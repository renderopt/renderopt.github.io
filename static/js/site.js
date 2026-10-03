(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var C = { ink: '#1f2328', mute: '#5b616b', faint: '#8b9098', line: '#e6e6e3', grid: '#eeeeeb', ax: '#b9bcc1',
    ours: '#d9711c', oursSoft: '#f6d8bb', cons: '#3366b0', aggr: '#8b5a2b', safe: '#2e8b57', bad: '#c8423b', edge: '#e0a526',
    orig: '#8a6bbf', opt: '#3a8fc4' };

  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  function $(id) { return document.getElementById(id); }
  function fmt(x, d) { return x.toFixed(d); }

  /* ================= scene player ================= */
  var SCENES = [
    { id: '4ltfDr', name: 'traveler.', by: 'kaneta', g: 'Shadertoy', o: 7.944, n: 4.701, flip: 0.0060, eps: 0.01, d: '1D' },
    { id: 'NtlSDs', name: 'Protean Clouds', by: 'iq', g: 'Shadertoy', o: 7.875, n: 5.032, flip: 0.0099, eps: 0.01, d: '1D', note: 'limitation case: FLIP accepts, LPIPS/DISTS reject' },
    { id: 'Xds3zN', name: 'Raymarching Primitives', by: 'iq', g: 'Shadertoy', o: 6.625, n: 5.168, flip: 0.0090, eps: 0.01, d: '5D' },
    { id: '3lsSzf', name: 'Happy Jumping', by: 'iq', g: 'Shadertoy', o: 5.602, n: 4.560, flip: 0.0021, eps: 0.01, d: '1D' },
    { id: 'XdsGDB', name: 'Buoy', by: 'TekF', g: 'Shadertoy', o: 3.694, n: 3.059, flip: 0.0111, eps: 0.01, d: '5D' },
    { id: '3sc3z4', name: 'GLSL Ray Tracing Test', by: 'colin299', g: 'Shadertoy', o: 7.280, n: 6.408, flip: 0.0093, eps: 0.01, d: '5D' },
    { id: 'Mss3zM', name: 'Insect', by: 'iq', g: 'Shadertoy', o: 6.856, n: 6.131, flip: 0.0195, eps: 0.01, d: '5D' },
    { id: '4sX3Rn', name: 'Menger Sponge', by: 'iq', g: 'Shadertoy', o: 2.205, n: 2.004, flip: 0.0000, eps: 0.01, d: '5D' },
    { id: 'lsf3zr', name: 'Columns and Lights', by: 'iq', g: 'Shadertoy', o: 4.552, n: 4.229, flip: 0.0088, eps: 0.01, d: '5D' },
    { id: 'ssil', name: 'SSIL render pass', by: 'Godot TPS demo, 4 GLSL stages', g: 'Godot', o: 4.036, n: 2.433, flip: 0.1065, eps: 0.1, d: '7D' },
    { id: 'black_hole_2', name: 'Black hole shader', by: 'Godot planets scene', g: 'Godot', o: 5.598, n: 4.780, flip: 0.0878, eps: 0.1, d: '7D' },
    { id: 'brick', name: 'Bricks', by: 'procedural MaterialX', g: 'MaterialX', o: 1.337, n: 0.926, flip: 0.0737, eps: 0.05, d: 'up to 34D' },
    { id: 'carpaint', name: 'Car Paint', by: 'MaterialX', g: 'MaterialX', o: 2.152, n: 1.676, flip: 0.0592, eps: 0.05, d: 'up to 34D' }
  ];
  SCENES.forEach(function (s) { s.sp = s.o / s.n; });

  function report(s) { return 'sup/' + s.id + '/live_report.html'; }
  function tree(s) { return 'sup/' + s.id + '/mutation_tree.html'; }

  function initPlayer() {
    var v = $('pv'), chips = $('pchips');
    if (!v) return;
    var groups = {};
    SCENES.forEach(function (s, i) {
      if (!groups[s.g]) {
        var g = document.createElement('div'); g.className = 'chip-group';
        g.innerHTML = '<span>' + s.g + '</span><div class="chip-row"></div>';
        chips.appendChild(g); groups[s.g] = g.lastChild;
      }
      var b = document.createElement('button'); b.className = 'chip'; b.dataset.i = i;
      b.innerHTML = '<img loading="lazy" src="static/img/thumbs/' + s.id + '.jpg" alt=""><span>' + s.name + ' <b>' + fmt(s.sp, 2) + '&times;</b></span>';
      b.addEventListener('click', function () { show(i); });
      groups[s.g].appendChild(b);
    });
    var cv = $('pc'), cx = cv.getContext('2d'), stage = $('pstage'), mode = 'tri', amp = false, split = 0.5, cur = 0;
    var poster = new Image();
    function draw() {
      var src = (v.readyState >= 2 && v.videoWidth) ? v : (poster.complete && poster.naturalWidth ? poster : null);
      if (src) {
        var W = src.videoWidth || src.naturalWidth, H = src.videoHeight || src.naturalHeight, pw = Math.floor(W / 3);
        if (mode === 'tri') {
          if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
          cx.filter = 'none'; cx.drawImage(src, 0, 0);
          if (amp) { cx.filter = 'brightness(8)'; cx.drawImage(src, 2 * pw, 0, W - 2 * pw, H, 2 * pw, 0, W - 2 * pw, H); cx.filter = 'none'; }
        } else {
          if (cv.width !== pw || cv.height !== H) { cv.width = pw; cv.height = H; }
          var sx = Math.round(pw * split);
          cx.filter = 'none';
          cx.drawImage(src, 0, 0, sx, H, 0, 0, sx, H);
          cx.drawImage(src, pw + sx, 0, pw - sx, H, sx, 0, pw - sx, H);
          cx.fillStyle = '#fff'; cx.fillRect(sx - 1, 0, 2, H);
          var r = Math.max(10, H / 26), cy = H / 2;
          cx.beginPath(); cx.arc(sx, cy, r, 0, 2 * Math.PI); cx.fill();
          cx.fillStyle = '#1f2328'; cx.beginPath();
          cx.moveTo(sx - r * 0.25, cy - r * 0.45); cx.lineTo(sx - r * 0.7, cy); cx.lineTo(sx - r * 0.25, cy + r * 0.45);
          cx.moveTo(sx + r * 0.25, cy - r * 0.45); cx.lineTo(sx + r * 0.7, cy); cx.lineTo(sx + r * 0.25, cy + r * 0.45); cx.fill();
        }
      }
      requestAnimationFrame(draw);
    }
    stage.addEventListener('click', function () { if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } });
    function setSplit(e) {
      if (mode !== 'wipe') return;
      var b = cv.getBoundingClientRect();
      split = Math.max(0.01, Math.min(0.99, (e.clientX - b.left) / b.width));
    }
    var dragging = false;
    cv.addEventListener('pointerdown', function (e) { dragging = true; setSplit(e); });
    window.addEventListener('pointerup', function () { dragging = false; });
    cv.addEventListener('pointermove', function (e) { if (dragging || e.pointerType === 'mouse') setSplit(e); });
    [].forEach.call($('pmode').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        mode = b.dataset.m;
        [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); });
        stage.classList.toggle('wipe', mode === 'wipe');
        var cols = $('pcols');
        cols.classList.toggle('two', mode === 'wipe');
        cols.innerHTML = mode === 'wipe' ? '<span>&larr; Original</span><span class="o">Optimized &rarr;</span>' : '<span>Original</span><span class="o">Optimized</span><span>FLIP error</span>';
        $('pamp').disabled = mode === 'wipe';
      });
    });
    $('pamp').addEventListener('change', function (e) { amp = e.target.checked; });
    requestAnimationFrame(draw);
    function show(i) {
      var s = SCENES[i];
      v.poster = poster.src = 'static/videos/clips/' + s.id + '.jpg';
      v.src = 'static/videos/clips/' + s.id + '.mp4';
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      $('pname').innerHTML = s.name + '<small>' + s.g + (s.g === 'Shadertoy' ? ' ' + s.id + ' by ' + s.by : ' &middot; ' + s.by) + '</small>';
      $('pnums').innerHTML = '<span><b>' + fmt(s.o, 2) + '</b> &rarr; <b>' + fmt(s.n, 2) + ' ms</b></span>' +
        '<span><b class="sp">' + fmt(s.sp, 2) + '&times;</b></span>' +
        '<span>worst FLIP <b>' + fmt(s.flip, 4) + '</b> at &epsilon; = ' + s.eps + '</span>' +
        (s.note ? '<span class="bad" style="font-weight:400">' + s.note + '</span>' : '') +
        '<span><a href="' + report(s) + '">report</a> &middot; <a href="' + tree(s) + '">tree</a></span>';
      [].forEach.call(chips.querySelectorAll('.chip'), function (c) { c.classList.toggle('on', +c.dataset.i === i); });
    }
    show(0);

    var tb = $('rep-table'), last = '';
    var h = '<tr><th></th><th>Scene</th><th class="num">Original</th><th class="num">Optimized</th><th class="num">Speedup</th><th class="num">Worst FLIP</th><th>Open</th></tr>';
    SCENES.forEach(function (s) {
      if (s.g !== last) { h += '<tr class="grp"><td colspan="7">' + s.g + ' <span style="text-transform:none;letter-spacing:0">&middot; &epsilon; = ' + s.eps + '</span></td></tr>'; last = s.g; }
      h += '<tr><td><img loading="lazy" src="static/img/thumbs/' + s.id + '.jpg" alt=""></td><td>' + s.name + ' <span class="mono" style="color:var(--faint)">' + (s.g === 'Shadertoy' ? s.id : '') + '</span></td>' +
        '<td class="num">' + fmt(s.o, 2) + ' ms</td><td class="num">' + fmt(s.n, 2) + ' ms</td><td class="num sp">' + fmt(s.sp, 2) + '&times;</td><td class="num">' + fmt(s.flip, 4) + '</td>' +
        '<td><a href="' + report(s) + '">report</a><a href="' + tree(s) + '">mutation tree</a></td></tr>';
    });
    tb.innerHTML = h;
  }

  /* ================= PRPS parallel coordinates ================= */
  var PRPS = {
    xds: { img: 'xds', pts: [[0.10, 0.39, 0.74, 0.85, 0.96, 14.0], [0.03, 0.45, 0.61, 0.62, 0.40, 18.6], [0.41, 0.76, 0.96, 0.18, 0.34, 14.3]] },
    sc: { img: 'sc', pts: [[0.210, 0.029, 0.136, 0.190, 0.107, 15.7], [0.442, 0.109, 0.962, 0.280, 0.090, 16.4], [0.759, 0.464, 0.762, 0.967, 0.790, 13.8]] }
  };
  var PCOL = ['#d9534f', '#3f9a5a', '#3b78d8'];
  function initPRPS() {
    var row = $('prps-row'); if (!row) return;
    var key = 'xds';
    function bars(p) {
      var svg = el('svg', { viewBox: '0 0 120 54', role: 'img', 'aria-label': 'normalized coordinates' });
      el('line', { x1: 0, y1: 40, x2: 120, y2: 40, class: 'ax' }, svg);
      p.slice(0, 5).forEach(function (v, d) {
        var x = 4 + d * 23, hgt = 34 * v;
        el('rect', { x: x, y: 6, width: 16, height: 34, fill: '#f1f1ee', rx: 1.5 }, svg);
        el('rect', { x: x, y: 40 - hgt, width: 16, height: hgt, fill: C.ours, rx: 1.5 }, svg);
        var t = el('text', { x: x + 8, y: 51, 'font-size': 8.5, fill: C.mute, 'text-anchor': 'middle', 'font-style': 'italic' }, svg, 'r');
        el('tspan', { 'font-size': 6.5, dy: 2 }, t, String(d + 1));
      });
      return svg;
    }
    function draw() {
      row.innerHTML = '';
      PRPS[key].pts.forEach(function (p, i) {
        var d = document.createElement('div');
        d.innerHTML = '<img alt="Render at PRPS point P' + (i + 1) + '" src="static/img/prps/' + PRPS[key].img + '_' + (i + 1) + '.jpg">' +
          '<div class="pmeta"><span><b>P' + (i + 1) + '</b><br>' + p[5].toFixed(1) + ' ms</span></div>';
        d.querySelector('.pmeta').appendChild(bars(p));
        row.appendChild(d);
      });
    }
    [].forEach.call($('prps-shader').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        key = b.dataset.k;
        [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); });
        draw();
      });
    });
    draw();
  }

  /* ================= code tabs ================= */
  function initTabs() {
    var t = $('edit-tabs'); if (!t) return;
    var panes = t.parentNode.querySelectorAll('.code');
    [].forEach.call(t.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(t.children, function (c) { c.classList.toggle('on', c === b); });
        [].forEach.call(panes, function (p) { p.hidden = p.dataset.t !== b.dataset.t; });
      });
    });
  }

  /* ================= Bayesian sequential test ================= */
  var TAU = 0.01, GH = 0.99, GL = 0.16, PEXP = 2, NMAX = 1024, NMIN = 8;
  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    var s = 1.000000000190015; for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  // P(p < tau | k, n) = P(Binomial(n+1, tau) >= k+1)
  function probSafe(k, n) {
    var m = n + 1, lt = Math.log(TAU), l1 = Math.log(1 - TAU), lgm = lgamma(m + 1), s = 0;
    for (var j = 0; j <= k; j++) s += Math.exp(lgm - lgamma(j + 1) - lgamma(m - j + 1) + j * lt + (m - j) * l1);
    return Math.max(0, Math.min(1, 1 - s));
  }
  function betaPdf(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b)));
  }
  function gammaEff(trust) { return GH + (GL - GH) * Math.pow(trust, PEXP); }
  function rendersToAccept(g) { return 2 * Math.floor(Math.log(1 - g) / Math.log(1 - TAU)); }

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var framesMarker = null;
  function initSeq() {
    var post = $('seq-post'), trace = $('seq-trace'); if (!post) return;
    var trueP = 0.001, trust = 0, seed = 7, hist = [], n = 0, k = 0, state = 'UNDET', timer = null;
    var exc = [];
    function reset() {
      if (timer) { clearInterval(timer); timer = null; }
      n = 0; k = 0; hist = [[0, probSafe(0, 0)]]; exc = []; state = 'UNDET';
      rng = mulberry(seed);
      $('seq-run').innerHTML = '&#9654; Run';
      render();
    }
    var rng = mulberry(seed);
    function step(count) {
      var gs = gammaEff(trust);
      for (var c = 0; c < count && state === 'UNDET'; c++) {
        n++; if (rng() < trueP) { k++; exc.push(n); }
        var P = probSafe(k, n); hist.push([n, P]);
        if (n >= NMIN && P >= gs) state = 'SAFE';
        else if (n >= NMIN && P <= 1 - GH) state = 'BAD';
        else if (n >= NMAX) state = 'REJECT';
      }
      if (state !== 'UNDET' && timer) { clearInterval(timer); timer = null; $('seq-run').innerHTML = '&#9654; Run'; }
      render();
    }
    function render() {
      var gs = gammaEff(trust);
      /* posterior */
      clear(post);
      var L = 44, R = 450, T = 12, B = 186, a = 1 + k, b = 1 + n - k;
      var mean = a / (a + b), sd = Math.sqrt(a * b / ((a + b) * (a + b) * (a + b + 1)));
      var xmax = Math.min(1, Math.max(0.04, mean + 4.5 * sd));
      if (xmax > 0.04) xmax = Math.ceil(xmax * 20) / 20;
      var N = 220, xs = [], ys = [], ymax = 0;
      for (var i = 0; i <= N; i++) { var x = xmax * i / N; var y = betaPdf(Math.max(x, 1e-6), a, b); if (a === 1 && b === 1) y = 1; xs.push(x); ys.push(y); ymax = Math.max(ymax, y); }
      ymax *= 1.1;
      function X(x) { return L + (R - L) * x / xmax; }
      function Y(y) { return B - (B - T) * y / ymax; }
      var ticks = xmax <= 0.05 ? [0, 0.01, 0.02, 0.03, 0.04, 0.05] : (xmax <= 0.2 ? [0, 0.05, 0.1, 0.15, 0.2] : [0, 0.25, 0.5, 0.75, 1]);
      ticks.forEach(function (t) { if (t > xmax + 1e-9) return; el('line', { x1: X(t), y1: T, x2: X(t), y2: B, class: 'grid' }, post); el('text', { x: X(t), y: B + 15, class: 'tick', 'text-anchor': 'middle' }, post, (t * 100).toFixed(0) + '%'); });
      el('line', { x1: L, y1: B, x2: R, y2: B, class: 'ax' }, post);
      el('text', { x: (L + R) / 2, y: B + 31, class: 'tick', 'text-anchor': 'middle' }, post, 'exceedance rate p');
      el('text', { x: 12, y: (T + B) / 2, class: 'tick', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + ((T + B) / 2) + ')' }, post, 'density');
      var area = 'M' + X(0) + ',' + B, line = '';
      for (i = 0; i <= N; i++) { if (xs[i] > TAU) break; area += ' L' + X(xs[i]) + ',' + Y(ys[i]); }
      area += ' L' + X(Math.min(TAU, xmax)) + ',' + B + ' Z';
      el('path', { d: area, fill: C.safe, 'fill-opacity': 0.22 }, post);
      for (i = 0; i <= N; i++) line += (i ? ' L' : 'M') + X(xs[i]) + ',' + Y(ys[i]);
      el('path', { d: line, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, post);
      el('line', { x1: X(TAU), y1: T, x2: X(TAU), y2: B, stroke: C.safe, 'stroke-dasharray': '4 3', 'stroke-width': 1.5 }, post);
      el('text', { x: X(TAU) + 5, y: T + 12, 'font-size': 11.5, fill: C.safe, 'font-style': 'italic' }, post, 'τ = 1%');
      el('line', { x1: X(Math.min(trueP, xmax)), y1: B - 7, x2: X(Math.min(trueP, xmax)), y2: B, stroke: C.bad, 'stroke-width': 2.5 }, post);
      el('text', { x: X(Math.min(trueP, xmax)) + 4, y: B - 10, 'font-size': 10.5, fill: C.bad }, post, 'true p');

      /* trace */
      clear(trace);
      var L2 = 44, R2 = 450, T2 = 12, B2 = 186;
      var nx = Math.max(64, Math.min(NMAX, Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1) * 1.15)))));
      function X2(v) { return L2 + (R2 - L2) * v / nx; }
      function Y2(v) { return B2 - (B2 - T2) * v; }
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { el('line', { x1: L2, y1: Y2(t), x2: R2, y2: Y2(t), class: 'grid' }, trace); el('text', { x: L2 - 6, y: Y2(t) + 4, class: 'tick', 'text-anchor': 'end' }, trace, t); });
      for (var q = 0; q <= 4; q++) { var tv = Math.round(nx * q / 4); el('text', { x: X2(tv), y: B2 + 15, class: 'tick', 'text-anchor': 'middle' }, trace, tv); }
      el('line', { x1: L2, y1: B2, x2: R2, y2: B2, class: 'ax' }, trace);
      el('text', { x: (L2 + R2) / 2, y: B2 + 31, class: 'tick', 'text-anchor': 'middle' }, trace, 'sampled conditions n (renders = 2n)');
      el('rect', { x: L2, y: Y2(1), width: R2 - L2, height: Y2(gs) - Y2(1), fill: C.safe, 'fill-opacity': 0.07 }, trace);
      el('line', { x1: L2, y1: Y2(gs), x2: R2, y2: Y2(gs), stroke: C.ours, 'stroke-width': 1.6, 'stroke-dasharray': '6 3' }, trace);
      el('text', { x: R2 - 4, y: Y2(gs) - 5, 'font-size': 11, fill: C.ours, 'text-anchor': 'end' }, trace, 'γsafe = ' + gs.toFixed(2) + ' (accept above)');
      el('line', { x1: L2, y1: Y2(1 - GH), x2: R2, y2: Y2(1 - GH), stroke: C.bad, 'stroke-width': 1.3, 'stroke-dasharray': '6 3' }, trace);
      el('text', { x: R2 - 4, y: Y2(1 - GH) - 5, 'font-size': 11, fill: C.bad, 'text-anchor': 'end' }, trace, 'reject below 0.01');
      var d = '';
      hist.forEach(function (h, j) { d += (j ? ' L' : 'M') + X2(h[0]).toFixed(1) + ',' + Y2(h[1]).toFixed(1); });
      el('path', { d: d, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, trace);
      exc.forEach(function (e) { el('line', { x1: X2(e), y1: B2 - 8, x2: X2(e), y2: B2, stroke: C.bad, 'stroke-width': 1.5 }, trace); });
      if (state !== 'UNDET') {
        var last = hist[hist.length - 1];
        el('circle', { cx: X2(last[0]), cy: Y2(last[1]), r: 5, fill: state === 'SAFE' ? C.safe : C.bad }, trace);
      }

      var P = hist[hist.length - 1][1];
      var lbl = { UNDET: 'UNDETERMINED', SAFE: 'SAFE', BAD: 'BAD', REJECT: 'BUDGET OUT' }[state];
      var wrong = (state === 'SAFE' && trueP > TAU) ? ' <span class="bad">a bad candidate was accepted</span>' : (state !== 'SAFE' && state !== 'UNDET' && trueP < TAU ? ' <span class="bad">a safe candidate was rejected</span>' : '');
      $('seq-read').innerHTML = '<span>n = <b>' + n + '</b> (' + 2 * n + ' renders)</span><span>k = <b>' + k + '</b></span><span>P(p &lt; &tau;) = <b>' + P.toFixed(3) + '</b></span>' +
        '<span>&gamma;<sub>safe</sub> = <b>' + gs.toFixed(3) + '</b> &rarr; a clean run accepts after <b>' + rendersToAccept(gs) + '</b> renders</span><span class="verdict ' + state + '">' + lbl + '</span>' + wrong;
      if (framesMarker) framesMarker(gs);
    }
    $('seq-trust').addEventListener('input', function (e) {
      trust = +e.target.value; $('seq-trust-o').textContent = trust.toFixed(2);
      if (n === 0) render(); else reset();
    });
    [].forEach.call($('seq-p').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        trueP = +b.dataset.p;
        [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); });
        reset();
      });
    });
    $('seq-run').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '&#9654; Run'; return; }
      if (state !== 'UNDET') reset();
      this.innerHTML = '&#10074;&#10074; Pause';
      timer = setInterval(function () { step(Math.max(2, Math.ceil(n / 18))); }, 35);
    });
    $('seq-reset').addEventListener('click', function () { seed = (seed * 9301 + 49297) % 233280; reset(); });
    reset();
  }

  /* ================= renders needed vs gamma ================= */
  function initFrames() {
    var svg = $('frames-plot'); if (!svg) return;
    var L = 62, R = 455, T = 14, B = 236;
    function X(g) { return L + (R - L) * g; }
    function Y(f) { return B - (B - T) * f / 1000; }
    [0, 200, 400, 600, 800, 1000].forEach(function (t) { el('line', { x1: L, y1: Y(t), x2: R, y2: Y(t), class: 'grid' }, svg); el('text', { x: L - 6, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg, t); });
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (t) { el('text', { x: X(t), y: B + 16, class: 'tick', 'text-anchor': 'middle' }, svg, t); });
    el('line', { x1: L, y1: B, x2: R, y2: B, class: 'ax' }, svg);
    el('line', { x1: L, y1: T, x2: L, y2: B, class: 'ax' }, svg);
    var tl = el('text', { x: (L + R) / 2, y: B + 34, class: 'lbl', 'text-anchor': 'middle' }, svg, 'SAFE threshold ');
    el('tspan', { 'font-style': 'italic' }, tl, '\u03B3');
    el('text', { x: 14, y: (T + B) / 2, class: 'lbl', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((T + B) / 2) + ')' }, svg, 'renders per accepted candidate');
    var d = '';
    for (var i = 0; i <= 600; i++) { var g = 0.995 * i / 600; d += (i ? ' L' : 'M') + X(g).toFixed(1) + ',' + Y(rendersToAccept(g)).toFixed(1); }
    el('path', { d: d, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, svg);
    el('circle', { cx: X(0.99), cy: Y(916), r: 5.5, fill: C.cons }, svg);
    el('text', { x: X(0.99) - 9, y: Y(916) + 4, 'font-size': 11.5, fill: C.cons, 'text-anchor': 'end' }, svg, 'conservative 0.99: 916');
    var pts = [['ldlcRf', 0.51, 140], ['4sX3Rn', 0.33, 78], ['lsf3zr', 0.17, 36], ['XtyGWD', 0.16, 34]];
    pts.forEach(function (p) { el('circle', { cx: X(p[1]), cy: Y(p[2]), r: 4.5, fill: C.ours, stroke: '#fff', 'stroke-width': 1.2 }, svg); });
    var lab = [['ldlcRf 0.51: 140', 0.51, 140], ['4sX3Rn 0.33: 78', 0.33, 78], ['lsf3zr 0.17: 36', 0.17, 36], ['XtyGWD, Mss3zM 0.16: 34', 0.16, 34]];
    lab.forEach(function (p, j) {
      var ly = Y(300) - 16 * (3 - j), lx = X(0.08);
      el('text', { x: lx, y: ly, 'font-size': 11, fill: C.ours }, svg, p[0]);
      el('line', { x1: X(p[1]), y1: Y(p[2]) - 5, x2: X(p[1]), y2: ly + 3, stroke: C.ours, 'stroke-opacity': 0.35 }, svg);
    });
    el('text', { x: X(0.08), y: Y(300) - 66, 'font-size': 11, fill: C.mute }, svg, 'learned \u03B3low per session:');
    var mk = el('g', {}, svg);
    framesMarker = function (g) {
      clear(mk);
      var f = rendersToAccept(g);
      el('line', { x1: X(g), y1: Y(f), x2: X(g), y2: B, stroke: C.faint, 'stroke-dasharray': '3 3' }, mk);
      el('circle', { cx: X(g), cy: Y(f), r: 6, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, mk);
      el('text', { x: X(g) - 8, y: Y(f) + (f > 700 ? 22 : -10), 'font-size': 10.5, fill: C.ink, 'text-anchor': 'end' }, mk, 'widget: ' + f);
    };
    framesMarker(GH);
  }

  /* ================= speedup bars ================= */
  function initSpeed() {
    var svg = $('speed-plot'); if (!svg) return;
    var data = [
      ['Shadertoy', [['Multiple Transparency', 'XtyGWD', 2.19], ['traveler.', '4ltfDr', 1.68], ['Journey Desert', 'ldlcRf', 1.51], ['Raymarching Primitives', 'Xds3zN', 1.28], ['Happy Jumping', '3lsSzf', 1.23], ['Buoy', 'XdsGDB', 1.21], ['GLSL Ray Tracing Test', '3sc3z4', 1.14], ['Insect', 'Mss3zM', 1.12], ['Menger Sponge', '4sX3Rn', 1.10], ['Columns and Lights', 'lsf3zr', 1.07]], 'ε = 0.01'],
      ['MaterialX', [['Linen', '', 1.89], ['Bricks', '', 1.79], ['Car Paint', '', 1.47]], 'ε = 0.05'],
      ['Godot', [['SSIL render pass', 'engine', 1.70], ['Black hole shader', 'artistic', 1.17]], 'ε = 0.1']
    ];
    var L = 168, R = 440, rowH = 21, y = 10, lo = 1, hi = 2.3;
    function X(v) { return L + (R - L) * (v - lo) / (hi - lo); }
    var rows = [];
    data.forEach(function (g) { rows.push(['h', g[0], g[2]]); g[1].forEach(function (r) { rows.push(['r', r]); }); });
    var total = rows.length * rowH + 10;
    [1, 1.5, 2].forEach(function (t) { el('line', { x1: X(t), y1: 8, x2: X(t), y2: total - 4, class: 'grid' }, svg); el('text', { x: X(t), y: total + 10, class: 'tick', 'text-anchor': 'middle' }, svg, t.toFixed(1) + '×'); });
    rows.forEach(function (r) {
      if (r[0] === 'h') {
        el('text', { x: 4, y: y + 15, 'font-size': 12.5, 'font-weight': 700, fill: C.ink }, svg, r[1]);
        el('text', { x: R + 26, y: y + 15, 'font-size': 11, fill: C.mute, 'text-anchor': 'end' }, svg, r[2]);
        el('line', { x1: 4, y1: y + 20, x2: R + 26, y2: y + 20, stroke: C.line }, svg);
      } else {
        var v = r[1][2];
        var t = el('text', { x: L - 8, y: y + 15, 'font-size': 11.5, fill: C.ink, 'text-anchor': 'end' }, svg, r[1][0]);
        if (r[1][1]) el('tspan', { fill: C.faint, 'font-size': 10 }, t, ' ' + r[1][1]);
        el('rect', { x: X(1), y: y + 5, width: X(v) - X(1), height: 13, rx: 2, fill: C.ours, 'fill-opacity': v >= 1.6 ? 1 : 0.62 }, svg);
        el('text', { x: X(v) + 5, y: y + 15.5, 'font-size': 11.5, 'font-weight': 600, fill: C.ink }, svg, v.toFixed(2) + '×');
      }
      y += rowH;
    });
    svg.setAttribute('viewBox', '0 0 470 ' + (total + 18));
  }

  /* ================= replay savings ================= */
  function initSave() {
    var svg = $('save-plot'); if (!svg) return;
    var S = [['ldlcRf', 47, 0, 2], ['XtyGWD', 70, 0, 4], ['4sX3Rn', 68, 0, 5], ['lsf3zr', 65, 1, 8], ['Mss3zM', 67, 0, 4]];
    var L = 62, R = 330, T = 26, rh = 30;
    function X(p) { return L + (R - L) * p / 100; }
    el('text', { x: L, y: 14, 'font-size': 11, fill: C.mute }, svg, 'frames used, % of conservative');
    el('text', { x: 400, y: 14, 'font-size': 11, fill: C.mute, 'text-anchor': 'middle' }, svg, 'disagreements');
    el('text', { x: 372, y: T + 2, 'font-size': 10, fill: C.ours, 'text-anchor': 'middle', 'font-weight': 600 }, svg, 'trust');
    el('text', { x: 428, y: T + 2, 'font-size': 10, fill: C.aggr, 'text-anchor': 'middle', 'font-weight': 600 }, svg, 'aggressive');
    S.forEach(function (s, i) {
      var y = T + 8 + i * rh;
      el('text', { x: L - 8, y: y + 13, 'font-size': 11.5, 'text-anchor': 'end', fill: C.ink, 'font-family': 'ui-monospace, Menlo, monospace' }, svg, s[0]);
      el('rect', { x: X(0), y: y + 2, width: X(100) - X(0), height: 15, rx: 2, fill: C.cons, 'fill-opacity': 0.14 }, svg);
      el('rect', { x: X(0), y: y + 2, width: X(100 - s[1]) - X(0), height: 15, rx: 2, fill: C.ours }, svg);
      el('text', { x: X(100 - s[1]) + 6, y: y + 14, 'font-size': 11.5, 'font-weight': 600, fill: C.ink }, svg, '−' + s[1] + '%');
      el('text', { x: 372, y: y + 14, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 600, fill: s[2] ? C.bad : C.safe }, svg, s[2]);
      el('text', { x: 428, y: y + 14, 'font-size': 12, 'text-anchor': 'middle', fill: C.bad }, svg, s[3]);
    });
    var yb = T + 8 + S.length * rh + 6;
    [0, 50, 100].forEach(function (t) { el('text', { x: X(t), y: yb + 4, class: 'tick', 'text-anchor': 'middle' }, svg, t + '%'); });
    svg.setAttribute('viewBox', '0 0 470 ' + (yb + 10));
  }

  /* ================= live runs dumbbell ================= */
  function initLive() {
    var svg = $('live-plot'); if (!svg) return;
    var D = [['lsf3zr', 226, 67], ['Mss3zM', 312, 72], ['4sX3Rn', 176, 40], ['weighted', 228, 61]];
    var L = 70, R = 350, T = 14, rh = 26;
    function X(v) { return L + (R - L) * v / 330; }
    [0, 100, 200, 300].forEach(function (t) { el('line', { x1: X(t), y1: T, x2: X(t), y2: T + D.length * rh, class: 'grid' }, svg); el('text', { x: X(t), y: T + D.length * rh + 14, class: 'tick', 'text-anchor': 'middle' }, svg, t); });
    D.forEach(function (d, i) {
      var y = T + i * rh + 13, last = i === D.length - 1;
      el('text', { x: L - 8, y: y + 4, 'font-size': 11.5, 'text-anchor': 'end', fill: C.ink, 'font-weight': last ? 700 : 400, 'font-family': last ? 'inherit' : 'ui-monospace, Menlo, monospace' }, svg, d[0]);
      el('line', { x1: X(d[2]), y1: y, x2: X(d[1]), y2: y, stroke: '#c9c9c4', 'stroke-width': 2.5 }, svg);
      el('circle', { cx: X(d[1]), cy: y, r: 6, fill: C.cons }, svg);
      el('circle', { cx: X(d[2]), cy: y, r: 6, fill: C.ours }, svg);
      el('text', { x: R + 12, y: y + 4, 'font-size': 11, fill: last ? C.ink : C.mute, 'font-weight': last ? 600 : 400 }, svg, d[1] + ' → ' + d[2] + '  (−' + Math.round(100 * (1 - d[2] / d[1])) + '%)');
    });
    var ly = T + D.length * rh + 30;
    el('circle', { cx: L + 4, cy: ly - 4, r: 5, fill: C.cons }, svg); el('text', { x: L + 14, y: ly, 'font-size': 11, fill: C.mute }, svg, 'conservative');
    el('circle', { cx: L + 104, cy: ly - 4, r: 5, fill: C.ours }, svg); el('text', { x: L + 114, y: ly, 'font-size': 11, fill: C.mute }, svg, 'trust-guided');
    svg.setAttribute('viewBox', '0 0 470 ' + (ly + 6));
  }

  /* ================= LOD knob ================= */
  function initLOD() {
    var s = $('lod-s'); if (!s) return;
    var D = [[0.01, 9.1, 1.26, 41, 0.0000], [0.05, 6.4, 1.77, 53, 0.0168], [0.10, 5.0, 2.28, 60, 0.0638], [0.25, 3.4, 3.38, 89, 0.2224]];
    var svg = $('lod-plot');
    function draw(i) {
      var d = D[i];
      $('lod-o').textContent = d[0].toFixed(2);
      $('lod-r').src = 'static/img/lod/render_' + i + '.jpg';
      $('lod-f').src = 'static/img/lod/flip_' + i + '.jpg';
      $('lod-fc').textContent = 'FLIP error · ' + d[4].toFixed(4);
      $('lod-read').innerHTML = '<span>11.5 &rarr; <b>' + d[1] + ' ms</b></span><span><b style="color:var(--ours)">' + d[2].toFixed(2) + '&times;</b></span><span>accepted <b>' + d[3] + '%</b> of candidates</span>';
      clear(svg);
      var L = 40, R = 290, T1 = 26, B1 = 108, T2 = 140, B2 = 200, bw = 36;
      function X(j) { return L + 24 + (R - L - 48) * j / 3; }
      function Ys(v) { return B1 - (B1 - T1) * (v - 1) / 2.5; }
      function Ya(v) { return B2 - (B2 - T2) * v / 100; }
      el('text', { x: 4, y: 12, 'font-size': 11, 'font-weight': 600, fill: C.ours }, svg, 'best speedup');
      [1, 2, 3].forEach(function (t) { el('line', { x1: L, y1: Ys(t), x2: R, y2: Ys(t), class: 'grid' }, svg); el('text', { x: L - 6, y: Ys(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg, t + '\u00D7'); });
      var p = D.map(function (e, j) { return X(j) + ',' + Ys(e[2]); }).join(' ');
      el('polyline', { points: p, fill: 'none', stroke: C.ours, 'stroke-width': 2 }, svg);
      D.forEach(function (e, j) {
        el('circle', { cx: X(j), cy: Ys(e[2]), r: j === i ? 6 : 4, fill: j === i ? C.ours : '#fff', stroke: C.ours, 'stroke-width': 2 }, svg);
        el('text', { x: X(j) + (j === 3 ? -10 : 0), y: Ys(e[2]) - 10, 'font-size': 11, 'font-weight': j === i ? 700 : 500, fill: C.ours, 'text-anchor': j === 3 ? 'end' : 'middle' }, svg, e[2].toFixed(2) + '\u00D7');
      });
      el('text', { x: 4, y: T2 - 8, 'font-size': 11, 'font-weight': 600, fill: C.safe }, svg, 'candidates accepted');
      [0, 50, 100].forEach(function (t) { el('line', { x1: L, y1: Ya(t), x2: R, y2: Ya(t), class: 'grid' }, svg); el('text', { x: L - 6, y: Ya(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg, t + '%'); });
      D.forEach(function (e, j) {
        el('rect', { x: X(j) - bw / 2, y: Ya(e[3]), width: bw, height: B2 - Ya(e[3]), fill: j === i ? C.safe : '#cfe5d7', rx: 2 }, svg);
        el('text', { x: X(j), y: Ya(e[3]) + 13, 'font-size': 10.5, fill: j === i ? '#fff' : '#3f7a53', 'text-anchor': 'middle', 'font-weight': 600 }, svg, e[3] + '%');
        el('text', { x: X(j), y: B2 + 15, class: 'tick', 'text-anchor': 'middle', 'font-weight': j === i ? 700 : 400 }, svg, e[0]);
      });
      el('line', { x1: L, y1: B2, x2: R, y2: B2, class: 'ax' }, svg);
      el('text', { x: (L + R) / 2, y: B2 + 31, class: 'tick', 'text-anchor': 'middle' }, svg, 'error threshold \u03B5');
    }
    s.addEventListener('input', function () { draw(+s.value); });
    draw(+s.value);
  }

  /* ================= bibtex ================= */
  function initBib() {
    var b = $('bib-copy'); if (!b) return;
    b.addEventListener('click', function () {
      var t = $('bib').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }, function () {});
    });
  }

  initPlayer(); initPRPS(); initTabs(); initFrames(); initSeq(); initSpeed(); initSave(); initLive(); initLOD(); initBib();
})();
