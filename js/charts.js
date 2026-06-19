// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICAS — Chart.js (donut de gastos por tipo + barras ingresos vs gastos)
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData } from './state.js';

let chartByType    = null;
let chartComparison = null;

export function renderCharts() {
    const incomes  = localData.incomes.filter(i  => i.projectId === state.activeProjectId);
    const expenses = localData.expenses.filter(e => e.projectId === state.activeProjectId);

    renderExpensesByType(expenses);
    renderIncomeVsExpense(incomes, expenses);
}

function renderExpensesByType(expenses) {
    const totals = { EQU: 0, MAT: 0, TPT: 0, MO: 0, 'COST IND': 0, CONT: 0 };
    expenses.forEach(e => { if (totals[e.type] !== undefined) totals[e.type] += Number(e.val || 0); });

    chartByType?.destroy();
    chartByType = new Chart(
        document.getElementById('chart-expenses-by-type').getContext('2d'),
        {
            type: 'doughnut',
            data: {
                labels: ['EQU - Equipos', 'MAT - Materiales', 'TPT - Transporte', 'MO - Mano Obra', 'COST IND - Indirectos', 'CONT - Contratistas'],
                datasets: [{
                    data:            Object.values(totals),
                    backgroundColor: ['#f59e0b', '#0284c7', '#f97316', '#10b981', '#6366f1', '#ec4899'],
                    borderWidth:     1,
                    borderColor:     '#ffffff'
                }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
        }
    );
}

function renderIncomeVsExpense(incomes, expenses) {
    const totalIn  = incomes.reduce((s, i)  => s + Number(i.val  || 0), 0);
    const totalOut = expenses.reduce((s, e) => s + Number(e.val || 0), 0);

    chartComparison?.destroy();
    chartComparison = new Chart(
        document.getElementById('chart-income-vs-expense').getContext('2d'),
        {
            type: 'bar',
            data: {
                labels:   ['Saldos Consolidados'],
                datasets: [
                    { label: 'Total Ingresos', data: [totalIn],  backgroundColor: '#10b981', borderRadius: 6 },
                    { label: 'Total Gastos',   data: [totalOut], backgroundColor: '#f43f5e', borderRadius: 6 }
                ]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales:  {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => '$' + v.toLocaleString('es-CO') }
                    }
                }
            }
        }
    );
}
