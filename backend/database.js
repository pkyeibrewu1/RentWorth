const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'rentworth.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize tables
db.serialize(() => {
    // Reviews Table
    db.run(`
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complex_name TEXT NOT NULL,
            university TEXT NOT NULL,
            student_email TEXT NOT NULL,
            rating REAL NOT NULL,
            floorplan TEXT NOT NULL,
            rent INTEGER NOT NULL,
            tag TEXT NOT NULL,
            comment TEXT NOT NULL,
            lease_proof_path TEXT,
            verified INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Property Manager Claims Table
    db.run(`
        CREATE TABLE IF NOT EXISTS manager_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_name TEXT NOT NULL,
            corporate_email TEXT NOT NULL,
            role TEXT NOT NULL,
            proof_path TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Manager Official Responses Table
    db.run(`
        CREATE TABLE IF NOT EXISTS manager_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id INTEGER NOT NULL,
            responder_name TEXT NOT NULL,
            responder_title TEXT NOT NULL,
            response_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
        )
    `);
});

module.exports = db;