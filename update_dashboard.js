const fs = require('fs');
const file = '/Users/madsbrunsbjergchristensen/Desktop/frame-test-main/src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                    supabase.functions.invoke('dinero-auth', {
                        body: { code: code, redirectUri: redirectUri }
                    }).then(({ data, error }) => {`;
                    
const replacement = `                    supabase.functions.invoke('dinero-auth', {
                        body: { code: code, redirectUri: redirectUri },
                        headers: {
                            Authorization: \`Bearer \${session.access_token}\`
                        }
                    }).then(({ data, error }) => {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Successfully updated Dashboard.jsx!");
} else {
    console.log("Could not find target string in Dashboard.jsx.");
}
