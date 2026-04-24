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

// Generates a human-friendly strong password: Word-Word-1234
// Easy to share/type, hard to brute-force
function generatePassword() {
  const adjectives = [
    'Swift', 'Amber', 'Coral', 'Jade', 'Solar', 'Lunar', 'Crisp', 'Bold',
    'Vivid', 'Noble', 'Stark', 'Prime', 'Calm', 'Brisk', 'Sharp', 'Deft'
  ]
  const nouns = [
    'Falcon', 'Harbor', 'Summit', 'Ember', 'Cedar', 'Prism', 'Nexus', 'Orbit',
    'Crest', 'Vault', 'Ridge', 'Flare', 'Pulse', 'Forge', 'Blaze', 'Stone'
  ]
  const adj = adjectives[crypto.randomInt(adjectives.length)]
  const noun = nouns[crypto.randomInt(nouns.length)]
  const num = String(crypto.randomInt(1000, 9999))
  return `${adj}-${noun}-${num}`
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

  // Print results table
  const col1 = Math.max(12, ...results.map(r => r.name.length))
  const col2 = Math.max(10, ...results.map(r => r.slug.length))
  const col3 = 24

  const line = `+-${'-'.repeat(col1)}-+-${'-'.repeat(col2)}-+-${'-'.repeat(col3)}-+`
  const header = `| ${'Client'.padEnd(col1)} | ${'Slug'.padEnd(col2)} | ${'Portal Password'.padEnd(col3)} |`

  console.log(line)
  console.log(header)
  console.log(line)
  for (const r of results) {
    console.log(`| ${r.name.padEnd(col1)} | ${r.slug.padEnd(col2)} | ${r.password.padEnd(col3)} |`)
  }
  console.log(line)

  console.log(`\n✓ Done. Save these passwords — they cannot be recovered after this point.\n`)
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
