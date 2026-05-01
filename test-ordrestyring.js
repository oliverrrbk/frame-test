async function test() {
    const api_key = "sQSx4UUjQ2BzAZql";
    const authString = Buffer.from(`${api_key}:api`).toString('base64');
    const baseUrl = "https://v2.api.ordrestyring.dk";

    const casePayload = {
      customer_number: "950796",
      description: "Test Opgave Bison"
    };

    console.log("Opretter sag...");
    const caseRes = await fetch(`${baseUrl}/cases`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(casePayload)
    });

    const text = await caseRes.text();
    console.log("Status:", caseRes.status);
    console.log("Response:", text);
}

test();
