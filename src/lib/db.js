import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', '..', 'data', 'database.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
        token TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
`)

export function saveShare(token, state) {
    const stmt = db.prepare('INSERT INTO shares (token, state, created_at) VALUES (?, ?, ?)')
    stmt.run(token, JSON.stringify(state), Date.now())
}

export function getShare(token) {
    const stmt = db.prepare('SELECT state FROM shares WHERE token = ?')
    const row = stmt.get(token)
    return row ? JSON.parse(row.state) : null
}

export default db

