async function test() {
    try {
        const response = await fetch('http://localhost:3001/api/orders/quote', {
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
        console.log('Quote Data:', data);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
