const fetch = require('node-fetch');

async function testQuote() {
    try {
        const response = await fetch('http://localhost:5000/api/orders/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenSymbol: 'AUKA',
                tokenAmount: '1',
                paymentCurrency: 'USDT'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('--- AUKA QUOTE ---');
            console.log(JSON.stringify(data, null, 2));

            if (data.goldPrice && data.exchangeRate) {
                console.log('✅ Gold Price metadata present');
                console.log(`✅ Exchange Rate: ${data.exchangeRate}`);
                console.log(`✅ Gold Ounce Price: ${data.goldPrice.ounce}`);
            } else {
                console.error('❌ Missing gold metadata');
            }
        } else {
            console.error('❌ Request failed:', response.status, await response.text());
        }

        // Test ORIGEN
        const responseOrigen = await fetch('http://localhost:5000/api/orders/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenSymbol: 'ORIGEN',
                tokenAmount: '1',
                paymentCurrency: 'USDT'
            })
        });

        if (responseOrigen.ok) {
            const data = await responseOrigen.json();
            console.log('\n--- ORIGEN QUOTE ---');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error executing verification script:', error.message);
        console.log('Ensure the backend server is running on port 5000');
    }
}

testQuote();
