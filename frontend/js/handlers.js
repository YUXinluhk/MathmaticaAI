window.app = window.app || {};
window.app.handlers = {
    initializeEventListeners: function() {
        document.getElementById('solve-button').addEventListener('click', this.startWorkflow.bind(this));
        document.getElementById('results-container').addEventListener('click', this.handleResultActions.bind(this));
        document.getElementById('history-list').addEventListener('click', this.switchSession.bind(this));
        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            window.app.parameters.addParameterRow();
        });
        document.getElementById('knowledge-upload').addEventListener('change', this.handleKnowledgeUpload.bind(this));
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
        const knowledgeBase = this.getKnowledgeBaseContent();

        try {
            const result = await window.app.api.stepModel(provider, model, problem, parameters, knowledgeBase);
            window.app.state.workflow.history['step-model'] = result;
            this.displayStepResult('step-model', result);
        } catch (error) {
            const errorMessage = error.isAppError ? error.errorData : `Error in modeling step: ${error.message}`;
            window.app.ui.showNotification(errorMessage, 'error');
        }
    },

    handleResultActions: async function(event) {
        if (event.target.classList.contains('approve-btn')) {
            const nextStep = event.target.dataset.nextStep;
            if (nextStep) {
                this.proceedToNextStep(nextStep);
            }
        } else if (event.target.classList.contains('revise-btn')) {
            const resultSection = event.target.closest('.result-section');
            const contentElement = resultSection.querySelector('.result-content-editable');
            const buttonContainer = resultSection.querySelector('.approval-buttons');
            const step = resultSection.id.replace('result-', '');

            if (contentElement && buttonContainer) {
                contentElement.setAttribute('contenteditable', 'true');
                contentElement.style.backgroundColor = '#f0f0f0';
                contentElement.focus();

                buttonContainer.innerHTML = '<button class="resubmit-btn">Resubmit Revision</button>';

                buttonContainer.querySelector('.resubmit-btn').addEventListener('click', async () => {
                    const revisedContent = contentElement.innerText; // Use innerText to get user's edits
                    contentElement.setAttribute('contenteditable', 'false');
                    contentElement.style.backgroundColor = '';
                    buttonContainer.innerHTML = 'Re-processing...';

                    try {
                        await this.resubmitStep(step, revisedContent);
                    } catch (error) {
                        const errorMessage = error.isAppError ? error.errorData : `Error resubmitting step: ${error.message}`;
                        window.app.ui.showNotification(errorMessage, 'error');
                        // Restore buttons on failure
                        const buttons = window.app.ui.createApprovalButtons(step);
                        buttonContainer.innerHTML = '';
                        buttonContainer.appendChild(buttons);
                    }
                });
            }
        }
    },

    resubmitStep: async function(step, revisedContent) {
        window.app.ui.showNotification(`Resubmitting ${step} with revisions...`, 'info');

        const provider = window.app.state.systemState.aiConfig.provider;
        const model = window.app.state.systemState.aiConfig.model;
        const parameters = window.app.parameters.getParameters();
        const knowledgeBase = this.getKnowledgeBaseContent();
        const history = window.app.state.workflow.history;

        let result;
        if (step === 'step-model') {
            result = await window.app.api.stepModel(provider, model, revisedContent, parameters, knowledgeBase);
        } else if (step === 'step-generate-script') {
            const modelingResult = history['step-model'].computational_result;
            result = await window.app.api.stepGenerateScript(provider, model, modelingResult, parameters, knowledgeBase, revisedContent);
        }
        // Add other steps as needed

        window.app.state.workflow.history[step] = result;

        // Remove the old result div and display the new one
        const oldResultDiv = document.getElementById(`result-${step}`);
        if(oldResultDiv) oldResultDiv.remove();

        this.displayStepResult(step, result);
        this.updateActiveSession();
    },

    proceedToNextStep: async function(step) {
        window.app.ui.showNotification(`Proceeding to ${step}...`, 'info');
        window.app.state.workflow.currentStep = step;
        window.app.ui.updateStepVisualization(step);

        const provider = window.app.state.systemState.aiConfig.provider;
        const model = window.app.state.systemState.aiConfig.model;
        const history = window.app.state.workflow.history;
        const knowledgeBase = this.getKnowledgeBaseContent();

        try {
            let result;
            if (step === 'step-generate-script') {
                const modelingResult = history['step-model'].computational_result;
                const parameters = window.app.parameters.getParameters();
                result = await window.app.api.stepGenerateScript(provider, model, modelingResult, parameters, knowledgeBase);
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
                result = await window.app.api.stepSynthesize(provider, model, history, knowledgeBase);
            }

            window.app.state.workflow.history[step] = result;
            this.displayStepResult(step, result);
            this.updateActiveSession();

        } catch (error) {
            const errorMessage = error.isAppError ? error.errorData : `Error in ${step}: ${error.message}`;
            window.app.ui.showNotification(errorMessage, 'error');
        }
    },


    saveStateToLocalStorage: function() {
        try {
            const stateToSave = {
                sessions: window.app.state.sessions,
                activeSessionId: window.app.state.activeSessionId
            };
            localStorage.setItem('phoenix-session', JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save state to localStorage", e);
            window.app.ui.showNotification("Could not save session. Your browser might be out of space.", "error");
        }
    },

    createNewSession: function(problem) {
        const sessionId = Date.now().toString();
        const sessionName = problem.substring(0, 20) + '...';
        const newSession = {
            id: sessionId,
            name: sessionName,
            workflowState: { ...window.app.state.workflow },
            knowledge: { ...window.app.state.knowledge }
        };
        window.app.state.sessions.push(newSession);
        window.app.state.activeSessionId = sessionId;
        // Reset for new session
        window.app.state.workflow.history = {};
        window.app.state.workflow.currentStep = 'step-model';
        window.app.state.knowledge.files = [];
        this.saveStateToLocalStorage();
    },

    updateActiveSession: function() {
        const activeSession = window.app.state.sessions.find(s => s.id === window.app.state.activeSessionId);
        if (activeSession) {
            activeSession.workflowState = { ...window.app.state.workflow };
            activeSession.knowledge = { ...window.app.state.knowledge };
            this.saveStateToLocalStorage();
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
                    window.app.state.knowledge = { ...selectedSession.knowledge };
                    window.app.ui.renderHistory();
                    window.app.ui.renderKnowledgeFiles();
                    this.redisplayWorkflow();
                    this.saveStateToLocalStorage();
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
    },

    handleKnowledgeUpload: async function(event) {
        const files = event.target.files;
        if (!files.length) return;

        for (const file of files) {
            try {
                const result = await window.app.api.processKnowledge(file);
                window.app.ui.showNotification(`Successfully processed ${result.filename}.`, 'success');
                // We don't need to store the content in the frontend anymore
                window.app.state.knowledge.files.push({
                    filename: file.name,
                    content: null // No need to store content
                });
                window.app.ui.renderKnowledgeFiles();
            } catch (error) {
                window.app.ui.showNotification(`Error processing ${file.name}: ${error.message}`, 'error');
            }
        }
    },

    getKnowledgeBaseContent: function() {
        let content = '';
        for (const file of window.app.state.knowledge.files) {
            content += `--- ${file.filename} ---\n${file.content}\n\n`;
        }
        return content;
    }
};
