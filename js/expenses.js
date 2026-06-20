// ─────────────────────────────────────────────────────────────────────────────
// GASTOS — CRUD de gastos de obra + manejo de adjuntos
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData, ROLE_PERMISSIONS, saveLocalData } from './state.js';
import { formatCurrency, getRawNumericValue, todayISO }       from './utils.js';
import { showToast }                                          from './ui.js';
import { cloudSave, cloudDelete }                             from './firebase.js';

function refresh() { document.dispatchEvent(new Event('app:refresh')); }

const TYPE_COLORS = {
    EQU:        'bg-amber-100 text-amber-800',
    MAT:        'bg-sky-100 text-sky-800',
    TPT:        'bg-orange-100 text-orange-800',
    MO:         'bg-emerald-100 text-emerald-800',
    'COST IND': 'bg-indigo-100 text-indigo-800',
    CONT:       'bg-pink-100 text-pink-800'
};

// ── Listado con filtros ───────────────────────────────────────────────────────

export function loadExpensesList() {
    const tbody          = document.getElementById('expenses-tbody');
    const startDate      = document.getElementById('expense-filter-start').value;
    const endDate        = document.getElementById('expense-filter-end').value;
    const filterType     = document.getElementById('expense-filter-type').value;
    const filterProvider = document.getElementById('expense-filter-provider').value.toLowerCase().trim();
    const filterSupport  = document.getElementById('expense-filter-support').value;

    let list = localData.expenses.filter(e => e.projectId === state.activeProjectId);
    if (startDate)      list = list.filter(e => e.date >= startDate);
    if (endDate)        list = list.filter(e => e.date <= endDate);
    if (filterType)     list = list.filter(e => e.type === filterType);
    if (filterProvider) list = list.filter(e => e.provider.toLowerCase().includes(filterProvider));
    if (filterSupport)  list = list.filter(e => e.support === filterSupport);
    list.sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById('expense-pagination-info').innerText = `Mostrando ${list.length} gastos registrados`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400 text-xs">No se encontraron gastos con los filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(e => {
        const typeColor = TYPE_COLORS[e.type] || 'bg-slate-100 text-slate-700';
        return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
            <td class="py-3 px-4 font-mono text-slate-500">${e.date}</td>
            <td class="py-3 px-4 font-bold text-slate-900">${e.desc}</td>
            <td class="py-3 px-4 text-slate-600">${e.provider}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${typeColor}">${e.type}</span></td>
            <td class="py-3 px-4">
                <span class="font-medium text-slate-700 text-[11px] block">${e.support}</span>
                ${e.supportNo ? `<span class="text-[10px] text-slate-400 font-mono">Nº ${e.supportNo}</span>` : ''}
            </td>
            <td class="py-3 px-4 text-right font-bold text-rose-600">${formatCurrency(e.val)}</td>
            <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    ${e.file ? `<a href="${e.file}" target="_blank" class="text-xs text-primary-600 hover:text-primary-800" title="Ver adjunto"><i class="fa-solid fa-file-pdf"></i></a>` : ''}
                    <button onclick="openExpenseModal('${e.id}')" class="text-xs text-slate-500 hover:text-slate-900 p-1" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteExpense('${e.id}')" class="text-xs text-rose-500 hover:text-rose-700 p-1" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function openExpenseModal(id = '') {
    if (!state.activeProjectId) {
        showToast('Seleccione una obra primero.', 'error');
        return;
    }
    document.getElementById('modal-expense').classList.remove('hidden');

    if (id) {
        const e = localData.expenses.find(e => e.id === id);
        document.getElementById('expense-modal-title').innerText   = 'Editar Gasto de Obra';
        document.getElementById('expense-form-id').value           = e.id;
        document.getElementById('expense-form-date').value         = e.date;
        document.getElementById('expense-form-type').value         = e.type;
        document.getElementById('expense-form-provider').value     = e.provider;
        document.getElementById('expense-form-value').value        = new Intl.NumberFormat('es-CO').format(e.val);
        document.getElementById('expense-form-desc').value         = e.desc;
        document.getElementById('expense-form-support').value      = e.support;
        handleSupportDocChange(e.support);
        document.getElementById('expense-form-support-no').value   = e.supportNo || '';
        document.getElementById('attached-filename').innerText     = e.file ? 'Archivo en almacenamiento' : 'Ningún archivo cargado';
        document.getElementById('expense-form-obs').value          = e.obs || '';
    } else {
        document.getElementById('expense-modal-title').innerText   = 'Registrar Gasto de Obra';
        document.getElementById('expense-form-id').value           = '';
        document.getElementById('expense-form-date').value         = todayISO();
        document.getElementById('expense-form-type').value         = 'MAT';
        document.getElementById('expense-form-provider').value     = '';
        document.getElementById('expense-form-value').value        = '';
        document.getElementById('expense-form-desc').value         = '';
        document.getElementById('expense-form-support').value      = 'Factura';
        handleSupportDocChange('Factura');
        document.getElementById('expense-form-support-no').value   = '';
        document.getElementById('attached-filename').innerText     = 'Ningún archivo cargado';
        document.getElementById('expense-form-obs').value          = '';
    }
}

export function closeExpenseModal() {
    document.getElementById('modal-expense').classList.add('hidden');
}

// ── Validación del documento soporte ─────────────────────────────────────────

export function handleSupportDocChange(docType) {
    const field = document.getElementById('expense-form-support-no');
    const label = document.getElementById('support-doc-no-label');

    const DOC_LABELS = {
        'Factura':                { label: 'Número de Factura *',        placeholder: 'Ej: FE-1093'    },
        'Recibo de pago':         { label: 'Número de Recibo *',         placeholder: 'Ej: REC-992'    },
        'Transferencia bancaria': { label: 'Número de Transferencia *',  placeholder: 'Ej: TR-00912'   },
        'RUT':                    { label: 'Número de NIT / RUT *',      placeholder: 'Ej: 900123456-1' },
        'Recibo de caja menor':        { label: 'Número de Recibo *',         placeholder: 'Ej: RCM-045'    },
        'VCA - Vale de Caja/Traslado': { label: 'Número de Vale *',           placeholder: 'Ej: VCA-001'    }
    };

    if (DOC_LABELS[docType]) {
        field.disabled   = false;
        field.required   = true;
        field.className  = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-600';
        label.innerText  = DOC_LABELS[docType].label;
        field.placeholder = DOC_LABELS[docType].placeholder;
    } else {
        field.disabled   = true;
        field.required   = false;
        field.value      = '';
        field.className  = 'w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed';
        label.innerText  = 'Número de Soporte';
        field.placeholder = 'Opcional / Inactivo';
    }
}

// ── Adjunto de archivos (base64 temporal) ─────────────────────────────────────

export function handleFileAttachment(input) {
    const file = input.files[0];
    if (!file) return;

    const label = document.getElementById('attached-filename');
    label.innerText = `Cargando: ${file.name}`;

    const reader = new FileReader();
    reader.onload = ev => {
        state.attachedFileBase64 = ev.target.result;
        label.innerText = `Listo: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        showToast('Archivo adjunto listo.', 'success');
    };
    reader.readAsDataURL(file);
}

// ── Guardar ───────────────────────────────────────────────────────────────────

export async function saveExpenseForm(e) {
    e.preventDefault();
    if (!ROLE_PERMISSIONS[state.currentRole].allowWrite) {
        showToast('Su rol no permite modificar información.', 'error');
        return;
    }

    const id  = document.getElementById('expense-form-id').value;
    const val = getRawNumericValue(document.getElementById('expense-form-value').value);
    if (val <= 0) { showToast('El monto debe ser mayor a cero.', 'error'); return; }

    const data = {
        projectId: state.activeProjectId,
        date:      document.getElementById('expense-form-date').value,
        type:      document.getElementById('expense-form-type').value,
        provider:  document.getElementById('expense-form-provider').value.trim(),
        val,
        desc:      document.getElementById('expense-form-desc').value.trim(),
        support:   document.getElementById('expense-form-support').value,
        supportNo: document.getElementById('expense-form-support-no').value.trim(),
        file:      state.attachedFileBase64 || '',
        obs:       document.getElementById('expense-form-obs').value.trim()
    };

    if (state.db) {
        await cloudSave('expenses', id || null, data);
        showToast('Gasto guardado en la nube.', 'success');
    } else {
        if (id) {
            const idx = localData.expenses.findIndex(e => e.id === id);
            localData.expenses[idx] = { id, ...data };
        } else {
            localData.expenses.push({ id: 'exp-' + Date.now(), ...data });
        }
        saveLocalData();
        showToast('Gasto guardado localmente.', 'success');
        refresh();
    }
    closeExpenseModal();
    state.attachedFileBase64 = '';
}

// ── Eliminar ──────────────────────────────────────────────────────────────────

export async function deleteExpense(id) {
    if (!ROLE_PERMISSIONS[state.currentRole].allowDelete) {
        showToast('Su rol no permite eliminar información.', 'error');
        return;
    }
    if (!confirm('¿Está seguro de eliminar este gasto?')) return;

    if (state.db) {
        await cloudDelete('expenses', id);
        showToast('Gasto eliminado.', 'success');
    } else {
        localData.expenses = localData.expenses.filter(e => e.id !== id);
        saveLocalData();
        showToast('Gasto eliminado.', 'success');
        refresh();
    }
}

export function resetExpenseFilters() {
    ['expense-filter-start', 'expense-filter-end', 'expense-filter-type',
     'expense-filter-provider', 'expense-filter-support'].forEach(id => {
        document.getElementById(id).value = '';
    });
    loadExpensesList();
}
