import React, { useState, useRef, useEffect } from 'react';
import { HardHat, User, MapPin, Briefcase, Save, Building2, Clock, Mic, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { friendlyError } from '../../utils/friendlyError';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import WorkBreakdownModal, { totalManHours } from './WorkBreakdownModal';
import CustomerPicker from '../ui/CustomerPicker';

// Dansk telefon-formatering (+45 XX XX XX XX) — samme mønster som i QuickQuoteBuilder/wizarden.
const formatDkPhone = (raw) => {
    let val = String(raw ?? '').replace(/[^\d+]/g, '');
    const hasPlus45 = val.startsWith('+45');
    const numbersOnly = hasPlus45 ? val.slice(3) : val;
    const blocks = numbersOnly.match(/.{1,2}/g) || [];
    let result = blocks.join(' ');
    if (hasPlus45) result = result ? `+45 ${result}` : '+45';
    return result;
};

// Opret sag uden tilbud — for tømreren der bare kører ud, arbejder på timepris og
// fakturerer bagefter. Laver en lead direkte i status 'Bekræftet opgave', så den
// med det samme dukker op i Sager & Ordrestyring med tidsregistrering + fakturering.
// Materialer er bevidst udeladt — de kan tilføjes senere inde på sagen.
const CreateCaseForm = ({ carpenter, draftCreator, isMobile = false, onCancel, onComplete, initialCustomer = null }) => {
    const [customer, setCustomer] = useState({
        name: initialCustomer?.name || '',
        email: initialCustomer?.email || '',
        phone: initialCustomer?.phone || '',
        address: initialCustomer?.address || '',
        zip: initialCustomer?.zip || '',
        city: initialCustomer?.city || '',
    });
    const [customerType, setCustomerType] = useState(initialCustomer?.customer_type === 'erhverv' ? 'erhverv' : 'privat');
    const [cvr, setCvr] = useState(initialCustomer?.cvr || '');
    // Kunde-bibliotek: vælg en eksisterende kunde → felterne udfyldes og sagen kobles
    // til kunden (leads.customer_id). Manuelt indtastede kunder gemmes også i biblioteket
    // ved oprettelse (find-eller-opret i save()) — samme mønster som Hurtigt tilbud.
    const [customersList, setCustomersList] = useState(initialCustomer ? [initialCustomer] : []);
    const [linkedCustomerId, setLinkedCustomerId] = useState(initialCustomer?.id || null);
    const [title, setTitle] = useState('');
    // Valgfrit selvvalgt sagsnummer. Blankt → systemet vælger automatisk næste nummer.
    const [caseNumber, setCaseNumber] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [billingMode, setBillingMode] = useState('hourly');
    const [fixedPrice, setFixedPrice] = useState('');   // fast pris, ekskl. moms
    const [hourlyRate, setHourlyRate] = useState('');   // timepris kr/time, ekskl. moms
    // Omvendt betalingspligt gælder KUN byggeydelser (B2B) — ikke al erhverv. Derfor
    // default MED moms, og man vælger selv omvendt betalingspligt til ved byggeydelser.
    const [reverseCharge, setReverseCharge] = useState(false);
    const [busy, setBusy] = useState(false);
    // Valgfri delopgaver (byggeprocessen) — bliver til sagens bygge-to-do fra start.
    const [breakdown, setBreakdown] = useState([]);
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Adresse-forslag via DAWA (dataforsyningen) — officiel dansk adresse-API, ingen nøgle.
    // Samme kilde som resten af systemet bruger (Register/Wizard) til adresse + postnr→by.
    const [addrSuggestions, setAddrSuggestions] = useState([]);
    const [showAddrSuggestions, setShowAddrSuggestions] = useState(false);
    const addrDebounceRef = useRef(null);
    const addrBlurRef = useRef(null);

    const setC = (patch) => setCustomer((prev) => ({ ...prev, ...patch }));

    // Hent kundebiblioteket (samme kald som Hurtigt tilbud) — bruges af kundevælgeren.
    useEffect(() => {
        if (!carpenter?.id) return;
        let cancelled = false;
        supabase.from('customers').select('*').eq('carpenter_id', carpenter.id).order('name', { ascending: true })
            .then(({ data }) => { if (!cancelled && data) setCustomersList(data); });
        return () => { cancelled = true; };
    }, [carpenter?.id]);

    // Vælg en eksisterende kunde → udfyld felterne og kobl sagen til kunden.
    const pickCustomer = (c) => {
        setLinkedCustomerId(c.id);
        setCustomer({
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            address: c.address || '',
            zip: c.zip || '',
            city: c.city || '',
        });
        setCustomerType(c.customer_type === 'erhverv' ? 'erhverv' : 'privat');
        setCvr(c.cvr || '');
    };

    // Ryd valget igen → tom formular (man kan så skrive en ny kunde).
    const clearLinkedCustomer = () => {
        setLinkedCustomerId(null);
        setCustomer({ name: '', email: '', phone: '', address: '', zip: '', city: '' });
        setCvr('');
    };

    // Find en matchende kunde i biblioteket (navn + telefon/mail) eller opret en ny.
    // Returnerer kundens id (eller null hvis der ikke er noget navn at gemme på).
    // Samme logik som QuickQuoteBuilder, så sager og tilbud kobler ens.
    const findOrCreateCustomer = async () => {
        const name = (customer.name || '').trim();
        if (!name || !carpenter?.id) return null;
        const phone = (customer.phone || '').trim();
        const email = (customer.email || '').trim();
        const contact = phone.toLowerCase() || email.toLowerCase();
        try {
            const { data: existing } = await supabase
                .from('customers').select('id, phone, email')
                .eq('carpenter_id', carpenter.id).ilike('name', name);
            if (existing && existing.length) {
                const match = existing.find(c => !contact || (c.phone || '').toLowerCase() === contact || (c.email || '').toLowerCase() === contact) || existing[0];
                if (match) return match.id;
            }
            const { data: created, error } = await supabase.from('customers').insert([{
                carpenter_id: carpenter.id,
                name,
                email: email || null,
                phone: phone || null,
                address: (customer.address || '').trim() || null,
                zip: (customer.zip || '').trim() || null,
                city: (customer.city || '').trim() || null,
                customer_type: customerType,
                cvr: customerType === 'erhverv' ? ((cvr || '').trim() || null) : null,
                created_by: draftCreator?.id || null,
            }]).select('id').single();
            if (error) throw error;
            return created?.id || null;
        } catch (e) {
            console.warn('Kunde-kobling sprang over:', e);
            return null;
        }
    };

    // Indtaling af opgavebeskrivelsen — samme fagterm-korrektion som aftalesedlen
    // (WHISPER_PROMPT + FAGTERM_CORRECTION_PROMPT fra fagtermer.js via mode 'transcribe').
    const descriptionDictation = useVoiceDictation((text) => {
        setDescription((prev) => `${prev ? `${prev.trim()} ` : ''}${text}`.trim());
    }, {
        mode: 'transcribe',
        processingMessage: 'Skriver sagsbeskrivelsen…',
        successMessage: 'Tilføjet til beskrivelsen',
    });

    // Debounced adresse-opslag mens man skriver vej + husnr.
    const handleAddressChange = (value) => {
        setC({ address: value });
        if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current);
        if (!value || value.trim().length < 3) {
            setAddrSuggestions([]);
            setShowAddrSuggestions(false);
            return;
        }
        addrDebounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.dataforsyningen.dk/adgangsadresser/autocomplete?q=${encodeURIComponent(value)}&per_side=6`);
                if (!res.ok) return;
                const data = await res.json();
                setAddrSuggestions(Array.isArray(data) ? data : []);
                setShowAddrSuggestions(true);
            } catch { /* netværksfejl — ignorér, brugeren kan skrive manuelt */ }
        }, 200);
    };

    // Vælg et forslag → udfyld vej, postnr og by i ét hug (tekst-regex som fallback).
    const selectAddress = (item) => {
        const a = item?.adgangsadresse || {};
        let street = [a.vejnavn, a.husnr].filter(Boolean).join(' ').trim();
        let postnr = a.postnr || '';
        let by = a.postnrnavn || '';
        if ((!street || !postnr) && item?.tekst) {
            const m = item.tekst.match(/^(.*?),\s*(\d{4})\s+(.+)$/);
            if (m) { street = street || m[1].trim(); postnr = postnr || m[2]; by = by || m[3].trim(); }
        }
        setC({ address: street || customer.address, zip: postnr || customer.zip, city: by || customer.city });
        setAddrSuggestions([]);
        setShowAddrSuggestions(false);
        if (addrBlurRef.current) clearTimeout(addrBlurRef.current);
    };

    // Skriver man postnummer manuelt, slår vi byen op (DAWA), så byen altid følger postnr.
    const handleZipChange = (value) => {
        const z = value.replace(/[^\d]/g, '').slice(0, 4);
        setC({ zip: z });
        if (z.length === 4) {
            fetch(`https://api.dataforsyningen.dk/postnumre/${z}`)
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(d => { if (d && d.navn) setC({ city: d.navn }); })
                .catch(() => { /* ukendt postnr — lad brugeren udfylde by selv */ });
        }
    };

    // Dansk talformat → tal (fjern tusind-punktummer, brug komma som decimaltegn).
    const parseDkNum = (v) => parseFloat(String(v ?? '').replace(/\./g, '').replace(/\s/g, '').replace(',', '.')) || 0;

    // Vis pris med tusind-adskillelse (dansk: 60000 → 60.000) mens man skriver, så beløbet
    // er nemt at overskue. parseDkNum tolker formatet igen ved gem.
    const formatDkThousands = (raw) => {
        const s = String(raw ?? '').replace(/[^\d,]/g, '');   // kun cifre + komma
        if (!s) return '';
        const [intPart, ...rest] = s.split(',');
        const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return rest.length ? `${grouped},${rest.join('').slice(0, 2)}` : grouped;
    };

    // Tømreren indtaster altid ekskl. moms. Privat → altid +25% moms. Erhverv → MED moms
    // som standard, medmindre man vælger omvendt betalingspligt (kun byggeydelser).
    const isReverseChargeChoice = customerType === 'erhverv' && reverseCharge;
    const momsHint = customerType !== 'erhverv'
        ? 'Privat: der lægges automatisk 25% moms oven i på fakturaen.'
        : (reverseCharge
            ? 'Omvendt betalingspligt: fakturaen sendes uden moms (kun bygge- og anlægsydelser).'
            : 'Erhverv: fakturaen sendes med 25% moms (almindeligt B2B-salg).');

    // Minimum for en brugbar sag: navn + mindst én kontaktmåde (telefon eller mail).
    const canSave = customer.name.trim() && (customer.phone.trim() || customer.email.trim());

    const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' };
    const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#0f172a' };
    const sectionStyle = { background: '#fff', borderRadius: '16px', border: '1px solid #e8e6e1', padding: isMobile ? '18px' : '24px' };

    const save = async () => {
        if (!canSave || busy) return;
        if (!carpenter?.id) { toast.error('Mangler firma-profil. Prøv at genindlæse.'); return; }

        // Valgfrit selvvalgt sagsnummer: kun cifre, skal være et positivt tal.
        const manualCaseNumber = String(caseNumber).replace(/[^\d]/g, '');
        const caseNumberInt = manualCaseNumber ? parseInt(manualCaseNumber, 10) : null;
        if (manualCaseNumber && (!caseNumberInt || caseNumberInt < 1)) {
            toast.error('Sagsnummeret skal være et positivt tal.');
            return;
        }

        setBusy(true);
        try {
            // Har man selv valgt et nummer: tjek at det ikke allerede findes i firmaet
            // (venlig besked frem for en rå databasefejl — constraint'en fanger racet).
            if (caseNumberInt) {
                const { data: dup } = await supabase
                    .from('leads').select('id')
                    .eq('carpenter_id', carpenter.id)
                    .eq('case_number', caseNumberInt)
                    .limit(1);
                if (dup && dup.length) {
                    toast.error(`Sagsnummer ${caseNumberInt} findes allerede — vælg et andet.`);
                    setBusy(false);
                    return;
                }
            }

            const nowIso = new Date().toISOString();
            const fullAddress = [customer.address, [customer.zip, customer.city].filter(Boolean).join(' ')]
                .filter(Boolean).join(', ').trim();

            // Kobl sagen til en kunde i biblioteket: valgt kunde bruges direkte, ellers
            // find-eller-opret på det indtastede (så en ny kunde lander i kundedatabasen).
            const resolvedCustomerId = linkedCustomerId || await findOrCreateCustomer();

            // En medarbejder, der opretter sagen, sættes på holdet, så han kan se den (RLS).
            // Mester ser den altid via carpenter_id, så ejeren tilføjes ikke (overflødigt).
            const ownerId = carpenter?.company_id || carpenter?.id;
            const isEmployeeCreator = !!draftCreator?.id && draftCreator.id !== ownerId;

            const raw_data = {
                created_by: draftCreator?.id || null,
                ...(isEmployeeCreator ? { assigned_workers: [draftCreator.id] } : {}),
                is_manual_case: true,       // markør: oprettet direkte uden tilbud
                billing_mode: billingMode,  // 'hourly' (timepris) eller 'fixed'
                // Eksplicit moms-valg: false = med 25% moms (standard, også erhverv),
                // true = omvendt betalingspligt (kun byggeydelser B2B).
                reverse_charge: isReverseChargeChoice,
                // Pris gemmes altid ekskl. moms (tømrerens tal). caseFinance lægger moms
                // på ved visning/faktura ud fra moms-valget.
                ...(billingMode === 'fixed' && parseDkNum(fixedPrice) > 0 ? { fixed_price_ex_vat: parseDkNum(fixedPrice) } : {}),
                ...(billingMode === 'hourly' && parseDkNum(hourlyRate) > 0 ? { hourly_rate: parseDkNum(hourlyRate) } : {}),
                confirmed_at: nowIso,
                customerDetails: {
                    street: customer.address,
                    zip: customer.zip,
                    city: customer.city,
                    customerType,
                    cvr: customerType === 'erhverv' ? cvr : '',
                },
                ...(description.trim() ? { case_description: description.trim() } : {}),
                ...(startDate ? { start_date: startDate } : {}),
                // Har man lavet delopgaver, bliver DE til sagens bygge-to-do fra start.
                ...(Array.isArray(breakdown) && breakdown.some(s => (s.subTasks || []).length) ? { checklist: breakdown } : {}),
            };

            const fields = {
                customer_name: customer.name.trim(),
                customer_email: customer.email.trim() || '',
                customer_phone: customer.phone.trim() || '',
                customer_address: fullAddress || '',
                project_category: title.trim() || 'Sag uden tilbud',
                price_estimate: '',
                carpenter_id: carpenter.id,
                ...(resolvedCustomerId ? { customer_id: resolvedCustomerId } : {}),
                // Selvvalgt sagsnummer med → brug det; ellers udelades feltet, så
                // databasen automatisk tildeler firmaets næste nummer.
                ...(caseNumberInt ? { case_number: caseNumberInt } : {}),
                status: 'Bekræftet opgave',
                accepted_at: nowIso,
                raw_data,
            };

            const { data: lead, error } = await supabase.from('leads').insert([fields]).select().single();
            if (error) {
                // Race på et selvvalgt nummer → venlig besked frem for rå constraint-fejl.
                if (caseNumberInt && (error.code === '23505' || /case_number/i.test(error.message || ''))) {
                    toast.error(`Sagsnummer ${caseNumberInt} findes allerede — vælg et andet.`);
                    setBusy(false);
                    return;
                }
                throw error;
            }

            toast.success('Sagen er oprettet! 🛠️');
            onComplete && onComplete(lead);
        } catch (e) {
            console.error('Kunne ikke oprette sag:', e);
            toast.error(friendlyError(e, 'Kunne ikke oprette sagen. Prøv igen.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ padding: isMobile ? '64px 16px 24px' : '32px', fontFamily: 'Inter, sans-serif', maxWidth: '720px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <HardHat size={26} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.7rem', color: '#0f172a' }}>Opret sag (uden tilbud)</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>Kører du bare ud og fakturerer bagefter? Skriv kundens oplysninger — så ligger sagen klar til timeregistrering og faktura.</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>

                {/* KUNDE */}
                <div style={sectionStyle}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem', color: '#0f172a' }}>
                        <User size={18} color="#10b981" /> Kunde
                    </h3>

                    {/* Kundevælger — vælg fra biblioteket, så felterne udfyldes og sagen
                        kobles til kunden. Vises kun når man HAR kunder (ellers bare felterne). */}
                    {customersList.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle}>Vælg fra kundebiblioteket <span style={{ fontWeight: 400, color: '#94a3b8' }}>(valgfrit)</span></label>
                            <CustomerPicker
                                customers={customersList}
                                value={linkedCustomerId}
                                onSelect={pickCustomer}
                                onClear={clearLinkedCustomer}
                                placeholder="Vælg eksisterende kunde…"
                            />
                            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                Vælg en kunde, så udfyldes felterne automatisk — eller skriv en ny nedenfor, så oprettes den i kundebiblioteket sammen med sagen.
                            </p>
                        </div>
                    )}

                    {/* Privat / Erhverv */}
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px', marginBottom: '16px' }}>
                        {[{ k: 'privat', t: 'Privat' }, { k: 'erhverv', t: 'Erhverv' }].map(({ k, t }) => (
                            <button key={k} type="button" onClick={() => setCustomerType(k)}
                                style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: customerType === k ? '#fff' : 'transparent', color: customerType === k ? '#0f172a' : '#64748b', boxShadow: customerType === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                {t}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                        <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                            <label style={labelStyle}>{customerType === 'erhverv' ? 'Virksomhedsnavn' : 'Navn'} *</label>
                            <input style={inputStyle} value={customer.name} onChange={(e) => setC({ name: e.target.value })} placeholder={customerType === 'erhverv' ? 'Bruns Byg ApS' : 'Fx Jens Hansen'} />
                        </div>
                        {customerType === 'erhverv' && (
                            <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                                <label style={labelStyle}>CVR</label>
                                <input style={inputStyle} value={cvr} onChange={(e) => setCvr(e.target.value.replace(/[^\d]/g, '').slice(0, 8))} placeholder="12345678" inputMode="numeric" />
                            </div>
                        )}
                        <div>
                            <label style={labelStyle}>Telefon</label>
                            <input style={inputStyle} value={customer.phone} onChange={(e) => setC({ phone: formatDkPhone(e.target.value) })} placeholder="+45 12 34 56 78" inputMode="tel" />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input style={inputStyle} type="email" value={customer.email} onChange={(e) => setC({ email: e.target.value })} placeholder="kunde@email.dk" inputMode="email" />
                        </div>
                    </div>
                </div>

                {/* ADRESSE */}
                <div style={sectionStyle}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem', color: '#0f172a' }}>
                        <MapPin size={18} color="#10b981" /> Adresse <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#94a3b8' }}>(hvor opgaven er)</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 2fr', gap: '14px' }}>
                        <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1', position: 'relative' }}>
                            <label style={labelStyle}>Vej og nr.</label>
                            <input
                                style={inputStyle}
                                value={customer.address}
                                onChange={(e) => handleAddressChange(e.target.value)}
                                onFocus={() => { if (addrSuggestions.length > 0) setShowAddrSuggestions(true); }}
                                onBlur={() => { addrBlurRef.current = setTimeout(() => setShowAddrSuggestions(false), 150); }}
                                placeholder="Byggevej 12"
                                autoComplete="off"
                            />
                            {showAddrSuggestions && addrSuggestions.length > 0 && (
                                <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: '4px', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto' }}>
                                    {addrSuggestions.map((item, idx) => (
                                        <li
                                            key={item.tekst || idx}
                                            onMouseDown={(e) => { e.preventDefault(); selectAddress(item); }}
                                            style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#0f172a' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {item.tekst}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Postnr.</label>
                            <input style={inputStyle} value={customer.zip} onChange={(e) => handleZipChange(e.target.value)} placeholder="8000" inputMode="numeric" />
                        </div>
                        <div style={{ gridColumn: isMobile ? 'auto' : '2 / 4' }}>
                            <label style={labelStyle}>By</label>
                            <input style={inputStyle} value={customer.city} onChange={(e) => setC({ city: e.target.value })} placeholder="Aarhus C" />
                        </div>
                    </div>
                </div>

                {/* SAGEN */}
                <div style={sectionStyle}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '1.05rem', color: '#0f172a' }}>
                        <Briefcase size={18} color="#10b981" /> Sagen
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Hvad er opgaven?</label>
                                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx Tilbygning, timepris" />
                            </div>
                            <div>
                                <label style={labelStyle}>Sagsnummer <span style={{ fontWeight: 400, color: '#94a3b8' }}>(valgfrit)</span></label>
                                <input style={inputStyle} value={caseNumber} onChange={(e) => setCaseNumber(e.target.value.replace(/[^\d]/g, ''))} placeholder="Vælges automatisk" inputMode="numeric" />
                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Lad stå tomt, så vælger systemet næste nummer. Skriv dit eget for at føre en gammel sag over.</p>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>Beskrivelse <span style={{ fontWeight: 400, color: '#94a3b8' }}>(valgfrit)</span></label>
                                <button
                                    type="button"
                                    onClick={descriptionDictation.isProcessing ? undefined : descriptionDictation.toggle}
                                    disabled={descriptionDictation.isProcessing}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        minHeight: '36px', padding: '8px 12px', borderRadius: '999px',
                                        border: descriptionDictation.isRecording ? '1px solid #fecaca' : '1px solid #c7d2fe',
                                        background: descriptionDictation.isRecording ? '#fef2f2' : (descriptionDictation.isProcessing ? '#f8fafc' : '#eef2ff'),
                                        color: descriptionDictation.isRecording ? '#dc2626' : (descriptionDictation.isProcessing ? '#64748b' : '#4f46e5'),
                                        fontWeight: 800, fontSize: '0.8rem',
                                        cursor: descriptionDictation.isProcessing ? 'wait' : 'pointer',
                                        boxShadow: descriptionDictation.isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.08)' : 'none',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {descriptionDictation.isProcessing
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : (descriptionDictation.isRecording ? <MicOff size={14} /> : <Mic size={14} />)}
                                    {descriptionDictation.isProcessing ? 'Skriver…' : (descriptionDictation.isRecording ? 'Stop' : 'Indtal')}
                                </button>
                            </div>
                            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kort note om hvad der skal laves…" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={labelStyle}>Startdato <span style={{ fontWeight: 400, color: '#94a3b8' }}>(valgfrit)</span></label>
                                <input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>Afregning</label>
                                <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px', width: '100%' }}>
                                    {[{ k: 'hourly', t: 'Timepris', Icon: Clock }, { k: 'fixed', t: 'Fast pris', Icon: Building2 }].map(({ k, t, Icon }) => (
                                        <button key={k} type="button" onClick={() => setBillingMode(k)}
                                            style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: billingMode === k ? '#fff' : 'transparent', color: billingMode === k ? '#0f172a' : '#64748b', boxShadow: billingMode === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                            <Icon size={15} /> {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Pris pr. afregningsform — altid ekskl. moms (tømrerens tal). */}
                        {billingMode === 'fixed' ? (
                            <div>
                                <label style={labelStyle}>Fast pris <span style={{ fontWeight: 400, color: '#94a3b8' }}>(ekskl. moms)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input style={{ ...inputStyle, paddingRight: '42px' }} value={fixedPrice} onChange={(e) => setFixedPrice(formatDkThousands(e.target.value))} placeholder="Fx 45.000" inputMode="decimal" />
                                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>kr.</span>
                                </div>
                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{momsHint}</p>
                            </div>
                        ) : (
                            <div>
                                <label style={labelStyle}>Timepris <span style={{ fontWeight: 400, color: '#94a3b8' }}>(ekskl. moms)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input style={{ ...inputStyle, paddingRight: '70px' }} value={hourlyRate} onChange={(e) => setHourlyRate(formatDkThousands(e.target.value))} placeholder="Fx 550" inputMode="decimal" />
                                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>kr/time</span>
                                </div>
                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Fakturaen foreslår automatisk dine registrerede timer × timeprisen. {momsHint}</p>
                            </div>
                        )}

                        {/* Moms-valg (kun erhverv): standard MED moms — omvendt betalingspligt
                            vælges kun til ved bygge- og anlægsydelser. */}
                        {customerType === 'erhverv' && (
                            <div>
                                <label style={labelStyle}>Moms</label>
                                <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px', width: '100%' }}>
                                    {[{ v: false, t: 'Med moms (25%)' }, { v: true, t: 'Omvendt betalingspligt' }].map(({ v, t }) => (
                                        <button key={String(v)} type="button" onClick={() => setReverseCharge(v)}
                                            style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: reverseCharge === v ? '#fff' : 'transparent', color: reverseCharge === v ? '#0f172a' : '#64748b', boxShadow: reverseCharge === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Omvendt betalingspligt bruges kun ved byggeydelser til andre virksomheder. Er du i tvivl, så vælg "Med moms".</p>
                            </div>
                        )}
                    </div>

                    {/* Valgfri delopgaver & timer — bliver til bygge-to-do'en og kan sammenlignes senere. */}
                    <button type="button" onClick={() => setShowBreakdown(true)}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(14,165,233,0.14)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
                        style={{ width: '100%', marginTop: '14px', padding: '12px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', transition: 'all .15s' }}>
                        <HardHat size={16} color="#0ea5e9" />
                        {totalManHours(breakdown) > 0 ? `Delopgaver & timer · ${totalManHours(breakdown)} mandetimer` : 'Delopgaver & timer (valgfrit)'}
                    </button>
                    <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Delopgaver bliver til sagens bygge-to-do, så du senere kan sammenligne estimerede og faktiske timer. Springer du dem over, får du standardlisten.
                    </p>

                    <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Materialer kan du tilføje senere inde på sagen, hvis du får brug for det.
                    </p>
                </div>

                {/* HANDLINGER */}
                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', marginTop: '4px' }}>
                    {onCancel && (
                        <button type="button" onClick={onCancel} disabled={busy}
                            style={{ padding: '14px 22px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                            Annullér
                        </button>
                    )}
                    <button type="button" onClick={save} disabled={!canSave || busy}
                        style={{ padding: '14px 26px', borderRadius: '12px', border: 'none', background: (!canSave || busy) ? '#cbd5e1' : 'linear-gradient(145deg,#10b981,#059669)', color: '#fff', fontWeight: 800, fontSize: '0.98rem', cursor: (!canSave || busy) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: (!canSave || busy) ? 'none' : '0 8px 20px rgba(16,185,129,0.3)' }}>
                        <Save size={18} /> {busy ? 'Opretter…' : 'Opret sag'}
                    </button>
                </div>
                {!canSave && (
                    <p style={{ margin: 0, textAlign: isMobile ? 'center' : 'right', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Udfyld navn og enten telefon eller email for at oprette sagen.
                    </p>
                )}
            </div>

            {showBreakdown && (
                <WorkBreakdownModal
                    mode="edit"
                    steps={breakdown}
                    onChange={setBreakdown}
                    onClose={() => setShowBreakdown(false)}
                    hourlyRate={parseDkNum(hourlyRate) || carpenter?.hourly_rate || carpenter?.raw_data?.hourly_rate || 550}
                />
            )}
        </div>
    );
};

export default CreateCaseForm;
