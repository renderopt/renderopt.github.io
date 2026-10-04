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
    { id: '4ltfDr', llm: 2.95, gpu: 1.58, name: 'traveler.', by: 'kaneta', g: 'Shadertoy', o: 7.944, n: 4.701, flip: 0.0060, eps: 0.01, d: '1D' },
    { id: 'Xds3zN', llm: 3.44, gpu: 1.27, name: 'Raymarching Primitives', by: 'iq', g: 'Shadertoy', o: 6.625, n: 5.168, flip: 0.0090, eps: 0.01, d: '5D' },
    { id: '3lsSzf', llm: 2.90, gpu: 0.94, name: 'Happy Jumping', by: 'iq', g: 'Shadertoy', o: 5.602, n: 4.560, flip: 0.0021, eps: 0.01, d: '1D' },
    { id: 'XdsGDB', llm: 2.94, gpu: 1.29, name: 'Buoy', by: 'TekF', g: 'Shadertoy', o: 3.694, n: 3.059, flip: 0.0111, eps: 0.01, d: '5D' },
    { id: '3sc3z4', llm: 3.21, gpu: 0.69, name: 'GLSL Ray Tracing Test', by: 'colin299', g: 'Shadertoy', o: 7.280, n: 6.408, flip: 0.0093, eps: 0.01, d: '5D' },
    { id: 'Mss3zM', llm: 2.31, gpu: 0.57, name: 'Insect', by: 'iq', g: 'Shadertoy', o: 6.856, n: 6.131, flip: 0.0195, eps: 0.01, d: '5D' },
    { id: '4sX3Rn', llm: 2.47, gpu: 0.77, name: 'Menger Sponge', by: 'iq', g: 'Shadertoy', o: 2.205, n: 2.004, flip: 0.0000, eps: 0.01, d: '5D' },
    { id: 'lsf3zr', llm: 3.44, gpu: 1.13, name: 'Columns and Lights', by: 'iq', g: 'Shadertoy', o: 4.552, n: 4.229, flip: 0.0088, eps: 0.01, d: '5D' },
    { id: 'ssil', llm: 3.58, gpu: 1.20, name: 'SSIL render pass', by: 'Godot Engine', g: 'Godot', o: 4.036, n: 2.433, flip: 0.1065, eps: 0.1, d: '7D' },
    { id: 'black_hole_2', llm: 1.79, gpu: 0.85, name: 'Black hole shader', by: 'HyperJragon', g: 'Godot', o: 5.598, n: 4.780, flip: 0.0878, eps: 0.1, d: '7D' },
    { id: 'brick', llm: 7.74, gpu: 7.44, name: 'Bricks', by: 'MaterialX Project', g: 'MaterialX', o: 1.337, n: 0.926, flip: 0.0737, eps: 0.05, d: 'up to 34D' },
    { id: 'carpaint', llm: 8.75, gpu: 7.28, name: 'Car Paint', by: 'MaterialX Project', g: 'MaterialX', o: 2.152, n: 1.676, flip: 0.0592, eps: 0.05, d: 'up to 34D' }
  ];
  SCENES.forEach(function (s) { s.sp = s.o / s.n; });

  function usd(x) { return '$' + x.toFixed(2); }

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
      var nm = s.name.length > 9 ? s.name.slice(0, 8).replace(/\s+$/, '') + '\u2026' : s.name;
      b.title = s.name; b.innerHTML = '<img loading="lazy" src="static/img/thumbs/' + s.id + '.jpg" alt=""><span>' + nm + ' <b>' + fmt(s.sp, 2) + '&times;</b></span>';
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
    var playing = true, PAUSE = '<path d="M7 5h3v14H7zm7 0h3v14h-3z"/>', PLAY = '<path d="M8 5v14l11-7z"/>';
    $('pplay').addEventListener('click', function () {
      playing = !playing;
      if (playing) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause();
      this.querySelector('svg').innerHTML = playing ? PAUSE : PLAY; this.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    });
    $('pamp').addEventListener('change', function (e) { amp = e.target.checked; });
    requestAnimationFrame(draw);
    function show(i) {
      var s = SCENES[i];
      v.poster = poster.src = 'static/videos/clips/' + s.id + '.jpg';
      v.src = 'static/videos/clips/' + s.id + '.mp4';
      if (playing) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      $('pname').innerHTML = s.name + '<small>' + s.g + '</small>';
      $('pnums').innerHTML = '<span>' + fmt(s.o, 2) + ' &rarr; <b>' + fmt(s.n, 2) + ' ms</b></span>' +
        '<span><b class="sp">' + fmt(s.sp, 2) + '&times;</b></span>' +
        '<span>FLIP <b>' + fmt(s.flip, 3) + '</b></span>' +
        '<span title="Cost of the whole optimization session">' + usd(s.llm) + ' LLM &middot; ' + usd(s.gpu) + ' GPUs</span>';
      [].forEach.call(chips.querySelectorAll('.chip'), function (c) { c.classList.toggle('on', +c.dataset.i === i); });
    }
    show(0);

    var tb = $('rep-table'), last = '';
    var h = '<tr><th></th><th>Scene</th><th class="num">Original</th><th class="num">Optimized</th><th class="num">Speedup</th><th class="num">Worst FLIP</th><th class="num">LLM</th><th class="num">GPUs</th></tr>';
    SCENES.forEach(function (s) {
      if (s.g !== last) { h += '<tr class="grp"><td colspan="8">' + s.g + ' <span style="text-transform:none;letter-spacing:0">&middot; &epsilon; = ' + s.eps + '</span></td></tr>'; last = s.g; }
      h += '<tr><td><img loading="lazy" src="static/img/thumbs/' + s.id + '.jpg" alt=""></td><td>' + s.name + ' <span class="mono" style="color:var(--faint)">' + (s.g === 'Shadertoy' ? s.id : '') + '</span><span class="by">by ' + s.by + '</span></td>' +
        '<td class="num">' + fmt(s.o, 2) + ' ms</td><td class="num">' + fmt(s.n, 2) + ' ms</td><td class="num sp">' + fmt(s.sp, 2) + '&times;</td><td class="num">' + fmt(s.flip, 4) + '</td>' +
        '<td class="num">' + usd(s.llm) + '</td><td class="num">' + usd(s.gpu) + '</td></tr>';
    });
    tb.innerHTML = h;
  }

  /* ================= PRPS hypercube + live WebGL render ================= */
  function initCube() {
    var svg = $('cube-svg'); if (!svg) return;
    // PRPS of Xds3zN from the session config: iTime in [0,125], iMouse.xy in [0,1] (x resolution), iMouse.zw in [-1,1]
    var DIMS = [
      { u: 'iTime', f: function (r) { return (125 * r).toFixed(1) + ' s'; }, note: 'animates the waves and the boat' },
      { u: 'iMouse.x', f: function (r) { return Math.round(640 * r) + ' px'; }, note: 'orbits the camera around the buoy' },
      { u: 'iMouse.y', f: function (r) { return Math.round(360 * r) + ' px'; }, note: 'raises or lowers the camera' }
    ];
    var r = [0.30, 0.12, 0.30], samples = [], split = [0.40, 0.70], touched = false, sweep = null;
    // oblique projection of the first three axes
    var O = [62, 236], EX = [196, 0], EZ = [62, -46], EY = [0, -170];
    function P(a, b, c) { return [O[0] + a * EX[0] + b * EZ[0] + c * EY[0], O[1] + a * EX[1] + b * EZ[1] + c * EY[1]]; }
    function drawCube() {
      clear(svg);
      var corners = [];
      for (var i = 0; i < 8; i++) corners.push([i & 1, (i >> 1) & 1, (i >> 2) & 1]);
      var edges = [];
      corners.forEach(function (c, i) { for (var d = 0; d < 3; d++) if (!c[d]) { var j = i | (1 << d); edges.push([c, corners[j]]); } });
      edges.forEach(function (e) {
        var hid = function (c) { return c[0] === 0 && c[1] === 1 && c[2] === 0; }, back = hid(e[0]) || hid(e[1]);
        var a = P(e[0][0], e[0][1], e[0][2]), b = P(e[1][0], e[1][1], e[1][2]);
        el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#c3c6cb', 'stroke-width': 1.2, 'stroke-dasharray': back ? '3 3' : '' }, svg);
      });
      // floor tint
      var f = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)];
      el('path', { d: 'M' + f.map(function (q) { return q.join(','); }).join(' L') + 'Z', fill: C.ours, 'fill-opacity': 0.05 }, svg);
      // axis labels
      function lab(pt, t, sub, anchor) {
        var tx = el('text', { x: pt[0], y: pt[1], 'font-size': 12.5, fill: C.ink, 'font-style': 'italic', 'text-anchor': anchor || 'middle', 'font-family': 'Castoro, Georgia, serif' }, svg, 'r');
        el('tspan', { 'font-size': 9, dy: 3 }, tx, sub);
        el('tspan', { 'font-size': 10.5, dy: -3, 'font-style': 'normal', fill: C.mute, 'font-family': 'Noto Sans, sans-serif' }, tx, ' ' + t);
      }
      var a1 = P(0.5, 0, 0), a2 = P(1, 0.5, 0), a3 = P(0, 0, 0.5);
      lab([a1[0], a1[1] + 20], 'iTime', '1');
      var a2b = P(0, 0.62, 0); lab([a2b[0] - 8, a2b[1] + 4], 'iMouse.x', '2', 'end');
      lab([a3[0] - 8, a3[1] - 20], 'iMouse.y', '3', 'end');
      ['0', '1'].forEach(function (t, k) { var q = P(k, 0, 0); el('text', { x: q[0], y: q[1] + 14, class: 'tick', 'text-anchor': 'middle' }, svg, t); });
      // previous samples
      samples.forEach(function (s) {
        var q = P(s[0], s[1], s[2]);
        el('circle', { cx: q[0], cy: q[1], r: 2.6, fill: C.faint, 'fill-opacity': 0.7 }, svg);
      });
      // drop lines
      var p = P(r[0], r[1], r[2]), fl = P(r[0], r[1], 0), ax = P(r[0], 0, 0), az = P(0, r[1], 0);
      el('line', { x1: p[0], y1: p[1], x2: fl[0], y2: fl[1], stroke: C.ours, 'stroke-dasharray': '3 2' }, svg);
      el('line', { x1: fl[0], y1: fl[1], x2: ax[0], y2: ax[1], stroke: C.ours, 'stroke-opacity': 0.5, 'stroke-dasharray': '3 2' }, svg);
      el('line', { x1: fl[0], y1: fl[1], x2: az[0], y2: az[1], stroke: C.ours, 'stroke-opacity': 0.5, 'stroke-dasharray': '3 2' }, svg);
      el('circle', { cx: fl[0], cy: fl[1], r: 2.5, fill: C.ours, 'fill-opacity': 0.5 }, svg);
      el('circle', { cx: p[0], cy: p[1], r: 7, fill: C.ours, stroke: '#fff', 'stroke-width': 2 }, svg);
      if (!touched) {
        var hx = p[0] + 9, hy = p[1] + 6, hg = el('g', { transform: 'translate(' + hx + ',' + hy + ') scale(0.9)', opacity: 0.85 }, svg);
        el('path', { d: 'M0 0 L0 15 L4 11 L7 18 L10 17 L7 10 L12 10 Z', fill: '#fff', stroke: C.ink, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, hg);
        el('text', { x: 15, y: 15, 'font-size': 11, fill: C.mute }, hg, 'drag');
      }
    }
    // one row per coordinate: slider, value, renderer uniform, meaning
    var rows = $('cube-rows');
    DIMS.forEach(function (d, i) {
      var row = document.createElement('label'); row.className = 'cube-row';
      row.innerHTML = '<i>r<sub>' + (i + 1) + '</sub></i><input type="range" min="0" max="1" step="0.001" id="cube-r' + i + '" aria-label="r' + (i + 1) + '"><output></output><span class="u"></span><span class="n">' + d.note + '</span>';
      rows.appendChild(row);
      row.querySelector('input').addEventListener('input', function (e) { touch(); r[i] = +e.target.value; update(); });
    });
    function updateUI() {
      DIMS.forEach(function (d, i) {
        var row = rows.children[i];
        row.querySelector('input').value = r[i]; row.querySelector('output').textContent = r[i].toFixed(2);
        row.querySelector('.u').textContent = '\u2192 ' + d.u + ' = ' + d.f(r[i]);
      });
    }
    function update() { drawCube(); updateUI(); requestRender(); }
    // dragging in the (r1, r2) plane at the current r3
    var dragging = false;
    function toCube(e) {
      var b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      var x = (e.clientX - b.left) * vb.width / b.width, y = (e.clientY - b.top) * vb.height / b.height;
      var bx = x - O[0] - r[2] * EY[0], by = y - O[1] - r[2] * EY[1];
      var det = EX[0] * EZ[1] - EX[1] * EZ[0];
      var a = (bx * EZ[1] - by * EZ[0]) / det, c = (EX[0] * by - EX[1] * bx) / det;
      r[0] = Math.max(0, Math.min(1, a)); r[1] = Math.max(0, Math.min(1, c)); update();
    }
    function touch() { touched = true; if (sweep) { cancelAnimationFrame(sweep); sweep = null; } }
    svg.addEventListener('pointerdown', function (e) { touch(); dragging = true; svg.classList.add('drag'); svg.setPointerCapture(e.pointerId); toCube(e); });
    svg.addEventListener('pointermove', function (e) { if (dragging) toCube(e); });
    svg.addEventListener('pointerup', function () { dragging = false; svg.classList.remove('drag'); });
    $('cube-sample').addEventListener('click', function () {
      touch();
      samples.push(r.slice(0, 3)); if (samples.length > 40) samples.shift();
      for (var i = 0; i < 3; i++) r[i] = Math.random();
      update();
    });
    $('cube-clear').addEventListener('click', function () { samples = []; drawCube(); });
    // two diagonal dividers: original | ours | error
    var view = $('cube-view'), SLOPE = 0.35, dragSplit = -1;
    function diag(e) {
      var b = view.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      return (x * 16 + (1 - y) * 9 * SLOPE) / (16 + 9 * SLOPE);
    }
    function placeLabels() {
      // x position (fraction of width) where a divider meets the top edge
      function topX(s) { return (s * (16 + 9 * SLOPE) - 9 * SLOPE) / 16; }
      var edges = [0, Math.max(0, topX(split[0])), Math.max(0, topX(split[1])), 1];
      for (var i = 0; i < 3; i++) {
        var lab = $('lab' + i), w = edges[i + 1] - edges[i];
        lab.hidden = !ready || w < 0.12; lab.style.left = (100 * (edges[i] + edges[i + 1]) / 2) + '%';
      }
    }
    view.addEventListener('pointerdown', function (e) {
      var d = diag(e); dragSplit = Math.abs(d - split[0]) < Math.abs(d - split[1]) ? 0 : 1;
      view.setPointerCapture(e.pointerId); move(e);
    });
    function move(e) {
      if (dragSplit < 0) return;
      var d = Math.max(0.02, Math.min(0.98, diag(e)));
      if (dragSplit === 0) split[0] = Math.min(d, split[1] - 0.04); else split[1] = Math.max(d, split[0] + 0.04);
      placeLabels(); requestRender();
    }
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', function () { dragSplit = -1; });

    /* ---- WebGL2 renderer for the original and optimized shader ---- */
    var cv = $('cube-gl'), gl = null, progs = {}, fbs = [], show = null, pending = false, ready = false;
    var W = cv.width, H = cv.height, noise = null;
    // Shadertoy's 256x256 "RGBA Noise Small" layout: G and A repeat R and B shifted by (37, 17)
    function noiseTex() {
      var N = 256, d = new Uint8Array(N * N * 4), rnd = mulberry(1234), R = new Uint8Array(N * N), B = new Uint8Array(N * N);
      for (var i = 0; i < N * N; i++) { R[i] = rnd() * 256; B[i] = rnd() * 256; }
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var o = (y * N + x) * 4, sx = (x - 37 + N) % N, sy = (y - 17 + N) % N, s = sy * N + sx;
        d[o] = R[y * N + x]; d[o + 1] = R[s]; d[o + 2] = B[y * N + x]; d[o + 3] = B[s];
      }
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      return t;
    }
    function status(t) { $('cube-status').textContent = t; }
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var VS = '#version 300 es\nvoid main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.0-1.0, 0.0, 1.0); }';
    function program(fs) {
      var p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      return p;
    }
    function wrap(src) {
      return '#version 300 es\nprecision highp float;\nprecision highp int;\nuniform vec3 iResolution;\nuniform float iTime;\nuniform vec4 iMouse;\nuniform int iFrame;\nuniform sampler2D iChannel0;\n#define HW_PERFORMANCE 0\nout vec4 outColor_;\n' +
        src.replace(/\r/g, '') + '\nvoid main(){ vec4 c = vec4(0.0); mainImage(c, gl_FragCoord.xy); outColor_ = vec4(c.rgb, 1.0); }\n';
    }
    var SHOW = '#version 300 es\nprecision highp float;\nuniform sampler2D A; uniform sampler2D B; uniform vec2 split; uniform vec2 res; uniform float slope; out vec4 o;\n' +
      'void main(){ ivec2 p = ivec2(gl_FragCoord.xy); vec3 a = texelFetch(A, p, 0).rgb, b = texelFetch(B, p, 0).rgb;\n' +
      ' float d = (gl_FragCoord.x + gl_FragCoord.y * slope) / (res.x + res.y * slope);\n' +
      ' vec3 c = d < split.x ? a : (d < split.y ? b : vec3(min(length(a - b) * 20.0, 1.0)) * vec3(1.0, 0.62, 0.3));\n' +
      ' float px = 1.0 / (res.x + res.y * slope); if (abs(d - split.x) < 1.2 * px || abs(d - split.y) < 1.2 * px) c = vec3(1.0);\n' +
      ' o = vec4(c, 1.0); }';
    function target() {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { t: t, f: f, key: '' };
    }
    function start() {
      gl = cv.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
      if (!gl) { status('WebGL2 is not available; showing a pre-rendered frame.'); return; }
      status('Compiling shaders…');
      Promise.all(['static/shaders/xdsgdb_original.frag', 'static/shaders/xdsgdb_optimized.frag'].map(function (u) { return fetch(u).then(function (x) { if (!x.ok) throw new Error(u); return x.text(); }); }))
        .then(function (src) {
          setTimeout(function () {
            try {
              progs[0] = program(wrap(src[0])); progs[1] = program(wrap(src[1])); show = program(SHOW);
              fbs = [target(), target()]; noise = noiseTex(); ready = true; status('');
              $('cube-fallback').hidden = true; placeLabels(); requestRender(); intro();
            } catch (err) { status('Could not compile the shader here; showing a pre-rendered frame.'); }
          }, 30);
        }).catch(function () { status('Could not load the shader; showing a pre-rendered frame.'); });
    }
    function pass(i) {
      var key = r.join(',');
      if (fbs[i].key === key) return;
      var p = progs[i]; gl.useProgram(p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbs[i].f); gl.viewport(0, 0, W, H);
      gl.uniform3f(gl.getUniformLocation(p, 'iResolution'), W, H, 1);
      gl.uniform1f(gl.getUniformLocation(p, 'iTime'), 125 * r[0]);
      gl.uniform4f(gl.getUniformLocation(p, 'iMouse'), r[1] * W, r[2] * H, 0, 0);
      gl.uniform1i(gl.getUniformLocation(p, 'iFrame'), 0);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, noise); gl.uniform1i(gl.getUniformLocation(p, 'iChannel0'), 2);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      fbs[i].key = key;
    }
    function render() {
      pending = false; if (!ready) return;
      pass(0); pass(1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(show);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbs[0].t);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fbs[1].t);
      gl.uniform1i(gl.getUniformLocation(show, 'A'), 0); gl.uniform1i(gl.getUniformLocation(show, 'B'), 1);
      gl.uniform2f(gl.getUniformLocation(show, 'split'), split[0], split[1]);
      gl.uniform2f(gl.getUniformLocation(show, 'res'), W, H);
      gl.uniform1f(gl.getUniformLocation(show, 'slope'), SLOPE * W / 16 * 9 / H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function requestRender() { if (!pending) { pending = true; requestAnimationFrame(render); } }
    // first view: move the point along the time axis for a few seconds, then hand over to the reader
    function intro() {
      if (touched || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
      var r0 = r[0], t0 = null, last = -1e9, DUR = 5000;
      function f(ts) {
        if (touched) return;
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / DUR);
        // about 8 updates per second: each update renders two ray-marched frames
        if (ts - last > 120 || k === 1) { last = ts; r[0] = r0 + 0.22 * Math.sin(Math.PI * k); update(); }
        sweep = k < 1 ? requestAnimationFrame(f) : null;
      }
      sweep = requestAnimationFrame(f);
    }
    update(); placeLabels();
    // compile lazily, once the figure is close to the viewport
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
      io.observe(cv);
    } else start();
  }

  /* ================= search tree ================= */
  function initTree() {
    var svg = $('tree-svg'); if (!svg) return;
    var ISL = ['#4c78b5', '#c8524a', '#4f9a63', '#d19a2b'];
    var L = 64, R = 984, T = 26, B = 262, Y0 = 0.9, Y1 = 1.8, XMAX = 1000;  // XMAX: fixed per session
    var RUG = [['V', 'rejected by validation', C.bad, 0.55], ['C', 'did not compile', '#8b9098', 0.55], ['L', 'LLM failure or duplicate', '#c3c6cb', 0.7]];
    var cache = {}, D = null, key = '4ltfDr', sel = -1, best = -1, acc = [];
    function X(s) { return L + (R - L) * s / XMAX; }
    function Y(b) { return B - (B - T) * (Math.max(Y0, Math.min(Y1, b)) - Y0) / (Y1 - Y0); }
    function chain(i) { var c = []; while (i >= 0 && c.length < 200) { c.unshift(i); var p = D[i].p; if (p < 0 || !D[p] || D[p].t !== 'A') break; i = p; } return c; }
    var base = el('g', {}, svg), over = el('g', {}, svg);
    function drawBase() {
      clear(base);
      // axes and grid (fixed for every session)
      [1.0, 1.2, 1.4, 1.6, 1.8].forEach(function (t) {
        el('line', { x1: L, y1: Y(t), x2: R, y2: Y(t), class: 'grid' }, base);
        el('text', { x: L - 8, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, base, t.toFixed(1) + '×');
      });
      el('line', { x1: L, y1: Y(1), x2: R, y2: Y(1), stroke: '#c9ccd1' }, base);
      el('text', { x: 14, y: (T + B) / 2, class: 'lbl', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((T + B) / 2) + ')' }, base, 'speedup');
      // generation boundaries
      var firstOfGen = {};
      D.forEach(function (d) { if (d.g > 0 && (firstOfGen[d.g] == null || d.s < firstOfGen[d.g])) firstOfGen[d.g] = d.s; });
      var gs = Object.keys(firstOfGen).map(Number).sort(function (a, b) { return a - b; });
      gs.forEach(function (g) { var x = X(firstOfGen[g]); el('line', { x1: x, y1: T - 6, x2: x, y2: B, stroke: '#e3e3df', 'stroke-dasharray': '3 3' }, base); });
      [0].concat(gs).forEach(function (g, k) {
        var x0 = k === 0 ? X(0) : X(firstOfGen[g]), x1 = k + 1 < gs.length + 1 && gs[k] != null ? X(firstOfGen[gs[k]]) : X(D.length);
        if (x1 - x0 > 34) el('text', { x: (x0 + x1) / 2, y: T - 10, class: 'tick', 'text-anchor': 'middle' }, base, 'gen ' + g);
      });
      // running best
      var bestSoFar = 1, path = 'M' + X(0) + ',' + Y(1);
      D.slice().sort(function (a, b) { return a.s - b.s; }).forEach(function (d) {
        if (d.t === 'A' && d.b > bestSoFar) { path += ' H' + X(d.s).toFixed(1) + ' V' + Y(d.b).toFixed(1); bestSoFar = d.b; }
      });
      path += ' H' + X(D.length).toFixed(1);
      el('path', { d: path, fill: 'none', stroke: C.ours, 'stroke-width': 2 }, base);
      // accepted dots
      acc.forEach(function (i) { var d = D[i]; el('circle', { cx: X(d.s), cy: Y(d.b), r: 2.8, fill: d.i >= 0 ? ISL[d.i % 4] : C.ink, 'fill-opacity': 0.5 }, base); });
      // rejected strip
      RUG.forEach(function (r, k) {
        var y = B + 22 + k * 15, n = 0, dpath = '';
        D.forEach(function (d) { if (d.t === r[0]) { n++; dpath += 'M' + X(d.s).toFixed(1) + ',' + (y - 5) + 'v10'; } });
        if (dpath) el('path', { d: dpath, stroke: r[2], 'stroke-opacity': r[3], 'stroke-width': 1 }, base);
        el('text', { x: L - 8, y: y + 4, 'font-size': 10.5, fill: C.mute, 'text-anchor': 'end' }, base, n);
      });
      var lx = L;
      RUG.forEach(function (r) {
        el('rect', { x: lx, y: B + 66, width: 10, height: 3, fill: r[2] }, base);
        var t = el('text', { x: lx + 14, y: B + 71, 'font-size': 10.5, fill: C.mute }, base, r[1]); lx += 14 + r[1].length * 5.6 + 18;
      });
      ISL.forEach(function (c, k) { el('circle', { cx: lx + 4 + k * 10, cy: B + 67.5, r: 3.5, fill: c, 'fill-opacity': 0.7 }, base); });
      el('text', { x: lx + 44, y: B + 71, 'font-size': 10.5, fill: C.mute }, base, 'accepted, by island');
      el('line', { x1: lx + 166, y1: B + 67.5, x2: lx + 182, y2: B + 67.5, stroke: C.ours, 'stroke-width': 2 }, base);
      el('text', { x: lx + 186, y: B + 71, 'font-size': 10.5, fill: C.mute }, base, 'best so far');
      [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (f) { return Math.round(f * XMAX); }).forEach(function (t) { el('text', { x: X(t), y: B + 96, class: 'tick', 'text-anchor': 'middle' }, base, t); });
      el('text', { x: (L + R) / 2, y: B + 110, class: 'tick', 'text-anchor': 'middle' }, base, 'candidate, in order of proposal');
    }
    function drawSel() {
      clear(over);
      if (sel < 0) return;
      var c = chain(sel), pts = c.map(function (i) { return [X(D[i].s), Y(D[i].b)]; });
      var sp = 'M' + pts[0][0] + ',' + pts[0][1]; for (var q = 1; q < pts.length; q++) sp += ' H' + pts[q][0].toFixed(1) + ' V' + pts[q][1].toFixed(1);
      el('path', { d: sp, fill: 'none', stroke: C.ink, 'stroke-width': 1.6 }, over);
      c.forEach(function (i, k) {
        var d = D[i], last = k === c.length - 1;
        el('circle', { cx: X(d.s), cy: Y(d.b), r: last ? 7 : 4.5, fill: last ? C.ours : '#fff', stroke: C.ink, 'stroke-width': last ? 2 : 1.6 }, over);
      });
      var d = D[sel];
      $('tree-info').innerHTML = '<span class="big">' + d.b.toFixed(2) + '&times;</span>' +
        (sel === best ? 'Best program of the run. ' : '') + 'Candidate <b>#' + d.s + '</b>, generation <b>' + d.g + '</b>' + (d.i >= 0 ? ', island <b>' + d.i + '</b>' : '') +
        '<br>worst sampled FLIP <b>' + (d.e || 0).toFixed(4) + '</b><br><b>' + (c.length - 1) + '</b> accepted edits from the original:' +
        '<div class="lineage">' + c.map(function (i) { return '<button data-i="' + i + '"' + (i === sel ? ' class="on"' : '') + '>' + D[i].b.toFixed(2) + '&times;</button>'; }).join('<span>&rsaquo;</span>') + '</div>';
      [].forEach.call($('tree-info').querySelectorAll('.lineage button'), function (b) { b.addEventListener('click', function () { sel = +b.dataset.i; drawSel(); }); });
      var lines = d.d && d.d.length ? d.d : ['  (original program)'];
      $('tree-diff').innerHTML = lines.map(function (l) {
        var cls = l[0] === '+' ? 'a' : (l[0] === '-' ? 'd' : 'c'); if (l.charAt(1) === '\u2026') cls = 'c';
        return '<span class="' + cls + '">' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\t/g, '    ') + '</span>';
      }).join('');
    }
    function pick(e) {
      if (!D) return;
      var b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      var x = (e.clientX - b.left) * vb.width / b.width, y = (e.clientY - b.top) * vb.height / b.height, bi = -1, bd = 14 * 14;
      acc.forEach(function (i) { var dx = X(D[i].s) - x, dy = Y(D[i].b) - y, q = dx * dx + dy * dy; if (q < bd) { bd = q; bi = i; } });
      if (bi >= 0 && bi !== sel) { sel = bi; drawSel(); }
    }
    svg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') pick(e); });
    svg.addEventListener('pointerdown', pick);
    function load(k) {
      key = k;
      function go(data) {
        D = data; cache[k] = data; acc = []; best = -1; XMAX = Math.ceil(D.length / 100) * 100;
        D.forEach(function (d, i) { if (d.t === 'A' && d.b != null) acc.push(i); if (d.best) best = i; });
        sel = best; drawBase(); drawSel();
      }
      if (cache[k]) go(cache[k]);
      else fetch('static/data/tree_' + k + '.json').then(function (r) { return r.json(); }).then(go).catch(function () { $('tree-hint').textContent = 'Could not load the search data.'; });
    }
    [].forEach.call($('tree-pick').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); });
        load(b.dataset.k);
      });
    });
    $('tree-best').addEventListener('click', function () { sel = best; drawSel(); });
    load(key);
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
    var SEEDS = { '0.001': 6, '0.015': 9, '0.15': 1 };
    var trueP = 0.015, trust = 0, seed = SEEDS['0.015'], hist = [], n = 0, k = 0, state = 'UNDET', timer = null;
    var exc = [];
    function reset(quiet) {
      if (timer) { clearInterval(timer); timer = null; }
      n = 0; k = 0; hist = [[0, probSafe(0, 0)]]; exc = []; state = 'UNDET';
      rng = mulberry(seed);
      $('seq-run').innerHTML = '&#9654; Replay';
      if (!quiet) render();
    }
    // run the whole draw at once, so every setting shows a finished, representative run
    function complete() { reset(true); step(NMAX + 1); }
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
      if (state !== 'UNDET' && timer) { clearInterval(timer); timer = null; $('seq-run').innerHTML = '&#9654; Replay'; }
      render();
    }
    function render() {
      var gs = gammaEff(trust);
      /* posterior: fixed log-scaled x (p from 0.01% to 100%), peak-normalized y */
      clear(post);
      var L = 44, R = 450, T = 14, B = 186, a = 1 + k, b = 1 + n - k, LX0 = -4, LX1 = 0;
      function X(p) { return L + (R - L) * (Math.log10(p) - LX0) / (LX1 - LX0); }
      function Y(y) { return B - (B - T) * y; }
      var N = 260, pts = [], ymax = 0;
      for (var i = 0; i <= N; i++) {
        var lp = LX0 + (LX1 - LX0) * i / N, p = Math.pow(10, lp);
        var ld = (a - 1) * Math.log(Math.max(p, 1e-12)) + (b - 1) * Math.log(Math.max(1 - p, 1e-12));
        pts.push([p, ld]); if (i === 0 || ld > ymax) ymax = ld;
      }
      pts.forEach(function (q) { q[1] = Math.exp(q[1] - ymax); });
      [1e-4, 1e-3, 1e-2, 1e-1, 1].forEach(function (t) { el('line', { x1: X(t), y1: T, x2: X(t), y2: B, class: 'grid' }, post); el('text', { x: X(t), y: B + 15, class: 'tick', 'text-anchor': 'middle' }, post, (t * 100 >= 1 ? (t * 100).toFixed(0) : (t * 100).toFixed(t < 1e-3 ? 2 : 1)) + '%'); });
      [0, 0.5, 1].forEach(function (t) { el('text', { x: L - 6, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, post, t); });
      el('line', { x1: L, y1: B, x2: R, y2: B, class: 'ax' }, post);
      el('text', { x: (L + R) / 2, y: B + 31, class: 'tick', 'text-anchor': 'middle' }, post, 'exceedance rate p (log scale)');
      el('text', { x: 12, y: (T + B) / 2, class: 'tick', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + ((T + B) / 2) + ')' }, post, 'density (peak = 1)');
      var area = 'M' + X(pts[0][0]) + ',' + B, line = '';
      pts.forEach(function (q) { if (q[0] <= TAU) area += ' L' + X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1); });
      area += ' L' + X(TAU) + ',' + B + ' Z';
      el('path', { d: area, fill: C.safe, 'fill-opacity': 0.22 }, post);
      pts.forEach(function (q, j2) { line += (j2 ? ' L' : 'M') + X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1); });
      el('path', { d: line, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, post);
      el('line', { x1: X(TAU), y1: T, x2: X(TAU), y2: B, stroke: C.safe, 'stroke-dasharray': '4 3', 'stroke-width': 1.5 }, post);
      el('text', { x: X(TAU) - 5, y: T + 12, 'font-size': 11.5, fill: C.safe, 'font-style': 'italic', 'text-anchor': 'end' }, post, '\u03C4 = 1%');
      el('line', { x1: X(trueP), y1: B - 8, x2: X(trueP), y2: B, stroke: C.bad, 'stroke-width': 2.5 }, post);
      el('text', { x: X(trueP) + 4, y: B - 10, 'font-size': 10.5, fill: C.bad }, post, 'true p');

      /* trace */
      clear(trace);
      var L2 = 44, R2 = 450, T2 = 12, B2 = 186;
      function X2(v) { return L2 + (R2 - L2) * Math.log(1 + v) / Math.log(1 + NMAX); }
      function Y2(v) { return B2 - (B2 - T2) * v; }
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) { el('line', { x1: L2, y1: Y2(t), x2: R2, y2: Y2(t), class: 'grid' }, trace); el('text', { x: L2 - 6, y: Y2(t) + 4, class: 'tick', 'text-anchor': 'end' }, trace, t); });
      [0, 4, 16, 64, 256, 1024].forEach(function (tv) { el('line', { x1: X2(tv), y1: B2, x2: X2(tv), y2: B2 + 4, class: 'ax' }, trace); el('text', { x: X2(tv), y: B2 + 15, class: 'tick', 'text-anchor': 'middle' }, trace, tv); });
      [[17, 'trust 1'], [458, 'trust 0']].forEach(function (m) { el('line', { x1: X2(m[0]), y1: T2, x2: X2(m[0]), y2: B2, stroke: C.faint, 'stroke-dasharray': '2 3' }, trace); el('text', { x: X2(m[0]) + 3, y: (T2 + B2) / 2 + 30, 'font-size': 10, fill: C.faint }, trace, m[1] + ': ' + m[0]); });
      el('line', { x1: L2, y1: B2, x2: R2, y2: B2, class: 'ax' }, trace);
      el('text', { x: (L2 + R2) / 2, y: B2 + 31, class: 'tick', 'text-anchor': 'middle' }, trace, 'sampled conditions n (log scale; renders = 2n)');
      el('rect', { x: L2, y: Y2(1), width: R2 - L2, height: Y2(gs) - Y2(1), fill: C.safe, 'fill-opacity': 0.07 }, trace);
      el('line', { x1: L2, y1: Y2(gs), x2: R2, y2: Y2(gs), stroke: C.ours, 'stroke-width': 1.6, 'stroke-dasharray': '6 3' }, trace);
      el('text', { x: R2 - 4, y: Y2(gs) - 5, 'font-size': 11, fill: C.ours, 'text-anchor': 'end' }, trace, 'γsafe = ' + gs.toFixed(2) + ' (accept above)');
      el('line', { x1: L2, y1: Y2(1 - GH), x2: R2, y2: Y2(1 - GH), stroke: C.bad, 'stroke-width': 1.3, 'stroke-dasharray': '6 3' }, trace);
      el('text', { x: L2 + 4, y: Y2(1 - GH) - 5, 'font-size': 11, fill: C.bad }, trace, 'reject below 0.01');
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
      complete();
    });
    [].forEach.call($('seq-p').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        trueP = +b.dataset.p; seed = SEEDS[b.dataset.p];
        [].forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); });
        complete();
      });
    });
    $('seq-run').addEventListener('click', function () {
      if (timer) { clearInterval(timer); timer = null; this.innerHTML = '&#9654; Replay'; return; }
      if (state !== 'UNDET' || n > 0) reset();
      this.innerHTML = '&#10074;&#10074; Pause';
      timer = setInterval(function () { step(Math.max(2, Math.ceil(n / 18))); }, 35);
    });
    $('seq-reset').addEventListener('click', function () { seed = 1 + Math.floor(Math.random() * 1e6); complete(); });
    complete();
    if ('IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { seen.disconnect(); if (!timer) $('seq-run').click(); }
      }, { threshold: 0.5 });
      seen.observe($('seq'));
    }
  }

  /* ================= renders needed vs gamma ================= */
  function initFrames() {
    var svg = $('frames-plot'); if (!svg) return;
    var L = 62, R = 455, T = 14, B = 236;
    function X(g) { return L + (R - L) * g; }
    function Y(f) { return B - (B - T) * (Math.log10(Math.max(f, 10)) - 1) / 2; }
    [10, 30, 100, 300, 1000].forEach(function (t) { el('line', { x1: L, y1: Y(t), x2: R, y2: Y(t), class: 'grid' }, svg); el('text', { x: L - 6, y: Y(t) + 4, class: 'tick', 'text-anchor': 'end' }, svg, t); });
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (t) { el('text', { x: X(t), y: B + 16, class: 'tick', 'text-anchor': 'middle' }, svg, t); });
    el('line', { x1: L, y1: B, x2: R, y2: B, class: 'ax' }, svg);
    el('line', { x1: L, y1: T, x2: L, y2: B, class: 'ax' }, svg);
    var tl = el('text', { x: (L + R) / 2, y: B + 34, class: 'lbl', 'text-anchor': 'middle' }, svg, 'SAFE threshold ');
    el('tspan', { 'font-style': 'italic' }, tl, '\u03B3');
    el('text', { x: 14, y: (T + B) / 2, class: 'lbl', 'text-anchor': 'middle', transform: 'rotate(-90 14 ' + ((T + B) / 2) + ')' }, svg, 'renders per accepted candidate (log)');
    var d = '';
    for (var i = 0, first = true; i <= 600; i++) { var g = 0.995 * i / 600; if (2 * Math.log(1 - g) / Math.log(1 - TAU) < 10) continue; d += (first ? 'M' : ' L'); first = false; d += '' + X(g).toFixed(1) + ',' + Y(2 * Math.log(1 - g) / Math.log(1 - TAU)).toFixed(1); }
    el('path', { d: d, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, svg);
    el('circle', { cx: X(0.99), cy: Y(916), r: 5.5, fill: C.cons }, svg);
    el('text', { x: X(0.99) - 9, y: Y(916) + 4, 'font-size': 11.5, fill: C.cons, 'text-anchor': 'end' }, svg, 'conservative 0.99: 916');
    var pts = [['ldlcRf', 0.51, 140], ['4sX3Rn', 0.33, 78], ['lsf3zr', 0.17, 36], ['XtyGWD', 0.16, 34]];
    pts.forEach(function (p) { el('circle', { cx: X(p[1]), cy: Y(p[2]), r: 4.5, fill: C.ours, stroke: '#fff', 'stroke-width': 1.2 }, svg); });
    var lab = [['ldlcRf 0.51: 140', 0.51, 140], ['4sX3Rn 0.33: 78', 0.33, 78], ['lsf3zr 0.17: 36', 0.17, 36], ['XtyGWD, Mss3zM 0.16: 34', 0.16, 34]];
    lab.forEach(function (p, j) {
      var ly = Y(700) + 16 * j, lx = X(0.05);
      el('text', { x: lx, y: ly, 'font-size': 11, fill: C.ours }, svg, p[0]);
      el('line', { x1: X(p[1]), y1: Y(p[2]) - 5, x2: X(p[1]), y2: Y(700) + 16 * 3 + 6, stroke: C.ours, 'stroke-opacity': 0.35 }, svg);
    });
    el('text', { x: X(0.05), y: Y(700) - 16, 'font-size': 11, fill: C.mute }, svg, 'learned \u03B3low per session:');
    var mk = el('g', {}, svg);
    framesMarker = function (g) {
      clear(mk);
      var f = rendersToAccept(g);
      el('line', { x1: X(g), y1: Y(f), x2: X(g), y2: B, stroke: C.faint, 'stroke-dasharray': '3 3' }, mk);
      el('circle', { cx: X(g), cy: Y(f), r: 6, fill: 'none', stroke: C.ink, 'stroke-width': 1.8 }, mk);
      if (g < GH - 1e-6) el('text', { x: X(g) + 8, y: Y(f) + 14, 'font-size': 10.5, fill: C.ink }, mk, 'simulator: ' + f);
    };
    framesMarker(GH);
  }

  /* ================= speedup bars ================= */
  function initSpeed() {
    var svg = $('speed-plot'); if (!svg) return;
    var data = [
      ['Shadertoy', [['Multiple Transparency', 'XtyGWD', 2.19], ['traveler.', '4ltfDr', 1.68], ['Tribute - Journey!', 'ldlcRf', 1.51], ['Raymarching Primitives', 'Xds3zN', 1.28], ['Happy Jumping', '3lsSzf', 1.23], ['Buoy', 'XdsGDB', 1.21], ['GLSL Ray Tracing Test', '3sc3z4', 1.14], ['Insect', 'Mss3zM', 1.12], ['Menger Sponge', '4sX3Rn', 1.10], ['Columns and Lights', 'lsf3zr', 1.07]], 'ε = 0.01'],
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
      $('lod-o').textContent = 'LOD ' + i;
      $('lod-r').src = 'static/img/lod/render_' + i + '.jpg';
      $('lod-f').src = 'static/img/lod/flip_' + i + '.jpg';
      $('lod-fc').textContent = 'FLIP error · ' + d[4].toFixed(4);
      $('lod-read').innerHTML = '<span>&epsilon; = <b>' + d[0].toFixed(2) + '</b></span><span>11.5 &rarr; <b>' + d[1] + ' ms</b></span><span><b style="color:var(--ours)">' + d[2].toFixed(2) + '&times;</b></span><span>accepted <b>' + d[3] + '%</b> of candidates</span>';
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
    // swipe or drag across the images to step through the levels of detail
    var imgs = $('lod-imgs'), x0 = null, v0 = 0;
    imgs.addEventListener('pointerdown', function (e) { x0 = e.clientX; v0 = +s.value; imgs.setPointerCapture(e.pointerId); });
    imgs.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      var step = Math.round((e.clientX - x0) / Math.max(40, imgs.clientWidth / 8)), nv = Math.max(0, Math.min(3, v0 + step));
      if (nv !== +s.value) { s.value = nv; draw(nv); }
    });
    imgs.addEventListener('pointerup', function () { x0 = null; });
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

  (function () {
    var ov = $('ov'); if (!ov || !('IntersectionObserver' in window)) return;
    var userCtl = false;
    ov.addEventListener('pause', function () { if (!auto) userCtl = true; });
    ov.addEventListener('play', function () { if (!auto) userCtl = true; });
    var auto = false;
    new IntersectionObserver(function (es) {
      if (userCtl) return;
      auto = true;
      if (es[0].isIntersecting) { var pr = ov.play(); if (pr && pr.catch) pr.catch(function () {}); } else ov.pause();
      setTimeout(function () { auto = false; }, 300);
    }, { threshold: 0.5 }).observe(ov);
  })();
  initPlayer(); initCube(); initTabs(); initTree(); initFrames(); initSeq(); initSpeed(); initSave(); initLive(); initLOD(); initBib();
})();
