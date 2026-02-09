async function test() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd');
        const data = await response.json();
        console.log('CoinGecko PAXG Price Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
