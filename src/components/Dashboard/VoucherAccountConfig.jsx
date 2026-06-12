import React, { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

// Konto-opsætning for bilags-overførsel (udgifter) til e-conomic eller Dinero.
// Gemmes på firma-profilen (carpenters.raw_data.{system}_voucher_config), så
// edge-funktionerne 'economic-voucher' / 'dinero-voucher' selv kan slå konti op.
const VoucherAccountConfig = ({ system = 'economic', carpenterProfile, setCarpenterProfile }) => {
    const storageKey = `${system}_voucher_config`;
    const needsContra = system === 'economic'; // Dinero-købsbilag balancerer selv kreditorsiden
    const existing = carpenterProfile?.raw_data?.[storageKey] || {};
    const [expenseAccount, setExpenseAccount] = useState(existing.expenseAccount || '');
    const [contraAccount, setContraAccount] = useState(existing.contraAccount || '');
    const [vatCode, setVatCode] = useState(existing.vatCode || '');
    const [saving, setSaving] = useState(false);

    const isConfigured = existing.expenseAccount && (!needsContra || existing.contraAccount);

    const save = async () => {
        if (!expenseAccount || (needsContra && !contraAccount)) {
            toast.error(needsContra ? 'Udfyld både udgiftskonto og modkonto.' : 'Udfyld udgiftskonto.');
            return;
        }
        setSaving(true);
        try {
            const { data: latest } = await supabase.from('carpenters').select('raw_data').eq('id', carpenterProfile.id).single();
            const currentRaw = latest?.raw_data || carpenterProfile.raw_data || {};
            const newRaw = {
                ...currentRaw,
                [storageKey]: {
                    expenseAccount: String(expenseAccount).trim(),
                    contraAccount: String(contraAccount).trim(),
                    vatCode: String(vatCode).trim()
                }
            };
            const { error } = await supabase.from('carpenters').update({ raw_data: newRaw }).eq('id', carpenterProfile.id);
            if (error) throw error;
            if (setCarpenterProfile) setCarpenterProfile(prev => ({ ...prev, raw_data: newRaw }));
            toast.success('Bilags-konti gemt.');
        } catch (err) {
            console.error('Kunne ikke gemme bilags-konti:', err);
            toast.error('Kunne ikke gemme konto-opsætningen.');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' };
    const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' };

    return (
        <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Bilag (udgifter)</h4>
                {isConfigured && <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Klar</span>}
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#6b7280' }}>
                Når svende uploader en kvittering (fx fra Stark eller en VVS'er), oprettes et bilag i {system === 'economic' ? 'e-conomic' : 'Dinero'} med billedet vedhæftet, konteret på disse konti — klar til bogføring. Spørg evt. din bogholder om de rigtige kontonumre.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: needsContra ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                    <label style={labelStyle}>Udgiftskonto (debet)</label>
                    <input style={inputStyle} inputMode="numeric" placeholder="fx 1300" value={expenseAccount} onChange={e => setExpenseAccount(e.target.value.replace(/[^0-9]/g, ''))} />
                </div>
                {needsContra && (
                    <div>
                        <label style={labelStyle}>Modkonto (kredit)</label>
                        <input style={inputStyle} inputMode="numeric" placeholder="fx 6900" value={contraAccount} onChange={e => setContraAccount(e.target.value.replace(/[^0-9]/g, ''))} />
                    </div>
                )}
            </div>
            <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Momskode (valgfri)</label>
                <input style={{ ...inputStyle, maxWidth: '180px' }} placeholder={system === 'economic' ? 'fx I25' : 'fx købsmoms'} value={vatCode} onChange={e => setVatCode(e.target.value)} />
            </div>
            <button
                onClick={save}
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}
            >
                <Save size={16} /> {saving ? 'Gemmer...' : 'Gem bilags-konti'}
            </button>
        </div>
    );
};

export default VoucherAccountConfig;
