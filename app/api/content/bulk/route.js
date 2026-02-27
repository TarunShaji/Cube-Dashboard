import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectToMongo } from '@/lib/mongodb'
import { handleCORS, withAuth } from '@/lib/api-utils'
import { applyContentTransition } from '@/lib/lifecycleEngine'

import { ContentSchema } from '@/lib/schemas/content.schema'
import { validateBody } from '@/lib/validation'
import { z } from 'zod'

export async function POST(request) {
    return withAuth(request, async () => {
        try {
            const database = await connectToMongo()
            const body = await request.json()

            const validation = validateBody(z.object({
                items: z.array(ContentSchema.partial().extend({ blog_title: z.string().min(1) })),
                client_id: z.string().uuid()
            }), body)

            if (!validation.success) {
                return handleCORS(NextResponse.json(validation.error, { status: 400 }))
            }

            const { items, client_id } = validation.data

            const now = new Date()
            const docs = []
            const errors = []

            for (const item of items) {
                try {
                    const doc = applyContentTransition(null, {
                        ...item,
                        id: uuidv4(),
                        client_id,
                        created_at: now,
                        updated_at: now
                    })
                    docs.push(doc)
                } catch (err) {
                    errors.push({ title: item.blog_title || 'Unknown', error: err.message })
                }
            }

            if (docs.length > 0) {
                await database.collection('content_items').insertMany(docs)
            }

            return handleCORS(NextResponse.json({
                success: true,
                imported: docs.length,
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
