// --- Globals ---
let systemState = {};
let providerModels = {};
const BACKEND_URL = 'http://127.0.0.1:8000';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    initializeUI();
    initializeEventListeners();
});

function initializeState() {
    systemState = {
        aiConfig: {
            provider: 'gemini',
            model: 'gemini-2.5-pro',
            isConnected: false
        },
        verificationState: {
            isRunning: false,
            forceStop: false,
            currentIteration: 0,
            consecutivePasses: 0,
            maxIterations: 8,
            requiredPasses: 3,
            verificationScore: 0,
            confidence: 0
        },
        solutions: [],
        errorReports: [],
        pythonResults: [],
        actionPlans: []
    };

    providerModels = {
        gemini: [{ value: 'gemini-2.5-pro', text: 'Gemini 2.5 Pro' }],
        deepseek: [{ value: 'deepseek-chat', text: 'DeepSeek V3' }],
        openai: [{ value: 'gpt-4', text: 'OpenAI GPT-4' }]
    };
}

function initializeUI() {
    updateModelOptions();
    const stepsContainer = document.querySelector('.verification-steps');
    const steps = [
        { id: 1, label: "初始解/修正" },
        { id: 2, label: "自我改进" },
        { id: 3, label: "AI 验证" },
        { id: 4, label: "Python 验证" },
        { id: 5, label: "AI 审查" },
        { id: 6, label: "最终决策" }
    ];
    stepsContainer.innerHTML = steps.map(s => `
        <div class="verification-step" id="main-step-${s.id}">
            <div class="step-number">${s.id}</div>
            <div class="step-label">${s.label}</div>
        </div>
    `).join('');
}

function initializeEventListeners() {
    document.getElementById('solve-button').addEventListener('click', startRigorousVerification);
    document.getElementById('stop-button').addEventListener('click', stopVerification);
    document.getElementById('test-btn').addEventListener('click', testAIConnection);
    document.getElementById('save-all-btn').addEventListener('click', saveAllFiles);
    document.getElementById('export-data-btn').addEventListener('click', exportVerificationData);
    document.getElementById('api-provider').addEventListener('change', updateModelOptions);
    document.getElementById('model-version').addEventListener('change', () => {
        systemState.aiConfig.model = document.getElementById('model-version').value;
    });
}

// --- UI Update Functions ---
function updateModelOptions() {
    const provider = document.getElementById('api-provider').value;
    const models = providerModels[provider] || [];
    const modelSelect = document.getElementById('model-version');
    modelSelect.innerHTML = models.map(m => `<option value="${m.value}">${m.text}</option>`).join('');
    systemState.aiConfig.provider = provider;
    if (models.length > 0) {
        systemState.aiConfig.model = models[0].value;
    }
}

function updateMainStepStatus(step, status) {
    const stepElement = document.getElementById(`main-step-${step}`);
    if (stepElement) {
        stepElement.className = `verification-step ${status}`;
    }
}

function displayResult(title, content, type = '') {
    const container = document.getElementById('results-container');
    const resultSection = document.createElement('div');
    resultSection.className = `result-section ${type}`;
    resultSection.innerHTML = `
        <div class="result-header">${title}</div>
        <div class="result-content">${markdownToHtml(content)}</div>
    `;
    container.appendChild(resultSection);
    if (window.MathJax) {
        window.MathJax.typesetPromise([resultSection]);
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// --- Core Logic ---
async function startRigorousVerification() {
    // ... (Full verification logic from previous verification.js)
}

function stopVerification() {
    if (systemState.verificationState.isRunning) {
        systemState.verificationState.forceStop = true;
    }
}

async function testAIConnection() {
    // ... (Full test connection logic)
}

// --- API Call Functions ---
async function callAI(task, data) {
    // ... (Full callAI logic)
}

async function executePythonCode(code) {
    // ... (Full executePythonCode logic)
}

// --- File Handling ---
async function saveAllFiles() {
    // ... (Full saveAllFiles logic)
}

function exportVerificationData() {
    // ... (Full exportVerificationData logic)
}

// --- Utils ---
function markdownToHtml(text) {
    // ... (Full markdownToHtml logic)
}

function extractPythonCode(text) {
    // ... (Full extractPythonCode logic)
}