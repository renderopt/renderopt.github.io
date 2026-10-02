# Supplementary Materials: Optimization Session Reports

This folder contains detailed per-shader optimization reports for reviewer inspection.

## Contents

Each subfolder corresponds to one shader optimization session. Open `live_report.html` in a browser to view the interactive report.

| Folder | Name | Platform | Boost |
|--------|------|----------|-------|
| `3lsSzf/` | Happy Jumping | Shadertoy | +22.9% |
| `3sc3z4/` | 3sc3z4 | Shadertoy | +13.6% |
| `4ltfDr/` | traveler. | Shadertoy | +69.0% |
| `NtlSDs/` | Protean Clouds | Shadertoy | +56.5% |
| `Xds3zN/` | Xds3zN | Shadertoy | +28.2% |
| `lsf3zr/` | Columns and Lights | Shadertoy | +7.6% |
| `Mss3zM/` | Mss3zM | Shadertoy | +11.8% |
| `4sX3Rn/` | Menger Sponge | Shadertoy | +10.0% |
| `ssil/` | ssil | Godot | +65.9% |
| `black_hole_2/` | black_hole_2 | Godot | +17.1% |
| `brick/` | brick | MaterialX | +44.4% |
| `carpaint/` | carpaint | MaterialX | +28.3% |

## Per-Shader Report Structure

- **`live_report.html`** -- Main interactive report (open in browser). Contains:
  - Performance Summary (original vs. optimized render times, FPS, improvement %)
  - LLM and GPU rent costs
  - Video Comparison (side-by-side: Original | Optimized | Error)
  - FLIP Error Distribution
  - Mutation Tree (interactive visualization of the optimization search)
  - Optimization Diff (unified diff between original and optimized shader)
  - Shader Code (full original and optimized source)
  - Generation History
- **`mutation_tree.html`** -- Standalone mutation tree visualization
- **`original/`** -- Original shader source files
- **`generation_NNN/`** -- Best optimized shader files + comparison media
  - `media/worst_merged.mp4` -- Side-by-side video comparison
  - `media/first_frame_*.png` -- First-frame screenshots
  - `*.frag` / `*.glsl` / `*.gdshader` -- Optimized shader source
