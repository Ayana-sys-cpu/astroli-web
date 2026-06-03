import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ygqhdcacjswddofgcfxf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncWhkY2FjanN3ZGRvZmdjZnhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQyOTE2MywiZXhwIjoyMDk0MDA1MTYzfQ.FbGUOoT3-CkTd4AmdN6im3k1UhnN8vpfbp6CzwbPIYM'
);

async function main() {
  // Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) { console.error(userError); process.exit(1); }

  const user = users.users.find(u => u.email === 'ayana6@gmail.com');
  if (!user) { console.error('User not found'); process.exit(1); }

  console.log('Student ID:', user.id);

  // List all messages for this student grouped by screen_context
  const { data: contexts } = await supabase
    .from('messages')
    .select('screen_context')
    .eq('student_id', user.id);

  const unique = Array.from(new Set((contexts ?? []).map(r => r.screen_context)));
  console.log('Existing screen contexts:', unique);

  // Find Rashi's planet context (prompt user which to clear, or clear all planet_voice ones)
  const planetContexts = unique.filter(c => c?.startsWith('planet_voice:'));
  console.log('Planet voice contexts:', planetContexts);

  if (planetContexts.length === 0) {
    console.log('No planet voice history found — nothing to clear.');
    return;
  }

  // Clear all planet voice history for this student
  const { error: delError, count } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .eq('student_id', user.id)
    .in('screen_context', planetContexts);

  if (delError) { console.error(delError); process.exit(1); }
  console.log(`Deleted ${count} messages. You can now test the new opener flow.`);
}

main();
