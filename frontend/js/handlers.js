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

                // Clear previous results
                document.getElementById('results-container').innerHTML = '';

                if (result.modeling_result) {
                    window.app.ui.displayResult({ title: '物理建模结果', content: result.modeling_result });
                }
                if (result.model_review_result) {
                    window.app.ui.displayResult({ title: '模型审查结果', content: result.model_review_result });
                }
                if (result.simulation_script) {
                    window.app.ui.displayResult({ title: '生成仿真脚本', content: result.simulation_script, language: 'python' });
                }
                if (result.execution_result) {
                    window.app.ui.displayResult({
                        title: '执行仿真结果',
                        content: result.execution_result.output,
                        imageB64: result.execution_result.image
                    });
                }
                if (result.analysis_result) {
                    window.app.ui.displayResult({ title: '结果分析', content: result.analysis_result });
                }

            } catch (error) {
                window.app.ui.showNotification(`处理失败: ${error.message}`, 'error');
            }
        });

        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            window.app.parameters.addParameterRow();
        });
    }
};
