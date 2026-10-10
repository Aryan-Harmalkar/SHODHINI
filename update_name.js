import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateName() {
  console.log('Searching for "shreyash naik"...');
  
  const { data: users, error: searchError } = await supabase
    .from('profiles')
    .select('id, name')
    .ilike('name', '%shreyash naik%');

  if (searchError) {
    console.error('Error searching:', searchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('User "shreyash naik" not found.');
    return;
  }

  for (const user of users) {
    console.log(`Found user: ${user.name} (ID: ${user.id}). Updating...`);
    const newName = user.name.replace(/naik/i, 'khanam');
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name: newName })
      .eq('id', user.id);
      
    if (updateError) {
      console.error(`Failed to update ${user.id}:`, updateError);
    } else {
      console.log(`Successfully updated ${user.name} to ${newName}`);
    }
  }
}

updateName();
