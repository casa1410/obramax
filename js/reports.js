// ─────────────────────────────────────────────────────────────────────────────
// REPORTES — Vista previa, impresión, exportación Excel y CSV
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData } from './state.js';
import { formatCurrency }   from './utils.js';
import { showToast }        from './ui.js';

// ── Vista previa del reporte ──────────────────────────────────────────────────

export function updateReportPreview() {
    const proj = localData.projects.find(p => p.id === state.activeProjectId);

    if (!proj) {
        document.getElementById('report-project-name').innerText  = 'Ninguno seleccionado';
        document.getElementById('report-project-code').innerText  = 'S/C';
        document.getElementById('report-income-rows').innerHTML   = `<tr><td colspan="4" class="py-4 text-center text-slate-400">Seleccione un proyecto activo.</td></tr>`;
        document.getElementById('report-expense-rows').innerHTML  = `<tr><td colspan="6" class="py-4 text-center text-slate-400">Seleccione un proyecto activo.</td></tr>`;
        return;
    }

    const startDate = document.getElementById('report-filter-start').value;
    const endDate   = document.getElementById('report-filter-end').value;

    let incomes  = localData.incomes.filter(i  => i.projectId === state.activeProjectId);
    let expenses = localData.expenses.filter(e => e.projectId === state.activeProjectId);
    if (startDate) { incomes = incomes.filter(i => i.date >= startDate); expenses = expenses.filter(e => e.date >= startDate); }
    if (endDate)   { incomes = incomes.filter(i => i.date <= endDate);   expenses = expenses.filter(e => e.date <= endDate);   }

    document.getElementById('report-project-name').innerText  = proj.name;
    document.getElementById('report-project-code').innerText  = proj.code || 'Sin Código';
    document.getElementById('report-generated-at').innerText  = `Fecha: ${new Date().toLocaleDateString('es-CO')}`;
    document.getElementById('report-date-range').innerText    = (startDate || endDate)
        ? `Rango: ${startDate || 'Origen'} al ${endDate || 'Hoy'}`
        : 'Todo el historial registrado';

    const totalIn  = incomes.reduce((s, i)  => s + Number(i.val  || 0), 0);
    const totalOut = expenses.reduce((s, e) => s + Number(e.val || 0), 0);
    document.getElementById('report-summary-income').innerText  = formatCurrency(totalIn);
    document.getElementById('report-summary-expense').innerText = formatCurrency(totalOut);
    document.getElementById('report-summary-balance').innerText = formatCurrency(totalIn - totalOut);

    document.getElementById('report-income-rows').innerHTML = incomes.length === 0
        ? `<tr><td colspan="4" class="py-4 text-center text-slate-400">Sin ingresos en este periodo.</td></tr>`
        : incomes.map(i => `
            <tr>
                <td class="py-2 px-3">${i.date}</td>
                <td class="py-2 px-3 font-semibold text-slate-800">${i.source}</td>
                <td class="py-2 px-3 text-slate-500">${i.obs || '-'}</td>
                <td class="py-2 px-3 text-right font-bold text-emerald-600">${formatCurrency(i.val)}</td>
            </tr>`).join('');

    document.getElementById('report-expense-rows').innerHTML = expenses.length === 0
        ? `<tr><td colspan="6" class="py-4 text-center text-slate-400">Sin gastos en este periodo.</td></tr>`
        : expenses.map(e => `
            <tr>
                <td class="py-2 px-3">${e.date}</td>
                <td class="py-2 px-3 font-semibold text-slate-800">${e.desc}</td>
                <td class="py-2 px-3 text-slate-600">${e.provider}</td>
                <td class="py-2 px-3 font-bold">${e.type}</td>
                <td class="py-2 px-3 text-slate-500">${e.support}${e.supportNo ? ` (${e.supportNo})` : ''}</td>
                <td class="py-2 px-3 text-right font-bold text-rose-600">${formatCurrency(e.val)}</td>
            </tr>`).join('');
}

// ── Imprimir / PDF ────────────────────────────────────────────────────────────

export function triggerPrint() {
    window.print();
}

// ── Exportar Excel ────────────────────────────────────────────────────────────

export function exportToExcel() {
    const proj = localData.projects.find(p => p.id === state.activeProjectId);
    if (!proj) { showToast('Seleccione una obra activa para exportar.', 'error'); return; }

    const wb = XLSX.utils.book_new();

    const incomeRows = localData.incomes
        .filter(i => i.projectId === state.activeProjectId)
        .map(i => ({ Fecha: i.date, Concepto_Fuente: i.source, Observaciones: i.obs || '', Valor: i.val }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), 'Ingresos');

    const expenseRows = localData.expenses
        .filter(e => e.projectId === state.activeProjectId)
        .map(e => ({ Fecha: e.date, Descripcion: e.desc, Proveedor: e.provider, Tipo_Gasto: e.type, Soporte: e.support, No_Soporte: e.supportNo || '', Observaciones: e.obs || '', Valor: e.val }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), 'Gastos');

    XLSX.writeFile(wb, `Reporte_Obramax_${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
    showToast('Reporte Excel generado y descargado.', 'success');
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────

export function exportToCSV() {
    const proj = localData.projects.find(p => p.id === state.activeProjectId);
    if (!proj) { showToast('Seleccione una obra activa para exportar.', 'error'); return; }

    const q = s => `"${s.replace(/"/g, '""')}"`;

    const rows = [
        'CONCEPTO,FECHA,DESCRIPCION/FUENTE,PROVEEDOR,TIPO_GASTO,SOPORTE,VALOR',
        ...localData.incomes
            .filter(i => i.projectId === state.activeProjectId)
            .map(i => `INGRESO,${i.date},${q(i.source)},N/A,N/A,N/A,${i.val}`),
        ...localData.expenses
            .filter(e => e.projectId === state.activeProjectId)
            .map(e => `GASTO,${e.date},${q(e.desc)},${q(e.provider)},${e.type},${q(e.support + (e.supportNo ? ` ${e.supportNo}` : ''))},${e.val}`)
    ];

    const link    = document.createElement('a');
    link.href     = 'data:text/csv;charset=utf-8,' + encodeURI(rows.join('\n'));
    link.download = `Reporte_Obramax_${proj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte CSV generado.', 'success');
}
