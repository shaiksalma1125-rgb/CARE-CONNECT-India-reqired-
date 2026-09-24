-- =========================================================================
-- Smart India Hackathon 2026 (SIH26133)
-- Public Healthcare Accessibility & Quality Platform - MySQL Schema (DDL)
-- =========================================================================

CREATE DATABASE IF NOT EXISTS public_healthcare_db;
USE public_healthcare_db;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    role ENUM('CITIZEN', 'HOSPITAL_STAFF', 'ADMIN') NOT NULL DEFAULT 'CITIZEN',
    location VARCHAR(150) NOT NULL,
    district VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    hospital_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(300) NOT NULL,
    village VARCHAR(100) NOT NULL,
    mandal VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    emergency_phone VARCHAR(20) NOT NULL,
    opening_hours VARCHAR(100) NOT NULL,
    hospital_type ENUM('District Hospital', 'Community Health Centre (CHC)', 'Primary Health Centre (PHC)', 'Area Hospital', 'Sub-District Hospital') NOT NULL,
    facilities TEXT NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 4.00,
    total_reviews INT DEFAULT 0,
    emergency_available BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
    availability_status ENUM('AVAILABLE', 'IN_CONSULTATION', 'ON_LEAVE') NOT NULL DEFAULT 'AVAILABLE',
    available_days VARCHAR(255) NOT NULL,
    time_slots VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 4. SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_id BIGINT NOT NULL,
    service_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    waiting_time VARCHAR(50) DEFAULT '15 mins',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 5. MEDICINES TABLE
CREATE TABLE IF NOT EXISTS medicines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_id BIGINT NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    minimum_threshold INT NOT NULL DEFAULT 50,
    status ENUM('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK') NOT NULL DEFAULT 'AVAILABLE',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 6. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    hospital_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    patient_name VARCHAR(150) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(50) NOT NULL,
    reason TEXT,
    status ENUM('BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

-- 7. FEEDBACKS TABLE
CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    hospital_id BIGINT NOT NULL,
    appointment_id VARCHAR(50) NULL,
    doctor_rating INT NOT NULL CHECK (doctor_rating BETWEEN 1 AND 5),
    waiting_rating INT NOT NULL CHECK (waiting_rating BETWEEN 1 AND 5),
    staff_rating INT NOT NULL CHECK (staff_rating BETWEEN 1 AND 5),
    cleanliness_rating INT NOT NULL CHECK (cleanliness_rating BETWEEN 1 AND 5),
    medicine_rating INT NOT NULL CHECK (medicine_rating BETWEEN 1 AND 5),
    service_rating INT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
    overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- 8. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    hospital_id BIGINT NOT NULL,
    appointment_id VARCHAR(50) NULL,
    category ENUM(
        'Doctor unavailable',
        'Medicine unavailable',
        'Healthcare service unavailable',
        'Long waiting time',
        'Staff behavior',
        'Cleanliness',
        'Infrastructure',
        'Emergency service issue',
        'Other'
    ) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('SUBMITTED', 'UNDER REVIEW', 'IN PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    resolution_remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);
