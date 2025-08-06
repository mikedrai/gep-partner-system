import { supabase } from '../config/supabase.ts';

// Partner API
export const partnersApi = {
  async getAll() {
    console.log('🔍 Fetching partners from Supabase...');
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('name');
    
    console.log('📊 Partners API response:', { data, error });
    if (error) {
      console.error('❌ Partners API error:', error);
      throw error;
    }
    console.log('✅ Partners fetched successfully:', data?.length, 'records');
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(partner: any) {
    const { data, error } = await supabase
      .from('partners')
      .insert(partner)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Customer Requests API
export const requestsApi = {
  async getAll() {
    console.log('🔍 Fetching customer requests from Supabase...');
    const { data, error } = await supabase
      .from('customer_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('📊 Customer Requests API response:', { data, error });
    if (error) {
      console.error('❌ Customer Requests API error:', error);
      throw error;
    }
    console.log('✅ Customer Requests fetched successfully:', data?.length, 'records');
    return data;
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('customer_requests')
      .select(`
        *,
        partners(name, specialty),
        assignments(
          id,
          partner_id,
          status,
          assigned_hours,
          total_cost,
          partners(name, specialty)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(request: any) {
    const { data, error } = await supabase
      .from('customer_requests')
      .insert(request)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: any) {
    const { data, error } = await supabase
      .from('customer_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('customer_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Assignments API
export const assignmentsApi = {
  async getAll() {
    console.log('🔍 Fetching assignments from Supabase...');
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('📊 Assignments API response:', { data, error });
    if (error) {
      console.error('❌ Assignments API error:', error);
      throw error;
    }
    console.log('✅ Assignments fetched successfully:', data?.length, 'records');
    return data;
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        customer_requests(
          id,
          client_name,
          installation_address,
          service_type,
          start_date,
          end_date
        ),
        partners(
          id,
          name,
          specialty,
          city,
          hourly_rate
        ),
        installations(
          installation_code,
          description,
          address,
          clients(company_name)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(assignment: any) {
    const { data, error } = await supabase
      .from('assignments')
      .insert(assignment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: any) {
    const { data, error } = await supabase
      .from('assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByPartnerId(partnerId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        customer_requests(
          id,
          client_name,
          installation_address,
          service_type,
          start_date,
          end_date
        ),
        partners(
          id,
          name,
          specialty,
          city,
          hourly_rate
        )
      `)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Clients API
export const clientsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('company_name');
    
    if (error) throw error;
    return data;
  }
};

// Installations API
export const installationsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('installations')
      .select('*')
      .order('description');
    
    if (error) throw error;
    return data;
  }
};

// Schedules API (for calendar view) - simplified without complex joins
export const schedulesApi = {
  async getAll() {
    // Return empty array since we don't have actual schedule tables
    return [];
  },

  async getByDateRange(startDate: string, endDate: string) {
    // Return empty array since we don't have actual schedule tables
    return [];
  },

  async getByPartnerId(partnerId: string) {
    // Return empty array since we don't have actual schedule tables
    return [];
  }
};

// Contracts API
export const contractsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};