const SUPABASE_URL = 'https://khwzgqnwlknawggugznd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

async function testCrud() {
    const userId = '46771a9e-a080-4cb3-85df-dd47dd49842a';

    // 1. Insert Profile
    console.log('1. Inserting profile...');
    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/user_neis_profiles`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            user_id: userId,
            student_name: '조은우',
            school_name: '서운중학교',
            grade: 2
        })
    });
    console.log('Profile insert status:', pRes.status);
    const pData = await pRes.json();
    console.log('Inserted profile:', pData);

    if (!Array.isArray(pData) || pData.length === 0) return;
    const profileId = pData[0].id;

    // 2. Insert Grades
    console.log('2. Inserting grades for profileId:', profileId);
    const gRes = await fetch(`${SUPABASE_URL}/rest/v1/user_student_grades`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify([
            { profile_id: profileId, subject_name: '국어', raw_score: 92, school_avg: 75, std_dev: 12, achievement: 'A' },
            { profile_id: profileId, subject_name: '영어', raw_score: 88, school_avg: 72, std_dev: 14, achievement: 'B' },
            { profile_id: profileId, subject_name: '수학', raw_score: 95, school_avg: 70, std_dev: 15, achievement: 'A' }
        ])
    });
    console.log('Grades insert status:', gRes.status);
    const gData = await gRes.json();
    console.log('Inserted grades count:', gData.length);

    // 3. Select Joined Data
    console.log('3. Selecting joined profile with grades...');
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/user_neis_profiles?id=eq.${profileId}&select=*,user_student_grades(*)`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    console.log('Select status:', sRes.status);
    const sData = await sRes.json();
    console.log('Selected data:', JSON.stringify(sData, null, 2));
}

testCrud().catch(console.error);
