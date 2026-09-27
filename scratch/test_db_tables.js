const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

async function check(table) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const text = await res.text();
        console.log(table, res.status, text.slice(0, 120));
    } catch(e) {
        console.log(table, 'ERROR', e.message);
    }
}

async function main() {
    await check('users');
    await check('user_neis_profiles');
    await check('user_student_grades');
    await check('user_school_records');
    await check('child_profiles');
}
main();
