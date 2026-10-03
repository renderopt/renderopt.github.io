# renderopt.github.io

Project page for **Efficient Validation for LLM-Generated Rendering Optimizations**
(Dereviannykh, Klepikov, Brucker, Wüst, Krimmel, Dolp, Dachsbacher — Karlsruhe Institute of Technology).

Static site, no build step: `index.html`, `static/css/site.css`, `static/js/site.js`.

- `static/js/site.js` draws all plots and interactive widgets as inline SVG from the numbers reported in the paper
  (scene player, PRPS parallel coordinates, Bayesian sequential test simulator, renders-vs-threshold curve,
  speedup bars, replay/live savings, error-threshold slider).
- `static/fig/*.svg` are vector exports of paper figures (`pdftocairo -svg`, coordinates rounded to 2 decimals).
- `static/videos/clips/*.mp4` are web re-encodes (H.264, CRF 22, ≤1920 px wide) of the
  `sup/*/generation_*/media/worst_merged.mp4` comparisons; `static/videos/overview.mp4` is the overview video (CRF 26).
- `sup/` holds the per-session supplementary reports (`live_report.html`, `mutation_tree.html`, shader sources).
  The full-resolution overview video (`sup/video.mp4`, 127 MB) exceeds GitHub's file limit and is only in the
  [supplementary archive](https://bwsyncandshare.kit.edu/s/AoYJ4XGpS4JPqcR).

Preview locally with `python3 -m http.server` and open http://localhost:8000.
