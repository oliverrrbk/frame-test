import handler from '../api/chat-estimator.js';

// Mocker request og response objekter
const req = {
    method: 'POST',
    body: {
        messages: [
            { role: 'user', content: 'Hej, jeg skal have udskiftet 4 vinduer' }
        ],
        contextData: {
            dbContext: 'LIVE MATERIALEPRISER:\n- WINDOWS: Standard: 5000 kr\n',
            questionsContext: 'KATEGORI: WINDOWS\n- Hvor mange vinduer?\n',
            carpenterInfo: {
                id: '7e1063a5-006a-4192-9463-3744b6b38f62',
                owner_name: 'Mads Christensen',
                company_name: 'Mads Byg',
                tier: 'pro'
            }
        }
    },
    headers: {
        'x-forwarded-for': '127.0.0.1'
    }
};

const res = {
    status: (code) => {
        res.statusCode = code;
        return res;
    },
    json: (data) => {
        res.data = data;
        return res;
    },
    setHeader: (name, value) => {
        res.headers = res.headers || {};
        res.headers[name] = value;
    }
};

async function run() {
    console.log("=== TEEST AF CHAT ESTIMATOR API ===");
    await handler(req, res);
    console.log("Response Status:", res.statusCode);
    console.log("Response Data:", JSON.stringify(res.data, null, 2));
}

run().catch(console.error);
