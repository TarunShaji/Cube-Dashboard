import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withErrorLogging } from '@/lib/middleware/api-utils'
import { validateBody } from '@/lib/middleware/validation'
import { PortalTaskApprovalSchema, PortalSocialApprovalSchema } from '@/lib/db/schemas/portal.schema'
import { applyTaskTransition, assertTaskInvariant, applySocialTaskTransition, assertSocialTaskInvariant } from '@/lib/engine/lifecycle'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs';

export async function PUT(request, { params }) {
    return withErrorLogging(request, async () => {
        const { slug, taskId } = params
        const body = await request.json()
        const database = await connectToMongo()

        const clientDoc = await database.collection('clients').findOne({ slug, is_active: true })
        if (!clientDoc) return handleCORS(NextResponse.json({ error: 'Client not found' }, { status: 404 }))

        if (clientDoc.portal_password) {
            const authHeader = request.headers.get('X-Portal-Password')
            let valid = false
            if (authHeader) {
                try {
                    valid = await bcrypt.compare(authHeader, clientDoc.portal_password)
                } catch {
                    valid = authHeader === clientDoc.portal_password
                }
            }
            if (!valid) {
                return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
            }
        }

        const isSocial = body.service === 'social'

        if (isSocial) {
            // Social tasks use a two-stage approval model
            const validation = validateBody(PortalSocialApprovalSchema, body)
            if (!validation.success) {
                return handleCORS(NextResponse.json(validation.error, { status: 400 }))
            }

            const { approval_type, approval_value, feedback } = validation.data

            const task = await database.collection('social_tasks').findOne({ id: taskId, client_id: clientDoc.id })
            if (!task) return handleCORS(NextResponse.json({ error: 'Task not found' }, { status: 404 }))

            // Gate: can only approve if the relevant content has been sent
            if (approval_type === 'content_idea' && !task.content_idea_sent) {
                return handleCORS(NextResponse.json({ error: 'Content idea has not been sent yet' }, { status: 400 }))
            }
            if (approval_type === 'content_draft' && !task.content_draft_sent) {
                return handleCORS(NextResponse.json({ error: 'Content draft has not been sent yet' }, { status: 400 }))
            }

            const approvalUpdate = approval_type === 'content_idea'
                ? { content_idea_approval: approval_value, content_idea_feedback: feedback || null }
                : { content_draft_approval: approval_value, draft_feedback: feedback || null }

            const finalState = applySocialTaskTransition(task, approvalUpdate)

            const result = await database.collection('social_tasks').updateOne(
                { id: taskId, updated_at: task.updated_at },
                { $set: finalState }
            )

            if (result.matchedCount === 0) {
                return handleCORS(NextResponse.json({ error: 'Update conflict: Task has been modified since it was loaded' }, { status: 409 }))
            }

            const updated = await database.collection('social_tasks').findOne({ id: taskId })
            assertSocialTaskInvariant(updated)

            return handleCORS(NextResponse.json({ success: true, ...finalState }))
        }

        // Standard SEO / Email / Paid approval flow
        const validation = validateBody(PortalTaskApprovalSchema, body)
        if (!validation.success) {
            return handleCORS(NextResponse.json(validation.error, { status: 400 }))
        }

        const cleanData = validation.data
        const { service, ...approvalUpdate } = cleanData

        const collectionName = service === 'email' ? 'email_tasks' : (service === 'paid' ? 'paid_tasks' : 'tasks')

        const task = await database.collection(collectionName).findOne({ id: taskId, client_id: clientDoc.id })
        if (!task) return handleCORS(NextResponse.json({ error: 'Task not found in service: ' + (service || 'seo') }, { status: 404 }))

        const finalState = applyTaskTransition(task, approvalUpdate)

        const result = await database.collection(collectionName).updateOne(
            { id: taskId, updated_at: task.updated_at },
            { $set: finalState }
        )

        if (result.matchedCount === 0) {
            return handleCORS(NextResponse.json({ error: 'Update conflict: Task has been modified since it was loaded' }, { status: 409 }))
        }

        const updated = await database.collection(collectionName).findOne({ id: taskId })
        try {
            assertTaskInvariant(updated)
        } catch (criticalError) {
            console.error('CRITICAL: Post-update invariant violation in Portal!', { taskId, state: updated })
            return handleCORS(NextResponse.json({ error: 'Critical system error: Invariant violation' }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({ success: true, ...finalState }))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
