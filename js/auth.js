// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Firebase Authentication: login, logout, roles y panel de usuarios
// ─────────────────────────────────────────────────────────────────────────────

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, onSnapshot, updateDoc }
    from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { state }      from './state.js';
import { showToast }  from './ui.js';

const APP_ID = 'obramax-default';

// ── Inicializar auth y escuchar cambios de sesión ─────────────────────────────

export function initAuth() {
    const auth = getAuth();

    onAuthStateChanged(auth, async user => {
        if (user) {
            state.currentUser = user;
            await loadOrCreateUserDoc(user);
            showApp();
        } else {
            state.currentUser  = null;
            state.currentRole  = 'Supervisor';
            hideApp();
        }
    });
}

// ── Cargar o crear documento de usuario en Firestore ─────────────────────────

async function loadOrCreateUserDoc(user) {
    const userRef = doc(state.db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid);
    const snap    = await getDoc(userRef);
    let   data;

    if (snap.exists()) {
        data = snap.data();
    } else {
        data = { email: user.email, name: user.email.split('@')[0], role: 'Supervisor' };
        await setDoc(userRef, data);
    }

    state.currentRole = data.role || 'Supervisor';

    const nameDisplay = data.name || user.email.split('@')[0];
    document.getElementById('user-display-name').innerText = nameDisplay;
    document.getElementById('user-role').innerText         = state.currentRole;
    document.getElementById('user-uuid').innerText         = user.email;
    document.getElementById('user-avatar').innerText       = nameDisplay[0].toUpperCase();
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function handleLogin(e) {
    e.preventDefault();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errorDiv = document.getElementById('login-error');

    btn.disabled  = true;
    btn.innerText = 'Ingresando...';
    errorDiv.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(getAuth(), email, password);
        // onAuthStateChanged maneja el resto
    } catch (err) {
        errorDiv.classList.remove('hidden');
        document.getElementById('login-error-msg').innerText = translateAuthError(err.code);
        btn.disabled  = false;
        btn.innerText = 'Ingresar';
    }
}

// ── Recuperar contraseña ──────────────────────────────────────────────────────

export async function handlePasswordReset(e) {
    e.preventDefault();

    const email   = document.getElementById('reset-email').value.trim();
    const btn     = document.getElementById('reset-btn');
    const success = document.getElementById('reset-success');
    const errorDiv = document.getElementById('reset-error');

    btn.disabled  = true;
    btn.innerText = 'Enviando...';
    success.classList.add('hidden');
    errorDiv.classList.add('hidden');

    try {
        await sendPasswordResetEmail(getAuth(), email);
        success.classList.remove('hidden');
        btn.innerText = 'Enviado';
    } catch (err) {
        errorDiv.classList.remove('hidden');
        document.getElementById('reset-error-msg').innerText = translateAuthError(err.code);
        btn.disabled  = false;
        btn.innerText = 'Enviar enlace';
    }
}

export function showLoginForm() {
    document.getElementById('login-form-section').classList.remove('hidden');
    document.getElementById('reset-form-section').classList.add('hidden');
}

export function showResetForm() {
    document.getElementById('login-form-section').classList.add('hidden');
    document.getElementById('reset-form-section').classList.remove('hidden');
    document.getElementById('reset-email').value = document.getElementById('login-email').value;
    document.getElementById('reset-success').classList.add('hidden');
    document.getElementById('reset-error').classList.add('hidden');
    document.getElementById('reset-btn').disabled  = false;
    document.getElementById('reset-btn').innerText = 'Enviar enlace';
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function handleLogout() {
    try {
        await signOut(getAuth());
    } catch (err) {
        showToast('Error al cerrar sesión.', 'error');
    }
}

// ── Mostrar / ocultar app ─────────────────────────────────────────────────────

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.dispatchEvent(new Event('app:refresh'));
}

function hideApp() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-email').value    = '';
    document.getElementById('login-password').value = '';
}

// ── Panel de gestión de usuarios (solo Administrador) ─────────────────────────

export function loadUsersPanel() {
    const panel = document.getElementById('users-panel');
    if (!panel) return;

    if (state.currentRole !== 'Administrador') {
        panel.innerHTML = `
            <div class="text-center py-10 text-slate-400">
                <i class="fa-solid fa-lock text-3xl mb-3 block"></i>
                <p class="text-sm font-semibold">Acceso restringido</p>
                <p class="text-xs mt-1">Solo el Administrador puede gestionar usuarios.</p>
            </div>`;
        return;
    }

    const ref = collection(state.db, 'artifacts', APP_ID, 'public', 'data', 'users');
    onSnapshot(ref, snapshot => {
        const users = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
        renderUsersTable(panel, users);
    }, err => console.error('users listener error:', err));
}

function renderUsersTable(panel, users) {
    if (users.length === 0) {
        panel.innerHTML = '<p class="text-slate-400 text-xs text-center py-8">Aún no hay usuarios registrados. Crea uno en Firebase Console → Authentication → Users.</p>';
        return;
    }

    panel.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                        <th class="py-3 px-4">Correo</th>
                        <th class="py-3 px-4">Nombre</th>
                        <th class="py-3 px-4">Rol actual</th>
                        <th class="py-3 px-4 text-center">Cambiar rol</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    ${users.map(u => `
                        <tr class="${u.uid === state.currentUser?.uid ? 'bg-amber-50' : 'hover:bg-slate-50'}">
                            <td class="py-3 px-4 text-xs font-mono text-slate-600">${escapeHtml(u.email || '')}</td>
                            <td class="py-3 px-4 font-semibold text-slate-900">
                                ${escapeHtml(u.name || '-')}
                                ${u.uid === state.currentUser?.uid ? '<span class="ml-1 text-[10px] text-amber-600 font-bold">(tú)</span>' : ''}
                            </td>
                            <td class="py-3 px-4">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadge(u.role)}">${escapeHtml(u.role || 'Supervisor')}</span>
                            </td>
                            <td class="py-3 px-4 text-center">
                                <select onchange="changeUserRole('${u.uid}', this.value)"
                                    class="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                                    ${u.uid === state.currentUser?.uid ? 'disabled title="No puedes cambiar tu propio rol"' : ''}>
                                    <option value="Administrador" ${u.role === 'Administrador' ? 'selected' : ''}>Administrador</option>
                                    <option value="Residente"     ${u.role === 'Residente'     ? 'selected' : ''}>Residente</option>
                                    <option value="Supervisor"    ${u.role === 'Supervisor'     ? 'selected' : ''}>Supervisor</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

export async function changeUserRole(uid, newRole) {
    try {
        await updateDoc(
            doc(state.db, 'artifacts', APP_ID, 'public', 'data', 'users', uid),
            { role: newRole }
        );
        showToast(`Rol actualizado a ${newRole}.`, 'success');
    } catch (err) {
        showToast('Error al cambiar el rol: ' + err.message, 'error');
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function translateAuthError(code) {
    const map = {
        'auth/invalid-email':      'El correo no es válido.',
        'auth/user-not-found':     'No existe cuenta con ese correo.',
        'auth/wrong-password':     'Contraseña incorrecta.',
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/too-many-requests':  'Demasiados intentos. Espera unos minutos.',
        'auth/user-disabled':      'Esta cuenta está deshabilitada.'
    };
    return map[code] || 'Error al iniciar sesión. Intenta de nuevo.';
}

function getRoleBadge(role) {
    const map = {
        'Administrador': 'bg-amber-100 text-amber-800',
        'Residente':     'bg-blue-100 text-blue-800',
        'Supervisor':    'bg-slate-100 text-slate-700'
    };
    return map[role] || 'bg-slate-100 text-slate-700';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
