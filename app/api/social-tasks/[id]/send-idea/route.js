import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { applySocialTaskTransition, assertSocialTaskInvariant } from '@/lib/engine/lifecycle'

export const runtime = 'nodejs';

/**
 * POST /api/social-tasks/[id]/send-idea
 * Marks content_idea_sent = true, resets content_idea_approval to Pending.
 * The internal team confirms intent via a UI dialog before calling this.
 */
export async function POST(request, { params }) {
    return withAuth(request, async () => {
        try {
            const { id: taskId } = params
            const database = await connectToMongo()

            const current = await database.collection('social_tasks').findOne({ id: taskId })
            if (!current) return handleCORS(NextResponse.json({ error: 'Task not found' }, { status: 404 }))

            let body = {}
            try { body = await request.json() } catch (e) { }

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

            const finalUpdate = applySocialTaskTransition(current, { content_idea_sent: true })

            const result = await database.collection('social_tasks').updateOne(
                { id: taskId, updated_at: current.updated_at },
                { $set: finalUpdate }
            )

            if (result.matchedCount === 0) {
                return handleCORS(NextResponse.json({ error: 'Update conflict: Task state changed during operation' }, { status: 409 }))
            }

            const updated = await database.collection('social_tasks').findOne({ id: taskId })
            assertSocialTaskInvariant(updated)

            const { _id, ...responseBody } = updated
            return handleCORS(NextResponse.json({ message: 'Content idea sent to client portal', task: responseBody }))
        } catch (error) {
            return handleCORS(NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 }))
        }
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
