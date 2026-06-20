// ─────────────────────────────────────────────────────────────────────────────
// GRÁFICAS — Chart.js (donut de gastos por tipo + barras ingresos vs gastos)
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData } from './state.js';

let chartByType    = null;
let chartComparison = null;

// Plugin inline: dibuja porcentajes dentro de cada sector del donut
const pieLabelsPlugin = {
    id: 'pieLabels',
    afterDraw(chart) {
        const { ctx } = chart;
        const dataset = chart.data.datasets[0];
        const meta    = chart.getDatasetMeta(0);
        const total   = dataset.data.reduce((a, b) => a + b, 0);
        if (!total) return;

        ctx.save();
        ctx.font         = 'bold 13px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#ffffff';

        meta.data.forEach((arc, i) => {
            const value = dataset.data[i];
            const pct   = (value / total) * 100;
            if (pct < 5) return;

            const midAngle  = (arc.startAngle + arc.endAngle) / 2;
            const midRadius = (arc.innerRadius + arc.outerRadius) / 2;
            const x = arc.x + Math.cos(midAngle) * midRadius;
            const y = arc.y + Math.sin(midAngle) * midRadius;

            ctx.fillText(`${pct.toFixed(1)}%`, x, y);
        });

        ctx.restore();
    }
};

export function renderCharts() {
    const incomes  = localData.incomes.filter(i  => i.projectId === state.activeProjectId);
    const expenses = localData.expenses.filter(e => e.projectId === state.activeProjectId);

    renderExpensesByType(expenses);
    renderIncomeVsExpense(incomes, expenses);
}

function renderExpensesByType(expenses) {
    const TYPES = [
        { key: 'EQU',      label: 'EQU - Equipos',          color: '#f59e0b' },
        { key: 'MAT',      label: 'MAT - Materiales',        color: '#0284c7' },
        { key: 'TPT',      label: 'TPT - Transporte',        color: '#f97316' },
        { key: 'MO',       label: 'MO - Mano de Obra',       color: '#10b981' },
        { key: 'COST IND', label: 'COST IND - Indirectos',   color: '#6366f1' },
        { key: 'CONT',     label: 'CONT - Contratistas',     color: '#ec4899' },
    ];

    const totals = {};
    TYPES.forEach(t => { totals[t.key] = 0; });
    expenses.forEach(e => { if (totals[e.type] !== undefined) totals[e.type] += Number(e.val || 0); });

    // Filtrar tipos con valor 0 para no saturar la leyenda
    const active = TYPES.filter(t => totals[t.key] > 0);
    const total  = active.reduce((s, t) => s + totals[t.key], 0);

    const labels = active.map(t => t.label);
    const data   = active.map(t => totals[t.key]);
    const colors = active.map(t => t.color);

    chartByType?.destroy();
    chartByType = new Chart(
        document.getElementById('chart-expenses-by-type').getContext('2d'),
        {
            type: 'doughnut',
            plugins: [pieLabelsPlugin],
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderWidth: 1, borderColor: '#ffffff' }]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: { size: 11 },
                            generateLabels(chart) {
                                return chart.data.labels.map((label, i) => {
                                    const value = chart.data.datasets[0].data[i];
                                    const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                    return {
                                        text:      `${label}  ${pct}%`,
                                        fillStyle: chart.data.datasets[0].backgroundColor[i],
                                        hidden:    false,
                                        index:     i
                                    };
                                });
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const value = ctx.parsed;
                                const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                const fmt   = value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
                                return `  ${fmt}  (${pct}%)`;
                            }
                        }
                    }
                }
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
