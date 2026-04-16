/**
 * scripts/migrate-service-types.mjs
 * Clears service_type to [] for all clients so users can re-select manually.
 */

import { MongoClient } from 'mongodb'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env')
  if (!process.env.MONGO_URL && fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const idx = t.indexOf('=')
      if (idx === -1) continue
      const key = t.slice(0, idx).trim()
      const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
}

loadEnv()

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'agency_dashboard'

if (!MONGO_URL) {
  console.error('❌  MONGO_URL is not set.')
  process.exit(1)
}

const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 8000 })
await client.connect()
const result = await client.db(DB_NAME).collection('clients').updateMany(
  {},
  { $set: { service_type: [], updated_at: new Date() } }
)
await client.close()

console.log(`✅  Done. Cleared service_type on ${result.modifiedCount} clients.`)
