async function test() {
    const api_key = "kaWySK3Xye5odizM"; // Den nye nøgle
    const authString = Buffer.from(`${api_key}:api`).toString('base64');
    const baseUrl = "https://v2.api.ordrestyring.dk";

    console.log("Tester ny API-nøgle...");
    const res = await fetch(`${baseUrl}/debtors`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 300));
}

test();
