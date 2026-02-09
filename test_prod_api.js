const https = require('https');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        }, (res) => {
            let resData = '';
            res.on('data', (chunk) => resData += chunk);
            res.on('end', () => resolve(JSON.parse(resData)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function runTests() {
    try {
        console.log('--- Testing AUKA Quote ---');
        const auka = await post('https://vetawallet-1a2e38ac52b1.herokuapp.com/api/orders/quote', {
            tokenSymbol: 'AUKA',
            tokenAmount: '1',
            paymentCurrency: 'USDT',
            paymentMethod: 'metamask'
        });
        console.log('AUKA Result:', auka);

        console.log('\n--- Testing ORIGEN Quote ---');
        const origen = await post('https://vetawallet-1a2e38ac52b1.herokuapp.com/api/orders/quote', {
            tokenSymbol: 'ORIGEN',
            tokenAmount: '1',
            paymentCurrency: 'USDT',
            paymentMethod: 'metamask'
        });
        console.log('ORIGEN Result:', origen);
    } catch (e) {
        console.error('Test failed:', e.message);
    }
}

runTests();
