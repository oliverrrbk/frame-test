// Lønperiode-håndtering og låsning af timer efter lønkørsel.
// Helt additivt — bruges af AdminTimesheet, WorkerTimesheet og CaseManagement.
import { supabase } from '../supabaseClient';

const DAY = 24 * 60 * 60 * 1000;

// Normalisér en dato (Date eller string) til 'YYYY-MM-DD' i lokal tid.
export function toDateKey(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date || '').substring(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Er en registrerings-dato låst? (til og med lockedUntil, inklusive)
export function isDateLocked(entryDate, lockedUntil) {
    if (!lockedUntil || !entryDate) return false;
    return toDateKey(entryDate) <= toDateKey(lockedUntil);
}

// Hvilke roller må køre/låse/genåbne løn
export function canManagePayroll(role) {
    return role === 'admin' || role === 'accountant';
}

// Slut-dato på den senest AFSLUTTEDE lønperiode (det man typisk lønkører).
export function lastCompletedPeriodEnd(cycle, anchor, now = new Date()) {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    if (cycle === 'biweekly') {
        const a = anchor ? new Date(anchor) : new Date(today);
        a.setHours(0, 0, 0, 0);
        const k = Math.floor((today - a) / (14 * DAY)); // index på nuværende periode
        const currentStart = new Date(a.getTime() + k * 14 * DAY);
        const prevEnd = new Date(currentStart.getTime() - DAY); // dagen før nuværende periode
        return toDateKey(prevEnd);
    }
    // monthly: sidste dag i forrige måned
    const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return toDateKey(prevEnd);
}

// Nuværende ÅBNE lønperiode (til visning).
export function currentPeriod(cycle, anchor, now = new Date()) {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    if (cycle === 'biweekly') {
        const a = anchor ? new Date(anchor) : new Date(today);
        a.setHours(0, 0, 0, 0);
        const k = Math.floor((today - a) / (14 * DAY));
        const start = new Date(a.getTime() + k * 14 * DAY);
        const end = new Date(start.getTime() + 13 * DAY);
        return { start: toDateKey(start), end: toDateKey(end) };
    }
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toDateKey(start), end: toDateKey(end) };
}

// Ved genåbning: slut-dato på perioden FØR den der pt. er låst (så seneste periode låses op).
export function previousPeriodEnd(cycle, anchor, lockedUntil) {
    if (!lockedUntil) return null;
    const lu = new Date(lockedUntil); lu.setHours(0, 0, 0, 0);
    if (cycle === 'biweekly') {
        const start = new Date(lu.getTime() - 13 * DAY); // start på den låste periode
        return toDateKey(new Date(start.getTime() - DAY));
    }
    // monthly: lu er sidste dag i måned M -> forrige slut = sidste dag i M-1
    const start = new Date(lu.getFullYear(), lu.getMonth(), 1);
    return toDateKey(new Date(start.getTime() - DAY));
}

export function formatDa(dateKey) {
    if (!dateKey) return '';
    const d = new Date(dateKey);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('da-DK', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- Konfiguration (gemt i payroll_settings.config jsonb) ---
export const DEFAULT_PAYROLL_CONFIG = {
    auto_lock: true,        // lås automatisk hver afsluttet periode
    grace_days: 2,          // antal dages frist efter periodeslut før lås
    daily_hours: 7.4,       // standard arbejdsdag (bruges til ferie/fravær)
    absence_unit: 'days',   // 'days' eller 'hours' — hvordan ferie/fravær eksporteres
    lonart: { normal: '', vacation: '', sick: '', other_absence: '', mileage: '' }
};

export function getConfig(settings) {
    const cfg = settings?.config || {};
    return { ...DEFAULT_PAYROLL_CONFIG, ...cfg, lonart: { ...DEFAULT_PAYROLL_CONFIG.lonart, ...(cfg.lonart || {}) } };
}

// Den reelle låsedato — automatisk (rullende) eller manuel, inkl. genåbning.
export function getEffectiveLockedUntil(settings) {
    if (!settings) return null;
    const cfg = getConfig(settings);
    if (!cfg.auto_lock) return settings.locked_until || null; // manuel tilstand
    const cycle = settings.cycle || 'monthly';
    const anchor = settings.anchor;
    const grace = Number(cfg.grace_days) || 0;
    const shifted = new Date(Date.now() - grace * DAY);
    const auto = lastCompletedPeriodEnd(cycle, anchor, shifted);
    // Manuel genåbning: hold låsen på den valgte 'open_to'-dato, indtil en NY periode er afsluttet.
    const r = cfg.reopen;
    if (r && r.at_auto) {
        if (auto <= r.at_auto) return r.open_to || null; // stadig i det genåbnede vindue
        return auto; // ny periode afsluttet -> genlås automatisk
    }
    // Bagudkompatibel med tidligere 'reopen_marker'
    if (cfg.reopen_marker && auto <= cfg.reopen_marker) {
        return previousPeriodEnd(cycle, anchor, auto);
    }
    return auto;
}

// Datointerval for den senest afsluttede lønperiode.
export function lastCompletedPeriodRange(cycle, anchor, now = new Date()) {
    const endKey = lastCompletedPeriodEnd(cycle, anchor, now);
    const end = new Date(endKey);
    if (cycle === 'biweekly') {
        const start = new Date(end.getTime() - 13 * DAY);
        return { start: toDateKey(start), end: endKey };
    }
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start: toDateKey(start), end: endKey };
}

// Dansk talformat (komma som decimal).
export function num(n) {
    return String(Math.round((Number(n) || 0) * 100) / 100).replace('.', ',');
}

// Opsummér registreringer pr. medarbejder for en periode (til løneksport).
// entries: array med {employeeId, date, hours, km, leadId, absenceType}
export function aggregatePayroll(entries, cfg) {
    const dailyHours = Number(cfg.daily_hours) || 7.4;
    const byEmp = {};
    const ensure = (id) => (byEmp[id] = byEmp[id] || { employeeId: id, normalHours: 0, vacationDays: 0, sickDays: 0, otherDays: 0, mileage: 0 });
    entries.forEach(e => {
        const r = ensure(e.employeeId);
        r.mileage += Number(e.km) || 0;
        if (e.leadId === 'internal') {
            const t = e.absenceType;
            if (t === 'Ferie') r.vacationDays += 1;
            else if (t === 'Sygdom') r.sickDays += 1;
            else r.otherDays += 1;
        } else {
            r.normalHours += Number(e.hours) || 0;
        }
    });
    // Beregn fravær i den valgte enhed
    Object.values(byEmp).forEach(r => {
        const toUnit = (days) => cfg.absence_unit === 'hours' ? Math.round(days * dailyHours * 100) / 100 : days;
        r.vacation = toUnit(r.vacationDays);
        r.sick = toUnit(r.sickDays);
        r.other = toUnit(r.otherDays);
        r.normalHours = Math.round(r.normalHours * 100) / 100;
    });
    return byEmp;
}

// Byg CSV-tekst (semikolon-separeret, komma-decimaler).
export function buildSummaryCSV(rows) {
    const head = ['Medarbejdernr', 'Navn', 'Normaltimer', 'Ferie', 'Sygdom', 'Øvrigt fravær', 'Kørsel (km)'];
    const lines = [head.join(';')];
    rows.forEach(r => {
        lines.push([r.lonnummer || '', `"${r.name}"`, num(r.normalHours), num(r.vacation), num(r.sick), num(r.other), num(r.mileage)].join(';'));
    });
    return lines.join('\n');
}

// Lønart-baseret transaktionsfil — universel (én linje pr. medarbejder pr. lønart).
export function buildLonartCSV(rows, lonart, periodLabel) {
    const head = ['Medarbejdernr', 'Lønart', 'Antal', 'Periode'];
    const lines = [head.join(';')];
    const push = (nr, code, qty) => { if (code && Number(qty) > 0) lines.push([nr || '', code, num(qty), periodLabel].join(';')); };
    rows.forEach(r => {
        push(r.lonnummer, lonart.normal, r.normalHours);
        push(r.lonnummer, lonart.vacation, r.vacation);
        push(r.lonnummer, lonart.sick, r.sick);
        push(r.lonnummer, lonart.other_absence, r.other);
        push(r.lonnummer, lonart.mileage, r.mileage);
    });
    return lines.join('\n');
}

// Hjælper: trigger download af en CSV-streng.
export function downloadCSV(filename, csv) {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Lønnummer ---
// Gyldigt lønnummer = kun cifre (lønsystemer kan ikke håndtere bogstaver/tegn).
export function isValidLonnummer(v) {
    return /^\d+$/.test(String(v ?? '').trim());
}

// Næste ledige lønnummer (starter ved 1001, tæller op fra højeste eksisterende).
export function nextLonnummer(existing) {
    const nums = (existing || [])
        .map(x => parseInt(String(x).trim(), 10))
        .filter(n => !isNaN(n));
    const max = Math.max(1000, ...nums);
    return String(max + 1);
}

// Hent firmaets løn-indstillinger (eller null hvis ingen findes / tabel mangler).
export async function fetchPayrollSettings(companyId) {
    if (!companyId) return null;
    try {
        const { data, error } = await supabase
            .from('payroll_settings')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    } catch (err) {
        // Tabellen findes måske ikke endnu — fejl ignoreres, så intet går i stykker.
        console.warn('Kunne ikke hente løn-indstillinger:', err?.message || err);
        return null;
    }
}

// Gem (upsert) firmaets løn-indstillinger.
export async function savePayrollSettings(companyId, fields) {
    const payload = { company_id: companyId, updated_at: new Date().toISOString(), ...fields };
    const { data, error } = await supabase
        .from('payroll_settings')
        .upsert(payload, { onConflict: 'company_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}
