const fs = require('fs');
const file = 'src/components/Wizard/Wizard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace WORK_FORMULAS import with performCalculation
content = content.replace(
    "import { WORK_FORMULAS } from '../../prices';",
    "import { performCalculation } from '../../utils/calculator';"
);

const startIndex = content.indexOf('    const fetchGoogleDistance = async');
const endIndex = content.indexOf('    const resetWizard = () => {');

if (startIndex !== -1 && endIndex !== -1) {
    const newFunc = `    const calculateEstimate = async (customerDetails) => {
        setIsCalculating(true);
        
        // Sørg for at latest data er i projectData objektet inden det sendes afsted
        const updatedProjectData = {
            ...projectData,
            customerDetails
        };
        
        setProjectData(updatedProjectData);

        if (!dbSettings || !dbMaterials) {
            import('react-hot-toast').then(toast => {
                toast.default.error('Kunne ikke få forbindelse til Beregningsmotoren.');
            });
            setIsCalculating(false);
            return;
        }

        try {
            const res = await performCalculation(updatedProjectData, customerDetails, dbSettings, dbMaterials, carpenter);
            
            setPriceRange(res.priceRange);
            setBreakdownArr(res.breakdownArr);

            setProjectData(prev => ({
                ...prev,
                calc_data: res.calcData
            }));

            setIsCalculating(false);
            setCurrentStep(5);
        } catch (error) {
            console.error(error);
            setIsCalculating(false);
        }
    };

`;
    
    content = content.substring(0, startIndex) + newFunc + content.substring(endIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully updated Wizard.jsx');
} else {
    console.log('Could not find start or end index', startIndex, endIndex);
}
