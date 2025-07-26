window.app = window.app || {};

window.app.ui = {
    initializeUI: function() {
        this.updateModelOptions();
        this.updateConnectionStatus();
        // Set default values from state to UI
        document.getElementById('max-iterations').value = window.app.state.systemState.verificationState.maxIterations;
        document.getElementById('consecutive-passes-config').value = window.app.state.systemState.verificationState.requiredPasses;
    },

    updateConnectionStatus: function() {
        const statusIndicator = document.getElementById('ai-connection-status');
        if (window.app.state.systemState.aiConfig.isConnected) {
            statusIndicator.className = 'status-indicator status-connected';
        } else {
            statusIndicator.className = 'status-indicator status-disconnected';
        }
    },

    updateModelOptions: function() {
        const provider = document.getElementById('api-provider').value;
        const models = window.app.state.providerModels[provider] || [];
        const modelSelect = document.getElementById('model-version');
        modelSelect.innerHTML = models.map(m => `<option value="${m.value}">${m.text}</option>`).join('');
        window.app.state.systemState.aiConfig.provider = provider;
        if (models.length > 0) {
            window.app.state.systemState.aiConfig.model = models[0].value;
        }
    },

    updateMainStepStatus: function(step, status) {
        const stepElement = document.getElementById(`main-step-${step}`);
        if (stepElement) {
            stepElement.className = `verification-step ${status}`;
        }
    },

    displayResult: function(title, content, type = '') {
        const container = document.getElementById('results-container');
        const resultSection = document.createElement('div');
        resultSection.className = `result-section ${type}`;
        resultSection.innerHTML = `
            <div class="result-header">${title}</div>
            <div class="result-content">${window.app.utils.markdownToHtml(content)}</div>
        `;
        container.appendChild(resultSection);
        if (window.MathJax) {
            window.MathJax.typesetPromise([resultSection]);
        }
    },

    updateErrorLogDisplay: function(errors) {
        const errorLogElement = document.getElementById('error-log-content');
        const errorLogContainer = errorLogElement.parentElement;

        if (errors && errors.length > 0) {
            const formattedErrors = errors.map((error, index) => {
                return `<strong>第 ${index + 1} 轮错误:</strong><br>${window.app.utils.markdownToHtml(error)}`;
            }).join('<hr style="margin: 10px 0;">');
            errorLogElement.innerHTML = formattedErrors;
            errorLogContainer.style.display = 'block';
        } else {
            errorLogElement.textContent = '暂无错误';
            errorLogContainer.style.display = 'none';
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

    showNotification: function(message, type = 'success', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, duration);
    },

    updateStatusDisplay: function() {
        document.getElementById('current-iteration').textContent = window.app.state.systemState.verificationState.currentIteration;
        document.getElementById('consecutive-passes').textContent = window.app.state.systemState.verificationState.consecutivePasses;
        document.getElementById('total-errors').textContent = window.app.state.systemState.errorReports.length;
        document.getElementById('python-validations').textContent = window.app.state.systemState.pythonResults.length;
    }
};
