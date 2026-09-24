(() => {
  'use strict';
  const { parseCoefficient, solveEquation, format: f, formatAnswer: answer, polynomial, evaluate } = window.Quadratic;
  const $ = id => document.getElementById(id);
  const fields = ['a', 'b', 'c'].map($);
  let mode = 'biquadratic';
  let model = null;
  let bounds = null;
  let zoom = 1;
  let projection = null;
  const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const value = x => x < 0 ? `(${f(x)})` : f(x);
  const rootLabel = i => `x${['₁', '₂', '₃', '₄'][i] || ''}`;
  const savedInputs = { biquadratic: ['1', '-5', '4'], quadratic: ['1', '-3', '-4'] };
  const examples = {
    biquadratic: [['1,-5,4', 'Четыре корня ℝ'], ['1,0,-16', 'Два ℝ и два ℂ'], ['1,0,1', 'Четыре комплексных'], ['1,-2,1', 'Кратные корни']],
    quadratic: [['1,-3,-4', 'Два корня'], ['1,-4,4', 'Двойной корень'], ['1,0,2', 'Комплексные корни']]
  };

  function complexText(z, formatter = answer) {
    if (z.imaginary === 0) return formatter(z.real);
    if (z.real === 0) return `${formatter(z.imaginary)}i`;
    return `${formatter(z.real)} ${z.imaginary < 0 ? '−' : '+'} ${formatter(Math.abs(z.imaginary))}i`;
  }

  function step(title, math, note) {
    return `<div class="step"><p class="step-title">${esc(title)}</p><p class="math">${esc(math)}</p><p>${esc(note)}</p></div>`;
  }

  function configureMode() {
    const bi = mode === 'biquadratic';
    $('page-title').textContent = bi ? 'Биквадратное уравнение' : 'Квадратное уравнение';
    $('eyebrow').textContent = `АЛГЕБРА / СТЕПЕНЬ ${bi ? '4' : '2'}`;
    document.title = `${bi ? 'Биквадратные' : 'Квадратные'} уравнения — Парабола`;
    $('a-power').textContent = bi ? 'при x⁴' : 'при x²';
    $('b-power').textContent = bi ? 'при x²' : 'при x';
    $('a').setAttribute('aria-label', `Коэффициент a ${bi ? 'при x⁴' : 'при x²'}`);
    $('b').setAttribute('aria-label', `Коэффициент b ${bi ? 'при x²' : 'при x'}`);
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    $('examples').innerHTML = examples[mode].map(([numbers, label]) => `<button type="button" data-example="${numbers}">${label}</button>`).join('');
    $('critical-label').textContent = bi ? 'ЭКСТРЕМУМЫ' : 'ВЕРШИНА';
    $('critical-legend').textContent = bi ? 'Экстремумы' : 'Вершина';
  }

  function renderSolution() {
    const { a, b, c, kind, roots, solutions } = model;
    const bi = mode === 'biquadratic';
    const equation = polynomial(a, b, c, mode);
    $('equation').textContent = `${equation} = 0`;
    $('intro-formula').textContent = `${equation} = 0`;
    $('function-label').textContent = `y = ${equation}`;
    const realCount = solutions.filter(z => z.imaginary === 0).length;
    const complexCount = solutions.length - realCount;
    const repeated = solutions.some(z => z.multiplicity > 1);
    const description = kind === 'identity' ? 'Решение — любое число' : kind === 'constant' ? 'Решений нет'
      : `Действительных: ${realCount} · комплексных: ${complexCount}${repeated ? ' · есть кратные' : ''}`;
    $('result-description').textContent = description;
    $('result-badge').textContent = kind === 'identity' ? '0 = 0' : kind === 'constant' ? `${f(c)} ≠ 0`
      : a === 0 ? 'a = 0' : `D ${model.discriminant > 0 ? '>' : model.discriminant < 0 ? '<' : '='} 0`;
    $('roots').className = `roots${solutions.length < 2 ? ' single' : ''}`;
    $('roots').innerHTML = solutions.length ? solutions.map((z, i) =>
      `<div class="root"><span class="root-label">${rootLabel(i)}${z.multiplicity > 1 ? ` · кратность ${z.multiplicity}` : ''}</span><strong class="root-value">${esc(complexText(z))}</strong>${z.imaginary !== 0 ? `<span class="root-parts">Re = ${esc(answer(z.real))}<br>Im = ${esc(answer(z.imaginary))}</span>` : ''}</div>`
    ).join('') : `<div class="root"><span class="root-label">Ответ</span><strong class="root-value">${kind === 'identity' ? 'x ∈ ℂ' : '∅'}</strong></div>`;
    $('rounding-note').hidden = !solutions.length;
    $('vertex').textContent = model.criticalPoints.length ? model.criticalPoints.map(point => `(${answer(point.x)}; ${answer(point.y)})`).join(' · ') : 'Нет';
    $('symmetry').textContent = model.symmetry !== null ? `x = ${f(model.symmetry)}` : '—';
    const leading = a || b;
    $('direction').textContent = model.degree === 0 ? 'Горизонтальная прямая' : model.degree === 1 ? 'Прямая' : leading > 0 ? 'Вверх ↑' : 'Вниз ↓';
    $('graph-note').textContent = kind === 'identity' ? 'График совпадает с осью x. Любое действительное x — решение.'
      : kind === 'constant' ? 'Горизонтальная прямая не пересекает ось x.'
      : `${roots.length ? 'Синие точки — действительные корни.' : 'График не пересекает ось x.'} ${complexCount ? 'Комплексные корни показаны в карточках; на действительной оси их нет. ' : ''}${bi ? 'График симметричен относительно оси y. ' : ''}Масштабы осей независимы.`;
    const finalAnswer = solutions.length ? solutions.map((z, i) => `${rootLabel(i)} ≈ ${complexText(z)}${z.multiplicity > 1 ? ` (кратность ${z.multiplicity})` : ''}`).join(';  ') : kind === 'identity' ? 'x ∈ ℂ' : '∅';
    if (bi) {
      const tAnswer = model.tRoots.map((z, i) => `t${i === 0 ? '₁' : '₂'} ≈ ${complexText(z, f)}`).join(';  ');
      $('steps').innerHTML = step('1. Заменяем x² на t', `${polynomial(a, b, c, 'reduced')} = 0`, 'Тогда x⁴ = t². Для действительного x требуется t ≥ 0; для комплексных корней такого ограничения нет.')
        + step('2. Решаем уравнение для t', a !== 0 ? `D = ${value(b)}² − 4 · ${value(a)} · ${value(c)} = ${f(model.discriminant)}\n${tAnswer}` : b !== 0 ? `t = −${value(c)} / ${value(b)} = ${f(model.tRoots[0].real)}` : c === 0 ? '0 = 0' : `${f(c)} ≠ 0`, a !== 0 ? 't = (−b ± √D) / (2a). При D < 0 получаем комплексные значения t.' : b !== 0 ? 'При a = 0 остаётся линейное уравнение для t, то есть квадратное для x.' : 'Остаётся проверить свободный член.')
        + step('3. Возвращаемся к x', finalAnswer, solutions.length ? 'Для каждого t находим x = ±√t. При t = 0 получаем x = 0 с удвоенной кратностью. Ответ округлён.' : description + '.');
    } else if (a !== 0) {
      $('steps').innerHTML = step('1. Находим дискриминант', `D = ${value(b)}² − 4 · ${value(a)} · ${value(c)} = ${f(model.discriminant)}`, 'Формула: D = b² − 4ac.')
        + step('2. Подставляем в формулу', 'x = (−b ± √D) / (2a)', model.discriminant < 0 ? 'При D < 0 корни комплексные; i² = −1.' : model.discriminant === 0 ? 'При D = 0 корень имеет кратность 2.' : 'При D > 0 получаем два действительных корня.')
        + step('3. Получаем ответ', finalAnswer, 'Действительные корни отмечены на графике. Ответ округлён.');
    } else {
      $('steps').innerHTML = step('1. Упрощаем уравнение', `${equation} = 0`, 'При a = 0 квадратный член исчезает.')
        + step('2. Проверяем коэффициенты', b !== 0 ? `x = −${value(c)} / ${value(b)}` : c === 0 ? '0 = 0' : `${f(c)} ≠ 0`, b !== 0 ? 'Решаем линейное уравнение.' : 'Проверяем свободный член.')
        + step('3. Получаем ответ', finalAnswer, description + '.');
    }
  }

  function fitBounds() {
    const { a, b, c, roots, criticalPoints } = model;
    let xMin = -5, xMax = 5;
    if (mode === 'biquadratic' && (a !== 0 || b !== 0)) {
      const scales = [...model.solutions.map(z => Math.hypot(z.real, z.imaginary)), ...criticalPoints.map(point => Math.abs(point.x))];
      const radius = (Math.max(...scales) || 2) * 1.1;
      xMin = -radius; xMax = radius;
    } else if (model.vertex) {
      const radius = Math.max(2, Math.sqrt(Math.abs(model.vertex.y / a)) * 1.5);
      xMin = Math.min(0, model.vertex.x - radius, ...roots);
      xMax = Math.max(0, model.vertex.x + radius, ...roots);
    } else if (mode === 'quadratic' && b !== 0) {
      const radius = Math.max(3, Math.abs(roots[0]) * .3);
      xMin = Math.min(0, roots[0]) - radius;
      xMax = Math.max(0, roots[0]) + radius;
    }
    const xPad = (xMax - xMin) * .06;
    xMin -= xPad; xMax += xPad;
    const values = [0, c, evaluate(model, xMin), evaluate(model, xMax), ...criticalPoints.map(point => point.y)];
    let yMin = Math.min(...values), yMax = Math.max(...values);
    const yPad = yMax > yMin ? (yMax - yMin) * .18 : 2;
    return { xMin, xMax, yMin: yMin - yPad, yMax: yMax + yPad };
  }

  function ticks(min, max, count) {
    const rough = (max - min) / count;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].find(n => n * magnitude >= rough) * magnitude;
    const start = Math.ceil(min / step);
    const end = Math.floor(max / step);
    return Array.from({ length: Math.max(0, Math.min(30, end - start + 1)) }, (_, i) => (start + i) * step);
  }

  function drawPlot() {
    if (!model || !bounds) return;
    const svg = $('plot');
    const width = Math.max(280, $('plot-wrap').clientWidth);
    const height = Math.max(260, $('plot-wrap').clientHeight);
    const pad = { left: width < 420 ? 65 : 85, right: 30, top: 30, bottom: 42 };
    const cx = (bounds.xMin + bounds.xMax) / 2, cy = (bounds.yMin + bounds.yMax) / 2;
    const dx = (bounds.xMax - bounds.xMin) / (2 * zoom), dy = (bounds.yMax - bounds.yMin) / (2 * zoom);
    const minX = cx - dx, maxX = cx + dx, minY = cy - dy, maxY = cy + dy;
    const w = width - pad.left - pad.right, h = height - pad.top - pad.bottom;
    const px = x => pad.left + (x - minX) / (maxX - minX) * w;
    const py = y => pad.top + (maxY - y) / (maxY - minY) * h;
    const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
    const zeroY = clamp(py(0), pad.top, height - pad.bottom);
    const zeroX = clamp(px(0), pad.left, width - pad.right);
    projection = { width, height, minX, maxX, px, py, pad, w, h };
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    let content = `<title id="plot-title">График y = ${esc(polynomial(model.a, model.b, model.c, mode))}</title><desc id="plot-description">${esc($('graph-note').textContent)} ${model.roots.length ? 'Корни: ' + model.roots.map(x => f(x)).join('; ') + '.' : ''} Масштаб осей подбирается независимо.</desc><defs><clipPath id="plot-clip"><rect x="${pad.left}" y="${pad.top}" width="${w}" height="${h}"/></clipPath></defs>`;
    for (const x of ticks(minX, maxX, width < 420 ? 4 : 7)) {
      content += `<line x1="${px(x)}" x2="${px(x)}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#edf0f6"/><text class="tick" text-anchor="middle" x="${px(x)}" y="${height - 9}">${f(x, 4)}</text>`;
    }
    for (const y of ticks(minY, maxY, 6)) {
      content += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${py(y)}" y2="${py(y)}" stroke="#edf0f6"/><text class="tick" text-anchor="end" x="${pad.left - 9}" y="${py(y) + 4}">${f(y, 3)}</text>`;
    }
    if (minY <= 0 && maxY >= 0) content += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${zeroY}" y2="${zeroY}" stroke="#b0bbce" stroke-width="1.2"/>`;
    if (minX <= 0 && maxX >= 0) content += `<line x1="${zeroX}" x2="${zeroX}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#b0bbce" stroke-width="1.2"/>`;
    content += `<text class="axis-label" x="${width - 12}" y="${zeroY - 8}">x</text><text class="axis-label" x="${zeroX + 8}" y="16">y</text><g clip-path="url(#plot-clip)">`;
    if (model.symmetry !== null) content += `<line x1="${px(model.symmetry)}" x2="${px(model.symmetry)}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#cad5f4" stroke-dasharray="5 5"/>`;
    // Include exact roots and critical points among samples so a tangency is not lost.
    const samples = Array.from({ length: 601 }, (_, i) => minX + (maxX - minX) * i / 600);
    samples.push(...model.roots.filter(x => x >= minX && x <= maxX));
    samples.push(...model.criticalPoints.map(point => point.x).filter(x => x >= minX && x <= maxX));
    samples.sort((a, b) => a - b);
    const path = samples.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(2)},${clamp(py(evaluate(model, x)), -1e6, 1e6).toFixed(2)}`).join(' ');
    content += `<path d="${path}" fill="none" stroke="#2751e8" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (const point of model.criticalPoints) {
      const vx = px(point.x), vy = py(point.y);
      content += `<rect x="${vx - 4}" y="${vy - 4}" width="8" height="8" rx="1" transform="rotate(45 ${vx} ${vy})" fill="#e48b2c" stroke="white" stroke-width="1.5"/>`;
    }
    model.roots.forEach((x, i) => {
      const pos = px(x), labelY = (i % 2 === 0 && zeroY + 28 < height - pad.bottom) ? zeroY + 28 : zeroY - 18;
      content += `<circle cx="${pos}" cy="${py(0)}" r="5" fill="white" stroke="#2751e8" stroke-width="2.5"/><text class="root-text" x="${pos}" y="${labelY}" text-anchor="middle">${rootLabel(model.solutions.findIndex(z => z.imaginary === 0 && z.real === x))} = ${answer(x)}</text>`;
    });
    content += '</g><g id="hover-point" pointer-events="none"></g>';
    svg.innerHTML = content;
    $('zoom-in').disabled = zoom >= 8;
    $('zoom-out').disabled = zoom <= .25;
  }

  function update() {
    const numbers = [];
    let error = '';
    fields.forEach(field => {
      try { numbers.push(parseCoefficient(field.value)); field.removeAttribute('aria-invalid'); }
      catch (issue) { error = issue.message; field.setAttribute('aria-invalid', 'true'); }
    });
    $('input-error').hidden = !error;
    $('input-error').textContent = error;
    $('graph-empty').hidden = !error;
    if (error) {
      model = null; projection = null;
      $('equation').textContent = 'Ожидаем коэффициенты';
      $('intro-formula').textContent = 'Введите коэффициенты';
      $('rounding-note').hidden = true;
      $('result-description').textContent = 'Проверьте введённые числа';
      $('result-badge').textContent = '—';
      $('roots').replaceChildren(); $('steps').replaceChildren(); $('plot').replaceChildren();
      ['vertex', 'symmetry', 'direction', 'function-label'].forEach(id => $(id).textContent = '—');
      $('graph-note').textContent = 'График появится после ввода корректных коэффициентов.';
      ['zoom-in', 'zoom-out', 'fit'].forEach(id => $(id).disabled = true);
      document.querySelectorAll('[data-example]').forEach(button => button.setAttribute('aria-pressed', 'false'));
      return;
    }
    model = solveEquation(...numbers, mode); zoom = 1; bounds = fitBounds();
    $('fit').disabled = false;
    renderSolution(); drawPlot();
    document.querySelectorAll('[data-example]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.example === numbers.join(','))));
  }

  fields.forEach(field => field.addEventListener('input', update));
  $('coefficients').addEventListener('submit', event => { event.preventDefault(); update(); });
  $('examples').addEventListener('click', event => {
    const button = event.target.closest('[data-example]');
    if (!button) return;
    button.dataset.example.split(',').forEach((number, i) => fields[i].value = number);
    update();
  });
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    if (mode === button.dataset.mode) return;
    savedInputs[mode] = fields.map(field => field.value);
    mode = button.dataset.mode;
    savedInputs[mode].forEach((number, i) => fields[i].value = number);
    configureMode(); update();
  }));
  $('zoom-in').addEventListener('click', () => { zoom = Math.min(8, zoom * 1.4); drawPlot(); });
  $('zoom-out').addEventListener('click', () => { zoom = Math.max(.25, zoom / 1.4); drawPlot(); });
  $('fit').addEventListener('click', () => { zoom = 1; drawPlot(); });
  $('plot').addEventListener('pointermove', event => {
    if (!model || !projection) return;
    const { width, height, minX, maxX, px, py, pad, w } = projection;
    const rect = $('plot').getBoundingClientRect();
    const screenX = (event.clientX - rect.left) * width / rect.width;
    const hover = $('hover-point');
    if (screenX < pad.left || screenX > width - pad.right) { hover.replaceChildren(); return; }
    const x = minX + (screenX - pad.left) / w * (maxX - minX), y = evaluate(model, x);
    if (py(y) < pad.top || py(y) > height - pad.bottom) { hover.replaceChildren(); return; }
    const text = `x: ${f(x, 5)}   y: ${f(y, 5)}`;
    const boxWidth = Math.min(width - 20, Math.max(155, text.length * 9.3));
    const boxX = Math.min(width - boxWidth - 6, Math.max(6, px(x) + 12)), boxY = Math.max(3, py(y) - 46);
    hover.innerHTML = `<circle cx="${px(x)}" cy="${py(y)}" r="4" fill="#2751e8" stroke="white" stroke-width="2"/><rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="36" rx="6" fill="#182338"/><text x="${boxX + 10}" y="${boxY + 24}" fill="white" font-size="16">${esc(text)}</text>`;
  });
  $('plot').addEventListener('pointerleave', () => $('hover-point')?.replaceChildren());
  new ResizeObserver(drawPlot).observe($('plot-wrap'));
  configureMode();
  update();
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
    for (const toolMode of ['quadratic', 'biquadratic']) {
      try {
        Promise.resolve(document.modelContext.registerTool({
          name: `solve_${toolMode}`,
          title: toolMode === 'biquadratic' ? 'Решить биквадратное уравнение' : 'Решить квадратное уравнение',
          description: `Задать коэффициенты и обновить решение и график ${toolMode === 'biquadratic' ? 'ax⁴ + bx² + c = 0' : 'ax² + bx + c = 0'}.`,
          inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' }, c: { type: 'number' } }, required: ['a', 'b', 'c'], additionalProperties: false },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (!input || ['a', 'b', 'c'].some(key => typeof input[key] !== 'number')) throw new TypeError('Нужны три числовых коэффициента a, b и c.');
            const numbers = ['a', 'b', 'c'].map(key => parseCoefficient(input[key]));
            const result = solveEquation(...numbers, toolMode);
            savedInputs[mode] = fields.map(field => field.value);
            mode = toolMode;
            numbers.forEach((number, i) => fields[i].value = String(number));
            configureMode(); update();
            return result;
          }
        }, { signal: lifecycle.signal })).catch(() => {});
      } catch { /* Optional browser capability. */ }
    }
  }
})();
