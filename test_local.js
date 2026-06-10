async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/traffic-accidents?bbox=127.0033,37.4851,127.0519,37.5107&width=1075&height=711');
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text.substring(0, 100));
    } catch (e) {
        console.error(e);
    }
}
run();
