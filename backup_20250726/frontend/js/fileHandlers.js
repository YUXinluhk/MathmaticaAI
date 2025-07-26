// frontend/js/fileHandlers.js
import { systemState } from './state.js';
import { showNotification, updateSavedFilesCount } from './ui.js';

// 文件保存功能
function downloadFile(content, filename, mimeType = 'text/plain') {
    try {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        showNotification(`文件保存失败: ${error.message}`, 'error');
        return false;
    }
}

// 生成并下载最终的输出文件
export function generateFinalOutputs() {
    // ... (implementation)
}

// 保存最终报告
export function saveFinalReport() {
    // ... (implementation)
}

// 批量保存所有文件
export async function saveAllFiles() {
    // ... (implementation)
}

// 导出验证数据
export function exportVerificationData() {
    console.log("exportVerificationData function called.");
    if (systemState.solutions.length === 0) {
        showNotification("没有可供导出的数据。", "warning");
        return;
    }
    
    try {
        const data = {
            version: '2.1',
            timestamp: new Date().toISOString(),
            problem: document.getElementById('problem-input').value,
            aiConfig: systemState.aiConfig,
            verificationStats: systemState.verificationState,
            solutions: systemState.solutions,
            errorReports: systemState.errorReports,
            pythonResults: systemState.pythonResults
        };
        
        const jsonData = JSON.stringify(data, null, 2);
        const filename = `verification_data_${new Date().toISOString().slice(0,10)}.json`;
        
        downloadFile(jsonData, filename, 'application/json');
        showNotification('验证数据已导出', 'success');
        
    } catch (error) {
        showNotification(`导出数据失败: ${error.message}`, 'error');
    }
}

// --- Helper functions ---
// ... (savePythonCode, generateLatexDocument, etc.)