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

        if ('+-*/()'.includes(character)) {
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

        return parsePrimary();
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

    return Number.parseFloat(result.toPrecision(12));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateExpression };
}

if (typeof document !== 'undefined') {
    const display = document.getElementById('displayResult');
    const buttons = document.querySelector('.buttons');
    let justEvaluated = false;

    function appendValue(value) {
        if (display.value === 'Error' || (justEvaluated && /[0-9.(]/.test(value))) {
            display.value = '';
        }

        display.value += value;
        justEvaluated = false;
    }

    function calculate() {
        try {
            display.value = String(evaluateExpression(display.value));
            justEvaluated = true;
        } catch (error) {
            display.value = 'Error';
            justEvaluated = true;
        }
    }

    function clearDisplay() {
        display.value = '';
        justEvaluated = false;
    }

    function handleAction(action) {
        if (action === 'clear') {
            clearDisplay();
        } else if (action === 'backspace') {
            if (display.value === 'Error' || justEvaluated) {
                clearDisplay();
            } else {
                display.value = display.value.slice(0, -1);
            }
        } else if (action === 'equals') {
            calculate();
        }
    }

    buttons.addEventListener('click', event => {
        const button = event.target.closest('input[data-value], input[data-action]');
        if (!button) return;

        if (button.dataset.action) {
            handleAction(button.dataset.action);
        } else {
            appendValue(button.dataset.value);
        }
    });

    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (/^[0-9.+\-*/()]$/.test(event.key)) {
            event.preventDefault();
            appendValue(event.key);
        } else if (event.key === 'Enter' || event.key === '=') {
            event.preventDefault();
            calculate();
        } else if (event.key === 'Backspace') {
            event.preventDefault();
            handleAction('backspace');
        } else if (event.key === 'Escape' || event.key === 'Delete') {
            event.preventDefault();
            clearDisplay();
        }
    });
}
