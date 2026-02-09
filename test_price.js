async function test() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        const data = await response.json();
        console.log('Price:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
