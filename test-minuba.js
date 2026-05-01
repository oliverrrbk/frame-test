import https from 'https';

const API_KEY = 'XH94oZvXic5eoFbBWZwzhDnRhzWSBQMs';

async function checkUrl(url) {
    return new Promise((resolve) => {
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`\nURL: ${url}`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Content-Type: ${res.headers['content-type']}`);
                console.log(`Body snippet: ${data.substring(0, 300)}`);
                resolve();
            });
        });
        req.on('error', (e) => {
            console.log(`\nURL: ${url} - ERROR: ${e.message}`);
            resolve();
        });
        req.end();
    });
}

async function run() {
    await checkUrl("https://app.minuba.dk/api/Client?authkey=" + API_KEY);
    await checkUrl("https://app.minuba.dk/api/Client?apiKey=" + API_KEY);
    await checkUrl("https://app.minuba.dk/api/Client?token=" + API_KEY);
}

run();
