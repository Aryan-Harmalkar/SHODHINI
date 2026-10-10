import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name');

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log(users.map(u => u.name));
  }
}

listUsers();
