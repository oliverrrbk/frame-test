import re

with open('src/components/Dashboard/Dashboard.jsx', 'r') as f:
    content = f.read()

# 1. Add targetCaseId to state
state_anchor = "    const [activeTab, setActiveTab] = useState(() => {"
if state_anchor in content:
    content = content.replace(state_anchor, "    const [targetCaseId, setTargetCaseId] = useState(null);\n" + state_anchor)
    print("Added targetCaseId state")

# 2. Update CaseManagement in activeTab === 'cases'
case_tab_search = """                    {activeTab === 'cases' && (
                        <div className="tab-pane active" style={{ height: '100%', overflowY: 'auto' }}>
                            <CaseManagement 
                                leads={leadsData} """
case_tab_replace = """                    {activeTab === 'cases' && (
                        <div className="tab-pane active" style={{ height: '100%', overflowY: 'auto' }}>
                            <CaseManagement 
                                targetCaseId={targetCaseId}
                                clearTargetCase={() => setTargetCaseId(null)}
                                leads={leadsData} """
if case_tab_search in content:
    content = content.replace(case_tab_search, case_tab_replace)
    print("Updated CaseManagement props")

# 3. Replace embedded CaseManagement in modal with CTA
modal_case_search = """                                        {selectedLead.status === 'Bekræftet opgave' && (
                                            <div style={{ marginTop: '24px', borderTop: '2px solid #cbd5e1', paddingTop: '24px' }}>
                                                <CaseManagement 
                                                    isModalView={true} 
                                                    selectedLeadId={selectedLead.id} 
                                                    leads={leadsData} 
                                                    profile={carpenterProfile} 
                                                    onUpdateLead={(updated) => {
                                                        setLeadsData(prev => prev.map(l => l.id === updated.id ? updated : l));
                                                        if (selectedLead && selectedLead.id === updated.id) {
                                                            setSelectedLead(updated);
                                                        }
                                                    }} 
                                                />
                                            </div>
                                        )}"""
                                        
modal_case_replace = """                                        {selectedLead.status === 'Bekræftet opgave' && (
                                            <div style={{ marginTop: '24px', borderTop: '2px solid #cbd5e1', paddingTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', textAlign: 'center' }}>Ordrestyring og Byggeproces</h3>
                                                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', textAlign: 'center', maxWidth: '500px' }}>
                                                    Sagen er bekræftet! Al praktisk styring, materialebestilling og timeregistrering foregår inde i den dedikerede Ordrestyring.
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        setTargetCaseId(selectedLead.id);
                                                        setActiveTab('cases');
                                                        setSelectedLead(null);
                                                    }}
                                                    style={{ 
                                                        marginTop: '8px',
                                                        padding: '20px 32px', 
                                                        backgroundColor: '#1d4ed8', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        borderRadius: '16px', 
                                                        fontSize: '1.2rem', 
                                                        fontWeight: 'bold', 
                                                        cursor: 'pointer', 
                                                        boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)', 
                                                        transition: 'transform 0.1s, background 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
                                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22 22 2"/><path d="M12 2l10 10-10 10-10-10 10-10z"/></svg>
                                                    Gå til Ordrestyring for denne sag
                                                </button>
                                            </div>
                                        )}"""

if modal_case_search in content:
    content = content.replace(modal_case_search, modal_case_replace)
    print("Replaced modal CaseManagement with CTA")
else:
    print("WARNING: modal_case_search not found!")

with open('src/components/Dashboard/Dashboard.jsx', 'w') as f:
    f.write(content)
print("Dashboard.jsx updated")
