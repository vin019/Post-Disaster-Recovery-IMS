const http = require('http');

const payload = JSON.stringify({
    head_name: "Debug Head",
    head_age: "45",
    contact_number: "09123456789",
    purok: "Purok 1",
    damage_status: "50",
    initial_needs: "Water",
    family_members: [],
    official_name: "Official"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/households',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
