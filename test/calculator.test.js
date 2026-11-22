const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateExpression } = require('../main.js');

test('respects multiplication precedence', () => {
    assert.equal(evaluateExpression('2 + 3 * 4'), 14);
});

test('supports parentheses and nested expressions', () => {
    assert.equal(evaluateExpression('(2 + 3) * (8 - 4)'), 20);
});

test('supports decimals and unary signs', () => {
    assert.equal(evaluateExpression('-2.5 + +.5'), -2);
});

test('supports repeated unary signs', () => {
    assert.equal(evaluateExpression('--4'), 4);
});

test('converts a postfix percentage to a fraction', () => {
    assert.equal(evaluateExpression('25%'), 0.25);
});

test('evaluates percentages before multiplication', () => {
    assert.equal(evaluateExpression('200 * 10%'), 20);
});

test('supports negative percentages', () => {
    assert.equal(evaluateExpression('-50%'), -0.5);
});

test('rejects division by zero', () => {
    assert.throws(() => evaluateExpression('10 / (3 - 3)'), /divide by zero/i);
});

test('rejects malformed expressions', () => {
    for (const expression of ['1 +', '(2 + 3', '2..4 + 1', '2 ** 3', '1 + %', '']) {
        assert.throws(() => evaluateExpression(expression), undefined, expression);
    }
});

test('rejects executable input instead of evaluating JavaScript', () => {
    assert.throws(() => evaluateExpression('globalThis.process.exit()'), /only numbers/i);
});
