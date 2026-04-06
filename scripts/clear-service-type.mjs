/**
 * Migration: Clear all client service_type values to empty array [].
 * Use this after migrating from string-based to array-based service_type.
 *
 * Usage:  node scripts/clear-service-type.mjs
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
    const collection = db.collection('clients')

    const result = await collection.updateMany(
        {},
        { $set: { service_type: [] } }
    )

    console.log(`Updated ${result.modifiedCount} clients — service_type cleared to [].`)
    await client.close()
}

run().catch(err => {
    console.error(err)
    process.exit(1)
})
