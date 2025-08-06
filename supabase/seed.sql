-- Seed data for GEP Partner Assignment System
-- This data is based on the Excel demo data provided

-- Insert Partners/Resources
INSERT INTO partners (id, name, specialty, city, hourly_rate, email, phone) VALUES
('R00050', 'Dr. Maria Papadaki', 'Occupational Doctor', 'Athens', 85.00, 'maria.papadaki@example.com', '+30210123456'),
('R00096', 'Dr. Nikos Stavros', 'Occupational Doctor', 'Thessaloniki', 80.00, 'nikos.stavros@example.com', '+30231098765'),
('R00123', 'Eng. Kostas Dimitriou', 'Safety Engineer', 'Athens', 75.00, 'kostas.dimitriou@example.com', '+30210456789'),
('R00145', 'Dr. Elena Georgiou', 'Occupational Doctor', 'Patras', 78.00, 'elena.georgiou@example.com', '+30261012345'),
('R00167', 'Eng. Yiannis Komnenos', 'Safety Engineer', 'Thessaloniki', 72.00, 'yiannis.komnenos@example.com', '+30231054321'),
('R00189', 'Dr. Sophia Alexiou', 'Occupational Doctor', 'Heraklion', 82.00, 'sophia.alexiou@example.com', '+30281098765'),
('R00201', 'Eng. Dimitris Petrou', 'Safety Engineer', 'Athens', 77.00, 'dimitris.petrou@example.com', '+30210789012'),
('R00223', 'Dr. Anna Christou', 'Occupational Doctor', 'Athens', 88.00, 'anna.christou@example.com', '+30210345678'),
('R00245', 'Eng. Michalis Antoniou', 'Safety Engineer', 'Patras', 74.00, 'michalis.antoniou@example.com', '+30261056789'),
('R00267', 'Dr. Petros Ioannou', 'Occupational Doctor', 'Thessaloniki', 79.00, 'petros.ioannou@example.com', '+30231067890');

-- Insert Sample Clients
INSERT INTO clients (company_code, group_name, company_name, company_type, afm, account_manager) VALUES
('C001', 'ALPHA GROUP', 'Alpha Manufacturing SA', 'Manufacturing', 123456789, 'John Papadopoulos'),
('C002', 'BETA CORP', 'Beta Logistics Ltd', 'Logistics', 987654321, 'Maria Konstantinidou'),
('C003', 'GAMMA INDUSTRIES', 'Gamma Construction SA', 'Construction', 456789123, 'Nikos Petridis'),
('C004', 'DELTA SERVICES', 'Delta Healthcare SA', 'Healthcare', 789123456, 'Elena Stavrou'),
('C005', 'EPSILON GROUP', 'Epsilon Technology SA', 'Technology', 321654987, 'Kostas Georgiou');

-- Insert Sample Installations
INSERT INTO installations (installation_code, company_code, description, address, post_code, category, employees_count, work_hours, latitude, longitude) VALUES
('I001', 'C001', 'Main Manufacturing Plant', '123 Industrial Ave, Athens', '11253', 'A', 150, '08:00-17:00', 37.9755, 23.7348),
('I002', 'C001', 'Warehouse Facility', '456 Storage St, Piraeus', '18540', 'B', 45, '06:00-15:00', 37.9538, 23.6291),
('I003', 'C002', 'Distribution Center', '789 Logistics Blvd, Thessaloniki', '54636', 'A', 85, '24/7 Shifts', 40.6401, 22.9444),
('I004', 'C003', 'Construction Site Office', '321 Building Ave, Patras', '26442', 'C', 25, '07:00-16:00', 38.2466, 21.7346),
('I005', 'C004', 'Medical Center', '654 Health St, Heraklion', '71202', 'A', 120, '24/7 Operations', 35.3387, 25.1442),
('I006', 'C005', 'Tech Hub', '987 Innovation Dr, Athens', '15125', 'B', 75, '09:00-18:00', 37.9838, 23.7275);

-- Insert Sample Customer Requests
INSERT INTO customer_requests (client_name, installation_address, service_type, employee_count, installation_category, work_hours, start_date, end_date, special_requirements, estimated_hours, max_budget) VALUES
('Alpha Manufacturing SA', '123 Industrial Ave, Athens', 'occupational_doctor', 150, 'A', '08:00-17:00', '2024-02-01', '2024-02-28', 'Monthly health screenings required', 40, 3500.00),
('Beta Logistics Ltd', '789 Logistics Blvd, Thessaloniki', 'safety_engineer', 85, 'A', '24/7 Shifts', '2024-02-15', '2024-03-15', 'Warehouse safety audit needed', 32, 2500.00),
('Gamma Construction SA', '321 Building Ave, Patras', 'occupational_doctor', 25, 'C', '07:00-16:00', '2024-02-10', '2024-02-20', 'Pre-employment medical exams', 20, 1600.00),
('Delta Healthcare SA', '654 Health St, Heraklion', 'safety_engineer', 120, 'A', '24/7 Operations', '2024-02-05', '2024-03-05', 'Emergency procedures review', 50, 4000.00),
('Epsilon Technology SA', '987 Innovation Dr, Athens', 'occupational_doctor', 75, 'B', '09:00-18:00', '2024-02-20', '2024-03-10', 'Ergonomic assessments for office workers', 25, 2200.00);

-- Insert Partner Availability for current month (February 2024)
INSERT INTO partner_availability (partner_id, date, available_hours, booked_hours) VALUES
-- Dr. Maria Papadaki (R00050)
('R00050', '2024-02-01', 8.0, 0.0),
('R00050', '2024-02-02', 8.0, 4.0),
('R00050', '2024-02-05', 8.0, 0.0),
('R00050', '2024-02-06', 8.0, 6.0),
('R00050', '2024-02-07', 8.0, 0.0),
('R00050', '2024-02-08', 8.0, 0.0),
('R00050', '2024-02-09', 8.0, 2.0),

-- Dr. Nikos Stavros (R00096) 
('R00096', '2024-02-01', 8.0, 0.0),
('R00096', '2024-02-02', 8.0, 0.0),
('R00096', '2024-02-05', 8.0, 8.0),
('R00096', '2024-02-06', 8.0, 0.0),
('R00096', '2024-02-07', 8.0, 3.0),
('R00096', '2024-02-08', 8.0, 0.0),
('R00096', '2024-02-09', 8.0, 0.0),

-- Eng. Kostas Dimitriou (R00123)
('R00123', '2024-02-01', 8.0, 0.0),
('R00123', '2024-02-02', 8.0, 0.0),
('R00123', '2024-02-05', 8.0, 0.0),
('R00123', '2024-02-06', 8.0, 4.0),
('R00123', '2024-02-07', 8.0, 0.0),
('R00123', '2024-02-08', 8.0, 0.0),
('R00123', '2024-02-09', 8.0, 0.0),

-- Dr. Elena Georgiou (R00145)
('R00145', '2024-02-01', 8.0, 0.0),
('R00145', '2024-02-02', 8.0, 0.0),
('R00145', '2024-02-05', 8.0, 0.0),
('R00145', '2024-02-06', 8.0, 0.0),
('R00145', '2024-02-07', 8.0, 5.0),
('R00145', '2024-02-08', 8.0, 0.0),
('R00145', '2024-02-09', 8.0, 0.0),

-- Eng. Yiannis Komnenos (R00167)
('R00167', '2024-02-01', 8.0, 0.0),
('R00167', '2024-02-02', 8.0, 0.0),
('R00167', '2024-02-05', 8.0, 0.0),
('R00167', '2024-02-06', 8.0, 0.0),
('R00167', '2024-02-07', 8.0, 0.0),
('R00167', '2024-02-08', 8.0, 6.0),
('R00167', '2024-02-09', 8.0, 0.0);

-- Insert Sample Assignments (some completed, some pending)
INSERT INTO assignments (request_id, partner_id, installation_code, service_type, assigned_hours, hourly_rate, status, optimization_score, travel_distance, email_sent_at, response_deadline) VALUES
(1, 'R00050', 'I001', 'occupational_doctor', 40, 85.00, 'accepted', 92.5, 5.2, NOW() - INTERVAL '2 days', NOW() + INTERVAL '22 hours'),
(2, 'R00167', 'I003', 'safety_engineer', 32, 72.00, 'proposed', 88.7, 8.1, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '18 hours'),
(4, 'R00201', 'I005', 'safety_engineer', 50, 77.00, 'proposed', 85.3, 15.7, NOW() - INTERVAL '12 hours', NOW() + INTERVAL '12 hours');

-- Insert Sample Optimization Results
INSERT INTO optimization_results (request_id, execution_time_ms, total_partners_evaluated, top_candidates, selected_partner_id, optimization_parameters) VALUES
(1, 156, 4, '[{"partner_id": "R00050", "score": 92.5}, {"partner_id": "R00223", "score": 89.2}, {"partner_id": "R00145", "score": 76.8}]', 'R00050', '{"location_weight": 0.4, "availability_weight": 0.3, "cost_weight": 0.2, "specialty_weight": 0.1}'),
(2, 203, 3, '[{"partner_id": "R00167", "score": 88.7}, {"partner_id": "R00123", "score": 82.1}]', 'R00167', '{"location_weight": 0.4, "availability_weight": 0.3, "cost_weight": 0.2, "specialty_weight": 0.1}'),
(4, 189, 5, '[{"partner_id": "R00201", "score": 85.3}, {"partner_id": "R00123", "score": 81.9}, {"partner_id": "R00167", "score": 79.4}]', 'R00201', '{"location_weight": 0.4, "availability_weight": 0.3, "cost_weight": 0.2, "specialty_weight": 0.1}');

-- Insert Email Log entries
INSERT INTO email_log (assignment_id, recipient_email, email_type, subject, delivery_status) VALUES
(1, 'maria.papadaki@example.com', 'assignment_notification', 'New Assignment Opportunity - Alpha Manufacturing SA', 'delivered'),
(2, 'yiannis.komnenos@example.com', 'assignment_notification', 'New Assignment Opportunity - Beta Logistics Ltd', 'delivered'),
(3, 'dimitris.petrou@example.com', 'assignment_notification', 'New Assignment Opportunity - Delta Healthcare SA', 'delivered');