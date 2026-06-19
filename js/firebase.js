// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE — Inicialización y helpers de Firestore
// Auth (email+contraseña) se implementará en la próxima versión.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { state, localData, saveLocalData } from './state.js';
import { showToast }                        from './ui.js';

const APP_ID = 'obramax-default';

function triggerRefresh() {
    document.dispatchEvent(new Event('app:refresh'));
}

// ── Inicialización ────────────────────────────────────────────────────────────

export async function initFirebase(config) {
    try {
        const app = initializeApp(config);
        state.db  = getFirestore(app);
        setConnectionBadge('online');
        setupFirestoreListeners();
        return true;
    } catch (err) {
        console.error('Firebase init error:', err);
        showToast('Fallo de conexión. Usando modo local.', 'error');
        initLocalMode();
        return false;
    }
}

export function initLocalMode() {
    setConnectionBadge('offline');
    document.getElementById('user-display-name').innerText = 'Usuario Local';
    document.getElementById('user-uuid').innerText         = 'ID: Offline-Workspace';
    document.getElementById('user-avatar').innerText       = 'L';
    triggerRefresh();
}

// ── Helpers de escritura/borrado ──────────────────────────────────────────────

export async function cloudSave(collectionName, id, data) {
    if (!state.db) return false;
    try {
        if (id) {
            await updateDoc(
                doc(state.db, 'artifacts', APP_ID, 'public', 'data', collectionName, id),
                data
            );
        } else {
            await addDoc(
                collection(state.db, 'artifacts', APP_ID, 'public', 'data', collectionName),
                data
            );
        }
        return true;
    } catch (err) {
        showToast('Error al guardar en la nube: ' + err.message, 'error');
        return false;
    }
}

export async function cloudDelete(collectionName, id) {
    if (!state.db) return false;
    try {
        await deleteDoc(
            doc(state.db, 'artifacts', APP_ID, 'public', 'data', collectionName, id)
        );
        return true;
    } catch (err) {
        showToast('Error al eliminar: ' + err.message, 'error');
        return false;
    }
}

// ── Listeners en tiempo real ──────────────────────────────────────────────────

function setupFirestoreListeners() {
    listenCollection('projects', docs => {
        localData.projects = docs;
        if (docs.length > 0 && !state.activeProjectId) {
            state.activeProjectId = docs[0].id;
        }
    });
    listenCollection('incomes',  docs => { localData.incomes  = docs; });
    listenCollection('expenses', docs => { localData.expenses = docs; });
}

function listenCollection(name, setter) {
    const ref = collection(state.db, 'artifacts', APP_ID, 'public', 'data', name);
    onSnapshot(
        ref,
        snapshot => {
            setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            saveLocalData();
            triggerRefresh();
        },
        err => console.error(`[${name}] listener error:`, err)
    );
}

// ── UI del badge de conexión ──────────────────────────────────────────────────

function setConnectionBadge(status) {
    const badge = document.getElementById('db-connection-badge');
    if (status === 'online') {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-white border border-emerald-600 shadow-sm';
        badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-white animate-ping"></span><span>Conectado Nube</span>`;
    } else {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-slate-900 border border-amber-600 shadow-sm';
        badge.innerHTML = `<span class="h-2.5 w-2.5 rounded-full bg-amber-900"></span><span>Modo Local (Offline)</span>`;
    }
}
