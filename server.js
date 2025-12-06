const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./pdrims.db');

// --- Helper for Logs ---
function logAction(user, action, target) {
    const stmt = db.prepare("INSERT INTO system_logs (user, action, target) VALUES (?, ?, ?)");
    stmt.run([user, action, target], err => {
        if(err) console.error("Log error:", err);
    });
    stmt.finalize();
}

// --- AUTH ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body; // 'username' here is used as 'email' or 'id' for official login
  
  // Try finding by email (for both official/viewer logic) or maybe ID if that's how they log in. 
  // The frontend calls it 'username', let's query 'email' column based on our seed data.
  // Or query 'name' ? The seed data has email.
  
  db.get('SELECT * FROM users WHERE email = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    bcrypt.compare(password, user.password_hash, (e, match) => {
      if (e || !match) return res.status(401).json({ error: 'Invalid credentials' });
      res.json(user); // Send back full user object (excluding pwd ideally, but fine for now)
    });
  });
});

// --- USERS ---
app.get('/api/users', (req, res) => {
    db.all('SELECT id, name, email, role, position, contact_number, status, last_active FROM users ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/users', (req, res) => {
    // Only allowing creation of officials/viewers technically, but admin can create more.
    const { name, email, password, role, position, contact } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if(err) return res.status(500).json({error: "Hash error"});
        db.run('INSERT INTO users (name, email, password_hash, role, position, contact_number) VALUES (?,?,?,?,?,?)', 
        [name, email, hash, role, position, contact], function(err) {
            if (err) return res.status(500).json({error: err.message});
            logAction('System', 'Created User', `User: ${name}`);
            res.json({id: this.lastID});
        });
    });
});

app.post('/api/users/approve/:id', (req, res) => {
    const { adminName } = req.body; // Pass who approved it
    db.run("UPDATE users SET status = 'Active', verified = 1 WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        logAction(adminName || 'Admin', 'Approved User', `User ID: ${req.params.id}`);
        res.json({success: true});
    });
});

app.delete('/api/users/:id', (req, res) => {
    const { adminName } = req.body; // Pass who deleted it (via body or header)
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err){
        if (err) return res.status(500).json({error: err.message});
        logAction(adminName || 'Admin', 'Deleted User', `User ID: ${req.params.id}`);
        res.json({success: true});
    });
});

// --- HOUSEHOLDS ---
app.get('/api/households', (req, res) => {
    db.all('SELECT * FROM households', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        // Parse family_members JSON
        const parsed = rows.map(r => ({...r, familyMembers: JSON.parse(r.family_members || '[]')}));
        res.json(parsed);
    });
});

app.post('/api/households', (req, res) => {
    const { head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs, official_name } = req.body;
    const id = Date.now().toString().slice(-6); // Simple ID generation
    
    db.run('INSERT INTO households (id, head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs) VALUES (?,?,?,?,?,?,?,?)',
    [id, head_name, purok, damage_status, head_age, contact_number, JSON.stringify(family_members), initial_needs], function(err) {
        if (err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Added Household', `ID: ${id} - ${head_name}`);
        res.json({success: true, id: id});
    });
});

app.put('/api/households/:id', (req, res) => {
    const { head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs, official_name } = req.body;
    db.run('UPDATE households SET head_name=?, purok=?, damage_status=?, head_age=?, contact_number=?, family_members=?, initial_needs=? WHERE id=?',
    [head_name, purok, damage_status, head_age, contact_number, JSON.stringify(family_members), initial_needs, req.params.id], function(err) {
        if (err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Updated Household', `ID: ${req.params.id} - ${head_name}`);
        res.json({success: true});
    });
});

// --- AID RECORDS ---
app.get('/api/aid-records', (req, res) => {
    db.all('SELECT * FROM aid_records ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/aid-records', (req, res) => {
    const { recipient_id, aid_type, quantity, date_distributed, distributed_by, notes, official_name } = req.body;
    
    db.run('INSERT INTO aid_records (recipient_id, aid_type, quantity, date_distributed, distributed_by, notes) VALUES (?,?,?,?,?,?)',
    [recipient_id, aid_type, quantity, date_distributed, distributed_by, notes], function(err) {
        if(err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Distributed Aid', `To: ${recipient_id}, Type: ${aid_type}`);
        res.json({success: true, id: this.lastID});
    });
});

app.put('/api/aid-records/:id', (req, res) => {
    const { aid_type, quantity, date_distributed, distributed_by, notes, official_name } = req.body;
     db.run('UPDATE aid_records SET aid_type=?, quantity=?, date_distributed=?, distributed_by=?, notes=? WHERE id=?',
    [aid_type, quantity, date_distributed, distributed_by, notes, req.params.id], function(err) {
        if(err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Updated Aid Record', `ID: ${req.params.id}`);
        res.json({success: true});
    });
});


// --- LOGS ---
app.get('/api/logs', (req, res) => {
    db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT 100', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// --- INBOX ---
app.get('/api/inbox', (req, res) => {
    db.all('SELECT * FROM inbox_messages ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
