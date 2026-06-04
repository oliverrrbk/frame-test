const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard/MaterialList.jsx', 'utf8');

const regex = /const \[deliveryInfo, setDeliveryInfo\] = useState\(\{[\s\S]*?\}\);/;
const match = content.match(regex);
if (match) {
    const replacement = match[0] + "\n    const [isDeliveryOpen, setIsDeliveryOpen] = useState(!lead.customer_address && (!lead.raw_data?.delivery_info?.address));";
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/Dashboard/MaterialList.jsx', content);
}
