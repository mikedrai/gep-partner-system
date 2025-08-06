-- =====================================================
-- ENHANCED GEP SCHEDULING SYSTEM SCHEMA
-- Comprehensive database enhancement for full scheduling system
-- Generated on: 2025-07-23
-- Based on: GEP Scheduling Spec requirements
-- =====================================================

-- =====================================================
-- USER MANAGEMENT AND AUTHENTICATION
-- =====================================================

-- User roles enumeration
CREATE TYPE user_role AS ENUM ('partner', 'manager', 'admin', 'client');

-- System users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'partner',
    partner_id VARCHAR(10) REFERENCES partners(id),
    client_company_code VARCHAR(10) REFERENCES clients(company_code),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_role_associations CHECK (
        (role = 'partner' AND partner_id IS NOT NULL) OR
        (role = 'client' AND client_company_code IS NOT NULL) OR
        (role IN ('manager', 'admin'))
    )
);

-- User permissions table
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(50),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- ENHANCED SCHEDULING SYSTEM
-- =====================================================

-- Schedule status enumeration
CREATE TYPE schedule_status AS ENUM ('draft', 'pending_approval', 'approved', 'locked', 'cancelled', 'completed');

-- Visit type enumeration
CREATE TYPE visit_type AS ENUM ('occupational_doctor', 'safety_engineer', 'specialist_consultation', 'follow_up');

-- Master schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_code VARCHAR(20) REFERENCES contracts(contract_code),
    installation_code VARCHAR(10) REFERENCES installations(installation_code),
    partner_id VARCHAR(10) REFERENCES partners(id),
    service_type visit_type NOT NULL,
    
    -- Schedule metadata
    schedule_name VARCHAR(200),
    description TEXT,
    status schedule_status DEFAULT 'draft',
    
    -- Time constraints
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours DECIMAL(8,2) NOT NULL,
    visit_duration_hours DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    visits_per_month INTEGER DEFAULT 1,
    
    -- AI optimization data
    optimization_score DECIMAL(8,4),
    algorithm_used VARCHAR(50),
    confidence_level DECIMAL(5,2),
    
    -- Approval workflow
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    
    -- SEPE.net compliance
    sepe_uploaded BOOLEAN DEFAULT false,
    sepe_upload_date TIMESTAMP WITH TIME ZONE,
    sepe_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual scheduled visits
CREATE TABLE scheduled_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ) STORED,
    
    -- Visit details
    visit_type visit_type NOT NULL,
    notes TEXT,
    special_requirements TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled',
    partner_confirmed BOOLEAN DEFAULT false,
    client_notified BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Conflict prevention
    conflict_checked BOOLEAN DEFAULT false,
    conflict_check_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT no_time_overlap EXCLUDE USING gist (
        partner_id WITH =,
        daterange(visit_date, visit_date, '[]') WITH &&,
        timerange(start_time, end_time, '[]') WITH &&
    ) WHERE (status != 'cancelled')
);

-- Schedule templates for recurring patterns
CREATE TABLE schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    service_type visit_type NOT NULL,
    
    -- Pattern definition
    visit_duration_hours DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    visits_per_month INTEGER DEFAULT 1,
    preferred_day_of_month INTEGER, -- 1-31
    preferred_day_of_week INTEGER, -- 1-7
    preferred_time TIME,
    
    -- Constraints
    min_hours_between_visits INTEGER DEFAULT 720, -- 30 days
    max_hours_between_visits INTEGER DEFAULT 1440, -- 60 days
    
    -- AI optimization preferences
    optimization_weights JSONB DEFAULT '{"location": 0.4, "availability": 0.3, "cost": 0.2, "specialty": 0.1}',
    
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AI SCHEDULING ENGINE
-- =====================================================

-- AI algorithm definitions
CREATE TABLE ai_algorithms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    algorithm_type VARCHAR(50) NOT NULL, -- 'linear_programming', 'genetic', 'ml_based', 'rule_based'
    version VARCHAR(20) NOT NULL,
    
    -- Configuration
    parameters JSONB NOT NULL DEFAULT '{}',
    weights JSONB NOT NULL DEFAULT '{"location": 0.4, "availability": 0.3, "cost": 0.2, "specialty": 0.1}',
    
    -- Performance tracking
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    average_execution_time_ms INTEGER,
    average_optimization_score DECIMAL(8,4),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_production BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Algorithm performance metrics
CREATE TABLE algorithm_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    algorithm_id UUID REFERENCES ai_algorithms(id),
    schedule_id UUID REFERENCES schedules(id),
    
    -- Execution metrics
    execution_time_ms INTEGER NOT NULL,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    
    -- Quality metrics
    optimization_score DECIMAL(8,4) NOT NULL,
    feasibility_score DECIMAL(5,2),
    constraint_violations INTEGER DEFAULT 0,
    partner_satisfaction_score DECIMAL(5,2),
    client_satisfaction_score DECIMAL(5,2),
    
    -- Business metrics
    total_cost DECIMAL(12,2),
    total_travel_distance DECIMAL(10,2),
    schedule_efficiency DECIMAL(5,2),
    resource_utilization DECIMAL(5,2),
    
    -- AI-specific metrics
    confidence_level DECIMAL(5,2),
    learning_feedback JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historical scheduling patterns for ML
CREATE TABLE historical_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL, -- 'partner_preference', 'client_requirement', 'seasonal_trend'
    
    -- Pattern identification
    partner_id VARCHAR(10) REFERENCES partners(id),
    client_company_code VARCHAR(10) REFERENCES clients(company_code),
    installation_code VARCHAR(10) REFERENCES installations(installation_code),
    service_type visit_type,
    
    -- Pattern data
    pattern_data JSONB NOT NULL,
    frequency_score DECIMAL(5,2),
    success_rate DECIMAL(5,2),
    
    -- Time boundaries
    pattern_start_date DATE,
    pattern_end_date DATE,
    last_observed_date DATE,
    
    -- Confidence and learning
    confidence_level DECIMAL(5,2),
    sample_size INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WORKFLOW MANAGEMENT
-- =====================================================

-- Approval workflow status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Change request types
CREATE TYPE change_type AS ENUM ('schedule_modification', 'partner_change', 'time_change', 'cancellation', 'emergency_change');

-- Approval workflows
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL, -- 'schedule_approval', 'change_request', 'partner_assignment'
    
    -- Workflow definition
    approval_steps JSONB NOT NULL, -- [{"step": 1, "role": "manager", "required": true}, ...]
    auto_approval_rules JSONB, -- Conditions for automatic approval
    escalation_rules JSONB, -- Escalation conditions and timeouts
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approval requests
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES approval_workflows(id),
    schedule_id UUID REFERENCES schedules(id),
    
    -- Request details
    request_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    requested_changes JSONB,
    
    -- Requestor information
    requested_by UUID REFERENCES users(id) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Current status
    status approval_status DEFAULT 'pending',
    current_step INTEGER DEFAULT 1,
    
    -- Approval chain
    approvals JSONB DEFAULT '[]', -- [{step, approver_id, status, timestamp, notes}]
    
    -- Resolution
    final_decision approval_status,
    final_approver UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Urgency and priority
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    due_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Change requests table
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id),
    visit_id UUID REFERENCES scheduled_visits(id),
    
    -- Change details
    change_type change_type NOT NULL,
    reason TEXT NOT NULL,
    requested_changes JSONB NOT NULL,
    impact_assessment TEXT,
    
    -- Requestor
    requested_by UUID REFERENCES users(id) NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Approval
    status approval_status DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Implementation
    implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMP WITH TIME ZONE,
    implementation_notes TEXT,
    
    -- Client notification
    client_notified BOOLEAN DEFAULT false,
    client_notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATIONS AND COMMUNICATIONS
-- =====================================================

-- Notification types
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success', 'urgent');

-- Notification delivery methods
CREATE TYPE delivery_method AS ENUM ('dashboard', 'email', 'sms', 'push');

-- System notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES users(id),
    
    -- Notification content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type DEFAULT 'info',
    
    -- Delivery
    delivery_methods delivery_method[] DEFAULT ARRAY['dashboard'],
    delivered_at JSONB DEFAULT '{}', -- {method: timestamp}
    
    -- Related entities
    related_schedule_id UUID REFERENCES schedules(id),
    related_approval_id UUID REFERENCES approval_requests(id),
    related_change_id UUID REFERENCES change_requests(id),
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT false,
    
    -- Urgency
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AUDIT TRAIL AND COMPLIANCE
-- =====================================================

-- Audit action types
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'lock', 'unlock', 'export');

-- Comprehensive audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action details
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Actor information
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_role user_role,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id UUID,
    
    -- Business context
    reason TEXT,
    related_approval_id UUID REFERENCES approval_requests(id),
    related_change_id UUID REFERENCES change_requests(id),
    
    -- Compliance
    compliance_required BOOLEAN DEFAULT false,
    compliance_status VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEPE.net export tracking
CREATE TABLE sepe_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Export details
    export_type VARCHAR(50) NOT NULL, -- 'schedule', 'changes', 'compliance_report'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    
    -- Data scope
    schedule_ids UUID[],
    date_range daterange,
    partner_ids VARCHAR(10)[],
    installation_codes VARCHAR(10)[],
    
    -- Export metadata
    total_records INTEGER,
    export_format VARCHAR(20) DEFAULT 'xlsx',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'uploaded'
    error_message TEXT,
    
    -- SEPE.net interaction
    sepe_reference VARCHAR(100),
    uploaded_to_sepe BOOLEAN DEFAULT false,
    sepe_upload_date TIMESTAMP WITH TIME ZONE,
    sepe_confirmation_number VARCHAR(100),
    
    -- Audit
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0
);

-- =====================================================
-- PERFORMANCE AND ANALYTICS
-- =====================================================

-- KPI metrics tracking
CREATE TABLE scheduling_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    
    -- Operational metrics
    total_schedules_created INTEGER DEFAULT 0,
    total_visits_scheduled INTEGER DEFAULT 0,
    total_partners_active INTEGER DEFAULT 0,
    total_clients_served INTEGER DEFAULT 0,
    
    -- Quality metrics
    average_optimization_score DECIMAL(8,4),
    schedule_approval_rate DECIMAL(5,2),
    partner_acceptance_rate DECIMAL(5,2),
    client_satisfaction_score DECIMAL(5,2),
    
    -- Efficiency metrics
    average_travel_distance DECIMAL(10,2),
    resource_utilization_rate DECIMAL(5,2),
    schedule_adherence_rate DECIMAL(5,2),
    
    -- Financial metrics
    total_revenue DECIMAL(12,2),
    total_costs DECIMAL(12,2),
    cost_per_visit DECIMAL(8,2),
    profit_margin DECIMAL(5,2),
    
    -- Performance metrics
    average_response_time_hours DECIMAL(6,2),
    sla_compliance_rate DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User management indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_partner_id ON users(partner_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Scheduling indexes
CREATE INDEX idx_schedules_contract_code ON schedules(contract_code);
CREATE INDEX idx_schedules_partner_id ON schedules(partner_id);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_dates ON schedules(start_date, end_date);

CREATE INDEX idx_scheduled_visits_schedule_id ON scheduled_visits(schedule_id);
CREATE INDEX idx_scheduled_visits_date ON scheduled_visits(visit_date);
CREATE INDEX idx_scheduled_visits_partner_time ON scheduled_visits(partner_id, visit_date, start_time);

-- AI and performance indexes
CREATE INDEX idx_algorithm_performance_algorithm_id ON algorithm_performance(algorithm_id);
CREATE INDEX idx_algorithm_performance_created_at ON algorithm_performance(created_at);
CREATE INDEX idx_historical_patterns_partner_id ON historical_patterns(partner_id);

-- Workflow indexes
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX idx_change_requests_schedule_id ON change_requests(schedule_id);
CREATE INDEX idx_change_requests_status ON change_requests(status);

-- Notification indexes
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit indexes
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- =====================================================
-- TRIGGERS FOR AUTOMATED FUNCTIONALITY
-- =====================================================

-- Trigger to update updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_visits_updated_at BEFORE UPDATE ON scheduled_visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_algorithms_updated_at BEFORE UPDATE ON ai_algorithms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_patterns_updated_at BEFORE UPDATE ON historical_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        user_id,
        user_email
    ) VALUES (
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'::audit_action
            WHEN TG_OP = 'UPDATE' THEN 'update'::audit_action
            WHEN TG_OP = 'DELETE' THEN 'delete'::audit_action
        END,
        TG_TABLE_NAME,
        COALESCE(NEW.id::text, OLD.id::text),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        COALESCE(
            current_setting('app.current_user_id', true)::uuid,
            '00000000-0000-0000-0000-000000000000'::uuid
        ),
        current_setting('app.current_user_email', true)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_schedules AFTER INSERT OR UPDATE OR DELETE ON schedules
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_scheduled_visits AFTER INSERT OR UPDATE OR DELETE ON scheduled_visits
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_approval_requests AFTER INSERT OR UPDATE OR DELETE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_change_requests AFTER INSERT OR UPDATE OR DELETE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_algorithms ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sepe_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_metrics ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies (will be refined based on specific security requirements)

-- Partners can only see their own schedules
CREATE POLICY partner_schedules_policy ON schedules
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE partner_id = schedules.partner_id AND role = 'partner'
        )
        OR
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('manager', 'admin')
        )
    );

-- Users can only see their own notifications
CREATE POLICY user_notifications_policy ON notifications
    FOR ALL USING (recipient_id = auth.uid());

-- Managers and admins can see all approval requests
CREATE POLICY approval_requests_policy ON approval_requests
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('manager', 'admin')
        )
        OR requested_by = auth.uid()
    );

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default AI algorithms
INSERT INTO ai_algorithms (name, description, algorithm_type, version, parameters, is_active, is_production) VALUES
('Linear Programming Optimizer', 'Original LP-based optimization using OR-Tools', 'linear_programming', '1.0', 
 '{"solver": "SCIP", "time_limit_seconds": 300, "gap_tolerance": 0.01}', true, true),

('Genetic Algorithm Scheduler', 'Evolutionary approach for complex scheduling', 'genetic', '1.0',
 '{"population_size": 100, "generations": 50, "mutation_rate": 0.1, "crossover_rate": 0.8}', true, false),

('Machine Learning Predictor', 'ML-based scheduling using historical patterns', 'ml_based', '1.0',
 '{"model_type": "random_forest", "feature_count": 15, "training_window_days": 365}', true, false),

('Rule-Based Expert System', 'Business rules-driven scheduling', 'rule_based', '1.0',
 '{"priority_rules": ["historical_preference", "cost_efficiency", "geographic_proximity"], "fallback_enabled": true}', true, false);

-- Insert default approval workflows
INSERT INTO approval_workflows (name, description, workflow_type, approval_steps, is_active) VALUES
('Standard Schedule Approval', 'Default workflow for schedule approvals', 'schedule_approval',
 '[{"step": 1, "role": "manager", "required": true}, {"step": 2, "role": "admin", "required": false}]', true),

('Emergency Change Request', 'Fast-track approval for urgent changes', 'change_request',
 '[{"step": 1, "role": "manager", "required": true, "timeout_hours": 2}]', true),

('Partner Assignment Review', 'Workflow for new partner assignments', 'partner_assignment',
 '[{"step": 1, "role": "manager", "required": true}, {"step": 2, "role": "admin", "required": true}]', true);

-- Insert default schedule templates
INSERT INTO schedule_templates (name, description, service_type, visit_duration_hours, visits_per_month, preferred_day_of_month) VALUES
('Monthly Occupational Doctor', 'Standard monthly visit for occupational health', 'occupational_doctor', 2.0, 1, 15),
('Bimonthly Safety Engineer', 'Safety engineering consultation every two months', 'safety_engineer', 2.5, 0.5, 1),
('Weekly Specialist', 'Weekly specialist consultation for complex cases', 'specialist_consultation', 1.5, 4, NULL);

-- =====================================================
-- SUMMARY
-- =====================================================
-- This comprehensive schema enhancement provides:
-- ✅ Multi-role user authentication system
-- ✅ Advanced scheduling with AI integration
-- ✅ Workflow management and approval chains
-- ✅ Comprehensive audit trail and compliance tracking
-- ✅ Performance metrics and analytics
-- ✅ SEPE.net export capability
-- ✅ Notification and communication system
-- ✅ Row-level security for data protection
-- ✅ Optimized indexes for performance
-- ✅ Automated triggers for data integrity
-- 
-- Ready for implementation of the complete GEP scheduling system!
-- =====================================================