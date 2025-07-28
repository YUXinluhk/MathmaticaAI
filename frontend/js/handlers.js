window.app = window.app || {};
window.app.handlers = {
    initializeEventListeners: function() {
        document.getElementById('solve-button').addEventListener('click', this.startWorkflow.bind(this));
        document.getElementById('results-container').addEventListener('click', this.handleResultActions.bind(this));
        document.getElementById('history-list').addEventListener('click', this.switchSession.bind(this));
        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            window.app.parameters.addParameterRow();
        });
    },

    startWorkflow: async function() {
        const problem = document.getElementById('problem-input').value;
        if (!problem) {
            window.app.ui.showNotification('Please enter a problem description.', 'error');
            return;
        }

        this.createNewSession(problem);
        window.app.ui.renderHistory();

        window.app.ui.showNotification('Starting workflow...', 'info');
        document.getElementById('results-container').innerHTML = '';

        const parameters = window.app.parameters.getParameters();
        const provider = window.app.state.systemState.aiConfig.provider;
        const model = window.app.state.systemState.aiConfig.model;

        try {
            const result = await window.app.api.stepModel(provider, model, problem, parameters);
            window.app.state.workflow.history['step-model'] = result;
            this.displayStepResult('step-model', result);
        } catch (error) {
            window.app.ui.showNotification(`Error in modeling step: ${error.message}`, 'error');
        }
    },

    handleResultActions: async function(event) {
        if (event.target.classList.contains('approve-btn')) {
            const nextStep = event.target.dataset.nextStep;
            if (nextStep) {
                this.proceedToNextStep(nextStep);
            }
        } else if (event.target.classList.contains('revise-btn')) {
            // Handle revision logic here
            window.app.ui.showNotification('Revision requested. Please edit the inputs and restart.', 'info');
        }
    },

    proceedToNextStep: async function(step) {
        window.app.ui.showNotification(`Proceeding to ${step}...`, 'info');
        window.app.state.workflow.currentStep = step;
        window.app.ui.updateStepVisualization(step);

        const provider = window.app.state.systemState.aiConfig.provider;
        const model = window.app.state.systemState.aiConfig.model;
        const history = window.app.state.workflow.history;

        try {
            let result;
            if (step === 'step-generate-script') {
                const modelingResult = history['step-model'].computational_result;
                const parameters = window.app.parameters.getParameters();
                result = await window.app.api.stepGenerateScript(provider, model, modelingResult, parameters);
            } else if (step === 'step-execute') {
                const script = history['step-generate-script'].computational_result;
                const parameters = window.app.parameters.getParameters();
                const csvUpload = document.getElementById('csv-upload');
                const file = csvUpload.files[0];
                let filePath = null;
                if (file) {
                    const uploadResult = await window.app.api.uploadData(file);
                    filePath = uploadResult.filepath;
                }
                result = await window.app.api.stepExecute(script, parameters, filePath);
            } else if (step === 'step-synthesize') {
                result = await window.app.api.stepSynthesize(provider, model, history);
            }

            window.app.state.workflow.history[step] = result;
            this.displayStepResult(step, result);
            this.updateActiveSession();

        } catch (error) {
            window.app.ui.showNotification(`Error in ${step}: ${error.message}`, 'error');
        }
    },

    displayStepResult: function(step, result) {
        const resultsContainer = document.getElementById('results-container');
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-section';
        resultDiv.id = `result-${step}`;

        let contentHtml = '';
        if (result.computational_result) {
            if (typeof result.computational_result === 'object') {
                contentHtml += `<h4>Computational Result:</h4><pre>${JSON.stringify(result.computational_result, null, 2)}</pre>`;
            } else {
                contentHtml += `<h4>Computational Result:</h4><div class="result-content">${window.app.utils.markdownToHtml(result.computational_result)}</div>`;
            }
        }
        if (result.ai_review) {
            contentHtml += `<h4>AI Review:</h4><div class="result-content">${window.app.utils.markdownToHtml(result.ai_review)}</div>`;
        }
        if (result.synthesis_report) {
            contentHtml += `<h4>Synthesis Report:</h4><div class="result-content">${window.app.utils.markdownToHtml(result.synthesis_report)}</div>`;
        }

        resultDiv.innerHTML = contentHtml;

        const nextStep = window.app.state.workflow.getNextStep(step);
        if (nextStep) {
            const buttons = window.app.ui.createApprovalButtons(step);
            resultDiv.appendChild(buttons);
        }

        resultsContainer.appendChild(resultDiv);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    createNewSession: function(problem) {
        const sessionId = Date.now().toString();
        const sessionName = problem.substring(0, 20) + '...';
        const newSession = {
            id: sessionId,
            name: sessionName,
            workflowState: { ...window.app.state.workflow }
        };
        window.app.state.sessions.push(newSession);
        window.app.state.activeSessionId = sessionId;
        // Reset workflow for new session
        window.app.state.workflow.history = {};
        window.app.state.workflow.currentStep = 'step-model';
    },

    updateActiveSession: function() {
        const activeSession = window.app.state.sessions.find(s => s.id === window.app.state.activeSessionId);
        if (activeSession) {
            activeSession.workflowState = { ...window.app.state.workflow };
        }
    },

    switchSession: function(event) {
        if (event.target.classList.contains('history-item')) {
            const sessionId = event.target.dataset.sessionId;
            if (sessionId !== window.app.state.activeSessionId) {
                this.updateActiveSession(); // Save current state before switching
                const selectedSession = window.app.state.sessions.find(s => s.id === sessionId);
                if (selectedSession) {
                    window.app.state.activeSessionId = sessionId;
                    window.app.state.workflow = { ...selectedSession.workflowState };
                    window.app.ui.renderHistory();
                    this.redisplayWorkflow();
                }
            }
        }
    },

    redisplayWorkflow: function() {
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        const history = window.app.state.workflow.history;
        for (const step in history) {
            this.displayStepResult(step, history[step]);
        }
        window.app.ui.updateStepVisualization(window.app.state.workflow.currentStep);
    }
};
