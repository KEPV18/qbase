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
  const hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  };

  // Chrome hands back the AUTHORED colour function inside a gradient
  // (hsl() stays hsl(), it is not converted to rgb()), so the parser
  // has to speak every form the stylesheet uses.
  const parseColor = (v) => {
    if (!v) return null;
    const s = String(v).trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    let m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (p.length < 3 || p.some(Number.isNaN)) return null;
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    m = s.match(/^hsla?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean);
      const h = parseFloat(p[0]), sa = parseFloat(p[1]), l = parseFloat(p[2]);
      if (Number.isNaN(h) || Number.isNaN(sa) || Number.isNaN(l)) return null;
      let a = 1;
      if (p.length > 3) {
        a = p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
        if (Number.isNaN(a)) a = 1;
      }
      return { ...hslToRgb(h, sa, l), a };
    }
    m = s.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      if (h.length !== 6 && h.length !== 8) return null;
      const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16),
        b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].some(Number.isNaN)) return null;
      return { r, g, b, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    return null;
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

  /**
   * The colour stops of a gradient background.
   *
   * A CSS gradient is a background-IMAGE, not a background-COLOR: a
   * compositor that only reads backgroundColor walks straight past it
   * and measures the text against whatever lies behind — which is how
   * white-on-navy masthead labels were being reported as 1:1 failures.
   * Every stop is returned, because the text has to clear AA against
   * the WORST of them, not against the average.
   */
  const gradientStops = (v) => {
    if (!v || v === 'none' || !/gradient\(/i.test(v)) return null;
    const open = v.indexOf('(');
    const close = v.lastIndexOf(')');
    if (open < 0 || close < 0) return null;
    const inner = v.slice(open + 1, close);
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of inner) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    const stops = [];
    for (const part of parts) {
      const m = part.trim().match(/^(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}|[a-z]+)/i);
      if (!m) continue;
      const c = parseColor(m[1]);
      if (c) stops.push(c);
    }
    return stops.length ? stops : null;
  };

  /**
   * The grounds an element is actually painted on.
   *
   * The chain of ancestors is composited from the outermost inward, so
   * a translucent wash resolves to the colour the eye sees.  A
   * gradient contributes a SET of grounds rather than one, and the
   * answer is the worst of them.
   *
   * There is no early exit on an opaque ground: an opaque `<body>`
   * does NOT hide the gradient of a panel painted on top of it, so
   * the whole chain has to be walked.
   */
  const groundCandidates = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(n);
    chain.reverse();
    let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (const node of chain) {
      const s = cs(node);
      const c = parseColor(s.backgroundColor);
      if (c && c.a > 0) cands = cands.map((b) => over(c, b));
      const stops = gradientStops(s.backgroundImage);
      if (stops) {
        const next = [];
        for (const b of cands) for (const g of stops) next.push(over(g, b));
        cands = next;
      }
    }
    if (cands.length > 6) {
      const sorted = [...cands].sort((a, b) => lum(a) - lum(b));
      cands = [...sorted.slice(0, 3), ...sorted.slice(-3)];
    }
    return cands;
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
  //
  // Text that is hidden from assistive technology AND carries no
  // information of its own is PURE DECORATION, and WCAG 1.4.3 exempts
  // it: the giant ghost "404" behind a real "Page not found" heading
  // says nothing the heading does not already say.  The exemption is
  // taken only where the markup says so — aria-hidden="true" — and
  // never for a hidden-but-informative label.
  const decorative = (el) => !!el.closest('[aria-hidden="true"]');
  const lowContrast = [];
  let checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    if (!visible(el)) continue;
    if (decorative(el)) continue;
    const s = cs(el);
    if (s.webkitTextFillColor === 'transparent' || s.opacity === '0') continue;
    const fg = parseColor(s.color);
    if (!fg) continue;
    const grounds = groundCandidates(el);
    let worstRatio = Infinity, worstBg = grounds[0], worstFg = fg;
    for (const g of grounds) {
      const eff = fg.a < 1 ? over(fg, g) : fg;
      const r = contrast(eff, g);
      if (r < worstRatio) { worstRatio = r; worstBg = g; worstFg = eff; }
    }
    checked++;
    const size = num(s.fontSize);
    const bold = num(s.fontWeight) >= 700;
    // WCAG: 3:1 is enough for large text (18.66px bold / 24px+).
    const large = size >= 24 || (bold && size >= 18.66);
    const min = large ? 3 : 4.5;
    if (worstRatio < min) {
      lowContrast.push({
        text: t.slice(0, 44),
        ratio: Math.round(worstRatio * 100) / 100,
        need: min,
        fg: hex(worstFg),
        bg: hex(worstBg),
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
  //
  // A native FORM CONTROL is the exception.  The browser does not route
  // a pointer to an `<input>`'s or a `<select>`'s pseudo-element — a
  // ::before extension on a form field is decoration, not hit area — so
  // for those the painted box IS the target.  This is the app's own
  // rule, stated on `.input-modern` in src/index.css: a form field has
  // to be 44px tall FOR REAL.  Measuring the pseudo-extension here
  // would have hidden every under-height select in the app.
  const small = [];
  const inter = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]');
  for (const el of inter) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const isField = /^(input|select|textarea)$/i.test(el.tagName);
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
    if (!isField) {
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

  /**
   * A leaf is a FIGURE when it is mostly numerals: a count, a
   * percentage, a date, a measurement, a "2 / 21" counter.  Prose that
   * merely mentions a number is not one — the rule it exists to serve
   * (the eye comparing down a column) does not apply there.  The old
   * test only recognised a bare number, so a date like 08/01/2026 and
   * a count like "12 records" both passed as "not a figure".
   */
  const FIGURE = (t) => {
    const s = (t || '').trim();
    if (!s || s.length > 40) return false;
    if (!/\d/.test(s)) return false;
    if (/[.!?;]$/.test(s)) return false;
    if (/^[A-Za-z]{2,}/.test(s)) return false;
    const digits = (s.match(/\d/g) || []).length;
    const letters = (s.match(/[A-Za-z]/g) || []).length;
    if (/^[\d\s.,:/%±–—-]*$/.test(s)) return true;   // 404, 08/01/2026, 2 / 21, 3.5%
    if (/^\d[\d.,:/]*\s+\S/.test(s)) return true;      // "12 records", "3 of 8"
    return digits > letters;                         // "F/44: 12"
  };

  let nums = 0, tabular = 0;
  const untabular = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!FIGURE(t)) continue;
    if (decorative(el)) continue;
    nums++;
    if (/tabular-nums/.test(cs(el).fontVariantNumeric)) {
      tabular++;
    } else {
      untabular.push({ t: t.slice(0, 24), cls: clsOf(el) });
    }
  }
  out.numbers = nums;
  out.numbersTabular = tabular;
  out.untabular = untabular.slice(0, 40);
  out.untabularCount = untabular.length;

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
