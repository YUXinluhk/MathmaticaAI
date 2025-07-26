// frontend/js/handlers/handlers.js
window.app = window.app || {};
window.app.handlers = {
    initializeEventListeners: function() {
        document.getElementById('solve-button').addEventListener('click', window.app.core.startRigorousVerification.bind(window.app.core));
        document.getElementById('stop-button').addEventListener('click', window.app.core.stopVerification.bind(window.app.core));
        document.getElementById('test-ai-btn').addEventListener('click', this.testAIConnection.bind(this));
        document.getElementById('test-connection-btn').addEventListener('click', window.app.api.testBackendConnection);
        document.getElementById('save-all-btn').addEventListener('click', this.saveAllFiles.bind(this));
        document.getElementById('export-data-btn').addEventListener('click', this.exportVerificationData.bind(this));
        document.getElementById('generate-report-btn').addEventListener('click', this.generateLatexReport.bind(this));
        document.getElementById('api-provider').addEventListener('change', window.app.ui.updateModelOptions.bind(window.app.ui));
        document.getElementById('model-version').addEventListener('change', () => {
            window.app.state.systemState.aiConfig.model = document.getElementById('model-version').value;
        });
    },

    testAIConnection: async function() {
        const statusIndicator = document.getElementById('ai-connection-status');
        statusIndicator.className = 'status-indicator status-testing';
        try {
            await window.app.api.callAI('generate_python_solution', { problem: "Test Connection" });
            window.app.state.systemState.aiConfig.isConnected = true;
            window.app.ui.showNotification('AI 连接成功!', 'success');
        } catch (error) {
            window.app.state.systemState.aiConfig.isConnected = false;
            window.app.ui.showNotification(`AI 连接失败: ${error.message}`, 'error');
        } finally {
            window.app.ui.updateConnectionStatus();
        }
    },

    generateLatexReport: function() {
        const problem = document.getElementById('problem-input').value;
        if (!problem || window.app.state.systemState.solutions.length === 0) {
            window.app.ui.showNotification('没有可用于生成报告的内容。请先运行验证流程。', 'warning');
            return;
        }
    
        window.app.ui.showNotification('正在生成LaTeX报告...', 'info');
    
        try {
            const verificationStats = {
                score: window.app.state.systemState.verificationState.verificationScore,
                confidence: window.app.state.systemState.verificationState.confidence,
                pythonValidations: window.app.state.systemState.verificationState.pythonValidations,
                iterations: window.app.state.systemState.verificationState.currentIteration,
                aiModel: window.app.state.systemState.aiConfig.model
            };
            const documentType = document.getElementById('latex-document-type').value;
            const finalSolutionToShow = window.app.state.systemState.finalSolution || window.app.state.systemState.solutions[window.app.state.systemState.solutions.length - 1];

            const latexContent = window.app.utils.generateLatexDocument(
                problem,
                finalSolutionToShow,
                verificationStats,
                documentType
            );

            if (!latexContent) {
                throw new Error('不支持的文档类型。');
            }

            const blob = new Blob([latexContent], { type: 'application/x-latex' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `形式化验证报告_${documentType}_${timestamp}.tex`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.app.ui.showNotification('LaTeX报告已成功生成并开始下载！', 'success');
        } catch (error) {
            window.app.ui.displayResult('LaTeX 报告生成失败', `<pre>${error.message}</pre>`, 'final-fail');
            window.app.ui.showNotification('LaTeX报告生成失败，请查看结果区域的错误日志。', 'error', 5000);
        }
    },

    saveAllFiles: async function() {
        if (typeof JSZip === 'undefined') {
            window.app.ui.showNotification('ZIP library not loaded.', 'error');
            return;
        }
        if (window.app.state.systemState.solutions.length === 0) {
            window.app.ui.showNotification('没有可保存的验证数据。', 'warning');
            return;
        }
    
        const zip = new JSZip();
        const problem = document.getElementById('problem-input').value;
    
        zip.file("problem.txt", problem);
    
        let manifest = `数学验证全流程报告\n========================\n`;
        manifest += `问题: ${problem.substring(0, 50)}...\n`;
        manifest += `验证时间: ${new Date().toLocaleString()}\n`;
        manifest += `总迭代次数: ${window.app.state.systemState.verificationState.currentIteration}\n`;
        manifest += `最终状态: ${window.app.state.systemState.finalSolution ? "验证成功" : "未完全验证"}\n\n`;
        manifest += `文件结构:\n`;
    
        for (let i = 0; i < window.app.state.systemState.verificationState.currentIteration; i++) {
            const iterationFolder = zip.folder(`iteration-${i + 1}`);
            if (window.app.state.systemState.solutions[i]) {
                iterationFolder.file("solution.md", window.app.state.systemState.solutions[i]);
                manifest += `- iteration-${i + 1}/solution.md\n`;
            }
            if (window.app.state.systemState.errorReports[i]) {
                iterationFolder.file("error-report.md", window.app.state.systemState.errorReports[i]);
                manifest += `- iteration-${i + 1}/error-report.md\n`;
            }
            if (window.app.state.systemState.pythonResults[i]) {
                const presult = window.app.state.systemState.pythonResults[i];
                const code = presult.finalCode || "No code executed.";
                const output = (presult.result && presult.result.success) ? presult.result.output : (presult.result ? presult.result.error : "No output.");
                iterationFolder.file("verification-code.py", code);
                iterationFolder.file("execution-result.txt", output);
                manifest += `- iteration-${i + 1}/verification-code.py\n`;
                manifest += `- iteration-${i + 1}/execution-result.txt\n`;
            }
        }
        zip.file("manifest.txt", manifest);
    
        try {
            const content = await zip.generateAsync({ type: "blob" });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `数学验证全流程_${timestamp}.zip`;
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
    
            window.app.ui.showNotification('所有文件已成功打包并开始下载!', 'success');
        } catch (error) {
            console.error("Failed to generate zip file:", error);
            window.app.ui.showNotification('创建ZIP文件失败。', 'error');
        }
    },

    exportVerificationData: function() {
        window.app.ui.showNotification('数据导出功能正在实现中...', 'warning');
    }
};