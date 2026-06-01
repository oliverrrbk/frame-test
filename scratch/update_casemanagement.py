import re

with open('src/components/Dashboard/CaseManagement.jsx', 'r') as f:
    content = f.read()

# 1. Update signature
sig_search = "const CaseManagement = ({ leads = [], profile, onUpdateLead, isModalView = false, selectedLeadId = null }) => {"
sig_replace = "const CaseManagement = ({ leads = [], profile, onUpdateLead, isModalView = false, selectedLeadId = null, targetCaseId = null, clearTargetCase = () => {} }) => {"

if sig_search in content:
    content = content.replace(sig_search, sig_replace)
    print("Signature updated")
else:
    print("WARNING: sig_search not found!")

# 2. Add useEffect for targetCaseId
effect_search = "    }, [selectedCase]);\n"
effect_replace = """    }, [selectedCase]);

    // Lyt efter remote targeting fra Dashboard CTA'en
    useEffect(() => {
        if (targetCaseId) {
            const confirmed = leads.filter(l => l.status === 'Bekræftet opgave');
            const target = confirmed.find(c => c.id === targetCaseId);
            if (target) {
                setSelectedCase(target);
                clearTargetCase(); // Nulstil straks så vi kan navigere tilbage
            }
        }
    }, [targetCaseId, leads, clearTargetCase]);
"""

if effect_search in content:
    content = content.replace(effect_search, effect_replace)
    print("useEffect added")
else:
    print("WARNING: effect_search not found!")

with open('src/components/Dashboard/CaseManagement.jsx', 'w') as f:
    f.write(content)
print("CaseManagement.jsx updated")
