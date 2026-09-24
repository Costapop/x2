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

const { solveBiquadratic, solveEquation, formatAnswer } = require('../dist/solver.js');
const biCases = [
  ['четыре действительных', [1, -5, 4], [[-2, 0, 1], [-1, 0, 1], [1, 0, 1], [2, 0, 1]]],
  ['действительные и мнимые', [1, 0, -16], [[-2, 0, 1], [0, -2, 1], [0, 2, 1], [2, 0, 1]]],
  ['четыре мнимых', [1, 5, 4], [[0, -2, 1], [0, -1, 1], [0, 1, 1], [0, 2, 1]]],
  ['четыре комплексных', [1, 0, 1], [[-Math.SQRT1_2, -Math.SQRT1_2, 1], [-Math.SQRT1_2, Math.SQRT1_2, 1], [Math.SQRT1_2, -Math.SQRT1_2, 1], [Math.SQRT1_2, Math.SQRT1_2, 1]]],
  ['два двойных', [1, -2, 1], [[-1, 0, 2], [1, 0, 2]]],
  ['два мнимых двойных', [1, 2, 1], [[0, -1, 2], [0, 1, 2]]],
  ['нулевой четверной', [3, 0, 0], [[0, 0, 4]]],
  ['нулевой двойной и два простых', [1, -4, 0], [[-2, 0, 1], [0, 0, 2], [2, 0, 1]]],
  ['нулевой двойной и два мнимых', [1, 4, 0], [[0, -2, 1], [0, 0, 2], [0, 2, 1]]],
  ['вырождение в квадратное', [0, 2, -8], [[-2, 0, 1], [2, 0, 1]]],
  ['вырождение в мнимые', [0, 2, 8], [[0, -2, 1], [0, 2, 1]]],
  ['вырождение в нулевой двойной', [0, 2, 0], [[0, 0, 2]]],
  ['отрицательный старший коэффициент', [-1, 5, -4], [[-2, 0, 1], [-1, 0, 1], [1, 0, 1], [2, 0, 1]]],
  ['тождество', [0, 0, 0], []],
  ['нет решений', [0, 0, 2], []]
];
for (const [name, coefficients, expected] of biCases) {
  test(`биквадратное: ${name}`, () => {
    const result = solveBiquadratic(...coefficients);
    assert.equal(result.solutions.length, expected.length);
    result.solutions.forEach((z, i) => {
      const [real, imaginary, multiplicity] = expected[i];
      assert.ok(Math.abs(z.real - real) < 1e-12);
      assert.ok(Math.abs(z.imaginary - imaginary) < 1e-12);
      assert.equal(z.multiplicity, multiplicity);
      assert.ok(!Object.is(z.real, -0) && !Object.is(z.imaginary, -0));
    });
    assert.equal(result.solutions.reduce((sum, z) => sum + z.multiplicity, 0), result.degree);
    assert.deepEqual(result.roots, expected.filter(z => z[1] === 0).map(z => z[0]));
  });
}

test('критические точки и чётность биквадратного графика', () => {
  const result = solveBiquadratic(1, -5, 4);
  assert.equal(result.symmetry, 0);
  assert.equal(result.criticalPoints.length, 3);
  for (const point of result.criticalPoints) {
    assert.ok(Math.abs(4 * point.x ** 3 - 10 * point.x) < 1e-12);
    assert.ok(Math.abs(evaluate(result, point.x) - point.y) < 1e-12);
  }
  for (const x of [.1, .7, 2, 10]) assert.equal(evaluate(result, x), evaluate(result, -x));
  assert.equal(solveBiquadratic(1, 5, 4).criticalPoints.length, 1);
});

test('подстановка всех комплексных корней в исходный многочлен на разных масштабах', () => {
  const multiply = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
  const values = [-1e12, -1e6, -1, -1e-6, -1e-12, 0, 1e-12, 1e-6, 1, 1e6, 1e12];
  for (const a of values) for (const b of values) for (const c of values) {
    const result = solveBiquadratic(a, b, c);
    assert.equal(result.solutions.reduce((sum, z) => sum + z.multiplicity, 0), result.degree);
    for (const z of result.solutions) {
      const squared = multiply([z.real, z.imaginary], [z.real, z.imaginary]);
      const fourth = multiply(squared, squared);
      const residual = Math.hypot(a * fourth[0] + b * squared[0] + c, a * fourth[1] + b * squared[1]);
      const radius = Math.hypot(z.real, z.imaginary);
      const scale = Math.abs(a) * radius ** 4 + Math.abs(b) * radius ** 2 + Math.abs(c);
      assert.ok(Number.isFinite(residual) && residual <= Math.max(scale, Number.MIN_VALUE) * 2e-12, `${a}, ${b}, ${c}: ${JSON.stringify(z)}`);
    }
  }
});

test('близкие корни не объединяются; маленький ненулевой корень не теряется', () => {
  assert.equal(solveBiquadratic(1, -2, 1 - 1e-14).solutions.length, 4);
  assert.equal(solveBiquadratic(1, -2, 1 + 1e-14).kind, 'complex');
  const result = solveBiquadratic(1e-12, -1e12, 1e-12);
  assert.equal(result.roots.length, 4);
  assert.ok(Math.abs(result.roots[2] / 1e-12 - 1) < 1e-12);
  assert.ok(Math.abs(result.roots[3] / 1e12 - 1) < 1e-12);
});

test('формат двух знаков, степени и совместимость квадратного режима', () => {
  assert.equal(formatAnswer(Math.sqrt(2)), '1,41');
  assert.equal(formatAnswer(-0), '0');
  assert.equal(formatAnswer(1e-12), '1e−12');
  assert.equal(formatAnswer(-1e12), '−1e12');
  assert.equal(polynomial(1, -5, 4, 'biquadratic'), 'x⁴ − 5x² + 4');
  assert.equal(polynomial(1, -5, 4, 'reduced'), 't² − 5t + 4');
  assert.deepEqual(solveEquation(1, -3, -4, 'quadratic').roots, [-1, 4]);
  assert.equal(solveEquation(0, 0, 0).kind, 'identity');
  assert.equal(solveEquation(0, 0, 1).kind, 'constant');
  assert.throws(() => solveEquation(1, 2, 3, 'unknown'));
  for (const bad of [NaN, Infinity, 1e13, 1e-13]) assert.throws(() => solveBiquadratic(1, bad, 1));
});
