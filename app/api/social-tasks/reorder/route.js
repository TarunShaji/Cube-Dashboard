import { NextResponse } from 'next/server'
import { connectToMongo } from '@/lib/db/mongodb'
import { withAuth } from '@/lib/middleware/api-utils'

export const runtime = 'nodejs';

export async function PUT(request) {
    return withAuth(request, async () => {
        const body = await request.json()
        const { ids } = body
        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'ids must be an array' }, { status: 400 })
        }

        const database = await connectToMongo()
        const ops = ids.map((id, index) => ({
            updateOne: {
                filter: { id },
                update: { $set: { position: index, updated_at: new Date() } }
            }
        }))

        if (ops.length > 0) {
            await database.collection('social_tasks').bulkWrite(ops)
        }

        return NextResponse.json({ success: true, count: ops.length })
    })
}
