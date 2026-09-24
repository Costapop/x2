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

  function polynomial(a, b, c) {
    const parts = [];
    [[a, 'x²'], [b, 'x'], [c, '']].forEach(([value, variable]) => {
      if (value === 0) return;
      const magnitude = Math.abs(value);
      const term = (variable && magnitude === 1 ? '' : format(magnitude)) + variable;
      parts.push((parts.length ? (value < 0 ? ' − ' : ' + ') : (value < 0 ? '−' : '')) + term);
    });
    return parts.join('') || '0';
  }

  function evaluate(model, x) {
    return (model.a * x + model.b) * x + model.c;
  }

  const api = { parseCoefficient, solve, format, polynomial, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Quadratic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
