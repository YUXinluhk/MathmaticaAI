window.app = window.app || {};

window.app.core = {
    executeAndFixPython: async function(initialCode) {
        let currentCode = initialCode;
        let lastResult = null;
        const maxRetries = 2;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const result = await window.app.api.executePythonCode(currentCode);
            lastResult = result;

            if (result.success) {
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [3B] Python执行成功 (尝试 ${attempt + 1})`, `<pre>${result.output}</pre>`, 'python-success');
                
                // --- New Logic: Auto-download image if it exists ---
                if (result.image) {
                    const a = document.createElement('a');
                    a.href = `data:image/png;base64,${result.image}`;
                    a.download = `iteration_${window.app.state.systemState.verificationState.currentIteration}_plot.png`;
                    a.click();
                    window.app.ui.showNotification(`图表已自动下载: ${a.download}`, 'info');
                }
                return { finalCode: currentCode, result: lastResult };
            }

            // Execution failed
            window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [3B] Python执行失败 (尝试 ${attempt + 1})`, `<pre>${result.error}</pre>`, 'python-error');

            if (attempt < maxRetries) {
                window.app.ui.showNotification(`Python代码执行失败，正在尝试AI修复 (${attempt + 1}/${maxRetries})...`, 'info');
                const fixedCode = await window.app.api.callAI('fix_python_code', {
                    faulty_code: currentCode,
                    error_message: result.error
                });
                currentCode = window.app.utils.extractPythonCode(fixedCode) || fixedCode; // Handle if AI wraps in markdown
                // FIX: Corrected the template literal for the code block
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [3B] AI代码修复尝试`, `\`\`\`python\n${currentCode}\n\`\`\``, 'python-code');
            }
        }
        
        window.app.ui.showNotification('Python代码自动修复失败。', 'error');
        return { finalCode: currentCode, result: lastResult };
    },

    startRigorousVerification: async function() {
        const problem = document.getElementById('problem-input').value;
        if (!problem) {
            window.app.ui.showNotification('请输入数学问题', 'error');
            return;
        }

        window.app.state.initializeState();
        window.app.state.systemState.verificationState.maxIterations = parseInt(document.getElementById('max-iterations').value, 10);
        window.app.state.systemState.verificationState.requiredPasses = parseInt(document.getElementById('consecutive-passes-config').value, 10);
        const rigor = document.getElementById('verification-rigor').value;

        document.getElementById('results-container').innerHTML = '';
        window.app.ui.updateErrorLogDisplay(null);
        window.app.ui.updateFailureReasonDisplay(null);
        
        window.app.state.systemState.verificationState.isRunning = true;
        window.app.state.systemState.verificationState.forceStop = false;
        document.getElementById('solve-button').disabled = true;
        document.getElementById('stop-button').style.display = 'block';

        let currentSolution = "";
        let lastSynthesisReport = "";

        while (
            window.app.state.systemState.verificationState.currentIteration < window.app.state.systemState.verificationState.maxIterations &&
            window.app.state.systemState.verificationState.consecutivePasses < window.app.state.systemState.verificationState.requiredPasses &&
            !window.app.state.systemState.verificationState.forceStop
        ) {
            window.app.state.systemState.verificationState.currentIteration++;
            window.app.ui.updateStatusDisplay();

            try {
                // Steps 1 & 2
                window.app.ui.updateMainStepStatus(1, 'active');
                let solvePrompt = `Problem: ${problem}\n\n`;
                if (lastSynthesisReport) {
                    solvePrompt += `Based on the following final review, provide a corrected and improved solution:\n${lastSynthesisReport}\n\nSolution:`;
                } else {
                    solvePrompt += `Provide a detailed step-by-step solution:`;
                }
                currentSolution = await window.app.api.callAI('initial_solution', { problem, prompt: solvePrompt, solution: currentSolution, rigor });
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - 初始解答`, currentSolution, 'solution');
                window.app.ui.updateMainStepStatus(1, 'completed');

                window.app.ui.updateMainStepStatus(2, 'active');
                const improvementPrompt = `Review the following solution for the problem "${problem}". Identify potential flaws, missing steps, or areas for improvement. Then, provide a refined version.\n\nSolution:\n${currentSolution}`;
                let improvedSolution = await window.app.api.callAI('self_improve_solution', { problem, prompt: improvementPrompt, solution: currentSolution, rigor });
                currentSolution = improvedSolution;
                window.app.state.systemState.solutions.push(currentSolution);
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - 自我改进 (候选方案)`, currentSolution, 'solution');
                window.app.ui.updateMainStepStatus(2, 'completed');

                // Step 3 (Parallel)
                window.app.ui.updateMainStepStatus(3, 'active');
                window.app.ui.updateMainStepStatus(4, 'active');

                const theoreticalVerificationPromise = window.app.api.callAI('verify', { problem, solution: currentSolution, rigor });
                const programmingVerificationPromise = window.app.api.callAI('generate_python_solution', { problem, solution: currentSolution, rigor });

                const [theoryReport, fullPythonResponse] = await Promise.all([theoreticalVerificationPromise, programmingVerificationPromise]);
                
                // --- FIX: Extract only the Python code from the AI's full response ---
                const initialPythonCode = window.app.utils.extractPythonCode(fullPythonResponse) || fullPythonResponse;

                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [3A] 理论验证报告`, theoryReport, 'verification');
                window.app.ui.updateMainStepStatus(3, 'completed');

                // FIX: Corrected the template literal for the code block
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [3B] 初始Python代码`, `\`\`\`python\n${initialPythonCode}\n\`\`\``, 'python-code');
                const { finalCode, result: pythonResult } = await this.executeAndFixPython(initialPythonCode);
                window.app.state.systemState.pythonResults.push(pythonResult);
                window.app.ui.updateMainStepStatus(4, 'completed');

                // Step 4
                window.app.ui.updateMainStepStatus(5, 'active');
                const synthesisReport = await window.app.api.callAI('review_and_synthesis', {
                    solution: currentSolution,
                    error_report: theoryReport,
                    python_code: finalCode,
                    python_output: pythonResult.output,
                    python_error: pythonResult.error
                });
                lastSynthesisReport = synthesisReport;
                window.app.ui.displayResult(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮 - [4] 综合审查报告`, synthesisReport, 'synthesis');
                window.app.ui.updateMainStepStatus(5, 'completed');

                // === Step 5: Final Decision (User-Defined Logic v2) ===
                window.app.ui.updateMainStepStatus(6, 'active');
                const reportText = synthesisReport.trim();
                const verdictLine = reportText.split('\n')[0].toLowerCase();
                const isPass = verdictLine.includes("verification passed");
                const hasSuggestions = reportText.split('\n').filter(line => line.trim() !== '').length > 2;

                if (isPass) {
                    // --- Case 1 & 2: Any type of Pass (Clean or Conditional) increments the counter. ---
                    window.app.state.systemState.verificationState.consecutivePasses++;
                    
                    if (hasSuggestions) {
                        // Case 2: Conditional Pass. It counts as a pass, but we still log the suggestions for the next iteration.
                        window.app.ui.showNotification(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮有条件通过 (计数+1)`, 'success');
                        window.app.state.systemState.errorReports.push(reportText);
                        lastSynthesisReport = reportText;
                        window.app.ui.updateErrorLogDisplay(window.app.state.systemState.errorReports);
                    } else {
                        // Case 1: Clean Pass.
                        window.app.ui.showNotification(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮验证通过! (计数+1)`, 'success');
                        lastSynthesisReport = ""; // Clear report for next fresh start
                    }
                } else {
                    // --- Case 3: Hard Fail. Resets the counter. ---
                    window.app.state.systemState.verificationState.consecutivePasses = 0;
                    window.app.state.systemState.errorReports.push(reportText);
                    lastSynthesisReport = reportText;
                    window.app.ui.showNotification(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮发现问题 (计数重置)`, 'warning');
                    window.app.ui.updateErrorLogDisplay(window.app.state.systemState.errorReports);
                }
                
                window.app.ui.updateStatusDisplay();
                window.app.ui.updateMainStepStatus(6, 'completed');

            } catch (error) {
                window.app.ui.showNotification(`第 ${window.app.state.systemState.verificationState.currentIteration} 轮出现严重错误: ${error.message}`, 'error', 5000);
                window.app.state.systemState.verificationState.forceStop = true;
            }
        }

        // Final Wrap-up
        if (window.app.state.systemState.verificationState.consecutivePasses >= window.app.state.systemState.verificationState.requiredPasses) {
            window.app.state.systemState.finalSolution = currentSolution;
            window.app.ui.displayResult('最终结论', '验证成功! 解答已连续通过所需次数的验证。', 'final-success');
        } else if (window.app.state.systemState.verificationState.forceStop) {
            window.app.ui.displayResult('最终结论', '验证被手动或因错误而终止。', 'final-stopped');
        } else {
            window.app.ui.displayResult('最终结论', '验证结束。未达到连续通过要求。', 'final-fail');
            window.app.ui.updateFailureReasonDisplay(lastSynthesisReport);
        }

        window.app.state.systemState.verificationState.isRunning = false;
        document.getElementById('solve-button').disabled = false;
        document.getElementById('stop-button').style.display = 'none';
    },

    stopVerification: function() {
        if (window.app.state.systemState.verificationState.isRunning) {
            window.app.state.systemState.verificationState.forceStop = true;
            window.app.ui.showNotification('停止信号已发送，将在当前步骤完成后终止。', 'warning');
        }
    }
};
