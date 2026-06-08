/**
 * Beregning af danske helligdage og fridage (inkl. faste og bevægelige).
 * Tager højde for, at Store Bededag blev afskaffet som helligdag i 2024.
 */

// Gauss' påskeformel for at finde Påskedag for et givet år
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month - 1, day);
}

// Hjælpefunktion til at lægge dage til en dato
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Formater som 'YYYY-MM-DD' i lokal tidszone
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returnerer et Set af 'YYYY-MM-DD' strenge for alle danske helligdage i et givet år.
 */
export function getDanishHolidays(year) {
    const easter = getEasterDate(year);
    
    const holidays = [
        new Date(year, 0, 1), // Nytårsdag (1. Jan)
        addDays(easter, -3),  // Skærtorsdag
        addDays(easter, -2),  // Langfredag
        easter,               // Påskedag
        addDays(easter, 1),   // 2. Påskedag
        addDays(easter, 39),  // Kristi Himmelfartsdag
        addDays(easter, 49),  // Pinsedag
        addDays(easter, 50),  // 2. Pinsedag
        new Date(year, 5, 5), // Grundlovsdag (5. Juni - regnes oftest som fridag for håndværkere)
        new Date(year, 11, 24), // Juleaftensdag (24. Dec)
        new Date(year, 11, 25), // 1. Juledag (25. Dec)
        new Date(year, 11, 26), // 2. Juledag (26. Dec)
        new Date(year, 11, 31), // Nytårsaftensdag (31. Dec)
    ];

    const formattedHolidays = holidays.map(formatDate);
    return new Set(formattedHolidays);
}

/**
 * Tjekker om en specifik dato (YYYY-MM-DD) er en dansk helligdag eller weekend.
 */
export function isWeekendOrHoliday(dateString) {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Søndag, 6 = Lørdag
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
    }

    const year = date.getFullYear();
    const holidays = getDanishHolidays(year);
    
    return holidays.has(dateString);
}
