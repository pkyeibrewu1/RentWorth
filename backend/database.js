const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'rentworth.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at', dbPath);
    }
});

db.serialize(() => {
    // Reviews Table
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complex_name TEXT NOT NULL,
            university TEXT NOT NULL,
            student_email TEXT NOT NULL,
            rating REAL NOT NULL,
            floorplan TEXT,
            rent INTEGER NOT NULL,
            tag TEXT,
            comment TEXT,
            lease_proof_path TEXT,
            verified INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Student .edu OTP Email Verifications Table
    db.run(`
        CREATE TABLE IF NOT EXISTS email_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp_code TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Manager Claims Table
    db.run(`
        CREATE TABLE IF NOT EXISTS manager_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_name TEXT NOT NULL,
            corporate_email TEXT NOT NULL,
            role TEXT,
            proof_path TEXT,
            status TEXT DEFAULT 'pending',
            access_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration helper: add access_code column if table was initialized prior
    db.all(`PRAGMA table_info(manager_claims)`, (err, columns) => {
        if (!err && columns) {
            const hasAccessCode = columns.some(col => col.name === 'access_code');
            if (!hasAccessCode) {
                db.run(`ALTER TABLE manager_claims ADD COLUMN access_code TEXT`);
            }
        }
    });

    // Manager Responses Table
    db.run(`
        CREATE TABLE IF NOT EXISTS manager_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id INTEGER UNIQUE NOT NULL,
            responder_name TEXT NOT NULL,
            responder_title TEXT NOT NULL,
            response_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
        )
    `);
});

module.exports = db;