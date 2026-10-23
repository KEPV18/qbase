/*
 * The in-page probe, kept in its own file so it can be written as real
 * JavaScript instead of a template literal (a backtick inside the old
 * one-liner silently terminated the string, and ${...} was interpolated
 * by the outer scope).
 *
 * The file's content is an EXPRESSION: page.evaluate() evaluates it in
 * the page and returns its value.
 */
(() => {
  const out = {};
  const cs = (el) => getComputedStyle(el);
  const num = (v) => parseFloat(v) || 0;

  // ── colour helpers ──────────────────────────────────────────────────────
  const parseColor = (v) => {
    if (!v) return null;
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
  const contrast = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const hex = (c) =>
    '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  // The ground an element is actually painted on: every ancestor's
  // background, composited from the outermost inward, so a translucent
  // wash resolves to the colour the eye sees.
  const groundOf = (el) => {
    const layers = [];
    let node = el;
    while (node) {
      const c = parseColor(cs(node).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
      node = node.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };

  const visible = (el) => {
    const s = cs(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const clsOf = (el) =>
    (el.className && el.className.baseVal !== undefined
      ? el.className.baseVal
      : el.className || '')
      .toString()
      .slice(0, 70);

  // ── 1. the colour inventory ─────────────────────────────────────────────
  // Every chromatic colour on the page, with how often it is painted.
  // The design system allows ONE accent, ONE heat, ONE alarm — so a page
  // with five hues in it is a page that needs work.
  const chromatic = new Map();
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    for (const prop of ['backgroundColor', 'color', 'borderTopColor', 'borderLeftColor']) {
      const v = cs(el)[prop];
      const c = parseColor(v);
      if (!c || c.a === 0) continue;
      const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
      if (max - min > 26) {
        const key = v + ' @ ' + prop;
        chromatic.set(key, (chromatic.get(key) || 0) + 1);
      }
    }
  }
  out.chromatic = [...chromatic.entries()].sort((a, b) => b[1] - a[1]);
  out.chromaticHues = [...new Set(out.chromatic.map(([k]) => {
    const c = parseColor(k.split(' @ ')[0]);
    if (!c) return -1;
    const max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b), d = max - min;
    let h = 0;
    if (d) {
      if (max === c.r) h = ((c.g - c.b) / d + (c.g < c.b ? 6 : 0)) * 60;
      else if (max === c.g) h = ((c.b - c.r) / d + 2) * 60;
      else h = ((c.r - c.g) / d + 4) * 60;
    }
    return Math.round(h);
  }))].sort((a, b) => a - b);

  // ── 2. text contrast ────────────────────────────────────────────────────
  // The one measurement that cannot lie: what the reader actually gets.
  const lowContrast = [];
  let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    if (!visible(el)) continue;
    const s = cs(el);
    if (s.webkitTextFillColor === 'transparent' || s.opacity === '0') continue;
    const fg = parseColor(s.color);
    if (!fg) continue;
    const bg = groundOf(el);
    const eff = fg.a < 1 ? over(fg, bg) : fg;
    const ratio = contrast(eff, bg);
    checked++;
    const size = num(s.fontSize);
    const bold = num(s.fontWeight) >= 700;
    // WCAG: 3:1 is enough for large text (18.66px bold / 24px+).
    const large = size >= 24 || (bold && size >= 18.66);
    const min = large ? 3 : 4.5;
    if (ratio < min) {
      lowContrast.push({
        text: t.slice(0, 44),
        ratio: Math.round(ratio * 100) / 100,
        need: min,
        fg: hex(eff),
        bg: hex(bg),
        size: s.fontSize,
        cls: clsOf(el),
      });
    }
  }
  out.textChecked = checked;
  out.lowContrast = lowContrast.slice(0, 30);
  out.lowContrastCount = lowContrast.length;

  // ── 3. fragmentation ────────────────────────────────────────────────────
  // "One panel + hairlines", not a pile of separately-bordered cards.
  const surfaces = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = cs(el);
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.height < 60) continue;
    const hasBorder = num(s.borderTopWidth) > 0 || num(s.borderLeftWidth) > 0;
    const hasShadow = s.boxShadow && s.boxShadow !== 'none';
    if (!hasBorder && !hasShadow) continue;
    const key = s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor +
      ' | ' + s.backgroundColor + ' | ' + s.boxShadow.slice(0, 44);
    surfaces.set(key, (surfaces.get(key) || 0) + 1);
  }
  out.surfaceKinds = [...surfaces.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  out.surfaceTotal = [...surfaces.values()].reduce((a, b) => a + b, 0);

  // ── 4. glass discipline ─────────────────────────────────────────────────
  // backdrop-filter belongs on nav / overlay / CTA — nowhere else.
  const glass = [];
  for (const el of document.querySelectorAll('*')) {
    const f = cs(el).backdropFilter || cs(el).webkitBackdropFilter;
    if (!f || f === 'none') continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    glass.push({ tag: el.tagName.toLowerCase(), cls: clsOf(el), pos: cs(el).position,
      w: Math.round(r.width), h: Math.round(r.height) });
  }
  out.glass = glass;

  // ── 5. touch targets ────────────────────────────────────────────────────
  // The EFFECTIVE hit area: the stylesheet extends a control's hit area
  // with a transparent ::before, so the painted box is not the target.
  const small = [];
  const inter = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
  for (const el of inter) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps || ps.content === 'none' || ps.content === 'normal') continue;
      if (ps.pointerEvents === 'none') continue;
      if (ps.position !== 'absolute' && ps.position !== 'fixed') continue;
      const pw = ps.width === 'auto' ? r.width : num(ps.width);
      const ph = ps.height === 'auto' ? r.height : num(ps.height);
      if (!pw || !ph) continue;
      let pTop, pLeft;
      if (ps.top && ps.top !== 'auto') pTop = r.top + num(ps.top);
      else if (ps.bottom && ps.bottom !== 'auto') pTop = r.bottom - num(ps.bottom) - ph;
      else pTop = r.top + r.height / 2 - ph / 2;
      if (ps.left && ps.left !== 'auto') pLeft = r.left + num(ps.left);
      else if (ps.right && ps.right !== 'auto') pLeft = r.right - num(ps.right) - pw;
      else pLeft = r.left + r.width / 2 - pw / 2;
      top = Math.min(top, pTop); left = Math.min(left, pLeft);
      bottom = Math.max(bottom, pTop + ph); right = Math.max(right, pLeft + pw);
    }
    const h = bottom - top, w = right - left;
    if (h < 44 || w < 44) {
      small.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 30),
        h: Math.round(h), w: Math.round(w), painted: Math.round(r.width) + 'x' + Math.round(r.height) });
    }
  }
  out.smallTargets = small.slice(0, 25);
  out.smallTargetCount = small.length;
  out.interactiveCount = inter.length;

  // ── 6. type ─────────────────────────────────────────────────────────────
  const heads = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4')) {
    if (!visible(el)) continue;
    const s = cs(el);
    const t = (el.textContent || '').trim();
    if (!t) continue;
    heads.push({ tag: el.tagName, text: t.slice(0, 38), size: s.fontSize,
      ls: s.letterSpacing, weight: s.fontWeight });
  }
  out.headings = heads.slice(0, 24);

  let nums = 0, tabular = 0;
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || !/^\d[\d.,]*\s*[%kmKM]?$/.test(t)) continue;
    nums++;
    if (/tabular-nums/.test(cs(el).fontVariantNumeric)) tabular++;
  }
  out.numbers = nums;
  out.numbersTabular = tabular;

  // ── 7. the ground and the type stack ────────────────────────────────────
  const body = cs(document.body);
  out.body = { bg: body.backgroundColor, fg: body.color, font: body.fontFamily,
    ls: body.letterSpacing, lh: body.lineHeight };
  const root = cs(document.documentElement);
  out.groundHex = hex(parseColor(body.backgroundColor) || { r: 255, g: 255, b: 255 });
  out.tokens = {
    primary: root.getPropertyValue('--primary').trim(),
    primaryFg: root.getPropertyValue('--primary-foreground').trim(),
    radius: root.getPropertyValue('--radius').trim(),
    background: root.getPropertyValue('--background').trim(),
  };
  const shadows = new Set();
  for (const el of document.querySelectorAll('*')) {
    const s = cs(el).boxShadow;
    if (s && s !== 'none') shadows.add(s.split(/,(?![^(]*\))/)[0].trim());
  }
  out.shadows = [...shadows].slice(0, 8);

  return out;
})()
