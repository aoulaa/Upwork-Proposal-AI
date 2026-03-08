// sidepanel.js — Side Panel Logic

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const setupSection = $('setup-section');
const mainSection = $('main-section');
const apiKeyInput = $('api-key-input');
const modelSelect = $('model-select');
const saveKeyBtn = $('save-key-btn');
const resetKeyBtn = $('reset-key-btn');
const statusBadge = $('status-badge');
const toast = $('toast');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    const { geminiApiKey, geminiModel } = await chrome.storage.local.get(['geminiApiKey', 'geminiModel']);

    if (geminiModel) {
        modelSelect.value = geminiModel;
    }

    if (geminiApiKey) {
        showMain();
    } else {
        showSetup();
    }
}

function showSetup() {
    setupSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
    setStatus('idle', 'Needs Setup');
}

function showMain() {
    setupSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    setStatus('done', 'Active');
}

// ─── API Key Management ───────────────────────────────────────────────────────
saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!key || !key.startsWith('AIza')) {
        showToast('Invalid API key format. It should start with "AIza".', 'error');
        return;
    }
    await chrome.storage.local.set({
        geminiApiKey: key,
        geminiModel: model
    });
    showToast('Settings saved! ✓', 'success');
    showMain();
});

resetKeyBtn.addEventListener('click', async () => {
    const { geminiApiKey, geminiModel } = await chrome.storage.local.get(['geminiApiKey', 'geminiModel']);
    apiKeyInput.value = geminiApiKey || '';
    if (geminiModel) modelSelect.value = geminiModel;
    showSetup();
    apiKeyInput.focus();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatus(type, text) {
    statusBadge.className = `badge badge--${type}`;
    statusBadge.textContent = text;
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast toast--${type} toast--visible`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.remove('toast--visible');
    }, 3500);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
