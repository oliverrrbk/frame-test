const fs = require('fs');
const file = 'src/components/Dashboard/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /return \(\s*<details style=\{\{ padding: '16px'.*?Detaljeret Begrundelse \(Log\).*?<\/summary>.*?<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' \}\}>.*?\{\(\(\) => \{.*?const activeCategories = Object.values\(expl\).*?\}\)\(\)\}.*?\{calc && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*<\/details>\s*\);/m;

const match = content.match(targetRegex);
if (match) {
    console.log("Found log detail block!");
} else {
    console.log("Not found log detail block!");
    fs.writeFileSync('scratch/log_target_debug.txt', content.substring(210000, 215000));
}
