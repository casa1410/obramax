// ─────────────────────────────────────────────────────────────────────────────
// APP.JS — Punto de entrada principal
// Inicializa la app, escucha el evento de refresco y expone funciones al HTML.
// ─────────────────────────────────────────────────────────────────────────────

import { state, localData, SAMPLE_DATA, loadLocalData, loadFbConfig } from './state.js';
import { firebaseConfig } from './config.js';
import { formatCurrencyInput }           from './utils.js';
import { initFirebase, initLocalMode }   from './firebase.js';
import { initAuth, handleLogin, handleLogout, loadUsersPanel, changeUserRole, handlePasswordReset, showLoginForm, showResetForm } from './auth.js';
import {
    dismissToast, switchView, toggleMobileMenu,
    setActiveProject, changeSimulatedRole,
    updateSidebarProjectSelector, updateActiveProjectUI,
    calculateBalances, applyDashboardFilters, resetDashboardFilters
} from './ui.js';
import { renderCharts }                  from './charts.js';
import { loadProjectsGrid, openProjectModal, closeProjectModal, saveProjectForm, deleteProject } from './projects.js';
import { loadIncomesList, openIncomeModal, closeIncomeModal, saveIncomeForm, deleteIncome, resetIncomeFilters }       from './incomes.js';
import { loadExpensesList, openExpenseModal, closeExpenseModal, saveExpenseForm, deleteExpense, handleSupportDocChange, handleFileAttachment, resetExpenseFilters } from './expenses.js';
import { updateReportPreview, triggerPrint, exportToExcel, exportToCSV } from './reports.js';

// ── renderAll — actualiza toda la interfaz con el estado actual ───────────────

function renderAll() {
    updateSidebarProjectSelector();
    updateActiveProjectUI();
    calculateBalances();
    loadProjectsGrid();
    loadIncomesList();
    loadExpensesList();
    updateReportPreview();
    renderCharts();
}

// ── Alertas contextuales en formularios ──────────────────────────────────────

function checkIncomeAlert() {
    const val      = document.getElementById('income-form-source').value.toLowerCase();
    const keywords = ['crédito', 'credito', 'préstamo', 'prestamo', 'deuda', 'financiamiento', 'financiación', 'financiacion'];
    const show     = keywords.some(k => val.includes(k));
    document.getElementById('income-credit-alert').classList.toggle('hidden', !show);
}

function checkExpenseAlert() {
    const val      = document.getElementById('expense-form-desc').value.toLowerCase();
    const keywords = ['anticipo', 'adelanto', 'préstamo', 'prestamo', 'avance', 'adelanto'];
    const show     = keywords.some(k => val.includes(k));
    document.getElementById('expense-advance-alert').classList.toggle('hidden', !show);
}

// ── Exponer funciones al contexto global (necesario para los onclick del HTML) ─

function exposeToWindow() {
    Object.assign(window, {
        // Navegación
        switchView, toggleMobileMenu, setActiveProject, changeSimulatedRole,
        // Auth
        handleLogin, handleLogout, loadUsersPanel, changeUserRole,
        handlePasswordReset, showLoginForm, showResetForm,
        // Proyectos
        openProjectModal, closeProjectModal, saveProjectForm, deleteProject,
        // Ingresos
        openIncomeModal, closeIncomeModal, saveIncomeForm, deleteIncome, resetIncomeFilters, loadIncomesList,
        // Gastos
        openExpenseModal, closeExpenseModal, saveExpenseForm, deleteExpense, resetExpenseFilters, loadExpensesList,
        handleSupportDocChange, handleFileAttachment,
        // Reportes
        updateReportPreview, triggerPrint, exportToExcel, exportToCSV,
        // Dashboard
        applyDashboardFilters, resetDashboardFilters,
        // Alertas contextuales
        checkIncomeAlert, checkExpenseAlert,
        // Utilidades
        formatCurrencyInput, dismissToast
    });
}

// ── Inicialización ────────────────────────────────────────────────────────────

window.onload = async function () {
    // Cargar datos guardados o usar datos de ejemplo
    const saved = loadLocalData();
    if (saved) {
        Object.assign(localData, saved);
    } else {
        Object.assign(localData, SAMPLE_DATA);
    }

    if (localData.projects.length > 0) {
        state.activeProjectId = localData.projects[0].id;
    }

    exposeToWindow();

    // Escuchar el evento de refresco global (disparado por CRUD y listeners de Firebase)
    document.addEventListener('app:refresh', renderAll);

    // Usar config de config.js (o localStorage como override manual)
    const fbConfig = firebaseConfig.apiKey ? firebaseConfig : loadFbConfig();

    if (fbConfig && fbConfig.apiKey) {
        const connected = await initFirebase(fbConfig);
        if (connected) {
            initAuth(); // requiere login cuando hay Firebase
        } else {
            // Firebase falló → modo local sin auth
            showLocalAppDirectly();
        }
    } else {
        initLocalMode();
        showLocalAppDirectly();
    }
};

function showLocalAppDirectly() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.dispatchEvent(new Event('app:refresh'));
}
