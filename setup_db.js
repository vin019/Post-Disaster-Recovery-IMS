const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const dbFile = './pdrims.db';

// Remove existing DB for fresh setup (optional)
try {
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
    console.log('Existing database removed.');
  }
} catch (err) {
  console.warn('Warning: Could not delete existing database (might be in use). Proceeding with existing DB.');
}

const db = new sqlite3.Database(dbFile);

// Load schema
const schema = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','official','viewer')),
    position TEXT,
    contact_number TEXT,
    status TEXT DEFAULT 'Active',
    last_active TEXT DEFAULT 'Never',
    verified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY, 
    head_name TEXT NOT NULL,
    purok TEXT NOT NULL,
    damage_status TEXT,
    head_age INTEGER,
    contact_number TEXT,
    family_members TEXT, -- Stored as JSON string
    initial_needs TEXT
);

CREATE TABLE IF NOT EXISTS aid_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id TEXT NOT NULL,
    aid_type TEXT NOT NULL,
    quantity TEXT NOT NULL,
    date_distributed TEXT NOT NULL,
    distributed_by TEXT,
    notes TEXT,
    FOREIGN KEY(recipient_id) REFERENCES households(id)
);

CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inbox_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    sender TEXT,
    subject TEXT,
    message TEXT,
    date_sent TEXT,
    is_read INTEGER DEFAULT 0
);
`;

db.exec(schema, err => {
  if (err) {
    console.error('Error creating schema:', err);
    process.exit(1);
  }
  // Insert default admin with hashed password
  // Insert default admin with hashed password
  const plain = 'Admin@123';
  bcrypt.hash(plain, 10, (e, hash) => {
    if (e) {
      console.error('Hash error:', e);
      process.exit(1);
    }
    
    const users = [
        ['Kyle Grant G. Lapid', 'kyle.admin@barangay.gov.ph', hash, 'admin', 'System Administrator', '0917-000-0000', 'Active', 'Just now', 1],
        ['Jazcel A. Esio', 'jazcel@barangay.gov.ph', hash, 'official', 'Barangay Official', '0918-000-0000', 'Active', '2 hours ago', 1],
        ['Nicole I. Severino', 'nicole@barangay.gov.ph', hash, 'official', 'Barangay Official', '0919-000-0000', 'Pending', 'N/A', 0],
        ['Vin Ysl M. Bacsarsa', 'vin.viewer@gmail.com', hash, 'viewer', 'Beneficiary', '0920-000-0000', 'Active', '1 day ago', 1]
    ];

    const userStmt = db.prepare("INSERT INTO users (name, email, password_hash, role, position, contact_number, status, last_active, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    users.forEach(u => userStmt.run(u));
    userStmt.finalize();

    const households = [
        ['001', 'Bacsarsa, Vin Ysl M.', 'Purok 1', '100', 45, '0917-123-4567', JSON.stringify([{}, {}]), 'Food, Shelter'],
        ['002', 'Esio, Jazcel A.', 'Purok 1', '50', 32, '0918-987-6543', JSON.stringify([{}]), 'Financial'],
        ['003', 'Lapid, Kyle Grant G.', 'Purok 2', '75', 58, '0999-000-1111', JSON.stringify([{}, {}, {}]), 'Medical'],
        ['004', 'Severino, Nicole I.', 'Purok 2', '75', 28, '0920-555-2222', JSON.stringify([{}, {}, {}]), 'Food']
    ];

    const hhStmt = db.prepare("INSERT INTO households (id, head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    households.forEach(h => hhStmt.run(h));
    hhStmt.finalize();

    const aids = [
        ['001', 'Food Pack', '1 box', '2025-11-20', 'LGU', 'Received by head'],
        ['003', 'Cash Aid', 'Php 5,000', '2025-11-21', 'MSWD', 'First tranche'],
        ['001', 'Shelter Kit', '1 pc', '2025-11-25', 'NGO Relief', 'Tarpaulin']
    ];
    
    const aidStmt = db.prepare("INSERT INTO aid_records (recipient_id, aid_type, quantity, date_distributed, distributed_by, notes) VALUES (?, ?, ?, ?, ?, ?)");
    aids.forEach(a => aidStmt.run(a));
    aidStmt.finalize();
    
    const inbox = [
        ['Aid Inquiry', 'Vin Ysl M. Bacsarsa', 'Relief Goods Schedule', 'Good morning, when is the next distribution?', '2025-11-26', 0]
    ];
    const inboxStmt = db.prepare("INSERT INTO inbox_messages (category, sender, subject, message, date_sent, is_read) VALUES (?, ?, ?, ?, ?, ?)");
    inbox.forEach(i => inboxStmt.run(i));
    inboxStmt.finalize();

    console.log('Database initialized with seed data.');
  });
});
