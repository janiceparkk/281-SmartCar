-- -----------------------------------------------------------
-- DDL for Smart Car Platform PostgreSQL Database Schema
-- Based on the project's Relational Entity Diagram (Section 4.1)
-- -----------------------------------------------------------

-- Optional: Drop tables in reverse dependency order for safe schema recreation during development
DROP TABLE IF EXISTS ml_model_prediction CASCADE;
DROP TABLE IF EXISTS service_logs CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS model_training_runs CASCADE;
DROP TABLE IF EXISTS ml_models CASCADE;
DROP TABLE IF EXISTS training_datasets CASCADE;
DROP TABLE IF EXISTS iot_devices CASCADE;
DROP TABLE IF EXISTS smart_cars CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;


-- 1. user_roles Table
-- Manages distinct user roles (e.g., CarOwner, Admin, ServiceStaff)
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. users Table (DEPRECATED - Users are now stored in MongoDB)
-- This table is kept for future reference but not used in current implementation
-- User authentication is handled via MongoDB (see server.js UserSchema)
-- PostgreSQL only stores car telemetry data with user_id as VARCHAR reference
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY, -- MongoDB user_id string (for reference only)
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50), -- CarOwner, Admin, ServiceStaff
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT -- Optional metadata sync from MongoDB
);

-- 3. smart_cars Table (matches server.js implementation)
-- Core table for registered autonomous vehicles
CREATE TABLE IF NOT EXISTS smart_cars (
    car_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL, -- MongoDB user_id string (no FK constraint due to different DB)
    model VARCHAR(100),
    status VARCHAR(20),
    current_latitude DECIMAL(9, 6),
    current_longitude DECIMAL(9, 6),
    last_heartbeat TIMESTAMP WITH TIME ZONE
);

-- 4. iot_devices Table
-- Management of sensors/devices attached to smart cars (matches deliverable spec)
CREATE TABLE IF NOT EXISTS iot_devices (
    device_id VARCHAR(50) PRIMARY KEY, -- String device IDs like "IOT-001"
    car_id VARCHAR(50) REFERENCES smart_cars(car_id) ON DELETE CASCADE, -- Foreign Key to smart_cars
    device_type VARCHAR(100), -- Temperature Sensor, GPS Tracker, Camera Module, etc.
    status VARCHAR(50), -- Online, Offline, Maintenance, Error
    firmware_version VARCHAR(50),
    certificate_data TEXT, -- X.509 certificate storage
    mqtt_client_id VARCHAR(100),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    connection_quality JSONB, -- {latency, signalStrength, packetLoss}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. training_datasets Table
-- Tracks datasets used for ML model training
CREATE TABLE IF NOT EXISTS training_datasets (
    dataset_id SERIAL PRIMARY KEY,
    source TEXT,
    size INTEGER, -- Size in MB, GB, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ml_models Table
-- Stores metadata and the binary of machine learning models
CREATE TABLE IF NOT EXISTS ml_models (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(20),
    model_parameters JSONB, -- Flexible storage for configuration
    training_data_stats JSONB,
    performance_metrics TEXT[], -- Array of strings for key metrics
    model_binary BYTEA -- Stores the actual serialized model file
);

-- 7. model_training_runs Table
-- Logs specific training events and their performance metrics
CREATE TABLE IF NOT EXISTS model_training_runs (
    run_id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ml_models(model_id) ON DELETE RESTRICT,
    dataset_id INTEGER REFERENCES training_datasets(dataset_id) ON DELETE RESTRICT,
    accuracy NUMERIC(5, 4),
    precision NUMERIC(5, 4),
    recall NUMERIC(5, 4),
    f1_score NUMERIC(5, 4),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. service_requests Table
-- Tracks maintenance or service requests related to a car or device event
CREATE TABLE IF NOT EXISTS service_requests (
    request_id SERIAL PRIMARY KEY,
    car_id VARCHAR(50) REFERENCES smart_cars(car_id) ON DELETE RESTRICT,
    issue_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 9. service_logs Table
-- Detailed logs associated with a specific service request
CREATE TABLE IF NOT EXISTS service_logs (
    log_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(request_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 10. ml_model_prediction Table
-- Records every prediction generated by the ML models in the cloud
CREATE TABLE IF NOT EXISTS ml_model_prediction (
    prediction_id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES ml_models(model_id) ON DELETE RESTRICT,
    car_id VARCHAR(50) REFERENCES smart_cars(car_id) ON DELETE RESTRICT,
    request_id INTEGER REFERENCES service_requests(request_id) ON DELETE SET NULL, -- Can be NULL if no request was triggered
    predicted_issue JSONB,
    confidence_score TEXT[], -- Array of strings/numbers
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- Example Data Inserts (Optional)
-- -----------------------------------------------------------

-- Insert default user roles
INSERT INTO user_roles (role_name) VALUES ('Admin'), ('CarOwner'), ('ServiceStaff')
ON CONFLICT (role_name) DO NOTHING;

-- Insert a mock user reference (actual user data is in MongoDB)
INSERT INTO users (user_id, name, email, role, notes)
VALUES (
    'U001',
    'Test User',
    'test@example.com',
    'CarOwner',
    'Mock user - actual auth data in MongoDB'
)
ON CONFLICT (user_id) DO NOTHING;