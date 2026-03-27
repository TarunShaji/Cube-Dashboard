/**
 * Password Reset Script
 * Usage: node scripts/reset-password.mjs
 *
 * Hashes a new password with bcrypt (cost 10) and upserts it
 * into the team_members collection for a given email.
 */

import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'

config() // load .env

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'agency_dashboard'

// ── CONFIG ────────────────────────────────────────────────────────────────────
const TARGET_EMAIL = 'ravishankar@cubehq.ai'
const NEW_PASSWORD  = 'ravishankar@cubehq.ai'
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    if (!MONGO_URL) throw new Error('MONGO_URL is not set in .env')

    console.log(`Hashing new password for ${TARGET_EMAIL} ...`)
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10)
    console.log('New hash:', passwordHash)

    const client = new MongoClient(MONGO_URL)
    await client.connect()
    console.log('Connected to MongoDB.')

    const db = client.db(DB_NAME)
    const collection = db.collection('team_members')

    const result = await collection.updateOne(
        { email: TARGET_EMAIL },
        {
            $set: {
                password_hash: passwordHash,
                updated_at: new Date(),
            },
        }
    )

    if (result.matchedCount === 0) {
        console.error(`No user found with email: ${TARGET_EMAIL}`)
    } else if (result.modifiedCount === 1) {
        console.log(`Password updated successfully for ${TARGET_EMAIL}`)
        console.log(`They can now log in with: ${NEW_PASSWORD}`)
    } else {
        console.log('No change made (hash may already be identical).')
    }

    await client.close()
}

main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
})
