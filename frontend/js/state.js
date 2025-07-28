// frontend/js/state.js
window.app = window.app || {};
window.app.state = {
    workflow: {
        currentStep: 'step-model',
        stepOrder: ['step-model', 'step-generate-script', 'step-execute', 'step-synthesize'],
        history: {},
        getNextStep: function(current) {
            const currentIndex = this.stepOrder.indexOf(current);
            if (currentIndex < this.stepOrder.length - 1) {
                return this.stepOrder[currentIndex + 1];
            }
            return null;
        }
    },
    sessions: [],
    activeSessionId: null,
    systemState: {
        aiConfig: {
            provider: 'google',
            model: 'gemini-1.5-pro-latest',
            isConnected: false
        },
        verificationState: {
            currentStep: 0,
            currentIteration: 0,
            maxIterations: 8,
            consecutivePasses: 0,
            requiredPasses: 3,
            totalErrors: 0,
            pythonValidations: 0,
            pythonFailures: 0,
            syntaxErrors: 0,
            verificationScore: 0,
            confidence: 0,
            isRunning: false,
            forceStop: false,
            finalSolution: null
        },
        solutions: [],
        errorReports: [],
        pythonResults: [],
        savedFiles: []
    },
    BACKEND_URL: 'http://127.0.0.1:8000',
    providerModels: {
        deepseek: [
            { value: 'deepseek-chat', text: 'DeepSeek Chat' },
            { value: 'deepseek-coder', text: 'DeepSeek Coder' }
        ],
        google: [
            { value: 'gemini-1.5-pro-latest', text: 'Gemini 1.5 Pro' },
            { value: 'gemini-1.0-pro', text: 'Gemini 1.0 Pro' }
        ],
        openai: [
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
            { value: 'gpt-4', text: 'GPT-4' },
            { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
        ]
    },
    initializeState: function() {
        // This function can be used to reset the state if needed
        this.systemState.verificationState = {
            currentStep: 0,
            currentIteration: 0,
            maxIterations: 8,
            consecutivePasses: 0,
            requiredPasses: 3,
            totalErrors: 0,
            pythonValidations: 0,
            pythonFailures: 0,
            syntaxErrors: 0,
            verificationScore: 0,
            confidence: 0,
            isRunning: false,
            forceStop: false,
            finalSolution: null
        };
        this.systemState.solutions = [];
        this.systemState.errorReports = [];
        this.systemState.pythonResults = [];
    }
};