// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE FORMATO (funciones puras, sin dependencias)
// ─────────────────────────────────────────────────────────────────────────────

export function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
        style:                 'currency',
        currency:              'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Formatea el input mientras el usuario escribe (separador de miles automático)
export function formatCurrencyInput(input) {
    const digits = input.value.replace(/\D/g, '');
    if (!digits) { input.value = ''; return; }
    input.value = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(digits);
}

// Convierte "1.200.000" → 1200000
export function getRawNumericValue(formatted) {
    return Number(formatted.replace(/\./g, '').replace(/\$/g, '').replace(/,/g, '').trim()) || 0;
}

export function todayISO() {
    return new Date().toISOString().split('T')[0];
}
