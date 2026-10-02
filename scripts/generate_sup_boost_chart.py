#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "sup" / "README.md"
OUT_PATH = ROOT / "static" / "images" / "supplementary_boosts.svg"


def load_rows(readme_path: Path) -> list[dict[str, str | float]]:
    pattern = re.compile(
        r"\|\s*`(?P<folder>[^`]+)`\s*\|\s*(?P<name>[^|]+?)\s*\|\s*(?P<platform>[^|]+?)\s*\|\s*\+(?P<boost>[\d.]+)%\s*\|"
    )
    rows: list[dict[str, str | float]] = []
    for line in readme_path.read_text(encoding="utf-8").splitlines():
        match = pattern.search(line)
        if not match:
            continue
        rows.append(
            {
                "folder": match.group("folder").rstrip("/"),
                "name": match.group("name").strip(),
                "platform": match.group("platform").strip(),
                "boost": float(match.group("boost")),
            }
        )
    return sorted(rows, key=lambda row: float(row["boost"]), reverse=True)


def platform_color(platform: str) -> str:
    return {
        "Shadertoy": "#1f9d8b",
        "Godot": "#3674b5",
        "MaterialX": "#d97706",
    }.get(platform, "#6b7280")


def render_svg(rows: list[dict[str, str | float]]) -> str:
    width = 920
    top = 52
    left = 170
    row_height = 34
    bar_height = 18
    chart_width = 680
    height = top + len(rows) * row_height + 52
    max_boost = max(float(row["boost"]) for row in rows)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#f4f1ea"/>',
        '<text x="28" y="30" fill="#161616" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="20" font-weight="700">Supplementary session boosts</text>',
        '<text x="28" y="46" fill="#5f5a52" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="11">Measured improvement reported in the local reviewer packages.</text>',
    ]

    for tick in range(0, 71, 10):
        x = left + chart_width * (tick / max_boost)
        parts.append(
            f'<line x1="{x:.1f}" y1="{top - 8}" x2="{x:.1f}" y2="{height - 30}" stroke="#d7d0c5" stroke-width="1"/>'
        )
        parts.append(
            f'<text x="{x:.1f}" y="{height - 12}" text-anchor="middle" fill="#6b665f" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="10">{tick}%</text>'
        )

    for index, row in enumerate(rows):
        y = top + index * row_height
        boost = float(row["boost"])
        platform = str(row["platform"])
        label = f'{row["folder"]}  {row["name"]}'
        bar_width = chart_width * (boost / max_boost)
        color = platform_color(platform)
        parts.append(
            f'<text x="24" y="{y + 14}" fill="#171717" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="11" font-weight="600">{label}</text>'
        )
        parts.append(
            f'<text x="24" y="{y + 27}" fill="#736e66" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="10">{platform}</text>'
        )
        parts.append(
            f'<rect x="{left}" y="{y + 4}" width="{chart_width}" height="{bar_height}" rx="3" fill="#ebe4d9"/>'
        )
        parts.append(
            f'<rect x="{left}" y="{y + 4}" width="{bar_width:.1f}" height="{bar_height}" rx="3" fill="{color}"/>'
        )
        parts.append(
            f'<text x="{left + bar_width + 10:.1f}" y="{y + 18}" fill="#171717" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="11" font-weight="700">+{boost:.1f}%</text>'
        )

    parts.append('</svg>')
    return "\n".join(parts)


def main() -> None:
    rows = load_rows(README_PATH)
    OUT_PATH.write_text(render_svg(rows), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()