import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { connectToMongo } from '@/lib/db/mongodb'
import { handleCORS, withErrorLogging } from '@/lib/middleware/api-utils'

export const runtime = 'nodejs';

export async function POST(request) {
    return withErrorLogging(request, async () => {
        const registrationSecret = process.env.REGISTRATION_SECRET
        if (!registrationSecret) {
            return handleCORS(NextResponse.json({ error: 'Registration is disabled' }, { status: 403 }))
        }

        const database = await connectToMongo()
        const body = await request.json()
        const { name, email, password, registration_secret } = body

        if (registration_secret !== registrationSecret) {
            return handleCORS(NextResponse.json({ error: 'Invalid registration secret' }, { status: 403 }))
        }

        if (!name || !email || !password) {
            return handleCORS(NextResponse.json({ error: 'All fields (name, email, password) are required' }, { status: 400 }))
        }

        const existing = await database.collection('team_members').findOne({ email: email.toLowerCase() })
        if (existing) {
            return handleCORS(NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 }))
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const member = {
            id: uuidv4(),
            name,
            email: email.toLowerCase(),
            password_hash: passwordHash,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        }

        await database.collection('team_members').insertOne(member)

        const { _id, password_hash: _, ...result } = member
        return handleCORS(NextResponse.json({
            message: 'Registration successful',
            user: result
        }, { status: 201 }))
    })
}

export async function OPTIONS() {
    return handleCORS(new NextResponse(null, { status: 200 }))
}
