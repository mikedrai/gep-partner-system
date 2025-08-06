const express = require('express');
const Joi = require('joi');
const { supabase } = require('../config/supabase');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const createPartnerSchema = Joi.object({
  id: Joi.string().pattern(/^R\d{5}$/).required(),
  name: Joi.string().required().min(2).max(100),
  specialty: Joi.string().required().min(2).max(50),
  city: Joi.string().required().min(2).max(50),
  hourly_rate: Joi.number().min(10).max(500).required(),
  max_hours_per_week: Joi.number().integer().min(1).max(60).default(40),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20),
  is_active: Joi.boolean().default(true)
});

const updatePartnerSchema = createPartnerSchema.fork(['id'], (schema) => schema.optional());

// GET /api/partners - Get all partners
router.get('/', async (req, res, next) => {
  try {
    const { is_active, specialty, city, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('partners')
      .select('*');

    // Apply filters
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }
    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }
    if (city) {
      query = query.eq('city', city);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('name');

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /api/partners/:id - Get specific partner
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('partners')
      .select(`
        *,
        partner_availability (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Partner not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// POST /api/partners - Create new partner
router.post('/', validateRequest(createPartnerSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    logger.info('New partner created', { partnerId: data.id });
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/partners/:id - Update partner
router.put('/:id', validateRequest(updatePartnerSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('partners')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Partner not found' });
      }
      throw error;
    }

    logger.info('Partner updated', { partnerId: data.id });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/partners/:id - Delete partner
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info('Partner deleted', { partnerId: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;