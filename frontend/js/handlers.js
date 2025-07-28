window.app = window.app || {};
window.app.handlers = {
    initializeEventListeners: function() {
        document.getElementById('solve-button').addEventListener('click', () => {
            const problem = document.getElementById('problem-input').value;
            const parameters = window.app.parameters.getParameters();
            // This is a placeholder for the actual function call
            // In a real application, you would pass the problem and parameters
            // to the verification process.
            console.log("Problem:", problem);
            console.log("Parameters:", parameters);
            window.app.ui.showNotification('开始处理...', 'info');
            window.app.verification.startRigorousVerification(problem, parameters);
        });

        document.getElementById('add-parameter-btn').addEventListener('click', () => {
            window.app.parameters.addParameterRow();
        });
    }
};
