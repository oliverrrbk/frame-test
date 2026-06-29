// Delt økonomi-helper for en sag/lead.
//
// BAGGRUND: Tidligere blev "rest at fakturere" udregnet som caseTotal (inkl. moms)
// minus invoiced_amount (gemt EKSKL. moms). Det efterlod altid momsen som "mangler
// at faktureres" — selv når hele sagen var faktureret. Denne helper samler
// regnestykket ét sted, så moms-konverteringen er konsistent overalt.
//
// Konventioner:
//  * basePrice / actual_quote_price / extra_agreements-beløb behandles som kundens
//    INKL.-moms-tal (det er sådan de bruges i faktura-byggeren, der deler med 1,25).
//  * invoiced_amount og invoice_history[].amount gemmes EKSKL. moms (= fakturalinjernes
//    sum), og momsen lægges på af Dinero/e-conomic. Vi ganger op til inkl. moms ved visning.
//  * Omsætning = EKSKL. moms (momsen er ikke omsætning, men en gennemstrømning til staten).

// Statusser på invoice_history der tæller som "kommet over"/bogført.
export const BOOKED_INVOICE_STATUSES = ['booked', 'paid', 'manual'];

// Lille rundings-tolerance så 1,25-op/ned-rundinger ikke efterlader en falsk rest.
const ROUNDING_TOLERANCE = 2;

// Omvendt betalingspligt (B2B) → ingen moms. Matcher tjekket i InvoiceEditor.
export const isReverseChargeLead = (lead) => !!(lead?.raw_data?.customerDetails?.cvr);

// Basis-pris (inkl. moms) — samme prioritet som FinanceOverview brugte.
const getBasePriceInclVat = (lead) => {
    const rd = lead?.raw_data || {};

    // Manuel sag (oprettet uden tilbud): prisen styres af afregningsformen og gemmes
    // EKSKL. moms (tømrerens tal). Privat → læg 25% moms på; erhverv (CVR) → uden moms
    // (omvendt betalingspligt). Timepris = registrerede timer × timepris.
    if (rd.is_manual_case) {
        const toIncl = (exVat) => isReverseChargeLead(lead) ? Math.round(exVat) : Math.round(exVat * 1.25);
        if (rd.billing_mode === 'hourly' && Number(rd.hourly_rate) > 0) {
            const hours = (rd.time_entries || []).reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
            return toIncl(hours * Number(rd.hourly_rate));
        }
        if (rd.billing_mode === 'fixed' && Number(rd.fixed_price_ex_vat) > 0) {
            return toIncl(Number(rd.fixed_price_ex_vat));
        }
        // Ingen pris sat endnu → 0 (falder ikke igennem til tilbuds-felterne).
        return 0;
    }

    if (rd.calc_data?.totalPrice) {
        return parseFloat(rd.calc_data.totalPrice) || 0;
    }
    if (rd.actual_quote_price) {
        return typeof rd.actual_quote_price === 'number'
            ? rd.actual_quote_price
            : parseInt(String(rd.actual_quote_price).replace(/[^0-9]/g, '')) || 0;
    }
    const priceStr = String(lead?.price_estimate ?? '0');
    const firstPricePart = priceStr.split('-')[0] || priceStr;
    return parseInt(firstPricePart.replace(/[^0-9]/g, '')) || 0;
};

// Ekstrapris fra logbog (ændringsordrer) + bekræftede aftalesedler (inkl. moms).
const getExtraPriceInclVat = (lead) => {
    const rd = lead?.raw_data || {};
    const logExtra = (rd.case_logs || [])
        .filter(l => l.isChangeOrder)
        .reduce((sum, item) => sum + (item.extraPrice || 0), 0);

    const isAgrConfirmed = (a) => a.status === 'bekraeftet' || a.status === 'Godkendt';
    const agrExtra = (rd.extra_agreements || [])
        .filter(isAgrConfirmed)
        .reduce((sum, item) => {
            if (item.priceType === 'fast_pris') return sum + (Number(item.amount) || 0);
            if (item.priceType === 'efter_regning') return sum + (Number(item.final_amount) || 0);
            return sum;
        }, 0);

    return logExtra + agrExtra;
};

export function computeCaseFinance(lead) {
    const rd = lead?.raw_data || {};
    const vatRate = isReverseChargeLead(lead) ? 0 : 0.25;

    const extraPriceInclVat = getExtraPriceInclVat(lead);
    const caseTotalInclVat = getBasePriceInclVat(lead) + extraPriceInclVat;

    // invoiced_amount gemmes ekskl. moms → gang op til inkl. moms for at matche totalen.
    const invoicedExVat = Number(rd.invoiced_amount || 0);
    const invoicedInclVat = Math.round(invoicedExVat * (1 + vatRate));

    const rawRemaining = caseTotalInclVat - invoicedInclVat;
    const remainingInclVat = Math.abs(rawRemaining) <= ROUNDING_TOLERANCE ? 0 : Math.max(0, Math.round(rawRemaining));
    const isFullyInvoiced = invoicedExVat > 0 && remainingInclVat === 0;

    const history = rd.invoice_history || [];
    // Omsætning (ekskl. moms): kun fakturaer der er bogført/betalt/manuelt registreret.
    const bookedRevenueExVat = history
        .filter(inv => BOOKED_INVOICE_STATUSES.includes(inv.status))
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    // Betalt (ekskl. moms) — uændret betydning fra før.
    const paidExVat = history
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    return {
        vatRate,
        caseTotalInclVat,
        extraPriceInclVat,
        invoicedExVat,
        invoicedInclVat,
        remainingInclVat,
        isFullyInvoiced,
        bookedRevenueExVat,
        paidExVat,
    };
}
