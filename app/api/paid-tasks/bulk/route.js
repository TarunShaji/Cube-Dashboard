import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'
import { validateBody } from '@/lib/middleware/validation'
import { applyTaskTransition } from '@/lib/engine/lifecycle'
import { PaidBulkSchema } from '@/lib/db/schemas/paid.schema'

export const runtime = 'nodejs';

export async function POST(request) {
    return withAuth(request, async () => {
        const database = await connectToMongo()
        const body = await request.json()

        const validation = validateBody(PaidBulkSchema, body)
        if (!validation.success) {
            return handleCORS(NextResponse.json(validation.error, { status: 400 }))
        }

        const { tasks } = validation.data
        const finalTasks = tasks.map(t => {
            return applyTaskTransition(null, {
                ...t,
                id: uuidv4()
            })
        })

        if (finalTasks.length > 0) {
            await database.collection('paid_tasks').insertMany(finalTasks)
        }

        return handleCORS(NextResponse.json({
            count: finalTasks.length,
            message: `Successfully imported ${finalTasks.length} paid tasks`
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

        const result = await database.collection('paid_tasks').deleteMany({ id: { $in: ids } })

        return handleCORS(NextResponse.json({
            message: `Successfully deleted ${result.deletedCount} paid tasks`,
            count: result.deletedCount
        }))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
