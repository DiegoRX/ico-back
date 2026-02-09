async function test() {
    try {
        const response = await fetch('https://vetawallet-1a2e38ac52b1.herokuapp.com/api/orders/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenSymbol: 'AUKA',
                tokenAmount: '1',
                paymentCurrency: 'USDT',
                paymentMethod: 'metamask'
            })
        });
        const data = await response.json();
        console.log('Heroku Quote Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
