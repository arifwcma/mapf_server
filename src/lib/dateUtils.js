import { MONTH_NAMES_FULL, MONTH_NAMES_SHORT } from './config.js'

export function getMonthDateRange(year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end }
}

export function getPreviousMonth(year, month) {
    if (month === 1) {
        return { year: year - 1, month: 12 }
    }
    return { year, month: month - 1 }
}

export function getNextMonth(year, month) {
    if (month === 12) {
        return { year: year + 1, month: 1 }
    }
    return { year, month: month + 1 }
}

export function formatMonthLabel(year, month, short = false) {
    const monthNames = short ? MONTH_NAMES_SHORT : MONTH_NAMES_FULL
    return `${monthNames[month - 1]} ${year}`
}

export function monthKey(year, month) {
    return `${year}-${month}`
}

export function parseMonthKey(key) {
    const [year, month] = key.split('-').map(Number)
    return { year, month }
}

