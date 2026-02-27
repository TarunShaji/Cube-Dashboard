import { NextResponse } from 'next/server'
import { handleCORS, rateLimit } from '@/lib/api-utils'

/**
 * Telemetry endpoint for Dashboard Resilience.
 * Captures UI crashes from ErrorBoundary and critical lifecycle violations.
 */
export async function POST(request) {
    const limiter = rateLimit(request, { limit: 20, windowMs: 60000 })
    if (limiter.blocked) return limiter.response

    try {
        const body = await request.json()
        const { type, message, stack, url, ...context } = body

        // In this implementation, we log to stdout for the server log aggregator to pick up.
        // In a mature system, this would write to a dedicated Telemetry DB or Sentry-like service.

        const severity = type === 'critical_violation' ? 'CRITICAL' : 'ERROR'
        console.log(`[TELEMETRY] [${severity}] [${new Date().toISOString()}]`, JSON.stringify({
            type,
            message,
            url,
            stack: stack?.split('\n').slice(0, 3).join(' | '), // Compact stack for logs
            ...context
        }))

        return handleCORS(NextResponse.json({ status: 'ok' }))
    } catch (error) {
        return handleCORS(NextResponse.json({ error: 'Failed to process telemetry' }, { status: 400 }))
    }
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
