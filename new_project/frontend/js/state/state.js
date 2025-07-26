window.app = window.app || {};

window.app.state = {
    systemState: {},
    providerModels: {},
    BACKEND_URL: 'http://127.0.0.1:8000',

    initializeState: function() {
        this.systemState = {
            aiConfig: {
                provider: 'google',
                model: 'gemini-1.5-pro-latest',
                isConnected: false
            },
            verificationState: {
                isRunning: false,
                forceStop: false,
                currentIteration: 0,
                consecutivePasses: 0,
                maxIterations: 8,
                requiredPasses: 3,
            },
            solutions: [],
            finalSolution: null,
            errorReports: [],
            pythonResults: [],
            actionPlans: []
        };

        this.providerModels = {
            google: [{ value: 'gemini-1.5-pro', text: 'Gemini 1.5 Pro' }],
            openai: [{ value: 'gpt-4', text: 'OpenAI GPT-4' }],
            deepseek: [
                { value: 'deepseek-chat', text: 'DeepSeek Chat' },
                { value: 'deepseek-reasoner', text: 'DeepSeek Reasoner' }
            ]
        };
    }
};
