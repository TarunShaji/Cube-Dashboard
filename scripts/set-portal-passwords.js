/**
 * set-portal-passwords.js
 *
 * Generates and sets strong portal passwords for all active clients
 * that don't already have one. Prints a table of client → password
 * so you can share them with clients.
 *
 * Usage:
 *   node scripts/set-portal-passwords.js
 *
 * To force-reset ALL clients (even those with existing passwords):
 *   node scripts/set-portal-passwords.js --force
 */

require('dotenv').config({ path: '.env' })
const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME

if (!MONGO_URL || !DB_NAME) {
  console.error('Missing MONGO_URL or DB_NAME in .env')
  process.exit(1)
}

const force = process.argv.includes('--force')

// Generates a random 12-character password using letters + digits
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[crypto.randomInt(chars.length)]).join('')
}

async function main() {
  const client = new MongoClient(MONGO_URL)
  await client.connect()
  const db = client.db(DB_NAME)

  const query = { is_active: true }
  if (!force) {
    // Only target clients without a portal_password set
    query.$or = [
      { portal_password: { $exists: false } },
      { portal_password: null },
      { portal_password: '' }
    ]
  }

  const clients = await db.collection('clients').find(query).toArray()

  if (clients.length === 0) {
    console.log(force
      ? 'No active clients found.'
      : 'All clients already have portal passwords. Use --force to reset them all.')
    await client.close()
    return
  }

  console.log(`\nSetting portal passwords for ${clients.length} client(s)...\n`)

  const results = []

  for (const c of clients) {
    const password = generatePassword()
    const hash = await bcrypt.hash(password, 10)
    await db.collection('clients').updateOne(
      { id: c.id },
      { $set: { portal_password: hash, updated_at: new Date() } }
    )
    results.push({ name: c.name, slug: c.slug, password })
  }

  await client.close()

  const fs = require('fs')
  const lines = ['Client\tSlug\tPortal Password', ...results.map(r => `${r.name}\t${r.slug}\t${r.password}`)]
  const outPath = 'scripts/portal-passwords.txt'
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

  console.log(`✓ Done. Passwords saved to ${outPath}\n`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
