import dotenv from 'dotenv';
dotenv.config({ path: '/Users/madsbrunsbjergchristensen/Documents/GitHub/frame-test/.env' });

(async () => {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    }
  });
  const data = await response.json();
  console.log(data);
})();
