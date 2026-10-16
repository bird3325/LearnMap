const fs = require('fs');

async function testHub() {
    const SUPABASE_URL = 'https://khwzgqnwllknawgguznd.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3pncW53bGtuYXdnZ3Vnem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDQzNDksImV4cCI6MjA5NTc4MDM0OX0.P2g3Y_MYV_ca8ZRpfAT93pnEzP4osYWc2tfyBHKb7v4';

    const response = await fetch(`${SUPABASE_URL}/rest/v1/api_configs?id=eq.1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    const data = await response.json();
    const serviceKey = data[0].data_go_kr_key;
    console.log('serviceKey present:', !!serviceKey);

    // 서울시 노원구 상계동 테스트: sigunguCd: 11350, bjdongCd: 10500
    // 고양시 덕양구 행신동: sigunguCd: 41281, bjdongCd: 12800
    const testCases = [
        { name: '행신동 표제부', url: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=5&pageNo=1` },
        { name: '행신동 전유부', url: `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposInfo?serviceKey=${encodeURIComponent(serviceKey)}&sigunguCd=41281&bjdongCd=12800&numOfRows=10&pageNo=1` }
    ];

    for (const tc of testCases) {
        console.log(`\n--- ${tc.name} ---`);
        try {
            const res = await fetch(tc.url);
            const text = await res.text();
            console.log('Status:', res.status);
            console.log('Response sample (first 1000 chars):', text.substring(0, 1000));
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

testHub();
