import { supabase } from '../supabaseClient';

/**
 * Auto-læring: Henter kalibreringsfaktor til calculator.
 *
 * - Per-tømrer kalibrering bygger på (carpenter, category) historik.
 * - Globalt aggregat bruges som "prior" så nye tømrere ikke starter blindt.
 * - Bayesisk vægtning: 0 tilbud = 100% global, 10 = 50/50, 50+ = primært individuel.
 *
 * Faktoren skal kun anvendes på IKKE-materiale-delen af prisen (timer + tillægs +
 * buffer + kørsel). Materialepriser er hellige og rødres aldrig — tømreren har
 * sat dem efter sine egne leverandøraftaler.
 */

const GLOBAL_PRIOR_WEIGHT = 10; // antal "fiktive" globale tilbud som prior
const FACTOR_MIN = 0.6;          // sikkerhedsnet — accepter ikke vilde værdier
const FACTOR_MAX = 1.8;

export const fetchCalibrationFactor = async (carpenterId, category) => {
    if (!carpenterId || !category) return { factor: 1.0, source: 'none', sampleSize: 0 };

    try {
        const [carpRes, globalRes] = await Promise.all([
            supabase
                .from('carpenter_calibration')
                .select('factor, sample_size')
                .eq('carpenter_id', carpenterId)
                .eq('category', category)
                .maybeSingle(),
            supabase
                .from('global_calibration')
                .select('factor, sample_size')
                .eq('category', category)
                .maybeSingle(),
        ]);

        const carp = carpRes.data;
        const glob = globalRes.data;

        const indFactor = carp?.factor ? Number(carp.factor) : null;
        const indN = carp?.sample_size ? Number(carp.sample_size) : 0;
        const globFactor = glob?.factor ? Number(glob.factor) : 1.0;
        const globN = glob?.sample_size ? Number(glob.sample_size) : 0;

        // Bayesisk shrinkage: (global*W + individuel*n) / (W + n)
        let blended;
        let source;
        if (indFactor !== null && indN > 0) {
            blended = (globFactor * GLOBAL_PRIOR_WEIGHT + indFactor * indN) / (GLOBAL_PRIOR_WEIGHT + indN);
            source = indN >= 5 ? 'individual' : 'blended';
        } else if (globN > 0) {
            blended = globFactor;
            source = 'global';
        } else {
            blended = 1.0;
            source = 'none';
        }

        // Sikkerhedsnet
        blended = Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, blended));

        return {
            factor: Number(blended.toFixed(4)),
            source,
            sampleSize: indN,
            globalSampleSize: globN,
            individualFactor: indFactor,
            globalFactor,
        };
    } catch (err) {
        console.warn('Calibration fetch failed, using factor 1.0', err);
        return { factor: 1.0, source: 'error', sampleSize: 0 };
    }
};

/**
 * Læselig forklaring til UI-badge i tømrerens dashboard.
 */
export const describeCalibration = (calib) => {
    if (!calib || calib.source === 'none' || calib.source === 'error') return null;
    const pct = ((calib.factor - 1.0) * 100).toFixed(0);
    if (Math.abs(Number(pct)) < 2) return null;
    const sign = Number(pct) > 0 ? '+' : '';
    if (calib.source === 'individual') {
        return `Estimat justeret ${sign}${pct}% baseret på dine seneste ${calib.sampleSize} tilbud i denne kategori.`;
    } else if (calib.source === 'blended') {
        return `Estimat justeret ${sign}${pct}% — kombination af dine ${calib.sampleSize} tilbud og branchegennemsnit.`;
    } else if (calib.source === 'global') {
        return `Estimat justeret ${sign}${pct}% baseret på branchegennemsnit (du har endnu ingen tilbud i denne kategori).`;
    }
    return null;
};
