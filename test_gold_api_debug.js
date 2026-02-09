async function test() {
    try {
        const response = await fetch('https://api.gold-api.com/v1/latest'); // Re-trying endpoint
        const text = await response.text();
        console.log('Raw Response:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
