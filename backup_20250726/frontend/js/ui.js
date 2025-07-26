// frontend/js/ui.js

import { systemState } from './state.js';
import { markdownToHtml } from './utils.js';

// --- (Existing functions like updateLoadingText, showNotification, etc. remain the same) ---

// NEW: Function to update the status of a node in the logic tree
export function updateTreeNodeStatus(nodeId, status) {
    const node = document.getElementById(nodeId);
    if (node && node.firstElementChild) {
        // Clear existing statuses
        node.firstElementChild.classList.remove('active', 'completed', 'failed');
        // Add the new status
        if (status) {
            node.firstElementChild.classList.add(status);
        }
    }
}

// OLD function, now deprecated. We will remove its usages.
export function updateMainStepStatus(stepNumber, status) {
    // This function is now replaced by updateTreeNodeStatus
}

// --- (The rest of the file remains the same) ---
// updateStatusDisplay, displayResult, etc.
