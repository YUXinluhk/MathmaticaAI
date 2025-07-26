// frontend/js/api.js
window.app = window.app || {};
window.app.api = {
    BASE_URL: 'http://127.0.0.1:8000',

    testBackendConnection: async function() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: 'google' })
            });
            if (!response.ok) throw new Error('Server responded with an error.');
            window.app.ui.showNotification('后端连接成功!', 'success');
        } catch (error) {
            window.app.ui.showNotification(`后端连接失败: ${error.message}`, 'error');
        }
    },

    callAI: async function(task, data) {
        try {
            const response = await fetch(`${window.app.state.BACKEND_URL}/api/call-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: window.app.state.systemState.aiConfig.provider,
                    model: window.app.state.systemState.aiConfig.model,
                    task: task,
                    data: data
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `API请求失败: ${response.status}`);
            }
            const dataResponse = await response.json();
            return dataResponse.response;
        } catch (error) {
            console.error("AI call failed:", error);
            throw error;
        }
    },

    executePythonCode: async function(code) {
        try {
            const response = await fetch(`${window.app.state.BACKEND_URL}/api/execute-python`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Python execution failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Python execution failed:", error);
            return { success: false, error: error.message || String(error), output: '' };
        }
    },
    
    generateLatexReport: async function(requestBody) {
        const url = `${window.app.state.BACKEND_URL}/api/generate-latex-report`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `API请求失败: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error("LaTeX report generation failed:", error);
            throw error;
        }
    }
};
