const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pdrims'
});

db.connect(err => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL...');

    // 1. Alter Table to allow 'admin' role
    const alterQuery = "ALTER TABLE users MODIFY COLUMN role ENUM('viewer', 'official', 'admin') DEFAULT 'viewer'";
    
    db.query(alterQuery, (err) => {
        if (err) {
            console.error('Failed to alter table (might already be done):', err.message);
            // Continue anyway, it might just be that it's already set or strictly enforced mode differences
        } else {
            console.log('Schema updated: "admin" role added to ENUM.');
        }

        // 2. Create Admin User
        const password = 'admin123';
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) throw err;

            const insertQuery = `
                INSERT INTO users (surname, first_name, email, password_hash, role, contact_number, age) 
                VALUES ('System', 'Admin', 'admin@pdrims.gov', ?, 'admin', '0000000000', 99)
                ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'
            `;

            db.query(insertQuery, [hash], (err, result) => {
                if (err) {
                    console.error('Failed to seed admin:', err.message);
                } else {
                    console.log('Admin account seeded successfully!');
                    console.log('Email: admin@pdrims.gov');
                    console.log('Password: admin123');
                }
                db.end();
            });
        });
    });
});
