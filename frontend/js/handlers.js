window.app = window.app || {};
window.app.handlers = {
    initializeEventListeners: function() {
        document.getElementById('solve-button').addEventListener('click', async () => {
            const problem = document.getElementById('problem-input').value;
            const parameters = window.app.parameters.getParameters();
            const solver = document.getElementById('solver-preference').value;

            window.app.ui.showNotification('开始处理...', 'info');

            try {
                const result = await window.app.api.runWorkflow(problem, parameters, solver);
                window.app.ui.displayResult(result);
            } catch (error) {
                window.app.ui.showNotification(`处理失败: ${error.message}`, 'error');
            }
        });

        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            window.app.parameters.addParameterRow();
        });
    }
};
