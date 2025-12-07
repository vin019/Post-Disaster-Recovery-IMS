const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pdrims',
    multipleStatements: true
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');

    const sql = `
    CREATE TABLE IF NOT EXISTS households (
        id VARCHAR(20) PRIMARY KEY,
        head_name VARCHAR(100) NOT NULL,
        purok VARCHAR(50) NOT NULL,
        damage_status VARCHAR(20),
        head_age INT,
        contact_number VARCHAR(20),
        family_members JSON,
        initial_needs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS aid_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id VARCHAR(20),
        aid_type VARCHAR(50) NOT NULL,
        quantity VARCHAR(50),
        date_distributed DATE,
        distributed_by VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recipient_id) REFERENCES households(id) ON DELETE SET NULL
    );
    `;

    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error creating tables:', err);
        } else {
            console.log('Tables households and aid_records created successfully.');
        }
        connection.end();
    });
});
