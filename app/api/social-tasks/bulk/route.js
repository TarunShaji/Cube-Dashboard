import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { validateBody } from '@/lib/middleware/validation'
import { applySocialTaskTransition } from '@/lib/engine/lifecycle'
import { SocialBulkSchema } from '@/lib/db/schemas/social.schema'
import { getActiveTeamMemberIdSet, normalizeAssignedTo } from '@/lib/team/assignee'

export const runtime = 'nodejs';

export async function POST(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()
        const body = await request.json()

        const validation = validateBody(SocialBulkSchema, body)
        if (!validation.success) {
            return handleCORS(NextResponse.json(validation.error, { status: 400 }))
        }

        const { tasks } = validation.data
        const validMemberIds = await getActiveTeamMemberIdSet(database)
        const finalTasks = tasks.map(t => {
            const assignedTo = normalizeAssignedTo(t.assigned_to, validMemberIds)
            return applySocialTaskTransition(null, {
                ...t,
                ...(assignedTo !== undefined ? { assigned_to: assignedTo } : {}),
                id: uuidv4()
            })
        })

        if (finalTasks.length > 0) {
            await database.collection('social_tasks').insertMany(finalTasks)
        }

        return handleCORS(NextResponse.json({
            count: finalTasks.length,
            message: `Successfully imported ${finalTasks.length} social media tasks`
        }))
    })
}

export async function DELETE(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()
        const body = await request.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return handleCORS(NextResponse.json({ error: 'IDs array is required' }, { status: 400 }))
        }

        const result = await database.collection('social_tasks').deleteMany({ id: { $in: ids } })

        return handleCORS(NextResponse.json({
            message: `Successfully deleted ${result.deletedCount} social media tasks`,
            count: result.deletedCount
        }))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
