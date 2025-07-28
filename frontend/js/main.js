window.app = window.app || {};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    window.app.state.initializeState();
    window.app.ui.initializeUI();
    window.app.handlers.initializeEventListeners();
    window.app.parameters.initialize();
});