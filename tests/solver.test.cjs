'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { solve, parseCoefficient, format, polynomial, evaluate } = require('../dist/solver.js');

const cases = [
  ['два корня', [1, -3, -4], 'two', [-1, 4]],
  ['двойной корень', [1, -4, 4], 'double', [2]],
  ['нулевой двойной корень', [3, 0, 0], 'double', [0]],
  ['ветви вниз', [-1, 2, 3], 'two', [-1, 3]],
  ['нулевой свободный член', [2, -6, 0], 'two', [0, 3]],
  ['нулевой линейный член', [1, 0, -9], 'two', [-3, 3]],
  ['линейное уравнение', [0, 2, -6], 'linear', [3]],
  ['тождество', [0, 0, 0], 'identity', []],
  ['противоречие', [0, 0, 5], 'constant', []],
  ['малые коэффициенты', [1e-12, -3e-12, 2e-12], 'two', [1, 2]],
  ['большие коэффициенты', [1e12, -1e12, 0], 'two', [0, 1]],
  ['дробные коэффициенты', [.5, -1.5, -2], 'two', [-1, 4]],
];
for (const [name, coefficients, kind, expected] of cases) {
  test(name, () => {
    const result = solve(...coefficients);
    assert.equal(result.kind, kind);
    assert.equal(result.roots.length, expected.length);
    result.roots.forEach((root, i) => {
      assert.ok(Math.abs(root - expected[i]) <= Math.max(1, Math.abs(expected[i])) * 1e-12);
      const [a, b, c] = coefficients;
      const scale = Math.abs(a * root * root) + Math.abs(b * root) + Math.abs(c);
      assert.ok(Math.abs(evaluate(result, root)) <= Math.max(scale, 1) * 1e-12);
    });
  });
}

test('комплексные корни и вершина', () => {
  const result = solve(1, -2, 5);
  assert.equal(result.kind, 'complex');
  assert.equal(result.real, 1);
  assert.equal(result.imaginary, 2);
  assert.deepEqual(result.vertex, { x: 1, y: 4 });
  const downward = solve(-1, 2, -5);
  assert.equal(downward.real, 1);
  assert.equal(downward.imaginary, 2);
});
test('устойчивость маленького корня при большом b', () => {
  const { roots } = solve(1, 1e10, 1);
  assert.equal(roots[0], -1e10);
  assert.ok(Math.abs((roots[1] + 1e-10) / 1e-10) < 1e-12);
});
test('маленький ненулевой дискриминант не заменяется нулём', () => {
  assert.equal(solve(1, 2, 1 - 1e-14).kind, 'two');
  assert.equal(solve(1, 2, 1 + 1e-14).kind, 'complex');
});
test('запятая, Unicode-минус и экспонента', () => {
  assert.equal(parseCoefficient(' −1,25 '), -1.25);
  assert.equal(parseCoefficient('.5'), .5);
  assert.equal(parseCoefficient('1e-12'), 1e-12);
  assert.equal(parseCoefficient('-0'), 0);
});
test('ошибки ввода не превращаются в коэффициенты', () => {
  for (const value of ['', ' ', '-', 'abc', 'Infinity', 'NaN', '0x10', '1,2,3', '1e13', '1e-13', '1e-999']) {
    assert.throws(() => parseCoefficient(value), Error, value);
  }
  for (const bad of [Infinity, NaN, 1e13, 1e-13]) assert.throws(() => solve(bad, 1, 1));
});
test('читаемая запись без лишних членов и отрицательного нуля', () => {
  assert.equal(polynomial(1, -3, -4), 'x² − 3x − 4');
  assert.equal(polynomial(-1, 0, 0), '−x²');
  assert.equal(polynomial(0, 0, 0), '0');
  assert.equal(format(-0), '0');
  assert.equal(format(1e-10), '1e−10');
});
