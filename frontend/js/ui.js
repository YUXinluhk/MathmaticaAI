// frontend/js/ui.js
window.app = window.app || {};
window.app.ui = {
    initializeUI: function() {
        this.updateModelOptions();
        this.updateConnectionStatus();
        this.initializeCitationTooltips();
    },

    initializeCitationTooltips: function() {
        const resultsContainer = document.getElementById('results-container');
        let tooltip = null;

        resultsContainer.addEventListener('mouseover', (event) => {
            if (event.target.classList.contains('citation')) {
                const resultSection = event.target.closest('.result-section');
                if (!resultSection || !resultSection.dataset.citations) return;

                const citations = JSON.parse(resultSection.dataset.citations);
                const sourceIndex = parseInt(event.target.dataset.sourceIndex, 10);
                const citation = citations.find(c => c.id === sourceIndex);

                if (citation) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'citation-tooltip';
                    tooltip.innerHTML = `<strong>Source:</strong><p>${citation.text}</p>`;
                    document.body.appendChild(tooltip);

                    const rect = event.target.getBoundingClientRect();
                    tooltip.style.left = `${rect.left}px`;
                    tooltip.style.top = `${rect.bottom + 5}px`;
                }
            }
        });

        resultsContainer.addEventListener('mouseout', (event) => {
            if (event.target.classList.contains('citation') && tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
    },

    updateModelOptions: function() {
        const provider = document.getElementById('api-provider').value;
        const models = window.app.state.providerModels[provider] || [];
        const modelSelect = document.getElementById('model-version');
        modelSelect.innerHTML = models.map(m => `<option value="${m.value}">${m.text}</option>`).join('');
        if (models.length > 0) {
            window.app.state.systemState.aiConfig.model = models[0].value;
        }
    },

    updateConnectionStatus: function() {
        const statusIndicator = document.getElementById('ai-connection-status');
        if (window.app.state.systemState.aiConfig.isConnected) {
            statusIndicator.className = 'status-indicator status-connected';
        } else {
            statusIndicator.className = 'status-indicator status-disconnected';
        }
    },

    displayResult: function(title, content, type, imageB64 = null) {
        const resultsContainer = document.getElementById('results-container');
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-section ${type}`;

        const htmlContent = window.app.utils.markdownToHtml(content);
        let imageHtml = '';
        if (imageB64) {
            imageHtml = `<div class="result-image"><img src="data:image/png;base64,${imageB64}" alt="Generated Plot"></div>`;
        }

        resultDiv.innerHTML = `
            <div class="result-header">${title}</div>
            <div class="result-content">${htmlContent}</div>
            ${imageHtml}
        `;
        resultsContainer.prepend(resultDiv);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    updateStatusDisplay: function() {
        document.getElementById('current-iteration').textContent = window.app.state.systemState.verificationState.currentIteration;
        document.getElementById('consecutive-passes').textContent = window.app.state.systemState.verificationState.consecutivePasses;
        document.getElementById('total-errors').textContent = window.app.state.systemState.errorReports.length;
        const pySuccess = window.app.state.systemState.verificationState.pythonValidations - window.app.state.systemState.verificationState.pythonFailures;
        document.getElementById('python-validations').textContent = `${pySuccess}/${window.app.state.systemState.verificationState.pythonValidations}`;
    },

    updateErrorLogDisplay: function(errorReports) {
        const errorLogElement = document.getElementById('error-log-content');
        if (errorReports && errorReports.length > 0) {
            const formattedErrors = errorReports.map((report, index) => 
                `<strong>错误 #${index + 1}:</strong><br><pre>${report}</pre>`
            ).join('<hr>');
            errorLogElement.innerHTML = formattedErrors;
        } else {
            errorLogElement.textContent = '暂无错误';
        }
    },

    updateFailureReasonDisplay: function(reason) {
        const reasonContainer = document.getElementById('failure-reason-display');
        const reasonContent = document.getElementById('failure-reason-content');
        if (reason) {
            reasonContent.innerHTML = window.app.utils.markdownToHtml(reason);
            reasonContainer.style.display = 'block';
        } else {
            reasonContainer.style.display = 'none';
        }
    },

    showNotification: function(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        let content = '';
        if (typeof message === 'object' && message.message) {
            // Structured error object
            content = `
                <strong>${message.error_code || 'Error'}</strong>
                <p>${message.message}</p>
                ${message.suggestion ? `<p><em>Suggestion: ${message.suggestion}</em></p>` : ''}
            `;
        } else {
            // Simple string message
            content = `<span>${message}</span>`;
        }

        notification.innerHTML = content;
        document.body.appendChild(notification);

        // Add a close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'notification-close-btn';
        closeButton.onclick = () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        };
        notification.appendChild(closeButton);

        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-hide after duration
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, duration);
    },

    updateMainStepStatus: function(stepNumber, status) {
        const stepElement = document.getElementById(`main-step-${stepNumber}`);
        if (stepElement) {
            stepElement.classList.remove('active', 'completed', 'failed');
            if (status) stepElement.classList.add(status);
        }
    },

    createApprovalButtons: function(currentStep) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'approval-buttons';

        const approveButton = document.createElement('button');
        approveButton.className = 'approve-btn';
        approveButton.textContent = 'Approve & Continue';
        approveButton.dataset.nextStep = window.app.state.workflow.getNextStep(currentStep);

        const reviseButton = document.createElement('button');
        reviseButton.className = 'revise-btn';
        reviseButton.textContent = 'Request Revision';

        buttonContainer.appendChild(reviseButton);
        buttonContainer.appendChild(approveButton);

        return buttonContainer;
    },

    updateStepVisualization: function(currentStep) {
        const steps = document.querySelectorAll('.verification-step');
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
        });

        const stepOrder = window.app.state.workflow.stepOrder;
        const currentIndex = stepOrder.indexOf(currentStep);

        for (let i = 0; i < currentIndex; i++) {
            document.getElementById(stepOrder[i]).classList.add('completed');
        }

        const currentStepElement = document.getElementById(currentStep);
        if (currentStepElement) {
            currentStepElement.classList.add('active');
        }
    },

    renderHistory: function() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        window.app.state.sessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'history-item';
            if (session.id === window.app.state.activeSessionId) {
                sessionDiv.classList.add('active');
            }
            sessionDiv.textContent = session.name;
            sessionDiv.dataset.sessionId = session.id;
            historyList.appendChild(sessionDiv);
        });
    },

    renderKnowledgeFiles: function() {
        const fileList = document.getElementById('knowledge-file-list');
        fileList.innerHTML = '';
        window.app.state.knowledge.files.forEach(file => {
            const fileItem = document.createElement('li');
            fileItem.textContent = file.filename;
            fileList.appendChild(fileItem);
        });
    },

    addCopyButtonsToCodeBlocks: function(container) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(block => {
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', () => {
                const code = block.querySelector('code') ? block.querySelector('code').innerText : block.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });
            block.appendChild(copyButton);
        });
    },

    displayStepResult: function(step, result) {
        const resultsContainer = document.getElementById('results-container');
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-section';
        resultDiv.id = `result-${step}`;

        let contentHtml = '';
        if (result.computational_result) {
             if (typeof result.computational_result === 'object') {
                contentHtml += `<div class="result-part"><h4>Computational Result:</h4><pre><code>${JSON.stringify(result.computational_result, null, 2)}</code></pre></div>`;
            } else {
                contentHtml += `<div class="result-part"><h4>Computational Result:</h4><div class="result-content-editable">${result.computational_result}</div></div>`;
            }
        }
        if (result.ai_review) {
            contentHtml += `<div class="result-part ai-review"><h4>AI Review:</h4><div class="result-content">${result.ai_review}</div></div>`;
        }
        if (result.synthesis_report) {
            contentHtml += `<div class="result-part synthesis-report"><h4>Synthesis Report:</h4><div class="result-content">${result.synthesis_report}</div></div>`;
        }

        if (result.citations && result.citations.length > 0) {
            resultDiv.dataset.citations = JSON.stringify(result.citations);
        }

        resultDiv.innerHTML = contentHtml;

        this.addCopyButtonsToCodeBlocks(resultDiv);

        const nextStep = window.app.state.workflow.getNextStep(step);
        if (nextStep) {
            const buttons = this.createApprovalButtons(step);
            resultDiv.appendChild(buttons);
        }

        resultsContainer.appendChild(resultDiv);
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};
