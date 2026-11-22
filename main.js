function evaluateExpression(expression) {
    if (typeof expression !== 'string' || expression.trim() === '') {
        throw new Error('Enter an expression first.');
    }

    const tokens = [];
    let index = 0;

    while (index < expression.length) {
        const character = expression[index];

        if (/\s/.test(character)) {
            index++;
            continue;
        }

        if (/[0-9.]/.test(character)) {
            const start = index;
            let decimalPoints = 0;
            let digits = 0;

            while (index < expression.length && /[0-9.]/.test(expression[index])) {
                if (expression[index] === '.') decimalPoints++;
                else digits++;
                index++;
            }

            if (decimalPoints > 1 || digits === 0) {
                throw new Error('Invalid number.');
            }

            tokens.push({ type: 'number', value: Number(expression.slice(start, index)) });
            continue;
        }

        if ('+-*/()%'.includes(character)) {
            tokens.push({ type: character, value: character });
            index++;
            continue;
        }

        throw new Error('Only numbers and basic arithmetic operators are allowed.');
    }

    let position = 0;

    function parseExpression() {
        let value = parseTerm();

        while (tokens[position]?.type === '+' || tokens[position]?.type === '-') {
            const operator = tokens[position++].type;
            const right = parseTerm();
            value = operator === '+' ? value + right : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (tokens[position]?.type === '*' || tokens[position]?.type === '/') {
            const operator = tokens[position++].type;
            const right = parseUnary();

            if (operator === '/' && right === 0) {
                throw new Error('Cannot divide by zero.');
            }

            value = operator === '*' ? value * right : value / right;
        }

        return value;
    }

    function parseUnary() {
        if (tokens[position]?.type === '+') {
            position++;
            return parseUnary();
        }

        if (tokens[position]?.type === '-') {
            position++;
            return -parseUnary();
        }

        return parsePostfix();
    }

    function parsePostfix() {
        let value = parsePrimary();

        while (tokens[position]?.type === '%') {
            position++;
            value /= 100;
        }

        return value;
    }

    function parsePrimary() {
        const token = tokens[position++];

        if (!token) {
            throw new Error('Incomplete expression.');
        }

        if (token.type === 'number') {
            return token.value;
        }

        if (token.type === '(') {
            const value = parseExpression();

            if (tokens[position]?.type !== ')') {
                throw new Error('Missing closing parenthesis.');
            }

            position++;
            return value;
        }

        throw new Error('Invalid expression.');
    }

    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
        throw new Error('Invalid expression.');
    }

    return Object.is(result, -0) ? 0 : Number.parseFloat(result.toPrecision(12));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateExpression };
}

if (typeof document !== 'undefined') {
    const calculator = document.querySelector('.calculator-card');
    const expressionDisplay = document.getElementById('expressionDisplay');
    const resultDisplay = document.getElementById('resultDisplay');
    const displayMessage = document.getElementById('displayMessage');
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    const clearHistoryButton = document.getElementById('clearHistory');
    const themeToggle = document.getElementById('themeToggle');
    const historyKey = 'calcora-history';
    const themeKey = 'calcora-theme';
    const maximumHistory = 8;

    let expressionValue = '';
    let completedExpression = '';
    let justEvaluated = false;
    let history = [];

    function formatNumber(value) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 10
        }).format(value);
    }

    function readStoredHistory() {
        try {
            const stored = JSON.parse(window.localStorage.getItem(historyKey) || '[]');
            if (!Array.isArray(stored)) return [];

            return stored
                .filter(item =>
                    item &&
                    typeof item.expression === 'string' &&
                    typeof item.result === 'string' &&
                    Number.isFinite(Number(item.result))
                )
                .slice(0, maximumHistory);
        } catch {
            return [];
        }
    }

    function saveHistory() {
        try {
            window.localStorage.setItem(historyKey, JSON.stringify(history));
        } catch {
            displayMessage.textContent = 'History could not be saved on this device.';
        }
    }

    function renderHistory() {
        historyList.replaceChildren();

        if (history.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';

            const icon = document.createElement('span');
            icon.className = 'history-empty-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '↗';

            const title = document.createElement('strong');
            title.textContent = 'No calculations yet';

            const description = document.createElement('span');
            description.textContent = 'Your results will show up here.';

            empty.append(icon, title, description);
            historyList.append(empty);
        } else {
            history.forEach(item => {
                const entry = document.createElement('button');
                entry.type = 'button';
                entry.className = 'history-item';
                entry.setAttribute('aria-label', item.expression + ' equals ' + formatNumber(Number(item.result)));

                const expression = document.createElement('span');
                expression.className = 'history-expression';
                expression.textContent = item.expression;

                const result = document.createElement('strong');
                result.className = 'history-result';
                result.textContent = '= ' + formatNumber(Number(item.result));

                const time = document.createElement('span');
                time.className = 'history-time';
                const timestamp = Number(item.createdAt);
                time.textContent = Number.isFinite(timestamp)
                    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                entry.append(expression, result, time);
                entry.addEventListener('click', () => {
                    expressionValue = item.expression;
                    completedExpression = '';
                    justEvaluated = false;
                    renderDisplay();
                });
                historyList.append(entry);
            });
        }

        historyCount.textContent = history.length + (history.length === 1 ? ' saved' : ' saved');
        clearHistoryButton.disabled = history.length === 0;
    }

    function renderDisplay() {
        if (!expressionValue) {
            expressionDisplay.textContent = 'Start with a number';
            resultDisplay.textContent = '0';
            displayMessage.textContent = 'Ready when you are';
            return;
        }

        expressionDisplay.textContent = justEvaluated
            ? completedExpression + ' ='
            : expressionValue;

        if (justEvaluated) {
            resultDisplay.textContent = formatNumber(Number(expressionValue));
            displayMessage.textContent = 'Calculation complete';
            return;
        }

        try {
            resultDisplay.textContent = formatNumber(evaluateExpression(expressionValue));
            displayMessage.textContent = 'Live preview';
        } catch {
            resultDisplay.textContent = '—';
            displayMessage.textContent = 'Keep going to complete your expression';
        }
    }

    function appendValue(value) {
        if (justEvaluated) {
            if (/[0-9.]/.test(value) || value === '(') {
                expressionValue = '';
            }
            completedExpression = '';
            justEvaluated = false;
        }

        expressionValue += value;
        renderDisplay();
    }

    function clearDisplay() {
        expressionValue = '';
        completedExpression = '';
        justEvaluated = false;
        renderDisplay();
    }

    function backspace() {
        if (justEvaluated) {
            clearDisplay();
            return;
        }

        expressionValue = expressionValue.slice(0, -1);
        renderDisplay();
    }

    function toggleSign() {
        const match = expressionValue.match(/(?:\d+\.?\d*|\.\d+)$/);
        if (!match) return;

        const numberStart = expressionValue.length - match[0].length;
        const prefix = expressionValue.slice(0, numberStart);
        const prefixWithoutSign = prefix.slice(0, -1);
        const hasUnaryMinus = prefix.endsWith('-') &&
            (prefix.length === 1 || /[+\-*/(]$/.test(prefixWithoutSign));

        expressionValue = hasUnaryMinus
            ? prefixWithoutSign + match[0]
            : prefix + '-' + match[0];

        completedExpression = '';
        justEvaluated = false;
        renderDisplay();
    }

    function calculate() {
        if (!expressionValue.trim()) return;

        try {
            const originalExpression = expressionValue;
            const result = evaluateExpression(originalExpression);
            const resultText = String(result);

            history.unshift({
                expression: originalExpression,
                result: resultText,
                createdAt: Date.now()
            });
            history = history.slice(0, maximumHistory);
            saveHistory();
            renderHistory();

            completedExpression = originalExpression;
            expressionValue = resultText;
            justEvaluated = true;
            renderDisplay();
        } catch (error) {
            resultDisplay.textContent = '—';
            displayMessage.textContent = error.message;
        }
    }

    function handleAction(action) {
        if (action === 'clear') clearDisplay();
        else if (action === 'backspace') backspace();
        else if (action === 'toggle-sign') toggleSign();
        else if (action === 'equals') calculate();
    }

    function setTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        themeToggle.querySelector('.theme-symbol').textContent = isDark ? '☀' : '☾';
        themeToggle.querySelector('.theme-label').textContent = isDark ? 'Light mode' : 'Dark mode';

        try {
            window.localStorage.setItem(themeKey, isDark ? 'dark' : 'light');
        } catch {
            // The theme still works for the current page when storage is unavailable.
        }
    }

    calculator.addEventListener('click', event => {
        const button = event.target.closest('button[data-value], button[data-action]');
        if (!button) return;

        if (button.dataset.action) {
            handleAction(button.dataset.action);
        } else {
            appendValue(button.dataset.value);
        }
    });

    clearHistoryButton.addEventListener('click', () => {
        history = [];
        saveHistory();
        renderHistory();
    });

    themeToggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    });

    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (/^[0-9.+\-*/()%]$/.test(event.key)) {
            event.preventDefault();
            appendValue(event.key);
        } else if (event.key.toLowerCase() === 'x') {
            event.preventDefault();
            appendValue('*');
        } else if (event.key === 'Enter' || event.key === '=') {
            event.preventDefault();
            calculate();
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            backspace();
        } else if (event.key === 'Escape' || event.key === 'Delete') {
            event.preventDefault();
            clearDisplay();
        }
    });

    history = readStoredHistory();
    renderHistory();
    renderDisplay();

    let savedTheme = 'light';
    try {
        const storedTheme = window.localStorage.getItem(themeKey);
        if (storedTheme === 'dark' || storedTheme === 'light') savedTheme = storedTheme;
    } catch {
        // Keep the default light theme when storage is unavailable.
    }
    setTheme(savedTheme);
}
