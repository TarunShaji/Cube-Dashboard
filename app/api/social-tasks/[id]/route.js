import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applyTaskTransition, assertTaskInvariant } from '@/lib/engine/lifecycle'
import { validateBody, rejectFields } from '@/lib/middleware/validation'
import { SocialTaskUpdateSchema } from '@/lib/db/schemas/social.schema'
import { getActiveTeamMemberIdSet, normalizeAssignedTo } from '@/lib/team/assignee'

export const runtime = 'nodejs';

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

const FORBIDDEN_FIELDS = [
    'client_approval',
    'client_feedback_at'
];

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

        // Concurrency Control
        if (body.updated_at && current.updated_at) {
            const clientTime = new Date(body.updated_at).getTime()
            const dbTime = new Date(current.updated_at).getTime()
            if (clientTime < dbTime) {
                return handleCORS(NextResponse.json({
                    error: 'Concurrency error: Task has been modified by another user',
                    current: current
                }, { status: 409 }))
            }
        }

        const finalState = applyTaskTransition(current, cleanUpdate);

        const result = await database.collection('social_tasks').updateOne(
            { id: taskId, updated_at: current.updated_at },
            { $set: finalState }
        )

        if (result.matchedCount === 0) {
            return handleCORS(NextResponse.json({ error: 'Update conflict or record missing' }, { status: 409 }))
        }

        const updated = await database.collection('social_tasks').findOne({ id: taskId })
        assertTaskInvariant(updated);

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
