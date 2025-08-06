-- Create enum types
CREATE TYPE service_type AS ENUM ('occupational_doctor', 'safety_engineer');
CREATE TYPE assignment_status AS ENUM ('proposed', 'accepted', 'declined', 'expired', 'completed');
CREATE TYPE request_status AS ENUM ('pending', 'assigned', 'completed', 'cancelled');

-- Partners/Resources Table
CREATE TABLE partners (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    max_hours_per_week INTEGER DEFAULT 40,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients Table
CREATE TABLE clients (
    company_code VARCHAR(10) PRIMARY KEY,
    group_name VARCHAR(100),
    company_name VARCHAR(200) NOT NULL,
    company_type VARCHAR(100),
    afm BIGINT,
    account_manager VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installations Table
CREATE TABLE installations (
    installation_code VARCHAR(10) PRIMARY KEY,
    company_code VARCHAR(10) REFERENCES clients(company_code),
    description TEXT,
    address VARCHAR(200),
    post_code VARCHAR(10),
    category CHAR(1),
    employees_count INTEGER DEFAULT 0,
    work_hours VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Requests Table
CREATE TABLE customer_requests (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(200) NOT NULL,
    installation_address VARCHAR(200) NOT NULL,
    service_type service_type NOT NULL,
    employee_count INTEGER,
    installation_category CHAR(1),
    work_hours VARCHAR(100),
    start_date DATE,
    end_date DATE,
    special_requirements TEXT,
    status request_status DEFAULT 'pending',
    estimated_hours DECIMAL(6,2),
    max_budget DECIMAL(10,2),
    preferred_partner_id VARCHAR(10) REFERENCES partners(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Assignments Table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES customer_requests(id) ON DELETE CASCADE,
    partner_id VARCHAR(10) REFERENCES partners(id),
    installation_code VARCHAR(10) REFERENCES installations(installation_code),
    service_type service_type NOT NULL,
    assigned_hours DECIMAL(6,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (assigned_hours * hourly_rate) STORED,
    status assignment_status DEFAULT 'proposed',
    optimization_score DECIMAL(8,4),
    travel_distance DECIMAL(8,2),
    email_sent_at TIMESTAMP WITH TIME ZONE,
    partner_response assignment_status,
    partner_responded_at TIMESTAMP WITH TIME ZONE,
    response_deadline TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner Availability Table
CREATE TABLE partner_availability (
    id SERIAL PRIMARY KEY,
    partner_id VARCHAR(10) REFERENCES partners(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_hours DECIMAL(4,2) DEFAULT 8.0,
    booked_hours DECIMAL(4,2) DEFAULT 0.0,
    is_available BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, date)
);

-- Optimization Results Table (for audit trail)
CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES customer_requests(id) ON DELETE CASCADE,
    algorithm_version VARCHAR(20) DEFAULT 'v1.0',
    execution_time_ms INTEGER,
    total_partners_evaluated INTEGER,
    top_candidates JSONB,
    selected_partner_id VARCHAR(10) REFERENCES partners(id),
    optimization_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Log Table
CREATE TABLE email_log (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    recipient_email VARCHAR(100) NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'sent',
    response_received_at TIMESTAMP WITH TIME ZONE
);

-- System Settings Table
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_partners_city ON partners(city);
CREATE INDEX idx_partners_specialty ON partners(specialty);
CREATE INDEX idx_partners_active ON partners(is_active);

CREATE INDEX idx_customer_requests_status ON customer_requests(status);
CREATE INDEX idx_customer_requests_created_at ON customer_requests(created_at);
CREATE INDEX idx_customer_requests_service_type ON customer_requests(service_type);

CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_partner_id ON assignments(partner_id);
CREATE INDEX idx_assignments_request_id ON assignments(request_id);
CREATE INDEX idx_assignments_response_deadline ON assignments(response_deadline);

CREATE INDEX idx_partner_availability_partner_date ON partner_availability(partner_id, date);
CREATE INDEX idx_partner_availability_date ON partner_availability(date);

CREATE INDEX idx_email_log_assignment_id ON email_log(assignment_id);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installations_updated_at BEFORE UPDATE ON installations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_requests_updated_at BEFORE UPDATE ON customer_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_availability_updated_at BEFORE UPDATE ON partner_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('response_deadline_hours', '24', 'Hours to wait for partner response before assigning to alternative'),
('max_travel_distance_km', '50', 'Maximum travel distance for partner assignments'),
('optimization_weights', '{"location": 0.4, "availability": 0.3, "cost": 0.2, "specialty": 0.1}', 'Weights for optimization algorithm factors'),
('email_templates_enabled', 'true', 'Enable automated email notifications'),
('sepe_export_enabled', 'true', 'Enable SEPE.net export functionality');

-- Row Level Security (RLS) policies will be added in a separate migration
-- Enable RLS on all tables
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;