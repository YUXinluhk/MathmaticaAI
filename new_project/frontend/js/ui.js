// frontend/js/ui.js
window.app = window.app || {};
window.app.ui = {
    initializeUI: function() {
        this.updateModelOptions();
        this.updateConnectionStatus();
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

    displayResult: function(title, content, type) {
        const resultsContainer = document.getElementById('results-container');
        const resultDiv = document.createElement('div');
        resultDiv.className = `result-section ${type}`;
        const htmlContent = window.app.utils.markdownToHtml(content);
        resultDiv.innerHTML = `
            <div class="result-header">${title}</div>
            <div class="result-content">${htmlContent}</div>
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

    showNotification: function(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 500);
        }, duration);
    },

    updateMainStepStatus: function(stepNumber, status) {
        const stepElement = document.getElementById(`main-step-${stepNumber}`);
        if (stepElement) {
            stepElement.classList.remove('active', 'completed', 'failed');
            if (status) stepElement.classList.add(status);
        }
    }
};
