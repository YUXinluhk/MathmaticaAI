window.app = window.app || {};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    window.app.state.initializeState();
    loadStateFromLocalStorage();
    window.app.ui.initializeUI();
    window.app.handlers.initializeEventListeners();
    window.app.parameters.initialize();
    window.app.ui.renderHistory();
    window.app.ui.renderKnowledgeFiles();
    window.app.handlers.redisplayWorkflow();
});

function loadStateFromLocalStorage() {
    try {
        const savedState = localStorage.getItem('phoenix-session');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            window.app.state.sessions = parsedState.sessions || [];
            window.app.state.activeSessionId = parsedState.activeSessionId || null;

            const activeSession = window.app.state.sessions.find(s => s.id === window.app.state.activeSessionId);
            if (activeSession) {
                window.app.state.workflow = activeSession.workflowState;
                window.app.state.knowledge = activeSession.knowledge;
            }
        }
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
        localStorage.removeItem('phoenix-session'); // Clear corrupted data
    }
}