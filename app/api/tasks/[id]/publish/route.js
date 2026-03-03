import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applyTaskTransition, assertTaskInvariant } from '@/lib/engine/lifecycle'

export async function POST(request, { params }) {
    return withAuth(request, async () => {
        try {
            const { id: taskId } = params
            const database = await connectToMongo()

            // Fetch current state
            const current = await database.collection('tasks').findOne({ id: taskId })
            if (!current) return handleCORS(NextResponse.json({ error: 'Task not found' }, { status: 404 }))

            let body = {};
            try { body = await request.json() } catch (e) { }

            // 5. Concurrency Control: Optimistic Locking
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

            // 6. Apply "Publish" transition via lifecycle engine
            let finalUpdate;
            try {
                finalUpdate = applyTaskTransition(current, { client_link_visible: true });
            } catch (error) {
                return handleCORS(NextResponse.json({ error: error.message }, { status: 400 }))
            }

            const result = await database.collection('tasks').updateOne(
                { id: taskId, updated_at: current.updated_at },
                { $set: finalUpdate }
            )

            if (result.matchedCount === 0) {
                return handleCORS(NextResponse.json({ error: 'Update conflict: Task state changed during operation' }, { status: 409 }))
            }

            // Post-Update Re-Verification
            const updated = await database.collection('tasks').findOne({ id: taskId })
            try {
                assertTaskInvariant(updated);
            } catch (criticalError) {
                console.error('CRITICAL: Post-update invariant violation in Publish!', { taskId, state: updated });
                return handleCORS(NextResponse.json({ error: 'Critical system error: Invariant violation' }, { status: 500 }))
            }

            return handleCORS(NextResponse.json({
                message: 'Task successfully published to portal',
                task: updated
            }))
        } catch (error) {
            return handleCORS(NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 }))
        }
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
