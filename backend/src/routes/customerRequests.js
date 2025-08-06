const express = require('express');
const Joi = require('joi');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const createRequestSchema = Joi.object({
  client_name: Joi.string().required().min(2).max(200),
  installation_address: Joi.string().required().min(5).max(200),
  service_type: Joi.string().valid('occupational_doctor', 'safety_engineer').required(),
  employee_count: Joi.number().integer().min(1).max(10000),
  installation_category: Joi.string().length(1).pattern(/[A-C]/),
  work_hours: Joi.string().max(100),
  start_date: Joi.date().iso().min('now'),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')),
  special_requirements: Joi.string().max(1000),
  estimated_hours: Joi.number().min(1).max(1000),
  max_budget: Joi.number().min(0).max(100000),
  preferred_partner_id: Joi.string().length(6).pattern(/^R\d{5}$/).allow(null)
});

const updateRequestSchema = createRequestSchema.fork(
  ['client_name', 'installation_address', 'service_type'], 
  (schema) => schema.optional()
);

// GET /api/customer-requests - Get all customer requests with filtering
router.get('/', async (req, res, next) => {
  try {
    const { status, service_type, page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;

    let query = supabase
      .from('customer_requests')
      .select(`
        *,
        assignments (
          id,
          partner_id,
          status,
          partners (
            id,
            name,
            specialty
          )
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (service_type) {
      query = query.eq('service_type', service_type);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('customer_requests')
      .select('*', { count: 'exact', head: true });

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/customer-requests/:id - Get specific customer request
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('customer_requests')
      .select(`
        *,
        assignments (
          *,
          partners (
            id,
            name,
            specialty,
            city,
            hourly_rate,
            email
          ),
          optimization_results (
            *
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer request not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/customer-requests - Create new customer request
router.post('/', validateRequest(createRequestSchema), async (req, res, next) => {
  try {
    const requestData = req.body;
    requestData.status = 'pending';

    const { data, error } = await supabase
      .from('customer_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) throw error;

    logger.info('New customer request created', {
      requestId: data.id,
      clientName: data.client_name,
      serviceType: data.service_type
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/customer-requests/:id - Update customer request
router.put('/:id', validateRequest(updateRequestSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('customer_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer request not found' });
      }
      throw error;
    }

    logger.info('Customer request updated', {
      requestId: data.id,
      updatedFields: Object.keys(req.body)
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customer-requests/:id - Delete customer request
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('customer_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info('Customer request deleted', { requestId: id });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/customer-requests/:id/assign - Trigger optimization and assignment
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force_reassign = false } = req.body;

    // Check if request exists and is pending
    const { data: request, error: requestError } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer request not found' });
      }
      throw requestError;
    }

    if (request.status !== 'pending' && !force_reassign) {
      return res.status(400).json({ 
        error: 'Request has already been processed. Use force_reassign=true to reassign.' 
      });
    }

    // Trigger optimization (this would call the optimization service)
    const optimizationResponse = await fetch(`${req.protocol}://${req.get('host')}/api/optimization/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: parseInt(id),
        forceReassign: force_reassign
      })
    });

    const optimizationResult = await optimizationResponse.json();

    if (!optimizationResponse.ok) {
      return res.status(400).json(optimizationResult);
    }

    logger.info('Assignment triggered for customer request', {
      requestId: id,
      optimizationId: optimizationResult.optimizationId
    });

    res.json({
      message: 'Assignment process initiated',
      optimizationResult
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;