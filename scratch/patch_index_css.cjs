const fs = require('fs');
const file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

const newCss = `
.quote-triple-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    align-items: end;
    max-width: 100%;
    box-sizing: border-box;
}
.quote-triple-grid input {
    max-width: 100%;
    box-sizing: border-box;
}
@media (max-width: 768px) {
    .quote-triple-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
    }
}
`;

if (!content.includes('.quote-triple-grid')) {
    content += newCss;
    fs.writeFileSync(file, content);
    console.log("Index CSS patch success");
}
