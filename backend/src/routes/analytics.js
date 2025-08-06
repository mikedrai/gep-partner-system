const express = require('express');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/analytics/dashboard - Get dashboard statistics
router.get('/dashboard', async (req, res, next) => {
  try {
    // Get total requests count
    const { count: totalRequests } = await supabase
      .from('customer_requests')
      .select('*', { count: 'exact', head: true });

    // Get active partners count
    const { count: activePartners } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get pending assignments count
    const { count: pendingAssignments } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'proposed');

    // Get completed assignments this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: completedThisMonth } = await supabase
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', startOfMonth.toISOString());

    // Get request status distribution
    const { data: statusDistribution } = await supabase
      .from('customer_requests')
      .select('status')
      .order('status');

    // Calculate status counts
    const statusCounts = statusDistribution.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const dashboardData = {
      totalRequests: totalRequests || 0,
      activePartners: activePartners || 0,
      pendingAssignments: pendingAssignments || 0,
      completedThisMonth: completedThisMonth || 0,
      statusDistribution: statusCounts,
      lastUpdated: new Date().toISOString()
    };

    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/utilization - Get partner utilization data
router.get('/utilization', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('assignments')
      .select(`
        partner_id,
        assigned_hours,
        status,
        partners (
          name,
          max_hours_per_week
        )
      `);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate utilization by partner
    const utilizationData = data.reduce((acc, assignment) => {
      const partnerId = assignment.partner_id;
      if (!acc[partnerId]) {
        acc[partnerId] = {
          partner_id: partnerId,
          partner_name: assignment.partners.name,
          max_hours_per_week: assignment.partners.max_hours_per_week,
          total_assigned_hours: 0,
          completed_assignments: 0,
          pending_assignments: 0
        };
      }
      
      acc[partnerId].total_assigned_hours += assignment.assigned_hours || 0;
      
      if (assignment.status === 'completed') {
        acc[partnerId].completed_assignments++;
      } else if (assignment.status === 'proposed') {
        acc[partnerId].pending_assignments++;
      }
      
      return acc;
    }, {});

    res.json(Object.values(utilizationData));
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/costs - Get cost analysis data
router.get('/costs', async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('assignments')
      .select(`
        assigned_hours,
        hourly_rate,
        total_cost,
        status,
        service_type,
        created_at
      `);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate cost statistics
    const totalCost = data.reduce((sum, assignment) => sum + (assignment.total_cost || 0), 0);
    const averageHourlyRate = data.length > 0 
      ? data.reduce((sum, assignment) => sum + (assignment.hourly_rate || 0), 0) / data.length
      : 0;

    // Group by service type
    const costsByServiceType = data.reduce((acc, assignment) => {
      const serviceType = assignment.service_type;
      if (!acc[serviceType]) {
        acc[serviceType] = { total_cost: 0, assignment_count: 0, total_hours: 0 };
      }
      acc[serviceType].total_cost += assignment.total_cost || 0;
      acc[serviceType].assignment_count++;
      acc[serviceType].total_hours += assignment.assigned_hours || 0;
      return acc;
    }, {});

    res.json({
      totalCost,
      averageHourlyRate,
      totalAssignments: data.length,
      costsByServiceType,
      currency: 'EUR'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/performance - Get performance metrics
router.get('/performance', async (req, res, next) => {
  try {
    // Get optimization performance data
    const { data: optimizationData } = await supabase
      .from('optimization_results')
      .select('execution_time_ms, total_partners_evaluated, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate performance metrics
    const avgExecutionTime = optimizationData.length > 0
      ? optimizationData.reduce((sum, result) => sum + (result.execution_time_ms || 0), 0) / optimizationData.length
      : 0;

    const avgPartnersEvaluated = optimizationData.length > 0
      ? optimizationData.reduce((sum, result) => sum + (result.total_partners_evaluated || 0), 0) / optimizationData.length
      : 0;

    // Get response time data for assignments
    const { data: assignmentData } = await supabase
      .from('assignments')
      .select('created_at, partner_responded_at, response_deadline, status')
      .not('partner_responded_at', 'is', null);

    // Calculate response time statistics
    const responseTimeData = assignmentData.map(assignment => {
      const created = new Date(assignment.created_at);
      const responded = new Date(assignment.partner_responded_at);
      const responseTimeHours = (responded - created) / (1000 * 60 * 60);
      
      return {
        response_time_hours: responseTimeHours,
        within_deadline: responded <= new Date(assignment.response_deadline),
        status: assignment.status
      };
    });

    const avgResponseTime = responseTimeData.length > 0
      ? responseTimeData.reduce((sum, item) => sum + item.response_time_hours, 0) / responseTimeData.length
      : 0;

    const onTimeResponseRate = responseTimeData.length > 0
      ? (responseTimeData.filter(item => item.within_deadline).length / responseTimeData.length) * 100
      : 0;

    res.json({
      optimization: {
        avgExecutionTime,
        avgPartnersEvaluated,
        totalOptimizations: optimizationData.length
      },
      assignments: {
        avgResponseTimeHours: avgResponseTime,
        onTimeResponseRate,
        totalResponses: responseTimeData.length
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;