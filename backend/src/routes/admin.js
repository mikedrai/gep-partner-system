const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const router = express.Router();

// Clear and populate with real Excel data
router.post('/reset-to-excel-data', async (req, res, next) => {
  try {
    logger.info('Starting database reset with real Excel data');

    // Clear existing data
    await supabaseAdmin.from('email_log').delete().neq('id', 0);
    await supabaseAdmin.from('optimization_results').delete().neq('id', 0);
    await supabaseAdmin.from('partner_availability').delete().neq('id', 0);
    await supabaseAdmin.from('assignments').delete().neq('id', 0);
    await supabaseAdmin.from('customer_requests').delete().neq('id', 0);
    await supabaseAdmin.from('installations').delete().neq('installation_code', '');
    await supabaseAdmin.from('clients').delete().neq('company_code', '');
    await supabaseAdmin.from('partners').delete().neq('id', '');

    logger.info('Cleared existing data');

    // Insert real partners from Excel
    const realPartners = [
      {
        id: 'R00050',
        name: 'ΔΑΝΕΖΗΣ ΝΙΚΟΛΑΣ',
        specialty: 'Παθολόγος',
        city: 'ΓΕΡΑΚΑΣ',
        hourly_rate: 75.00,
        email: 'n.danezis@example.com',
        phone: '+302106123456',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00096',
        name: 'ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ',
        specialty: 'Ιατρός',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 80.00,
        email: 'i.gyftakis@example.com',
        phone: '+302106234567',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00125',
        name: 'ΚΩΣΤΑΣ ΚΩΣΤΑΚΗΣ',
        specialty: 'Παιδίατρος',
        city: 'ΚΑΛΛΙΘΕΑ',
        hourly_rate: 85.00,
        email: 'k.kostakis@example.com',
        phone: '+302106345678',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00142',
        name: 'ΜΠΑΛΟΣ ΝΙΚΟΛΑΣ',
        specialty: 'Μηχανικός Δομικών Έργων ΤΕ',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 70.00,
        email: 'n.mpalos@example.com',
        phone: '+302106456789',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00175',
        name: 'ΚΑΚΟΣ ΓΙΩΡΓΟΣ',
        specialty: 'Μηχανολόγος Μηχανικός',
        city: 'ΓΕΡΑΚΑΣ',
        hourly_rate: 72.00,
        email: 'g.kakos@example.com',
        phone: '+302106567890',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00225',
        name: 'ΧΑΡΟΥΛΑ ΧΑΡΑ',
        specialty: 'Παθολόγος',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 78.00,
        email: 'ch.chara@example.com',
        phone: '+302106678901',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00609',
        name: 'ΓΙΑΝΝΗΣ ΓΙΑΝΝΑΚΗΣ',
        specialty: 'Μηχανικός Παραγωγής & Διοίκησης',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 74.00,
        email: 'i.giannakis@example.com',
        phone: '+302106789012',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00670',
        name: 'ΜΑΝΟΣ ΚΑΡΡΑΣ',
        specialty: 'Ηλεκτρολόγος Μηχανικός',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 76.00,
        email: 'm.karras@example.com',
        phone: '+302106890123',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00770',
        name: 'ΒΑΣΙΛΗΣ ΜΕΝΕΛΑΟΥ',
        specialty: 'Παθολόγος',
        city: 'ΚΑΛΛΙΘΕΑ',
        hourly_rate: 82.00,
        email: 'v.menelaou@example.com',
        phone: '+302106901234',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R00929',
        name: 'ΚΩΝΣΤΑΝΤΙΝΟΣ ΝΤΟΥΚΑΣ',
        specialty: 'Ηλεκτρολόγος Μηχανικός',
        city: 'ΓΕΡΑΚΑΣ',
        hourly_rate: 73.00,
        email: 'k.ntoukas@example.com',
        phone: '+302107012345',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R01032',
        name: 'ΛΑΛΟΣ ΕΥΑΓΓΕΛΟΣ',
        specialty: 'Παθολόγος',
        city: 'ΑΘΗΝΑ',
        hourly_rate: 77.00,
        email: 'e.lalos@example.com',
        phone: '+302107123456',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R01080',
        name: 'ΜΕΝΕΛΑΟΣ ΑΡΧΗΓΟΣ',
        specialty: 'Ειδικός Ιατρός Εργασίας',
        city: 'ΚΑΛΛΙΘΕΑ',
        hourly_rate: 90.00,
        email: 'm.archigos@example.com',
        phone: '+302107234567',
        is_active: true,
        max_hours_per_week: 40
      },
      {
        id: 'R01261',
        name: 'ΓΙΑΝΝΗΣ ΠΑΝΤΑΖΗΣ',
        specialty: 'Μηχανολόγος Μηχανικός ΤΕ',
        city: 'ΚΑΛΛΙΘΕΑ',
        hourly_rate: 68.00,
        email: 'i.pantazis@example.com',
        phone: '+302107345678',
        is_active: true,
        max_hours_per_week: 40
      }
    ];

    const { error: partnersError } = await supabaseAdmin
      .from('partners')
      .insert(realPartners);

    if (partnersError) throw partnersError;

    // Insert real client
    const { error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([{
        company_code: 'C000011',
        group_name: 'DEMO HELLAS A.E.E.',
        company_name: 'DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ ΕΜΠΟΡΙΑΣ',
        company_type: 'ΥΠΗΡΕΣΙΕΣ ΣΥΝΤΗΡΗΣΗΣ',
        afm: 54835232,
        account_manager: 'ΜΕΓΚΟΥΛΗΣ ΣΤΑΥΡΟΣ',
        is_active: true
      }]);

    if (clientError) throw clientError;

    // Insert real installations
    const realInstallations = [
      {
        installation_code: 'INST00029',
        company_code: 'C000011',
        description: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 320 - ΠΡΟΗΓΟΥΜΕΝΗ ΔΙΕΥΘΥΝΣΗ test',
        address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350',
        post_code: '17674',
        category: 'C',
        employees_count: 46,
        work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
        is_active: true
      },
      {
        installation_code: 'INST32836',
        company_code: 'C000011',
        description: 'ΣΟΦΟΚΛΕΟΥΣ 11 - (ΕΝΤΟΣ ΤΡΑΠΕΖΑΣ BANK-ΚΟ)',
        address: 'ΣΟΦΟΚΛΕΟΥΣ 11',
        post_code: '10557',
        category: 'C',
        employees_count: 1,
        work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
        is_active: true
      },
      {
        installation_code: 'INST32918',
        company_code: 'C000011',
        description: 'ΓΑΡΓΗΤΟΥ 86 - & ΠΟΡΟΥ (ΕΝΤΟΣ ΤΡΑΠΕΖΑ)',
        address: 'ΓΑΡΓΗΤΟΥ 86',
        post_code: '15344',
        category: 'C',
        employees_count: 1,
        work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
        is_active: true
      },
      {
        installation_code: 'INST58340',
        company_code: 'C000011',
        description: 'Λ. ΣΥΓΓΡΟΥ & ΛΑΓΟΥΜΙΤΖΗ 40 - (ΕΝΤΟΣ ΣΩΚΟΣ Κ.)',
        address: 'Λ. ΣΥΓΓΡΟΥ & ΛΑΓΟΥΜΙΤΖΗ 40',
        post_code: '11745',
        category: 'C',
        employees_count: 1,
        work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΣΚΕΥΗ 09:00-17:00',
        is_active: true
      }
    ];

    const { error: installationsError } = await supabaseAdmin
      .from('installations')
      .insert(realInstallations);

    if (installationsError) throw installationsError;

    // Insert sample customer requests
    const { error: requestsError } = await supabaseAdmin
      .from('customer_requests')
      .insert([
        {
          client_name: 'DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ ΕΜΠΟΡΙΑΣ',
          installation_address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350',
          service_type: 'occupational_doctor',
          employee_count: 46,
          installation_category: 'C',
          work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
          start_date: '2025-08-01',
          end_date: '2025-08-31',
          special_requirements: 'Τακτική επίσκεψη ιατρού εργασίας',
          estimated_hours: 20,
          max_budget: 1800.00,
          status: 'pending'
        },
        {
          client_name: 'DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ ΕΜΠΟΡΙΑΣ',
          installation_address: 'ΣΟΦΟΚΛΕΟΥΣ 11',
          service_type: 'safety_engineer',
          employee_count: 1,
          installation_category: 'C',
          work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
          start_date: '2025-08-15',
          end_date: '2025-09-15',
          special_requirements: 'Εκτίμηση επαγγελματικού κινδύνου',
          estimated_hours: 8,
          max_budget: 600.00,
          status: 'pending'
        },
        {
          client_name: 'DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ ΕΜΠΟΡΙΑΣ',
          installation_address: 'ΓΑΡΓΗΤΟΥ 86',
          service_type: 'occupational_doctor',
          employee_count: 1,
          installation_category: 'C',
          work_hours: 'ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00',
          start_date: '2025-08-20',
          end_date: '2025-09-20',
          special_requirements: 'Προληπτικός έλεγχος υγείας',
          estimated_hours: 4,
          max_budget: 350.00,
          status: 'pending'
        }
      ]);

    if (requestsError) throw requestsError;

    logger.info('Successfully populated database with real Excel data');

    res.json({
      success: true,
      message: 'Database reset with real Excel data completed',
      stats: {
        partners: realPartners.length,
        clients: 1,
        installations: realInstallations.length,
        customerRequests: 3
      }
    });

  } catch (error) {
    logger.error('Database reset failed:', error);
    next(error);
  }
});

module.exports = router;