import { NextResponse } from 'next/server'
import { handleCORS, withAuth } from '@/lib/middleware/api-utils'

export const runtime = 'nodejs';

// Social tasks no longer use a single "publish" — use /send-idea and /send-draft instead
export async function POST(request, { params }) {
    return withAuth(request, async () => {
        return handleCORS(NextResponse.json(
            { error: 'Social tasks use /send-idea and /send-draft endpoints instead of /publish' },
            { status: 410 }
        ))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
