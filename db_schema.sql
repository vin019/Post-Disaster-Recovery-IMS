CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','official')),
    verified INTEGER NOT NULL DEFAULT 0 -- 0 = pending, 1 = verified
);

-- Insert default admin account (password will be hashed by setup script)
INSERT INTO users (username, password_hash, role, verified)
VALUES ('admin', '', 'admin', 1);
