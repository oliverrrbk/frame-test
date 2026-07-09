// ============================================================================
// PhoneInput.jsx — genbrugelig, "rigtig" telefon-indtastning i Bison Frame-stil.
// Bruges ALLE steder man skriver et telefonnummer ind.
//
// - Dansk som standard: fast "+45"-chip + auto-formatering i par (40 59 85 68),
//   maks 8 cifre. Viser en lille hjælpe-tekst hvis der ikke er 8 cifre endnu.
// - Udenlandsk: klik "Udenlandsk nummer" → fri indtastning med landekode (+49 …),
//   og en "ser det rigtigt ud?"-hjælpetekst hvis formatet ser forkert ud.
//
// onChange(str): i DK-tilstand udsendes det lokale nummer i par (fx "40 59 85 68");
// i udlands-tilstand udsendes hele strengen inkl. "+" og landekode. Bagud-kompatibelt
// med det gamle BeautifulPhoneInput (som nu blot wrapper denne komponent).
// ============================================================================
import React, { useState } from 'react';
import { Phone, Globe, Check, AlertCircle } from 'lucide-react';

const fmtDkPairs = (raw) => (String(raw).replace(/\D/g, '').slice(0, 8).match(/.{1,2}/g)?.join(' ') || '');
const dkDigits = (raw) => String(raw).replace(/\D/g, '').slice(0, 8);
// Gyldigt udlands-nummer: + og 7–15 cifre (E.164), mellemrum tilladt.
const intlLooksValid = (raw) => /^\+\d[\d\s]{6,17}$/.test(String(raw).trim());

export default function PhoneInput({ value = '', onChange, placeholder, autoFocus = false, name }) {
    const startIntl = String(value || '').trim().startsWith('+');
    const [intl, setIntl] = useState(startIntl);
    const [focused, setFocused] = useState(false);

    const digits = dkDigits(value);
    const dkIncomplete = !intl && digits.length > 0 && digits.length < 8;
    const intlInvalid = intl && String(value).trim().length > 1 && !intlLooksValid(value);

    const switchToIntl = () => {
        setIntl(true);
        // Forudfyld med +45 så landekode-mønsteret er tydeligt, hvis feltet er tomt.
        if (!String(value).trim().startsWith('+')) onChange(`+45 ${value || ''}`.trim());
    };
    const switchToDk = () => {
        setIntl(false);
        onChange(fmtDkPairs(value));
    };

    return (
        <div>
            <div style={{
                display: 'flex', alignItems: 'stretch',
                border: `1px solid ${focused ? '#3b82f6' : (dkIncomplete || intlInvalid) ? '#f59e0b' : '#e2e8f0'}`,
                borderRadius: '12px', background: '#fff',
                boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                transition: 'all 0.2s', overflow: 'hidden',
            }}>
                {!intl && (
                    <div style={{ padding: '0 12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <Phone size={14} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>+45</span>
                    </div>
                )}
                {intl && (
                    <div style={{ padding: '0 10px', color: '#64748b', display: 'flex', alignItems: 'center', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <Globe size={14} />
                    </div>
                )}
                <input
                    name={name}
                    autoFocus={autoFocus}
                    value={value}
                    onChange={(e) => onChange(intl ? e.target.value : fmtDkPairs(e.target.value))}
                    inputMode={intl ? 'tel' : 'numeric'}
                    type="tel"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder || (intl ? '+49 151 23456789' : '40 59 85 68')}
                    style={{ flex: 1, border: 'none', padding: '12px 14px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', background: 'transparent', width: '100%', minWidth: 0 }}
                />
                {!intl && digits.length === 8 && (
                    <div style={{ display: 'flex', alignItems: 'center', paddingRight: '12px', color: '#16a34a' }}><Check size={16} /></div>
                )}
            </div>

            {/* Hjælpetekst + skift mellem dansk/udenlandsk */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '5px', minHeight: '16px' }}>
                <span style={{ fontSize: '0.72rem', color: (dkIncomplete || intlInvalid) ? '#b45309' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {dkIncomplete && <><AlertCircle size={12} /> Et dansk nummer har 8 cifre</>}
                    {intlInvalid && <><AlertCircle size={12} /> Ser det rigtigt ud? Husk landekode (fx +49 …)</>}
                </span>
                <button type="button" onClick={intl ? switchToDk : switchToIntl}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#3b82f6', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {intl ? 'Dansk nummer (+45)' : 'Udenlandsk nummer?'}
                </button>
            </div>
        </div>
    );
}
