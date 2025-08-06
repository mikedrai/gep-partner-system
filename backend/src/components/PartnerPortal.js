import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import ScheduleCalendar from './ScheduleCalendar';
import './PartnerPortal.css';

/**
 * Partner Portal
 * Secure interface for partners to manage their schedules and assignments
 * Features: 
 * - Secure login with role-based access
 * - Schedule viewing and management
 * - Assignment notifications
 * - Profile management
 * - Visit reporting
 */
const PartnerPortal = () => {
    const { user, isAuthenticated, login, logout, loading } = useContext(AuthContext);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [partnerData, setPartnerData] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Redirect if not partner role
    if (isAuthenticated && user?.role !== 'partner') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        if (isAuthenticated && user?.partnerId) {
            loadPartnerData();
        }
    }, [isAuthenticated, user]);

    const loadPartnerData = async () => {
        try {
            setLoadingData(true);
            
            // Load partner profile
            const profileResponse = await fetch(`/api/partners/${user.partnerId}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setPartnerData(profileData.partner);
            }

            // Load assignments
            const assignmentsResponse = await fetch(`/api/partners/${user.partnerId}/assignments`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            
            if (assignmentsResponse.ok) {
                const assignmentsData = await assignmentsResponse.json();
                setAssignments(assignmentsData.assignments || []);
            }

            // Load notifications
            const notificationsResponse = await fetch('/api/notifications/dashboard', {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });
            
            if (notificationsResponse.ok) {
                const notificationsData = await notificationsResponse.json();
                setNotifications(notificationsData.notifications || []);
            }

        } catch (error) {
            console.error('Failed to load partner data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    if (loading) {
        return (
            <div className="partner-portal-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <PartnerLogin onLogin={login} />;
    }

    return (
        <div className="partner-portal">
            <PartnerHeader 
                user={user} 
                partnerData={partnerData}
                onLogout={logout}
                notifications={notifications}
            />
            
            <div className="partner-main">
                <PartnerSidebar 
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    assignments={assignments}
                />
                
                <div className="partner-content">
                    {loadingData ? (
                        <div className="content-loading">
                            <div className="loading-spinner"></div>
                            <p>Φόρτωση δεδομένων...</p>
                        </div>
                    ) : (
                        <PartnerContent 
                            activeSection={activeSection}
                            user={user}
                            partnerData={partnerData}
                            assignments={assignments}
                            notifications={notifications}
                            onDataChange={loadPartnerData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Partner Login Component
 */
const PartnerLogin = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await onLogin(credentials.email, credentials.password);
        } catch (error) {
            setError(error.message || 'Σφάλμα σύνδεσης');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="partner-login">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <h1>GEP</h1>
                        <p>Πύλη Συνεργατών</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={credentials.email}
                            onChange={(e) => setCredentials(prev => ({
                                ...prev,
                                email: e.target.value
                            }))}
                            placeholder="Εισάγετε το email σας"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Κωδικός Πρόσβασης</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={credentials.password}
                                onChange={(e) => setCredentials(prev => ({
                                    ...prev,
                                    password: e.target.value
                                }))}
                                placeholder="Εισάγετε τον κωδικό σας"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Σύνδεση...' : 'Σύνδεση'}
                    </button>
                </form>

                <div className="login-footer">
                    <a href="#" className="forgot-password">
                        Ξεχάσατε τον κωδικό σας;
                    </a>
                    <div className="support-info">
                        <p>Χρειάζεστε βοήθεια;</p>
                        <p>Επικοινωνήστε: <a href="mailto:support@gep.com">support@gep.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Partner Header Component
 */
const PartnerHeader = ({ user, partnerData, onLogout, notifications }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="partner-header">
            <div className="header-left">
                <div className="logo">
                    <h2>GEP Portal</h2>
                </div>
                <div className="partner-info">
                    <span className="welcome">Καλώς ήρθατε,</span>
                    <span className="partner-name">{partnerData?.name || user?.name}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-actions">
                    <button 
                        className={`notifications-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <span className="notification-icon">🔔</span>
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    <button 
                        className="profile-btn"
                        onClick={() => setShowProfile(!showProfile)}
                    >
                        <span className="profile-icon">👤</span>
                        <span className="profile-name">{user?.name}</span>
                    </button>
                </div>

                {showNotifications && (
                    <NotificationsDropdown 
                        notifications={notifications}
                        onClose={() => setShowNotifications(false)}
                    />
                )}

                {showProfile && (
                    <ProfileDropdown 
                        user={user}
                        partnerData={partnerData}
                        onLogout={onLogout}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </div>
        </header>
    );
};

/**
 * Partner Sidebar Component
 */
const PartnerSidebar = ({ activeSection, onSectionChange, assignments }) => {
    const menuItems = [
        {
            id: 'dashboard',
            label: 'Αρχική',
            icon: '🏠',
            count: null
        },
        {
            id: 'schedule',
            label: 'Πρόγραμμα',
            icon: '📅',
            count: null
        },
        {
            id: 'assignments',
            label: 'Αναθέσεις',
            icon: '📋',
            count: assignments.length
        },
        {
            id: 'visits',
            label: 'Επισκέψεις',
            icon: '🏢',
            count: null
        },
        {
            id: 'reports',
            label: 'Αναφορές',
            icon: '📊',
            count: null
        },
        {
            id: 'profile',
            label: 'Προφίλ',
            icon: '⚙️',
            count: null
        }
    ];

    return (
        <nav className="partner-sidebar">
            <ul className="sidebar-menu">
                {menuItems.map(item => (
                    <li key={item.id}>
                        <button
                            className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => onSectionChange(item.id)}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                            {item.count !== null && (
                                <span className="menu-count">{item.count}</span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

/**
 * Partner Content Component
 */
const PartnerContent = ({ 
    activeSection, 
    user, 
    partnerData, 
    assignments, 
    notifications,
    onDataChange 
}) => {
    switch (activeSection) {
        case 'dashboard':
            return (
                <PartnerDashboard 
                    user={user}
                    partnerData={partnerData}
                    assignments={assignments}
                    notifications={notifications}
                />
            );
        
        case 'schedule':
            return (
                <PartnerSchedule 
                    user={user}
                    partnerData={partnerData}
                />
            );
        
        case 'assignments':
            return (
                <PartnerAssignments 
                    assignments={assignments}
                    onDataChange={onDataChange}
                />
            );
        
        case 'visits':
            return (
                <PartnerVisits 
                    user={user}
                    partnerData={partnerData}
                />
            );
        
        case 'reports':
            return (
                <PartnerReports 
                    user={user}
                    partnerData={partnerData}
                />
            );
        
        case 'profile':
            return (
                <PartnerProfile 
                    user={user}
                    partnerData={partnerData}
                    onDataChange={onDataChange}
                />
            );
        
        default:
            return <div>Άγνωστη σελίδα</div>;
    }
};

/**
 * Partner Dashboard Component
 */
const PartnerDashboard = ({ user, partnerData, assignments, notifications }) => {
    const [stats, setStats] = useState({
        totalAssignments: 0,
        activeContracts: 0,
        upcomingVisits: 0,
        completedVisits: 0
    });

    useEffect(() => {
        // Calculate stats
        setStats({
            totalAssignments: assignments.length,
            activeContracts: assignments.filter(a => a.status === 'active').length,
            upcomingVisits: 5, // Placeholder
            completedVisits: 23 // Placeholder
        });
    }, [assignments]);

    return (
        <div className="partner-dashboard">
            <div className="dashboard-header">
                <h1>Αρχική Σελίδα</h1>
                <p>Επισκόπηση της δραστηριότητάς σας</p>
            </div>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.totalAssignments}</div>
                        <div className="stat-label">Συνολικές Αναθέσεις</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.activeContracts}</div>
                        <div className="stat-label">Ενεργές Συμβάσεις</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.upcomingVisits}</div>
                        <div className="stat-label">Επερχόμενες Επισκέψεις</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-number">{stats.completedVisits}</div>
                        <div className="stat-label">Ολοκληρωμένες Επισκέψεις</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-section">
                    <h2>Πρόσφατες Ειδοποιήσεις</h2>
                    <div className="notifications-list">
                        {notifications.slice(0, 5).map(notification => (
                            <div key={notification.id} className="notification-item">
                                <div className="notification-icon">
                                    {notification.icon || '📢'}
                                </div>
                                <div className="notification-content">
                                    <div className="notification-title">
                                        {notification.title}
                                    </div>
                                    <div className="notification-message">
                                        {notification.message}
                                    </div>
                                    <div className="notification-time">
                                        {new Date(notification.created_at).toLocaleDateString('el-GR')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-section">
                    <h2>Πρόσφατες Αναθέσεις</h2>
                    <div className="assignments-list">
                        {assignments.slice(0, 3).map(assignment => (
                            <div key={assignment.id} className="assignment-item">
                                <div className="assignment-info">
                                    <div className="assignment-title">
                                        {assignment.installation_name}
                                    </div>
                                    <div className="assignment-details">
                                        {assignment.service_type} • {assignment.city}
                                    </div>
                                    <div className="assignment-status">
                                        <span className={`status-badge ${assignment.status}`}>
                                            {assignment.status === 'active' ? 'Ενεργή' : 'Ανενεργή'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Partner Schedule Component
 */
const PartnerSchedule = ({ user, partnerData }) => {
    return (
        <div className="partner-schedule">
            <div className="schedule-header">
                <h1>Πρόγραμμα Επισκέψεων</h1>
                <p>Διαχείριση και προβολή του προγράμματός σας</p>
            </div>

            <ScheduleCalendar
                user={user}
                initialView="week"
                height={600}
                showFilters={false}
                enableEdit={false}
                enableDragDrop={false}
                onEventSelect={(event) => {
                    console.log('Event selected:', event);
                }}
                filterOptions={{
                    partners: [partnerData?.id],
                    hideOtherPartners: true
                }}
                className="partner-calendar"
            />
        </div>
    );
};

/**
 * Partner Assignments Component
 */
const PartnerAssignments = ({ assignments, onDataChange }) => {
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    const handleViewDetails = (assignment) => {
        setSelectedAssignment(assignment);
        setShowDetails(true);
    };

    return (
        <div className="partner-assignments">
            <div className="assignments-header">
                <h1>Αναθέσεις</h1>
                <p>Διαχείριση των αναθέσεών σας</p>
            </div>

            <div className="assignments-list">
                {assignments.map(assignment => (
                    <div key={assignment.id} className="assignment-card">
                        <div className="assignment-header">
                            <h3>{assignment.installation_name}</h3>
                            <span className={`status-badge ${assignment.status}`}>
                                {assignment.status === 'active' ? 'Ενεργή' : 'Ανενεργή'}
                            </span>
                        </div>
                        
                        <div className="assignment-info">
                            <div className="info-item">
                                <span className="label">Τύπος Υπηρεσίας:</span>
                                <span className="value">{assignment.service_type}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Διεύθυνση:</span>
                                <span className="value">{assignment.address}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Περίοδος:</span>
                                <span className="value">
                                    {new Date(assignment.start_date).toLocaleDateString('el-GR')} - 
                                    {new Date(assignment.end_date).toLocaleDateString('el-GR')}
                                </span>
                            </div>
                        </div>

                        <div className="assignment-actions">
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleViewDetails(assignment)}
                            >
                                Προβολή Λεπτομερειών
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showDetails && selectedAssignment && (
                <AssignmentDetailsModal
                    assignment={selectedAssignment}
                    onClose={() => setShowDetails(false)}
                />
            )}
        </div>
    );
};

// Additional placeholder components
const PartnerVisits = ({ user, partnerData }) => (
    <div className="partner-visits">
        <h1>Επισκέψεις</h1>
        <p>Διαχείριση επισκέψεων - Coming soon</p>
    </div>
);

const PartnerReports = ({ user, partnerData }) => (
    <div className="partner-reports">
        <h1>Αναφορές</h1>
        <p>Στατιστικά και αναφορές - Coming soon</p>
    </div>
);

const PartnerProfile = ({ user, partnerData, onDataChange }) => (
    <div className="partner-profile">
        <h1>Προφίλ</h1>
        <p>Διαχείριση προφίλ - Coming soon</p>
    </div>
);

const NotificationsDropdown = ({ notifications, onClose }) => (
    <div className="notifications-dropdown">
        <div className="dropdown-header">
            <h3>Ειδοποιήσεις</h3>
            <button onClick={onClose}>×</button>
        </div>
        <div className="dropdown-content">
            {notifications.slice(0, 5).map(notification => (
                <div key={notification.id} className="notification-item">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                        {new Date(notification.created_at).toLocaleDateString('el-GR')}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ProfileDropdown = ({ user, partnerData, onLogout, onClose }) => (
    <div className="profile-dropdown">
        <div className="dropdown-header">
            <h3>{user?.name}</h3>
            <button onClick={onClose}>×</button>
        </div>
        <div className="dropdown-content">
            <div className="profile-info">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Ρόλος:</strong> Συνεργάτης</p>
            </div>
            <div className="dropdown-actions">
                <button className="btn btn-secondary">Ρυθμίσεις</button>
                <button className="btn btn-danger" onClick={onLogout}>
                    Αποσύνδεση
                </button>
            </div>
        </div>
    </div>
);

const AssignmentDetailsModal = ({ assignment, onClose }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header">
                <h2>Λεπτομέρειες Ανάθεσης</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
                <h3>{assignment.installation_name}</h3>
                <div className="details-grid">
                    <div className="detail-item">
                        <label>Κωδικός Εγκατάστασης:</label>
                        <span>{assignment.installation_code}</span>
                    </div>
                    <div className="detail-item">
                        <label>Τύπος Υπηρεσίας:</label>
                        <span>{assignment.service_type}</span>
                    </div>
                    <div className="detail-item">
                        <label>Διεύθυνση:</label>
                        <span>{assignment.address}</span>
                    </div>
                    <div className="detail-item">
                        <label>Αριθμός Εργαζομένων:</label>
                        <span>{assignment.employees_count}</span>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose}>
                    Κλείσιμο
                </button>
            </div>
        </div>
    </div>
);

export default PartnerPortal;