import React from 'react';
import { Mail, Building, User, MapPin, FileText, Phone, Link, Image as ImageIcon, MessageSquare, Briefcase, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import SubscriptionSettings from './SubscriptionSettings';

const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <div 
        onClick={() => !disabled && onChange()}
        style={{
            width: '44px',
            height: '24px',
            background: checked ? '#10b981' : '#e2e8f0',
            borderRadius: '12px',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s ease',
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0
        }}
    >
        <div style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '22px' : '2px',
            width: '20px',
            height: '20px',
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.3s ease'
        }} />
    </div>
);

const AccountSettingsView = ({
    carpenterProfile,
    setCarpenterProfile,
    handleProfileSave,
    isSaving,
    initialCategories,
    disabledCategories,
    toggleCategoryActive,
    handleFileUpload,
    isUploadingLogo,
    isUploadingPortrait,
    session
}) => {
    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '60px', padding: '0 16px' }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* FIRMAOPLYSNINGER (INTERNT) */}
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em' }}>Firmaoplysninger</h3>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Mail size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        value={new URLSearchParams(window.location.search).get('impersonate') ? 'Skjult under Admin-adgang' : (session?.user?.email || 'Ingen session')} 
                        disabled
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#64748b', padding: 0, background: 'transparent' }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Building size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="Firmanavn"
                        value={carpenterProfile.company_name || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, company_name: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <User size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="Ejer / Kontaktperson"
                        value={carpenterProfile.owner_name || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, owner_name: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <MapPin size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="Firma Adresse"
                        value={carpenterProfile.address || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, address: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <FileText size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="CVR-nummer"
                        value={carpenterProfile.cvr || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, cvr: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Phone size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="Telefonnummer"
                        value={carpenterProfile.phone || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, phone: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
                    <Mail size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                    <input 
                        type="text" 
                        placeholder="Fakturerings E-mail"
                        value={carpenterProfile.email || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, email: e.target.value }))}
                        style={{ border: 'none', outline: 'none', flex: 1, fontSize: '1rem', color: '#0f172a', padding: 0 }} 
                    />
                </div>
                
                <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                        onClick={handleProfileSave}
                        disabled={isSaving}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        {isSaving ? 'Gemmer...' : 'Gem Firmaoplysninger'}
                    </button>
                </div>
            </div>

            {/* KUNDE-PORTAL (OFFENTLIG) */}
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em' }}>Kunde-Portal (Offentlig)</h3>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                        <Link size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div style={{ fontSize: '1rem', color: '#0f172a' }}>Dit kunde-link</div>
                    </div>
                    
                    <div style={{ paddingLeft: '36px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', width: '100%', overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.95rem', color: '#64748b', userSelect: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>bisonframe.dk/</span>
                            <input 
                                type="text" 
                                placeholder="dit-firmanavn"
                                value={carpenterProfile.slug || ''} 
                                onChange={(e) => setCarpenterProfile(prev => ({ ...prev, slug: e.target.value }))}
                                style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: '1rem', color: '#10b981', padding: '0 0 0 2px', fontWeight: '600', minWidth: '50px' }} 
                            />
                        </div>
                    </div>

                    <div style={{ paddingLeft: '36px' }}>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(`https://bisonframe.dk/${carpenterProfile.slug || ''}`);
                                toast.success('Linket er kopieret!');
                            }}
                            style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            Kopiér kunde-link
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ImageIcon size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Firmalogo</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{isUploadingLogo ? 'Uploader...' : 'PNG / JPG'}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {carpenterProfile.logo_url && (
                            <img src={carpenterProfile.logo_url} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', border: '1px solid #e2e8f0' }} />
                        )}
                        <label style={{ cursor: 'pointer', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                            Vælg
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Camera size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <div>
                            <div style={{ fontSize: '1rem', color: '#0f172a' }}>Portrætbillede</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{isUploadingPortrait ? 'Uploader...' : 'Ansigt til kunder'}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {carpenterProfile.portrait_url && (
                            <img src={carpenterProfile.portrait_url} alt="Portræt" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                        )}
                        <label style={{ cursor: 'pointer', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>
                            Vælg
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'portrait')} disabled={isUploadingPortrait} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <MessageSquare size={20} color="#94a3b8" style={{ marginRight: '16px', flexShrink: 0 }}/>
                        <span style={{ fontSize: '1rem', color: '#0f172a' }}>Afslutningsbesked</span>
                    </div>
                    <textarea 
                        value={carpenterProfile.success_message || ''} 
                        onChange={(e) => setCarpenterProfile(prev => ({ ...prev, success_message: e.target.value }))} 
                        rows="3" 
                        placeholder="Tak for din forespørgsel! Vi vender tilbage..."
                        style={{ width: '100%', border: 'none', outline: 'none', background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.95rem', color: '#334155', resize: 'none', marginTop: '4px' }}
                    ></textarea>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                        onClick={handleProfileSave}
                        disabled={isSaving}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                    >
                        {isSaving ? 'Gemmer...' : 'Gem Kunde-Portal'}
                    </button>
                </div>
            </div>

            {/* ARBEJDSOMRÅDER (FILTRERING) */}
            <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em' }}>Arbejdsområder</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 16px' }}>Slå de kategorier fra, I ikke udfører.</p>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                {initialCategories.map((cat, index) => {
                    const isActive = !disabledCategories.includes(cat.id);
                    return (
                        <div 
                            key={cat.id} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                padding: '16px', 
                                borderBottom: index < initialCategories.length - 1 ? '1px solid #f1f5f9' : 'none',
                                background: isActive ? '#fff' : '#f8fafc',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <Briefcase size={20} color={isActive ? "#10b981" : "#94a3b8"} style={{ flexShrink: 0 }}/>
                                <span style={{ fontSize: '1rem', color: isActive ? '#0f172a' : '#64748b', fontWeight: isActive ? '500' : '400' }}>
                                    {cat.label}
                                </span>
                            </div>
                            <ToggleSwitch 
                                checked={isActive} 
                                onChange={() => toggleCategoryActive(cat.id)} 
                                disabled={isSaving}
                            />
                        </div>
                    );
                })}
            </div>

            {/* ABONNEMENT & FAKTURA */}
            <h3 id="frame-aftale" style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', margin: '0 0 8px 16px', fontWeight: '700', letterSpacing: '0.05em', scrollMarginTop: '80px' }}>Frame Aftale</h3>
            <SubscriptionSettings />

        </div>
    );
};

export default AccountSettingsView;
