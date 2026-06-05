const fs = require('fs');
const babel = require('@babel/parser');
const content = fs.readFileSync('src/components/Dashboard/CustomProjectCreator.jsx', 'utf8');

try {
  babel.parse(content, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('Valid');
} catch (e) {
  console.error(e.message);
  console.error('Line:', e.loc?.line, 'Column:', e.loc?.column);
}
