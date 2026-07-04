import { env } from '../env.js';
/** MSMED compound interest at 3× RBI bank rate from due date to today. */
export function calculateMsmedInterest(principal, dueDate, isMsmeSupplier, asOf = new Date()) {
    if (!isMsmeSupplier || principal <= 0)
        return 0;
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date(asOf);
    today.setHours(0, 0, 0, 0);
    if (today <= due)
        return 0;
    const annualRate = env.RBI_BANK_RATE * 3 / 100;
    const msPerDay = 86_400_000;
    const days = Math.floor((today.getTime() - due.getTime()) / msPerDay);
    if (days <= 0)
        return 0;
    const dailyRate = annualRate / 365;
    return Math.round(principal * (Math.pow(1 + dailyRate, days) - 1) * 100) / 100;
}
