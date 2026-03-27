import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applySocialTaskTransition } from '@/lib/engine/lifecycle'
import { getActiveTeamMemberIdSet, normalizeAssignedTo } from '@/lib/team/assignee'

export const runtime = 'nodejs';

export async function POST(request) {
    return withAuth(request, async () => {
        try {
            const database = await connectToMongo()
            const body = await request.json()
            const { task_ids, updates } = body

            if (!task_ids || !updates || !Array.isArray(task_ids)) {
                return handleCORS(NextResponse.json({ error: 'task_ids array and updates required' }, { status: 400 }))
            }

            let normalizedUpdates = updates
            if (Object.prototype.hasOwnProperty.call(updates, 'assigned_to')) {
                const validMemberIds = await getActiveTeamMemberIdSet(database)
                normalizedUpdates = {
                    ...updates,
                    assigned_to: normalizeAssignedTo(updates.assigned_to, validMemberIds)
                }
            }

            const tasks = await database.collection('social_tasks').find({ id: { $in: task_ids } }).toArray()
            const results = []
            const errors = []

            for (const task of tasks) {
                try {
                    const finalUpdate = applySocialTaskTransition(task, normalizedUpdates)
                    finalUpdate.updated_at = new Date()

                    const result = await database.collection('social_tasks').updateOne(
                        { id: task.id, updated_at: task.updated_at },
                        { $set: finalUpdate }
                    )

                    if (result.matchedCount > 0) {
                        results.push(task.id)
                    } else {
                        errors.push({ id: task.id, error: 'Concurrency conflict or task missing' })
                    }
                } catch (error) {
                    errors.push({ id: task.id, error: error.message })
                }
            }

            return handleCORS(NextResponse.json({
                message: `Updated ${results.length} social media tasks`,
                updated: results.length,
                failed: errors.length,
                errors: errors.length > 0 ? errors : undefined
            }))
        } catch (error) {
            return handleCORS(NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 }))
        }
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
