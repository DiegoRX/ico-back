async function test() {
    try {
        const response = await fetch('https://api.gold-api.com/v1/gold');
        const data = await response.json();
        console.log('Gold Price Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
