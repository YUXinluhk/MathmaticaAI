// frontend/js/state.js

export const systemState = {
    aiConfig: {
        provider: 'gemini',
        model: 'gemini-2.5-pro', // Also a good idea to set a default model
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
        isRunning: false
    },
    solutions: [],
    errorReports: [],
    pythonResults: [],
    savedFiles: []
};

export const BACKEND_URL = 'http://127.0.0.1:8000';

export const providerModels = {
    deepseek: [
        { value: 'deepseek-chat', text: 'DeepSeek Chat' },
        { value: 'deepseek-coder', text: 'DeepSeek Coder' }
    ],
    gemini: [
        { value: 'gemini-2.5-pro', text: 'Gemini 2.5 Pro (New)' },
        { value: 'gemini-1.5-pro-latest', text: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.0-pro', text: 'Gemini 1.0 Pro' }
    ],
    openai: [
        { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
        { value: 'gpt-4', text: 'GPT-4' },
        { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
    ]
};
