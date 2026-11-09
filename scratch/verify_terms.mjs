async function testPage() {
    const res = await fetch('http://localhost:5000/');
    const html = await res.text();
    console.log('Terms link in /:', html.includes('이용약관') && html.includes('openTermsModal'));
    console.log('Privacy link in /:', html.includes('개인정보처리방침'));
    console.log('Terms modal in /:', html.includes('id="termsModal"'));
}
testPage();
