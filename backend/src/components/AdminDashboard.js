import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import ScheduleCalendar from './ScheduleCalendar';
import './AdminDashboard.css';

/**
 * Admin Dashboard
 * Comprehensive system management and analytics interface
 * Features:
 * - System overview and health monitoring
 * - Advanced analytics and reporting
 * - User and partner management
 * - AI algorithm performance comparison
 * - Audit trail and compliance monitoring
 * - System configuration and settings
 */
const AdminDashboard = () => {
    const { user, isAuthenticated, logout } = useContext(AuthContext);
    const [activeSection, setActiveSection] = useState('overview');
    const [systemData, setSystemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

    // Redirect if not admin
    if (isAuthenticated && user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            loadSystemData();
            
            // Set up auto-refresh
            const interval = setInterval(loadSystemData, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user, refreshInterval]);

    const loadSystemData = async () => {
        try {
            setLoading(true);
            
            // Load comprehensive system data
            const [
                systemHealth,
                analytics,
                aiMetrics,
                auditData,
                userStats,
                complianceData
            ] = await Promise.all([
                fetch('/api/admin/system-health', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                
                fetch('/api/admin/analytics', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                
                fetch('/api/admin/ai-metrics', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                
                fetch('/api/admin/audit-summary', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                
                fetch('/api/admin/user-statistics', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json()),
                
                fetch('/api/admin/compliance-status', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }).then(res => res.json())
            ]);

            setSystemData({
                systemHealth,
                analytics,
                aiMetrics,
                auditData,
                userStats,
                complianceData,
                lastUpdated: new Date().toISOString()
            });

        } catch (error) {
            console.error('Failed to load system data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="admin-dashboard">
            <AdminHeader 
                user={user}
                onLogout={logout}
                systemHealth={systemData?.systemHealth}
                onRefresh={loadSystemData}
                refreshInterval={refreshInterval}
                onRefreshIntervalChange={setRefreshInterval}
            />
            
            <div className="admin-main">
                <AdminSidebar 
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    systemData={systemData}
                />
                
                <div className="admin-content">
                    {loading ? (
                        <div className="content-loading">
                            <div className="loading-spinner"></div>
                            <p>Φόρτωση δεδομένων συστήματος...</p>
                        </div>
                    ) : (
                        <AdminContent 
                            activeSection={activeSection}
                            systemData={systemData}
                            user={user}
                            onDataChange={loadSystemData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Admin Header Component
 */
const AdminHeader = ({ 
    user, 
    onLogout, 
    systemHealth, 
    onRefresh, 
    refreshInterval, 
    onRefreshIntervalChange 
}) => {
    const [showSettings, setShowSettings] = useState(false);

    const getSystemStatusColor = () => {
        if (!systemHealth) return 'gray';
        if (systemHealth.overallStatus === 'healthy') return 'green';
        if (systemHealth.overallStatus === 'warning') return 'orange';
        return 'red';
    };

    return (
        <header className="admin-header">
            <div className="header-left">
                <div className="logo">
                    <h2>GEP Admin</h2>
                </div>
                <div className="system-status">
                    <div className={`status-indicator ${getSystemStatusColor()}`}></div>
                    <span className="status-text">
                        {systemHealth?.overallStatus || 'Unknown'}
                    </span>
                </div>
            </div>

            <div className="header-center">
                <div className="quick-stats">
                    <div className="stat">
                        <span className="label">Ενεργοί Χρήστες:</span>
                        <span className="value">{systemHealth?.activeUsers || 0}</span>
                    </div>
                    <div className="stat">
                        <span className="label">Σύστημα AI:</span>
                        <span className="value">{systemHealth?.aiSystemStatus || 'Unknown'}</span>
                    </div>
                    <div className="stat">
                        <span className="label">Υπηρεσίες:</span>
                        <span className="value">
                            {systemHealth?.servicesUp || 0}/{systemHealth?.totalServices || 0}
                        </span>
                    </div>
                </div>
            </div>

            <div className="header-right">
                <div className="header-actions">
                    <button 
                        className="refresh-btn"
                        onClick={onRefresh}
                        title="Ανανέωση δεδομένων"
                    >
                        🔄
                    </button>
                    
                    <button 
                        className="settings-btn"
                        onClick={() => setShowSettings(!showSettings)}
                        title="Ρυθμίσεις"
                    >
                        ⚙️
                    </button>
                    
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">Διαχειριστής</span>
                    </div>
                    
                    <button 
                        className="logout-btn"
                        onClick={onLogout}
                        title="Αποσύνδεση"
                    >
                        🚪
                    </button>
                </div>

                {showSettings && (
                    <AdminSettingsDropdown 
                        refreshInterval={refreshInterval}
                        onRefreshIntervalChange={onRefreshIntervalChange}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </div>
        </header>
    );
};

/**
 * Admin Sidebar Component
 */
const AdminSidebar = ({ activeSection, onSectionChange, systemData }) => {
    const menuItems = [
        {
            id: 'overview',
            label: 'Επισκόπηση',
            icon: '📊',
            badge: null
        },
        {
            id: 'analytics',
            label: 'Αναλυτικά',
            icon: '📈',
            badge: null
        },
        {
            id: 'ai-performance',
            label: 'Επίδοση AI',
            icon: '🤖',
            badge: systemData?.aiMetrics?.issues || null
        },
        {
            id: 'user-management',
            label: 'Διαχείριση Χρηστών',
            icon: '👥',
            badge: systemData?.userStats?.pendingApprovals || null
        },
        {
            id: 'partner-management',
            label: 'Διαχείριση Συνεργατών',
            icon: '🤝',
            badge: systemData?.userStats?.inactivePartners || null
        },
        {
            id: 'schedule-management',
            label: 'Διαχείριση Προγραμμάτων',
            icon: '📅',
            badge: systemData?.analytics?.conflictsCount || null
        },
        {
            id: 'audit-trail',
            label: 'Ίχνη Ελέγχου',
            icon: '📋',
            badge: systemData?.auditData?.criticalEvents || null
        },
        {
            id: 'compliance',
            label: 'Συμμόρφωση',
            icon: '✅',
            badge: systemData?.complianceData?.issues || null
        },
        {
            id: 'system-health',
            label: 'Υγεία Συστήματος',
            icon: '⚡',
            badge: systemData?.systemHealth?.warnings || null
        },
        {
            id: 'reports',
            label: 'Αναφορές',
            icon: '📄',
            badge: null
        },
        {
            id: 'settings',
            label: 'Ρυθμίσεις',
            icon: '⚙️',
            badge: null
        }
    ];

    return (
        <nav className="admin-sidebar">
            <ul className="sidebar-menu">
                {menuItems.map(item => (
                    <li key={item.id}>
                        <button
                            className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => onSectionChange(item.id)}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                            {item.badge && (
                                <span className="menu-badge">{item.badge}</span>
                            )}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

/**
 * Admin Content Component
 */
const AdminContent = ({ activeSection, systemData, user, onDataChange }) => {
    switch (activeSection) {
        case 'overview':
            return (
                <SystemOverview 
                    systemData={systemData}
                    onDataChange={onDataChange}
                />
            );
        
        case 'analytics':
            return (
                <SystemAnalytics 
                    analytics={systemData?.analytics}
                    onDataChange={onDataChange}
                />
            );
        
        case 'ai-performance':
            return (
                <AIPerformanceDashboard 
                    aiMetrics={systemData?.aiMetrics}
                    onDataChange={onDataChange}
                />
            );
        
        case 'user-management':
            return (
                <UserManagement 
                    userStats={systemData?.userStats}
                    onDataChange={onDataChange}
                />
            );
        
        case 'partner-management':
            return (
                <PartnerManagement 
                    systemData={systemData}
                    onDataChange={onDataChange}
                />
            );
        
        case 'schedule-management':
            return (
                <ScheduleManagement 
                    user={user}
                    analytics={systemData?.analytics}
                    onDataChange={onDataChange}
                />
            );
        
        case 'audit-trail':
            return (
                <AuditTrailView 
                    auditData={systemData?.auditData}
                    onDataChange={onDataChange}
                />
            );
        
        case 'compliance':
            return (
                <ComplianceMonitoring 
                    complianceData={systemData?.complianceData}
                    onDataChange={onDataChange}
                />
            );
        
        case 'system-health':
            return (
                <SystemHealthMonitoring 
                    systemHealth={systemData?.systemHealth}
                    onDataChange={onDataChange}
                />
            );
        
        case 'reports':
            return (
                <ReportsManagement 
                    systemData={systemData}
                    onDataChange={onDataChange}
                />
            );
        
        case 'settings':
            return (
                <SystemSettings 
                    user={user}
                    onDataChange={onDataChange}
                />
            );
        
        default:
            return <div>Άγνωστη σελίδα</div>;
    }
};

/**
 * System Overview Component
 */
const SystemOverview = ({ systemData, onDataChange }) => {
    const [timeRange, setTimeRange] = useState('24h');

    return (
        <div className="system-overview">
            <div className="overview-header">
                <h1>Επισκόπηση Συστήματος</h1>
                <div className="time-range-selector">
                    <label>Χρονικό Διάστημα:</label>
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(e.target.value)}
                    >
                        <option value="1h">1 Ώρα</option>
                        <option value="24h">24 Ώρες</option>
                        <option value="7d">7 Ημέρες</option>
                        <option value="30d">30 Ημέρες</option>
                    </select>
                </div>
            </div>

            <div className="overview-grid">
                <div className="metric-cards">
                    <MetricCard
                        title="Συνολικοί Χρήστες"
                        value={systemData?.userStats?.totalUsers || 0}
                        change={systemData?.userStats?.userGrowth || 0}
                        icon="👥"
                        color="blue"
                    />
                    <MetricCard
                        title="Ενεργοί Συνεργάτες"
                        value={systemData?.userStats?.activePartners || 0}
                        change={systemData?.userStats?.partnerGrowth || 0}
                        icon="🤝"
                        color="green"
                    />
                    <MetricCard
                        title="Επισκέψεις Σήμερα"
                        value={systemData?.analytics?.todayVisits || 0}
                        change={systemData?.analytics?.visitsChange || 0}
                        icon="🏢"
                        color="orange"
                    />
                    <MetricCard
                        title="Επίδοση AI"
                        value={`${systemData?.aiMetrics?.averageAccuracy || 0}%`}
                        change={systemData?.aiMetrics?.accuracyTrend || 0}
                        icon="🤖"
                        color="purple"
                    />
                </div>

                <div className="charts-section">
                    <div className="chart-container">
                        <h3>Δραστηριότητα Συστήματος</h3>
                        <SystemActivityChart data={systemData?.analytics?.activityData} />
                    </div>
                    
                    <div className="chart-container">
                        <h3>Επίδοση Αλγορίθμων AI</h3>
                        <AIPerformanceChart data={systemData?.aiMetrics?.algorithmPerformance} />
                    </div>
                </div>

                <div className="alerts-section">
                    <h3>Ειδοποιήσεις Συστήματος</h3>
                    <SystemAlerts alerts={systemData?.systemHealth?.alerts || []} />
                </div>
            </div>
        </div>
    );
};

/**
 * AI Performance Dashboard Component
 */
const AIPerformanceDashboard = ({ aiMetrics, onDataChange }) => {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState('all');
    const [comparisonView, setComparisonView] = useState('accuracy');

    return (
        <div className="ai-performance-dashboard">
            <div className="dashboard-header">
                <h1>Επίδοση Αλγορίθμων AI</h1>
                <div className="controls">
                    <select 
                        value={selectedAlgorithm} 
                        onChange={(e) => setSelectedAlgorithm(e.target.value)}
                    >
                        <option value="all">Όλοι οι Αλγόριθμοι</option>
                        <option value="linear">Γραμμικός Προγραμματισμός</option>
                        <option value="genetic">Γενετικός Αλγόριθμος</option>
                        <option value="ml">Μηχανική Μάθηση</option>
                        <option value="rules">Κανόνες</option>
                        <option value="anthropic">Anthropic AI</option>
                    </select>
                    
                    <select 
                        value={comparisonView} 
                        onChange={(e) => setComparisonView(e.target.value)}
                    >
                        <option value="accuracy">Ακρίβεια</option>
                        <option value="speed">Ταχύτητα</option>
                        <option value="efficiency">Αποδοτικότητα</option>
                        <option value="cost">Κόστος</option>
                    </select>
                </div>
            </div>

            <div className="ai-metrics-grid">
                <div className="algorithm-comparison">
                    <h3>Σύγκριση Αλγορίθμων</h3>
                    <AlgorithmComparisonChart 
                        data={aiMetrics?.algorithmComparison}
                        metric={comparisonView}
                        selected={selectedAlgorithm}
                    />
                </div>

                <div className="performance-trends">
                    <h3>Τάσεις Επίδοσης</h3>
                    <PerformanceTrendsChart 
                        data={aiMetrics?.performanceTrends}
                        algorithm={selectedAlgorithm}
                    />
                </div>

                <div className="optimization-results">
                    <h3>Αποτελέσματα Βελτιστοποίησης</h3>
                    <OptimizationResultsTable 
                        data={aiMetrics?.optimizationResults}
                        algorithm={selectedAlgorithm}
                    />
                </div>

                <div className="ai-insights">
                    <h3>Insights AI</h3>
                    <AIInsightsList insights={aiMetrics?.insights || []} />
                </div>
            </div>
        </div>
    );
};

/**
 * User Management Component
 */
const UserManagement = ({ userStats, onDataChange }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [userFilters, setUserFilters] = useState({
        role: 'all',
        status: 'all',
        search: ''
    });

    return (
        <div className="user-management">
            <div className="management-header">
                <h1>Διαχείριση Χρηστών</h1>
                <button className="btn btn-primary" onClick={() => setActiveTab('create')}>
                    Νέος Χρήστης
                </button>
            </div>

            <div className="management-tabs">
                <button 
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Επισκόπηση
                </button>
                <button 
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Χρήστες
                </button>
                <button 
                    className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('permissions')}
                >
                    Δικαιώματα
                </button>
                <button 
                    className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Δραστηριότητα
                </button>
            </div>

            <div className="management-content">
                {activeTab === 'overview' && (
                    <UserOverview userStats={userStats} />
                )}
                {activeTab === 'users' && (
                    <UsersList 
                        filters={userFilters}
                        onFiltersChange={setUserFilters}
                        onDataChange={onDataChange}
                    />
                )}
                {activeTab === 'permissions' && (
                    <PermissionsManagement onDataChange={onDataChange} />
                )}
                {activeTab === 'activity' && (
                    <UserActivityMonitoring userStats={userStats} />
                )}
            </div>
        </div>
    );
};

/**
 * Schedule Management Component
 */
const ScheduleManagement = ({ user, analytics, onDataChange }) => {
    const [viewMode, setViewMode] = useState('calendar');

    return (
        <div className="schedule-management">
            <div className="management-header">
                <h1>Διαχείριση Προγραμμάτων</h1>
                <div className="view-controls">
                    <button 
                        className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('calendar')}
                    >
                        Προβολή Ημερολογίου
                    </button>
                    <button 
                        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('list')}
                    >
                        Προβολή Λίστας
                    </button>
                    <button 
                        className={`btn ${viewMode === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('analytics')}
                    >
                        Αναλυτικά
                    </button>
                </div>
            </div>

            <div className="schedule-content">
                {viewMode === 'calendar' && (
                    <div className="calendar-view">
                        <ScheduleCalendar
                            user={user}
                            initialView="month"
                            height={700}
                            showFilters={true}
                            enableEdit={true}
                            enableDragDrop={true}
                            adminMode={true}
                            onEventSelect={(event) => console.log('Event selected:', event)}
                            className="admin-calendar"
                        />
                    </div>
                )}
                
                {viewMode === 'list' && (
                    <SchedulesList 
                        analytics={analytics}
                        onDataChange={onDataChange}
                    />
                )}
                
                {viewMode === 'analytics' && (
                    <ScheduleAnalytics 
                        analytics={analytics}
                        onDataChange={onDataChange}
                    />
                )}
            </div>
        </div>
    );
};

// Placeholder components that would be fully implemented
const MetricCard = ({ title, value, change, icon, color }) => (
    <div className={`metric-card ${color}`}>
        <div className="metric-icon">{icon}</div>
        <div className="metric-content">
            <div className="metric-value">{value}</div>
            <div className="metric-title">{title}</div>
            {change !== 0 && (
                <div className={`metric-change ${change > 0 ? 'positive' : 'negative'}`}>
                    {change > 0 ? '+' : ''}{change}%
                </div>
            )}
        </div>
    </div>
);

const SystemActivityChart = ({ data }) => (
    <div className="chart-placeholder">
        <p>Γράφημα δραστηριότητας συστήματος</p>
        <div className="chart-data">
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        </div>
    </div>
);

const AIPerformanceChart = ({ data }) => (
    <div className="chart-placeholder">
        <p>Γράφημα επίδοσης AI</p>
        <div className="chart-data">
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        </div>
    </div>
);

const SystemAlerts = ({ alerts }) => (
    <div className="alerts-list">
        {alerts.length === 0 ? (
            <p>Δεν υπάρχουν ειδοποιήσεις</p>
        ) : (
            alerts.map((alert, index) => (
                <div key={index} className={`alert alert-${alert.severity}`}>
                    <div className="alert-icon">
                        {alert.severity === 'critical' ? '🚨' : 
                         alert.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div className="alert-content">
                        <div className="alert-title">{alert.title}</div>
                        <div className="alert-message">{alert.message}</div>
                        <div className="alert-time">{alert.timestamp}</div>
                    </div>
                </div>
            ))
        )}
    </div>
);

const AlgorithmComparisonChart = ({ data, metric, selected }) => (
    <div className="algorithm-chart-placeholder">
        <p>Σύγκριση αλγορίθμων - {metric}</p>
        <p>Επιλεγμένος: {selected}</p>
    </div>
);

const PerformanceTrendsChart = ({ data, algorithm }) => (
    <div className="trends-chart-placeholder">
        <p>Τάσεις επίδοσης - {algorithm}</p>
    </div>
);

const OptimizationResultsTable = ({ data, algorithm }) => (
    <div className="results-table-placeholder">
        <p>Πίνακας αποτελεσμάτων - {algorithm}</p>
    </div>
);

const AIInsightsList = ({ insights }) => (
    <div className="insights-list">
        {insights.map((insight, index) => (
            <div key={index} className="insight-item">
                <div className="insight-title">{insight.title}</div>
                <div className="insight-description">{insight.description}</div>
                <div className="insight-confidence">
                    Βεβαιότητα: {(insight.confidence * 100).toFixed(1)}%
                </div>
            </div>
        ))}
    </div>
);

const AdminSettingsDropdown = ({ refreshInterval, onRefreshIntervalChange, onClose }) => (
    <div className="settings-dropdown">
        <div className="dropdown-header">
            <h3>Ρυθμίσεις</h3>
            <button onClick={onClose}>×</button>
        </div>
        <div className="dropdown-content">
            <div className="setting-item">
                <label>Συχνότητα Ανανέωσης:</label>
                <select 
                    value={refreshInterval} 
                    onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
                >
                    <option value={10000}>10 δευτερόλεπτα</option>
                    <option value={30000}>30 δευτερόλεπτα</option>
                    <option value={60000}>1 λεπτό</option>
                    <option value={300000}>5 λεπτά</option>
                </select>
            </div>
        </div>
    </div>
);

// Additional placeholder components for remaining sections
const SystemAnalytics = ({ analytics }) => <div>System Analytics Component</div>;
const PartnerManagement = ({ systemData }) => <div>Partner Management Component</div>;
const AuditTrailView = ({ auditData }) => <div>Audit Trail Component</div>;
const ComplianceMonitoring = ({ complianceData }) => <div>Compliance Monitoring Component</div>;
const SystemHealthMonitoring = ({ systemHealth }) => <div>System Health Component</div>;
const ReportsManagement = ({ systemData }) => <div>Reports Management Component</div>;
const SystemSettings = ({ user }) => <div>System Settings Component</div>;
const UserOverview = ({ userStats }) => <div>User Overview Component</div>;
const UsersList = ({ filters, onFiltersChange }) => <div>Users List Component</div>;
const PermissionsManagement = () => <div>Permissions Management Component</div>;
const UserActivityMonitoring = ({ userStats }) => <div>User Activity Component</div>;
const SchedulesList = ({ analytics }) => <div>Schedules List Component</div>;
const ScheduleAnalytics = ({ analytics }) => <div>Schedule Analytics Component</div>;

export default AdminDashboard;