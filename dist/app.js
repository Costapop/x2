(() => {
  'use strict';
  const { parseCoefficient, solve, format: f, polynomial, evaluate } = window.Quadratic;
  const $ = id => document.getElementById(id);
  const fields = ['a', 'b', 'c'].map($);
  let model = null;
  let bounds = null;
  let zoom = 1;
  let projection = null;
  const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const value = x => x < 0 ? `(${f(x)})` : f(x);

  function rootCard(label, result) {
    return `<div class="root"><span class="root-label">${esc(label)}</span><strong class="root-value">${esc(result)}</strong></div>`;
  }

  function step(title, math, note) {
    return `<div class="step"><p class="step-title">${esc(title)}</p><p class="math">${esc(math)}</p><p>${esc(note)}</p></div>`;
  }

  function renderSolution() {
    const { a, b, c, kind, roots, discriminant: d } = model;
    $('equation').textContent = `${polynomial(a, b, c)} = 0`;
    $('function-label').textContent = `y = ${polynomial(a, b, c)}`;
    const descriptions = { two: 'Два действительных корня', double: 'Один действительный корень', complex: 'Действительных корней нет', linear: 'Линейное уравнение: один корень', identity: 'Подходит любое действительное число', constant: 'Решений нет' };
    $('result-description').textContent = descriptions[kind];
    $('result-badge').textContent = ({ two: 'D > 0', double: 'D = 0', complex: 'D < 0', linear: 'a = 0', identity: '0 = 0', constant: 'c ≠ 0' })[kind];
    $('roots').className = `roots${roots.length !== 2 && kind !== 'complex' ? ' single' : ''}${kind === 'complex' ? ' complex' : ''}`;
    if (kind === 'complex') {
      $('roots').innerHTML = rootCard('x₁', `${f(model.real)} − ${f(model.imaginary)}i`) + rootCard('x₂', `${f(model.real)} + ${f(model.imaginary)}i`);
    } else if (roots.length) {
      $('roots').innerHTML = roots.map((x, i) => rootCard(roots.length === 1 ? 'x' : `x${i === 0 ? '₁' : '₂'}`, f(x))).join('');
    } else $('roots').innerHTML = rootCard('Ответ', kind === 'identity' ? 'x ∈ ℝ' : '∅');
    $('vertex').textContent = model.vertex ? `(${f(model.vertex.x)}; ${f(model.vertex.y)})` : 'Нет';
    $('symmetry').textContent = model.vertex ? `x = ${f(model.vertex.x)}` : '—';
    $('direction').textContent = a > 0 ? 'Вверх ↑' : a < 0 ? 'Вниз ↓' : 'Прямая';
    const notes = {
      two: 'Корни — точки пересечения графика с осью x.',
      double: 'Парабола касается оси x в одной точке — это двойной корень.',
      complex: 'Парабола не пересекает ось x. В решении показаны комплексные корни; i² = −1.',
      linear: 'При a = 0 график — прямая. Её пересечение с осью x и есть корень.',
      identity: 'График совпадает с осью x: каждое действительное число — решение.',
      constant: 'Горизонтальная прямая не пересекает ось x: решений нет.'
    };
    $('graph-note').textContent = notes[kind];
    if (a !== 0) {
      const explanation = d > 0 ? 'D > 0, поэтому график пересекает ось x дважды.' : d === 0 ? 'D = 0, поэтому два корня совпадают.' : 'D < 0, поэтому действительных корней нет.';
      $('steps').innerHTML = step('1. Находим дискриминант', `D = ${value(b)}² − 4 · ${value(a)} · ${value(c)} = ${f(d)}`, 'Формула: D = b² − 4ac.') + step('2. Подставляем в формулу', kind === 'complex' ? 'x = (−b ± i√(−D)) / (2a)' : 'x = (−b ± √D) / (2a)', explanation) + step('3. Получаем ответ', kind === 'complex' ? `x = ${f(model.real)} ± ${f(model.imaginary)}i` : roots.map((x, i) => `${roots.length > 1 ? (i === 0 ? 'x₁' : 'x₂') : 'x'} = ${f(x)}`).join(';  '), kind === 'complex' ? 'Комплексные корни не являются пересечениями с осью x.' : 'На графике действительные корни отмечены синими точками.');
    } else {
      $('steps').innerHTML = step('1. Упрощаем уравнение', `${polynomial(a, b, c)} = 0`, 'При a = 0 квадратный член исчезает.') + step('2. Проверяем коэффициенты', b !== 0 ? 'x = −c / b' : c === 0 ? '0 = 0' : `${f(c)} ≠ 0`, b !== 0 ? 'Решаем линейное уравнение.' : 'При b = 0 остаётся проверить свободный член.') + step('3. Получаем ответ', b !== 0 ? `x = ${f(roots[0])}` : c === 0 ? 'x ∈ ℝ' : '∅', descriptions[kind] + '.');
    }
  }

  function fitBounds() {
    const { a, b, c, roots, vertex } = model;
    let xMin = -5, xMax = 5;
    if (a !== 0) {
      const radius = Math.max(2, Math.sqrt(Math.abs(vertex.y / a)) * 1.5);
      xMin = Math.min(0, vertex.x - radius, ...roots);
      xMax = Math.max(0, vertex.x + radius, ...roots);
    } else if (b !== 0) {
      const radius = Math.max(3, Math.abs(roots[0]) * .3);
      xMin = Math.min(0, roots[0]) - radius;
      xMax = Math.max(0, roots[0]) + radius;
    }
    const xPad = (xMax - xMin) * .08;
    xMin -= xPad; xMax += xPad;
    const values = [0, c, evaluate(model, xMin), evaluate(model, xMax)];
    if (vertex) values.push(vertex.y);
    let yMin = Math.min(...values), yMax = Math.max(...values);
    const spread = yMax - yMin;
    const yPad = spread > 0 ? spread * .18 : 2;
    yMin -= yPad; yMax += yPad;
    return { xMin, xMax, yMin, yMax };
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
    const pad = { left: width < 420 ? 49 : 65, right: 23, top: 24, bottom: 33 };
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
    let content = `<title id="plot-title">График y = ${esc(polynomial(model.a, model.b, model.c))}</title><desc id="plot-description">${esc($('graph-note').textContent)} ${model.roots.length ? 'Корни: ' + model.roots.map(x => f(x)).join('; ') + '.' : ''} Масштаб осей подбирается независимо.</desc><defs><clipPath id="plot-clip"><rect x="${pad.left}" y="${pad.top}" width="${w}" height="${h}"/></clipPath></defs>`;
    for (const x of ticks(minX, maxX, width < 420 ? 5 : 8)) {
      content += `<line x1="${px(x)}" x2="${px(x)}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#edf0f6"/><text class="tick" text-anchor="middle" x="${px(x)}" y="${height - 9}">${f(x, 4)}</text>`;
    }
    for (const y of ticks(minY, maxY, 6)) {
      content += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${py(y)}" y2="${py(y)}" stroke="#edf0f6"/><text class="tick" text-anchor="end" x="${pad.left - 9}" y="${py(y) + 4}">${f(y, 3)}</text>`;
    }
    if (minY <= 0 && maxY >= 0) content += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${zeroY}" y2="${zeroY}" stroke="#b0bbce" stroke-width="1.2"/>`;
    if (minX <= 0 && maxX >= 0) content += `<line x1="${zeroX}" x2="${zeroX}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#b0bbce" stroke-width="1.2"/>`;
    content += `<text class="axis-label" x="${width - 12}" y="${zeroY - 8}">x</text><text class="axis-label" x="${zeroX + 8}" y="16">y</text><g clip-path="url(#plot-clip)">`;
    if (model.vertex) content += `<line x1="${px(model.vertex.x)}" x2="${px(model.vertex.x)}" y1="${pad.top}" y2="${height - pad.bottom}" stroke="#cad5f4" stroke-dasharray="5 5"/>`;
    // Include exact roots and vertex among samples so a tangency is not lost.
    const samples = Array.from({ length: 601 }, (_, i) => minX + (maxX - minX) * i / 600);
    samples.push(...model.roots.filter(x => x >= minX && x <= maxX));
    if (model.vertex && model.vertex.x >= minX && model.vertex.x <= maxX) samples.push(model.vertex.x);
    samples.sort((a, b) => a - b);
    const path = samples.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(2)},${clamp(py(evaluate(model, x)), -1e6, 1e6).toFixed(2)}`).join(' ');
    content += `<path d="${path}" fill="none" stroke="#2751e8" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (model.vertex) {
      const vx = px(model.vertex.x), vy = py(model.vertex.y);
      content += `<rect x="${vx - 4}" y="${vy - 4}" width="8" height="8" rx="1" transform="rotate(45 ${vx} ${vy})" fill="#e48b2c" stroke="white" stroke-width="1.5"/>`;
    }
    model.roots.forEach((x, i) => {
      const pos = px(x), labelY = zeroY + 25 < height - pad.bottom ? zeroY + 25 : zeroY - 15;
      content += `<circle cx="${pos}" cy="${py(0)}" r="5" fill="white" stroke="#2751e8" stroke-width="2.5"/><text class="root-text" x="${pos}" y="${labelY}" text-anchor="middle">${model.roots.length === 1 ? 'x' : i === 0 ? 'x₁' : 'x₂'} = ${f(x, 5)}</text>`;
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
      $('result-description').textContent = 'Проверьте введённые числа';
      $('result-badge').textContent = '—';
      $('roots').replaceChildren(); $('steps').replaceChildren(); $('plot').replaceChildren();
      ['vertex', 'symmetry', 'direction', 'function-label'].forEach(id => $(id).textContent = '—');
      $('graph-note').textContent = 'График появится после ввода корректных коэффициентов.';
      ['zoom-in', 'zoom-out', 'fit'].forEach(id => $(id).disabled = true);
      document.querySelectorAll('[data-example]').forEach(button => button.setAttribute('aria-pressed', 'false'));
      return;
    }
    model = solve(...numbers); zoom = 1; bounds = fitBounds();
    $('fit').disabled = false;
    renderSolution(); drawPlot();
    document.querySelectorAll('[data-example]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.example === numbers.join(','))));
  }

  fields.forEach(field => field.addEventListener('input', update));
  $('coefficients').addEventListener('submit', event => { event.preventDefault(); update(); });
  document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { button.dataset.example.split(',').forEach((number, i) => fields[i].value = number); update(); }));
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
    const boxWidth = Math.min(width - 20, Math.max(155, text.length * 7.3));
    const boxX = Math.min(width - boxWidth - 6, Math.max(6, px(x) + 12)), boxY = Math.max(3, py(y) - 40);
    hover.innerHTML = `<circle cx="${px(x)}" cy="${py(y)}" r="4" fill="#2751e8" stroke="white" stroke-width="2"/><rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="29" rx="6" fill="#182338"/><text x="${boxX + 10}" y="${boxY + 19}" fill="white" font-size="12">${esc(text)}</text>`;
  });
  $('plot').addEventListener('pointerleave', () => $('hover-point')?.replaceChildren());
  new ResizeObserver(drawPlot).observe($('plot-wrap'));
  update();
  if (document.modelContext?.registerTool) {
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
    try {
      Promise.resolve(document.modelContext.registerTool({
        name: 'solve_quadratic',
        title: 'Решить квадратное уравнение',
        description: 'Задать коэффициенты, обновить решение и график уравнения ax² + bx + c = 0.',
        inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' }, c: { type: 'number' } }, required: ['a', 'b', 'c'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || ['a', 'b', 'c'].some(key => typeof input[key] !== 'number')) throw new TypeError('Нужны три числовых коэффициента a, b и c.');
          const numbers = ['a', 'b', 'c'].map(key => parseCoefficient(input[key]));
          const result = solve(...numbers);
          numbers.forEach((number, i) => fields[i].value = String(number));
          update();
          return result;
        }
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch { /* Optional browser capability; the ordinary UI remains available. */ }
  }
})();
