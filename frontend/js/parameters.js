window.app = window.app || {};
window.app.parameters = {
    initialize: function() {
        document.getElementById('add-parameter-btn').addEventListener('click', () => this.addParameterRow());
        this.addParameterRow('L', '10');
        this.addParameterRow('E', '210e9');
        this.addParameterRow('I', '1e-5');
        this.addParameterRow('F', '1000');
    },

    addParameterRow: function(key = '', value = '') {
        const container = document.getElementById('parameters-container');
        const row = document.createElement('div');
        row.className = 'parameter-row';
        row.innerHTML = `
            <input type="text" class="parameter-key" placeholder="参数名" value="${key}">
            <input type="text" class="parameter-value" placeholder="参数值" value="${value}">
            <button class="remove-btn">-</button>
        `;
        container.appendChild(row);
        row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
    },

    getParameters: function() {
        const parameters = {};
        const rows = document.querySelectorAll('.parameter-row');
        rows.forEach(row => {
            const key = row.querySelector('.parameter-key').value;
            const value = row.querySelector('.parameter-value').value;
            if (key) {
                parameters[key] = value;
            }
        });
        return parameters;
    }
};
