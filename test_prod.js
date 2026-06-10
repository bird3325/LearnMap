async function run() {
    try {
        const res = await fetch('https://leamap.vercel.app/api/traffic-accidents?bbox=127.0033%2C37.4851%2C127.0519%2C37.5107&width=1075&height=711');
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Headers:', res.headers);
        console.log('Body:', text.substring(0, 500));
    } catch (e) {
        console.error(e);
    }
}
run();
