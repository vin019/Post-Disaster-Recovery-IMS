CREATE DATABASE IF NOT EXISTS pdrims;

USE pdrims;

-- Table for users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    surname VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    middle_initial CHAR(1),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    contact_number VARCHAR(15),
    age INT,
    purok VARCHAR(50),
    household_head VARCHAR(100),
    is_head BOOLEAN DEFAULT FALSE,
    role ENUM('viewer', 'official') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for aid reports
CREATE TABLE aid_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL,
    location VARCHAR(100) NOT NULL,
    aid_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for damage assessments
CREATE TABLE damage_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purok VARCHAR(50) NOT NULL,
    damage_level ENUM('low', 'medium', 'high') NOT NULL,
    households_affected INT NOT NULL,
    assessment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for recovery progress
CREATE TABLE recovery_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purok VARCHAR(50) NOT NULL,
    progress_percentage DECIMAL(5, 2) NOT NULL,
    last_updated DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample data for users
INSERT INTO users (surname, first_name, email, password_hash, role) VALUES
('Doe', 'John', 'john.doe@example.com', 'hashed_password_1', 'viewer'),
('Smith', 'Jane', 'jane.smith@example.com', 'hashed_password_2', 'official');

-- Insert sample data for aid reports
INSERT INTO aid_reports (report_date, location, aid_type, quantity) VALUES
('2023-01-15', 'Purok 1', 'Food Packs', 150),
('2023-01-16', 'Purok 2', 'Water Bottles', 200);

-- Insert sample data for damage assessments
INSERT INTO damage_assessments (purok, damage_level, households_affected, assessment_date) VALUES
('Purok 1', 'high', 50, '2023-01-10'),
('Purok 2', 'medium', 30, '2023-01-11');

-- Insert sample data for recovery progress
INSERT INTO recovery_progress (purok, progress_percentage, last_updated) VALUES
('Purok 1', 75.00, '2023-01-20'),
('Purok 2', 50.00, '2023-01-20');