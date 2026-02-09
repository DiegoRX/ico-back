const http = require('http');

async function test(symbol) {
    const data = JSON.stringify({
        tokenSymbol: symbol,
        tokenAmount: '1',
        paymentCurrency: 'USDT',
        paymentMethod: 'metamask'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders/quote',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let resBody = '';
            res.on('data', (d) => resBody += d);
            res.on('end', () => {
                console.log(`--- Status ${symbol}: ${res.statusCode} ---`);
                try {
                    const parsed = JSON.parse(resBody);
                    console.log(`Body ${symbol}:`, parsed);
                    if (parsed.exchangeRate) {
                        console.log(`VALID PRICE: ${parsed.exchangeRate}`);
                    }
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
