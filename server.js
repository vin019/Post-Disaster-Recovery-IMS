const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS) from root


// --- MySQL Connection Pool ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Default XAMPP user
    password: '',      // Default XAMPP password (empty)
    database: 'pdrims', // Database name
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Helper for Query execution ---
// Wraps pool.query to handle standard callback pattern similar to sqlite3 mostly, but result structure differs.
const query = (sql, params, callback) => {
    db.execute(sql, params, (err, results, fields) => {
        if (callback) callback(err, results);
    });
};


// --- Helper for Logs ---
function logAction(user, action, target) {
    const sql = "INSERT INTO system_logs (user, action, target) VALUES (?, ?, ?)";
    query(sql, [user, action, target], (err, res) => {
        if(err) console.error("Log error:", err);
    });
}

// --- AUTH ---
app.post('/api/login', (req, res) => {
  const { username, password } = req.body; 
  
  query('SELECT * FROM users WHERE email = ?', [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = results[0];
    bcrypt.compare(password, user.password_hash, (e, match) => {
      if (e || !match) return res.status(401).json({ error: 'Invalid credentials' });
      
      // Construct 'name' for frontend compatibility
      const name = `${user.surname}, ${user.first_name} ${user.middle_initial || ''}`.trim();
      
      // Ensure 'verified' exists (default to true if missing from DB, or handle logic)
      // Since schema doesn't have it, let's treat everyone as verified for now or send 1
      const verified = user.verified !== undefined ? user.verified : 1;

      res.json({ ...user, name, verified }); 
    });
  });
});

// --- USERS ---
// --- USERS ---
app.get('/api/users', (req, res) => {
    // Columns based on screenshot: id, surname, first_name, middle_initial, email, role, contact_number, age, purok
    query('SELECT id, surname, first_name, middle_initial, email, role, contact_number, age, purok FROM users ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        
        // Construct full name for frontend display compatibility
        const users = rows.map(u => ({
            ...u,
            name: `${u.surname}, ${u.first_name} ${u.middle_initial || ''}`.trim()
        }));
        res.json(users);
    });
});

app.post('/api/users', (req, res) => {
    // Exact columns from frontend
    const { surname, first_name, middle_initial, email, password, role, contact_number, age, purok, household_head, is_head } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if(err) return res.status(500).json({error: "Hash error"});
        
        query('INSERT INTO users (surname, first_name, middle_initial, email, password_hash, role, contact_number, age, purok, household_head, is_head) VALUES (?,?,?,?,?,?,?,?,?,?,?)', 
        [surname, first_name, middle_initial, email, hash, role || 'viewer', contact_number, age, purok, household_head, is_head], function(err, result) {
            if (err) return res.status(500).json({error: err.message});
            logAction('System', 'Created User', `User: ${email}`);
            res.json({id: result.insertId});
        });
    });
});

// Since 'verified' and 'status' columns DO NOT EXIST in your screenshot, 
// I am commenting out the 'Approve' logic to prevent errors.
// If you add those columns later, you can uncomment this.
/*
app.post('/api/users/approve/:id', (req, res) => {
    const { adminName } = req.body; 
    query("UPDATE users SET status = 'Active', verified = 1 WHERE id = ?", [req.params.id], function(err, result) {
        if (err) return res.status(500).json({error: err.message});
        logAction(adminName || 'Admin', 'Approved User', `User ID: ${req.params.id}`);
        res.json({success: true});
    });
});
*/

app.delete('/api/users/:id', (req, res) => {
    const { adminName } = req.body; 
    query("DELETE FROM users WHERE id = ?", [req.params.id], function(err, result){
        if (err) return res.status(500).json({error: err.message});
        logAction(adminName || 'Admin', 'Deleted User', `User ID: ${req.params.id}`);
        res.json({success: true});
    });
});

// --- HOUSEHOLDS ---
app.get('/api/households', (req, res) => {
    query('SELECT * FROM households', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        const parsed = rows.map(r => ({...r, familyMembers: JSON.parse(r.family_members || '[]')}));
        res.json(parsed);
    });
});

app.post('/api/households', (req, res) => {
    const { head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs, official_name } = req.body;
    const id = Date.now().toString().slice(-6); 
    
    query('INSERT INTO households (id, head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs) VALUES (?,?,?,?,?,?,?,?)',
    [id, head_name, purok, damage_status, head_age, contact_number, JSON.stringify(family_members), initial_needs], function(err, result) {
        if (err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Added Household', `ID: ${id} - ${head_name}`);
        res.json({success: true, id: id});
    });
});

app.put('/api/households/:id', (req, res) => {
    const { head_name, purok, damage_status, head_age, contact_number, family_members, initial_needs, official_name } = req.body;
    query('UPDATE households SET head_name=?, purok=?, damage_status=?, head_age=?, contact_number=?, family_members=?, initial_needs=? WHERE id=?',
    [head_name, purok, damage_status, head_age, contact_number, JSON.stringify(family_members), initial_needs, req.params.id], function(err, result) {
        if (err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Updated Household', `ID: ${req.params.id} - ${head_name}`);
        res.json({success: true});
    });
});

// --- AID RECORDS ---
app.get('/api/aid-records', (req, res) => {
    query('SELECT * FROM aid_records ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.post('/api/aid-records', (req, res) => {
    const { recipient_id, aid_type, quantity, date_distributed, distributed_by, notes, official_name } = req.body;
    
    query('INSERT INTO aid_records (recipient_id, aid_type, quantity, date_distributed, distributed_by, notes) VALUES (?,?,?,?,?,?)',
    [recipient_id, aid_type, quantity, date_distributed, distributed_by, notes], function(err, result) {
        if(err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Distributed Aid', `To: ${recipient_id}, Type: ${aid_type}`);
        res.json({success: true, id: result.insertId});
    });
});

app.put('/api/aid-records/:id', (req, res) => {
    const { aid_type, quantity, date_distributed, distributed_by, notes, official_name } = req.body;
     query('UPDATE aid_records SET aid_type=?, quantity=?, date_distributed=?, distributed_by=?, notes=? WHERE id=?',
    [aid_type, quantity, date_distributed, distributed_by, notes, req.params.id], function(err, result) {
        if(err) return res.status(500).json({error: err.message});
        logAction(official_name || 'Official', 'Updated Aid Record', `ID: ${req.params.id}`);
        res.json({success: true});
    });
});


// --- LOGS ---
app.get('/api/logs', (req, res) => {
    query('SELECT * FROM system_logs ORDER BY id DESC LIMIT 100', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

// --- INBOX ---
app.get('/api/inbox', (req, res) => {
    query('SELECT * FROM inbox_messages ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
