// frontend/js/api.js

import { systemState, BACKEND_URL } from './state.js';
import { updateStatusDisplay } from './ui.js';

// AI调用函数 (调用后端)
export async function callAI(task, data) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/call-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: systemState.aiConfig.provider,
                model: systemState.aiConfig.model,
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
}

// Python代码执行函数 (调用后端)
export async function executePythonCode(code, context = '') {
    try {
        const response = await fetch(`${BACKEND_URL}/api/execute-python`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Python execution failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            systemState.verificationState.pythonValidations++;
            updateStatusDisplay();
            return {
                success: true,
                result: data.result,
                context: context,
                code: code
            };
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error("Python execution failed:", error);
        return {
            success: false,
            error: error.message || String(error),
            context: context,
            code: code
        };
    }
}