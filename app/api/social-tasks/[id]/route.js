import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applySocialTaskTransition, assertSocialTaskInvariant } from '@/lib/engine/lifecycle'
import { validateBody, rejectFields } from '@/lib/middleware/validation'
import { SocialTaskUpdateSchema } from '@/lib/db/schemas/social.schema'
import { getActiveTeamMemberIdSet, normalizeAssignedTo } from '@/lib/team/assignee'

export const runtime = 'nodejs';

const FORBIDDEN_FIELDS = [
    'content_idea_approval',
    'content_idea_feedback',
    'content_draft_approval',
    'draft_feedback',
    'content_idea_sent',
    'content_draft_sent',
];

export async function GET(request, { params }) {
    return withAuth(request, async () => {
        const { id: taskId } = params
        const database = await connectToMongo()
        const task = await database.collection('social_tasks').findOne({ id: taskId })
        if (!task) return handleCORS(NextResponse.json({ error: 'Social task not found' }, { status: 404 }))
        const { _id, ...result } = task
        return handleCORS(NextResponse.json(result))
    })
}

export async function PUT(request, { params }) {
    return withAuth(request, async () => {
        const { id: taskId } = params
        const database = await connectToMongo()
        const body = await request.json()

        const rejection = rejectFields(body, FORBIDDEN_FIELDS)
        if (!rejection.success) {
            return handleCORS(NextResponse.json(rejection.error, { status: 400 }))
        }

        const validation = validateBody(SocialTaskUpdateSchema, body)
        if (!validation.success) {
            return handleCORS(NextResponse.json(validation.error, { status: 400 }))
        }

        const cleanUpdate = validation.data
        if (Object.prototype.hasOwnProperty.call(cleanUpdate, 'assigned_to')) {
            const validMemberIds = await getActiveTeamMemberIdSet(database)
            cleanUpdate.assigned_to = normalizeAssignedTo(cleanUpdate.assigned_to, validMemberIds)
        }

        const current = await database.collection('social_tasks').findOne({ id: taskId })
        if (!current) return handleCORS(NextResponse.json({ error: 'Social task not found' }, { status: 404 }))

        if (body.updated_at && current.updated_at) {
            const clientTime = new Date(body.updated_at).getTime()
            const dbTime = new Date(current.updated_at).getTime()
            if (clientTime < dbTime) {
                return handleCORS(NextResponse.json({
                    error: 'Concurrency error: Task has been modified by another user',
                    current
                }, { status: 409 }))
            }
        }

        const finalState = applySocialTaskTransition(current, cleanUpdate)

        const result = await database.collection('social_tasks').updateOne(
            { id: taskId, updated_at: current.updated_at },
            { $set: finalState }
        )

        if (result.matchedCount === 0) {
            return handleCORS(NextResponse.json({ error: 'Update conflict or record missing' }, { status: 409 }))
        }

        const updated = await database.collection('social_tasks').findOne({ id: taskId })
        assertSocialTaskInvariant(updated)

        const { _id, ...responseBody } = updated
        return handleCORS(NextResponse.json(responseBody))
    })
}

export async function DELETE(request, { params }) {
    return withAuth(request, async () => {
        const { id: taskId } = params
        const database = await connectToMongo()
        const result = await database.collection('social_tasks').deleteOne({ id: taskId })
        if (result.deletedCount === 0) {
            return handleCORS(NextResponse.json({ error: 'Social task not found' }, { status: 404 }))
        }
        return handleCORS(NextResponse.json({ message: 'Social task deleted' }))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
