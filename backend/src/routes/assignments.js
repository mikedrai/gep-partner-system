const express = require('express');
const Joi = require('joi');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// GET /api/assignments - Get all assignments
router.get('/', async (req, res, next) => {
  try {
    const { status, partner_id, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('assignments')
      .select(`
        *,
        partners (
          id,
          name,
          specialty,
          city,
          email
        ),
        customer_requests (
          id,
          client_name,
          service_type,
          installation_address
        )
      `);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (partner_id) {
      query = query.eq('partner_id', partner_id);
    }

    // Apply pagination and sorting
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /api/assignments/pending - Get pending assignments
router.get('/pending', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        partners (
          id,
          name,
          specialty,
          email
        ),
        customer_requests (
          id,
          client_name,
          service_type
        )
      `)
      .eq('status', 'proposed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        partners (*),
        customer_requests (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/assignments/:id/response - Update assignment response
router.put('/:id/response', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response, notes } = req.body;

    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response. Must be "accepted" or "declined"' });
    }

    const updateData = {
      partner_response: response,
      partner_responded_at: new Date().toISOString(),
      status: response,
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      throw error;
    }

    logger.info('Assignment response updated', {
      assignmentId: id,
      response,
      partnerId: data.partner_id
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;