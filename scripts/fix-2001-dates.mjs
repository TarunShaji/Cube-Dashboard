/**
 * Migration: Fix social_tasks posting_date entries where year is 2001.
 * These were incorrectly stored due to a 2-digit year expansion bug.
 * Replaces year 2001 with 2026 in all affected posting_date values.
 *
 * Usage:  node scripts/fix-2001-dates.mjs
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const uri = process.env.MONGODB_URI
if (!uri) {
    console.error('MONGODB_URI not set in .env.local')
    process.exit(1)
}

const client = new MongoClient(uri)

async function run() {
    await client.connect()
    const db = client.db()
    const collection = db.collection('social_tasks')

    // Find all tasks where posting_date starts with '2001-'
    const cursor = collection.find({ posting_date: /^2001-/ })
    const tasks = await cursor.toArray()

    console.log(`Found ${tasks.length} tasks with year 2001 in posting_date`)

    if (tasks.length === 0) {
        console.log('Nothing to update.')
        await client.close()
        return
    }

    let updated = 0
    for (const task of tasks) {
        const fixed = task.posting_date.replace(/^2001-/, '2026-')
        await collection.updateOne(
            { _id: task._id },
            { $set: { posting_date: fixed, updated_at: new Date() } }
        )
        console.log(`  ${task.id}: ${task.posting_date} → ${fixed}`)
        updated++
    }

    console.log(`\nDone. Updated ${updated} tasks.`)
    await client.close()
}

run().catch(err => {
    console.error(err)
    process.exit(1)
})
