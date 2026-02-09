const https = require('https');

async function test(symbol) {
    const data = JSON.stringify({
        tokenSymbol: symbol,
        tokenAmount: '1',
        paymentCurrency: 'USDT',
        paymentMethod: 'metamask'
    });

    const options = {
        hostname: 'vetawallet-1a2e38ac52b1.herokuapp.com',
        port: 443,
        path: '/api/orders/quote',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let resBody = '';
            res.on('data', (d) => resBody += d);
            res.on('end', () => {
                console.log(`--- Status ${symbol}: ${res.statusCode} ---`);
                try {
                    console.log(`Body ${symbol}:`, JSON.parse(resBody));
                } catch (e) {
                    console.log(`Body ${symbol} (raw):`, resBody);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error(`Error ${symbol}:`, error);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    await test('AUKA');
    await test('ORIGEN');
}

run();
