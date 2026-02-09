const https = require('https');

async function testRoot() {
    return new Promise((resolve) => {
        https.get('https://vetawallet-1a2e38ac52b1.herokuapp.com/', (res) => {
            console.log(`Status: ${res.statusCode}`);
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                console.log('Body:', body.slice(0, 200));
                resolve();
            });
        }).on('error', e => {
            console.error('Error:', e);
            resolve();
        });
    });
}

testRoot();
