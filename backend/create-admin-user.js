const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const adminEmail = 'admin@gep.gr';
  const adminPassword = 'GepAdmin2024!';

  try {
    console.log('Creating admin user...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Skip email confirmation
      app_metadata: {
        role: 'admin'
      },
      user_metadata: {
        name: 'GEP Administrator',
        role: 'admin'
      }
    });

    if (error) {
      console.error('Error creating admin user:', error.message);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 User ID:', data.user.id);
    console.log('\n🚀 You can now login to the frontend with these credentials.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Also create manager and partner test users
async function createTestUsers() {
  const users = [
    {
      email: 'manager@gep.gr',
      password: 'GepManager2024!',
      role: 'manager',
      name: 'GEP Manager'
    },
    {
      email: 'partner@gep.gr', 
      password: 'GepPartner2024!',
      role: 'partner',
      name: 'GEP Partner'
    }
  ];

  for (const user of users) {
    try {
      console.log(`\nCreating ${user.role} user...`);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        app_metadata: {
          role: user.role
        },
        user_metadata: {
          name: user.name,
          role: user.role
        }
      });

      if (error) {
        console.error(`Error creating ${user.role} user:`, error.message);
        continue;
      }

      console.log(`✅ ${user.role} user created successfully!`);
      console.log('📧 Email:', user.email);
      console.log('🔑 Password:', user.password);
      
    } catch (error) {
      console.error(`Unexpected error creating ${user.role} user:`, error);
    }
  }
}

async function main() {
  await createAdminUser();
  await createTestUsers();
  
  console.log('\n🎉 All users created! You can now login with:');
  console.log('👑 Admin: admin@gep.gr / GepAdmin2024!');
  console.log('👔 Manager: manager@gep.gr / GepManager2024!');
  console.log('🤝 Partner: partner@gep.gr / GepPartner2024!');
}

main().catch(console.error);