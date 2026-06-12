import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { User, Lock, Camera, Copy, CheckCircle, Phone, MessageSquare, Shield, Bell } from 'lucide-react';
import PushSubscriber from './PushSubscriber';

const MyProfileView = ({ myProfile, setMyProfile }) => {

    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 900);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 900);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const [formData, setFormData] = useState({
        owner_name: myProfile?.owner_name || '',
        phone: myProfile?.phone || '',
        newPassword: '',
        confirmPassword: '',
        // Private oplysninger (gemmes i raw_data — kun synligt for medarbejderen selv + mester)
        home_address: myProfile?.raw_data?.home_address || '',
        home_zip: myProfile?.raw_data?.home_zip || '',
        home_city: myProfile?.raw_data?.home_city || '',
        next_of_kin_name: myProfile?.raw_data?.next_of_kin_name || myProfile?.raw_data?.next_of_kin || '',
        next_of_kin_phone: myProfile?.raw_data?.next_of_kin_phone || ''
    });

    const fileInputRef = useRef(null);
    const isAdmin = myProfile?.role === 'admin';

    const handleAvatarUpload = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            setIsUploading(true);
            setError('');
            setMessage('');

            const fileExt = file.name.split('.').pop();
            const fileName = `${myProfile.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload til avatars bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Hent den offentlige URL
            const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const avatarUrl = publicUrlData.publicUrl;

            // Opdater databasen
            const { error: updateError } = await supabase
                .from('carpenters')
                .update({ avatar_url: avatarUrl })
                .eq('id', myProfile.id);

            if (updateError) throw updateError;

            setMyProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
            setMessage('Profilbillede opdateret!');
        } catch (err) {
            setError('Kunne ikke uploade profilbillede: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        setMessage('');

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setError('De to kodeord stemmer ikke overens!');
            setIsSaving(false);
            return;
        }

        try {
            // Flet private felter ind i raw_data (overskriver ikke andet)
            const mergedRawData = {
                ...(myProfile?.raw_data || {}),
                home_address: formData.home_address,
                home_zip: formData.home_zip,
                home_city: formData.home_city,
                next_of_kin_name: formData.next_of_kin_name,
                next_of_kin_phone: formData.next_of_kin_phone
            };

            // Opdater navn og telefon i carpenters tabellen
            const { error: dbError } = await supabase
                .from('carpenters')
                .update({
                    owner_name: formData.owner_name,
                    phone: formData.phone,
                    raw_data: mergedRawData
                })
                .eq('id', myProfile.id);

            if (dbError) throw dbError;

            // Opdater password hvis angivet
            if (formData.newPassword) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: formData.newPassword
                });

                if (authError) throw authError;

                setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
            }

            setMyProfile(prev => ({
                ...prev,
                owner_name: formData.owner_name,
                phone: formData.phone,
                raw_data: mergedRawData
            }));

            setMessage('Din profil blev opdateret!');
        } catch (err) {
            setError('Kunne ikke gemme ændringerne: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatPhoneNumber = (value) => {
        let cleaned = value.replace(/[^\d+]/g, '');
        let prefix = '';
        let rest = cleaned;

        if (cleaned.startsWith('+45')) {
            prefix = '+45 ';
            rest = cleaned.substring(3);
        } else if (cleaned.startsWith('+')) {
            return cleaned;
        }

        rest = rest.substring(0, 8);
        const match = rest.match(/.{1,2}/g);
        return prefix + (match ? match.join(' ') : '');
    };

    const handleCopyText = () => {
        const textToCopy = `Hej! Tak for snakken. Her er linket til vores prisberegner, så du nemt kan få et uforpligtende prisoverslag: ${window.location.origin}/wizard/${myProfile.id}`;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
    };

    // --- Genbrugelige stil-helpers (Bison Frame) ---
    const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '6px', letterSpacing: '0.01em' };
    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', color: '#0f172a', background: '#f8fafc', outline: 'none', transition: 'border-color .15s, box-shadow .15s, background .15s' };
    const onFieldFocus = (e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; e.target.style.background = '#fff'; };
    const onFieldBlur = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; };

    const Card = ({ icon, title, badge, children }) => (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.04)', padding: isMobile ? '20px' : '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', background: '#f1f5f9', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
                {badge && <div style={{ marginLeft: 'auto' }}>{badge}</div>}
            </div>
            {children}
        </div>
    );

    const Field = ({ label, full, children }) => (
        <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
            <label style={labelStyle}>{label}</label>
            {children}
        </div>
    );

    const masterBadge = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#7c3aed', background: '#f5f3ff', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
            <Lock size={11} /> Kun for mester
        </div>
    );

    // --- Identitetskort (avatar + navn + rolle) ---
    const identityCard = (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.04)', padding: isMobile ? '24px' : '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
                onClick={() => fileInputRef.current?.click()}
                style={{ width: isMobile ? '96px' : '116px', height: isMobile ? '96px' : '116px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 4px 14px rgba(15,23,42,0.08)', border: '3px solid #fff' }}
            >
                {myProfile?.avatar_url ? (
                    <img src={myProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ fontSize: '2.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
                        {(formData.owner_name || 'T').charAt(0).toUpperCase()}
                    </span>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isUploading ? 1 : 0, transition: 'opacity 0.2s' }}>
                    {isUploading ? <span style={{ color: 'white', fontSize: '0.8rem' }}>...</span> : <Camera color="white" size={24} />}
                </div>
                {/* Kamera-badge der hinter at billedet kan skiftes */}
                <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '30px', height: '30px', borderRadius: '50%', background: '#0f172a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                    <Camera color="white" size={14} />
                </div>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />

            <h2 style={{ margin: '18px 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{formData.owner_name || 'Dit Navn'}</h2>
            <div style={{ fontSize: '0.85rem', color: '#475569', background: '#f1f5f9', padding: '5px 14px', borderRadius: '20px', fontWeight: 600 }}>
                {isAdmin ? 'Mester / Admin' : 'Medarbejder'}
            </div>
            {formData.phone && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b', fontSize: '0.95rem' }}>
                    <Phone size={16} /> {formData.phone}
                </div>
            )}
        </div>
    );

    // --- SMS-genvej (kun mester/admin) ---
    const smsCardWrapStyle = isMobile
        ? { display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: '16px', paddingBottom: '16px', margin: '0 -16px', paddingLeft: '16px', paddingRight: '16px' }
        : { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' };
    const smsCardBase = isMobile
        ? { minWidth: '85%', maxWidth: '320px', scrollSnapAlign: 'center' }
        : {};

    const smsSection = (
        <div>
            <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>SMS Tilbuds-genvej</h3>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: isMobile ? '0.9rem' : '1rem' }}>Gør det lynhurtigt at sende dit prisberegner-link til kunder.</p>
            <div className="hide-scrollbar" style={smsCardWrapStyle}>
                {/* Kort 1 */}
                <div style={{ ...smsCardBase, background: 'linear-gradient(145deg, #3b82f6, #2563eb)', borderRadius: '24px', padding: '24px', color: 'white', boxShadow: '0 10px 30px -10px rgba(37, 99, 235, 0.5)' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>1</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Kopiér link</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', opacity: 0.9 }}>Kopiér din personlige besked, som du vil sende til kunderne.</p>
                    <button onClick={handleCopyText} style={{ width: '100%', background: 'white', color: '#2563eb', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                        {isCopied ? <CheckCircle size={18} /> : <Copy size={18} />}
                        {isCopied ? 'Kopieret!' : 'Kopiér besked'}
                    </button>
                </div>

                {/* Kort 2 */}
                <div style={{ ...smsCardBase, background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#f1f5f9', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>2</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>Åbn indstillinger</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>Gå til tastaturindstillinger på din telefon.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', color: '#475569' }}><strong>iPhone:</strong> Indstillinger → Generelt → Tastatur → Teksterstatning</div>
                        <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', color: '#475569' }}><strong>Android:</strong> Indstillinger → System → Personlig ordbog</div>
                    </div>
                </div>

                {/* Kort 3 */}
                <div style={{ ...smsCardBase, background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ background: '#ecfdf5', color: '#10b981', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>3</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>Opret genvej</h4>
                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#64748b' }}>Indsæt beskeden og vælg et kort ord, fx <strong>mitlink</strong>.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                        <MessageSquare size={20} color="#3b82f6" />
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>Skriv <strong>mitlink</strong> i en SMS næste gang!</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard-workspace" style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0 16px 60px' : '0 0 80px', display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '28px' }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* HEADER */}
            <div style={{ marginTop: isMobile ? '8px' : '8px' }}>
                <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a', letterSpacing: '-1px' }}>Min Profil</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: isMobile ? '0.95rem' : '1.1rem' }}>Hold dine oplysninger opdaterede og personlige.</p>
            </div>

            {message && <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} /> {message}</div>}
            {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '0.9rem' }}>{error}</div>}

            {/* TO-KOLONNE LAYOUT (falder sammen til én kolonne på mobil) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '340px 1fr', gap: isMobile ? '20px' : '28px', alignItems: 'start' }}>

                {/* VENSTRE: identitet + notifikationer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '24px', position: isMobile ? 'static' : 'sticky', top: '24px' }}>
                    {identityCard}

                    <Card icon={<Bell size={19} />} title="Notifikationer">
                        <PushSubscriber />
                    </Card>
                </div>

                {/* HØJRE: redigerbare felter + gem */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '24px' }}>

                    {/* GENERELT */}
                    <Card icon={<User size={19} />} title="Generelt">
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                            <Field label="Dit fulde navn">
                                <input
                                    placeholder="Dit fulde navn"
                                    value={formData.owner_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            <Field label="Telefonnummer">
                                <input
                                    placeholder="Telefonnummer"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* PRIVATE OPLYSNINGER */}
                    <Card icon={<Shield size={19} />} title="Private oplysninger" badge={masterBadge}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                            <Field label="Hjemmeadresse" full>
                                <input
                                    placeholder="Vej og husnummer"
                                    value={formData.home_address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, home_address: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            <Field label="Postnummer">
                                <input
                                    placeholder="Postnummer"
                                    value={formData.home_zip}
                                    onChange={(e) => setFormData(prev => ({ ...prev, home_zip: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            <Field label="By">
                                <input
                                    placeholder="By"
                                    value={formData.home_city}
                                    onChange={(e) => setFormData(prev => ({ ...prev, home_city: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            <Field label="Pårørendes navn">
                                <input
                                    placeholder="Pårørendes navn"
                                    value={formData.next_of_kin_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, next_of_kin_name: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            <Field label="Pårørendes telefonnummer">
                                <input
                                    placeholder="Pårørendes telefonnummer"
                                    value={formData.next_of_kin_phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, next_of_kin_phone: formatPhoneNumber(e.target.value) }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* SIKKERHED */}
                    <Card icon={<Lock size={19} />} title="Sikkerhed">
                        <div style={{ display: 'grid', gridTemplateColumns: (isMobile || !formData.newPassword) ? '1fr' : '1fr 1fr', gap: '16px' }}>
                            <Field label="Nyt kodeord (valgfrit)">
                                <input
                                    type="password"
                                    placeholder="Nyt kodeord"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                    style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                />
                            </Field>
                            {formData.newPassword.length > 0 && (
                                <Field label="Gentag nyt kodeord">
                                    <input
                                        type="password"
                                        placeholder="Gentag nyt kodeord"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        style={inputStyle} onFocus={onFieldFocus} onBlur={onFieldBlur}
                                    />
                                </Field>
                            )}
                        </div>
                    </Card>

                    {/* GEM KNAP */}
                    <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                width: isMobile ? '100%' : 'auto', padding: isMobile ? '16px' : '15px 40px', borderRadius: '14px', background: '#0f172a', color: 'white',
                                fontSize: '1.05rem', fontWeight: 700, border: 'none', cursor: isSaving ? 'default' : 'pointer',
                                boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.4)', opacity: isSaving ? 0.7 : 1, transition: 'transform .15s, opacity .15s'
                            }}
                            onMouseEnter={(e) => { if (!isSaving && !isMobile) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {isSaving ? 'Gemmer...' : 'Gem Profil'}
                        </button>
                    </div>
                </div>
            </div>

            {/* SMS TILBUDS-GENVEJ — kun for mester/admin */}
            {isAdmin && smsSection}
        </div>
    );
};

export default MyProfileView;
