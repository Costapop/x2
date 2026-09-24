(function (root) {
  'use strict';
  const LIMIT = 1e12;
  const MIN_NONZERO = 1e-12;

  function parseCoefficient(value) {
    const text = String(value).trim().replace('−', '-').replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
      throw new Error('Введите число в каждом поле. Например: −3, 0 или 1,5.');
    }
    const number = Number(text);
    if (!Number.isFinite(number) || Math.abs(number) > LIMIT || (number !== 0 && Math.abs(number) < MIN_NONZERO) || (number === 0 && /[1-9]/.test(text.split(/e/i)[0]))) {
      throw new Error('Модуль ненулевого коэффициента должен быть от 10⁻¹² до 10¹². Ноль тоже допустим.');
    }
    return number === 0 ? 0 : number;
  }

  function solve(a, b, c) {
    for (const value of [a, b, c]) {
      if (!Number.isFinite(value) || Math.abs(value) > LIMIT || (value !== 0 && Math.abs(value) < MIN_NONZERO)) {
        throw new RangeError('Коэффициенты вне поддерживаемого диапазона.');
      }
    }
    if (a === 0) {
      if (b !== 0) return { kind: 'linear', roots: [-c / b], a, b, c };
      return { kind: c === 0 ? 'identity' : 'constant', roots: [], a, b, c };
    }
    const discriminant = b * b - 4 * a * c;
    const vertex = { x: -b / (2 * a), y: -discriminant / (4 * a) };
    const base = { a, b, c, discriminant, vertex };
    if (discriminant < 0) {
      return { ...base, kind: 'complex', roots: [], real: -b / (2 * a), imaginary: Math.sqrt(-discriminant) / (2 * Math.abs(a)) };
    }
    if (discriminant === 0) return { ...base, kind: 'double', roots: [vertex.x] };
    // Stable form: avoids subtracting nearly equal numbers for a small root.
    const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant));
    const roots = [q / a, c / q].sort((x, y) => x - y).map(x => x === 0 ? 0 : x);
    return { ...base, kind: 'two', roots };
  }

  function format(value, precision = 7) {
    if (value === 0 || Object.is(value, -0)) return '0';
    const abs = Math.abs(value);
    if (abs >= 1e7 || abs < 1e-5) {
      return value.toExponential(precision - 1).replace(/\.?(0+)(?=e)/, '').replace('.', ',').replace('e+', 'e').replace(/-/g, '−');
    }
    return Number(value.toPrecision(precision)).toLocaleString('ru-RU', { useGrouping: false, maximumSignificantDigits: precision }).replace(/-/g, '−');
  }

  // Principal square root without cancellation for a complex number.
  function complexSqrt(real, imaginary) {
    if (imaginary === 0) return real >= 0
      ? { real: Math.sqrt(real), imaginary: 0 }
      : { real: 0, imaginary: Math.sqrt(-real) };
    const radius = Math.hypot(real, imaginary);
    if (real >= 0) {
      const u = Math.sqrt((radius + real) / 2);
      return { real: u, imaginary: imaginary / (2 * u) };
    }
    const v = Math.sign(imaginary) * Math.sqrt((radius - real) / 2);
    return { real: Math.abs(imaginary / (2 * v)), imaginary: v };
  }

  function solveBiquadratic(a, b, c) {
    // Solve for t = x² first. Keep multiplicities instead of merging nearby roots.
    const reduced = solve(a, b, c);
    const tRoots = reduced.kind === 'complex'
      ? [-1, 1].map(sign => ({ real: reduced.real, imaginary: sign * reduced.imaginary, multiplicity: 1 }))
      : reduced.roots.map(real => ({ real, imaginary: 0, multiplicity: reduced.kind === 'double' ? 2 : 1 }));
    const solutions = tRoots.flatMap(t => {
      if (t.real === 0 && t.imaginary === 0) return [{ real: 0, imaginary: 0, multiplicity: 2 * t.multiplicity }];
      const z = complexSqrt(t.real, t.imaginary);
      return [-1, 1].map(sign => ({
        real: z.real === 0 ? 0 : sign * z.real,
        imaginary: z.imaginary === 0 ? 0 : sign * z.imaginary,
        multiplicity: t.multiplicity
      }));
    }).sort((u, v) => u.real - v.real || u.imaginary - v.imaginary);
    const roots = solutions.filter(z => z.imaginary === 0).map(z => z.real);
    const criticalPoints = a !== 0 || b !== 0 ? [{ x: 0, y: c }] : [];
    if (a !== 0 && -b / (2 * a) > 0) {
      const x = Math.sqrt(-b / (2 * a));
      criticalPoints.push({ x: -x, y: reduced.vertex.y }, { x, y: reduced.vertex.y });
    }
    criticalPoints.sort((u, v) => u.x - v.x);
    return {
      a, b, c, mode: 'biquadratic', degree: a !== 0 ? 4 : b !== 0 ? 2 : 0,
      kind: reduced.kind === 'identity' || reduced.kind === 'constant' ? reduced.kind
        : roots.length === solutions.length ? 'real' : roots.length ? 'mixed' : 'complex',
      roots, solutions, reduced, tRoots, criticalPoints,
      symmetry: a !== 0 || b !== 0 ? 0 : null,
      discriminant: reduced.discriminant
    };
  }

  function solveEquation(a, b, c, mode = 'biquadratic') {
    if (mode === 'biquadratic') return solveBiquadratic(a, b, c);
    if (mode !== 'quadratic') throw new RangeError('Неизвестный тип уравнения.');
    const result = solve(a, b, c);
    const solutions = result.kind === 'complex'
      ? [-1, 1].map(sign => ({ real: result.real, imaginary: sign * result.imaginary, multiplicity: 1 }))
      : result.roots.map(real => ({ real, imaginary: 0, multiplicity: result.kind === 'double' ? 2 : 1 }));
    return { ...result, mode, degree: a !== 0 ? 2 : b !== 0 ? 1 : 0, solutions,
      criticalPoints: result.vertex ? [result.vertex] : [], symmetry: result.vertex?.x ?? null };
  }

  function formatAnswer(value) {
    if (value === 0 || Object.is(value, -0)) return '0';
    if (Math.abs(value) >= 1e7 || Math.abs(value) < .01) {
      return value.toExponential(2).replace(/\.?0+(?=e)/, '').replace('.', ',').replace('e+', 'e').replace(/-/g, '−');
    }
    return value.toLocaleString('ru-RU', { useGrouping: false, maximumFractionDigits: 2 }).replace(/-/g, '−');
  }

  function polynomial(a, b, c, mode = 'quadratic') {
    const parts = [];
    const powers = mode === 'biquadratic' ? ['x⁴', 'x²'] : mode === 'reduced' ? ['t²', 't'] : ['x²', 'x'];
    [[a, powers[0]], [b, powers[1]], [c, '']].forEach(([value, variable]) => {
      if (value === 0) return;
      const magnitude = Math.abs(value);
      const term = (variable && magnitude === 1 ? '' : format(magnitude)) + variable;
      parts.push((parts.length ? (value < 0 ? ' − ' : ' + ') : (value < 0 ? '−' : '')) + term);
    });
    return parts.join('') || '0';
  }

  function evaluate(model, x) {
    const variable = model.mode === 'biquadratic' ? x * x : x;
    return (model.a * variable + model.b) * variable + model.c;
  }

  const api = { parseCoefficient, solve, solveBiquadratic, solveEquation, format, formatAnswer, polynomial, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Quadratic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
