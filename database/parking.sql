CREATE DATABASE IF NOT EXISTS parknova_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parknova_db;

-- password_hash is included so accounts can log in securely.
CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  email VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS parking_slots (
  slot_id INT PRIMARY KEY AUTO_INCREMENT,
  slot_number VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(30) NOT NULL,
  location VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  vehicle_number VARCHAR(30) NOT NULL UNIQUE,
  vehicle_type VARCHAR(30) NOT NULL,
  vehicle_model VARCHAR(100),
  CONSTRAINT fk_vehicles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS parking_records (
  record_id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_id INT NOT NULL,
  slot_id INT NOT NULL,
  entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time DATETIME NULL,
  parking_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'Parked',
  CONSTRAINT fk_records_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_records_slot
    FOREIGN KEY (slot_id) REFERENCES parking_slots(slot_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_records_status ON parking_records(status);
CREATE INDEX idx_records_entry_time ON parking_records(entry_time);

-- Optional starter slots. Run this file once; these inserts avoid duplicates.
INSERT IGNORE INTO parking_slots (slot_number, vehicle_type, location, status) VALUES
('A-01', 'Car', 'Ground Floor', 'Available'),
('A-02', 'Car', 'Ground Floor', 'Available'),
('A-03', 'Car', 'Ground Floor', 'Available'),
('B-01', 'Bike', 'Ground Floor', 'Available'),
('B-02', 'Bike', 'Ground Floor', 'Available'),
('B-03', 'Bike', 'Ground Floor', 'Available'),
('C-01', 'EV', 'Basement', 'Available'),
('C-02', 'EV', 'Basement', 'Available');
