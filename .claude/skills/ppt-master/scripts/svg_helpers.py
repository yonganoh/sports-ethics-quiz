"""PPT Master용 SVG 페이지를 스크립트로 만들 때 쓰는 작은 도우미.

사용법(예):
    from svg_helpers import Page, T, G, img, icon, line, wrap, bgrect
    p = Page(4, "day1_canal", "content", out_dir)   # 파일: 04_day1_canal.svg
    p.add(bgrect("#FFFFFF"))
    G(p, "header", (64, 52, 1152, 112), T(64, 112, "제목", 38, "#14213D", True))
    p.save()

주의:
- 최상위 <g>마다 data-pptx-bounds가 필요하고, 서로 겹치면 품질 검사 오류다.
- 전면 배경 사진·덮개는 <g>로 묶지 말고 직접 자식에 data-pptx-role="background"를 붙인다.
- 한글 폭 추정은 근사값이다. 열 너비의 94% 정도로 잡아 넘침을 막는다.
"""
import html
import os

FONT = "Malgun Gothic"


def esc(s):
    return html.escape(s, quote=False)


def char_width(ch, bold=False):
    o = ord(ch)
    if (0xAC00 <= o <= 0xD7A3 or 0x3000 <= o <= 0x30FF or 0x4E00 <= o <= 0x9FFF
            or 0xFF00 <= o <= 0xFFEF or 0x1100 <= o <= 0x11FF):
        w = 1.0
    elif ch == " ":
        w = 0.32
    elif ch in ".,:;!'|()[]/-·":
        w = 0.42
    elif ch.isdigit():
        w = 0.6
    else:
        w = 0.62
    return w * (1.04 if bold else 1.0)


def text_width(s, size, bold=False):
    return sum(char_width(c, bold) for c in s) * size * 1.03


def wrap(s, size, max_width, bold=False):
    """공백 단위로 줄을 나눈다. 단어가 한 줄보다 길면 글자 단위로 자른다."""
    lines = []
    for para in s.split("\n"):
        cur = ""
        for w in para.split(" "):
            t = (cur + " " + w) if cur else w
            if text_width(t, size, bold) <= max_width:
                cur = t
                continue
            if cur:
                lines.append(cur)
                cur = ""
            if text_width(w, size, bold) > max_width:
                buf = ""
                for c in w:
                    if text_width(buf + c, size, bold) > max_width:
                        lines.append(buf)
                        buf = c
                    else:
                        buf += c
                cur = buf
            else:
                cur = w
        lines.append(cur)
    return lines


class Page:
    def __init__(self, idx, name, role, out_dir):
        self.idx, self.name, self.role, self.out_dir = idx, name, role, out_dir
        self.parts, self.defs = [], []

    def add(self, x):
        self.parts.append(x)

    def save(self):
        os.makedirs(self.out_dir, exist_ok=True)
        defs = "".join(self.defs)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" '
               f'font-family="{FONT}" data-pptx-page-role="{self.role}">\n'
               + (f"<defs>{defs}</defs>\n" if defs else "")
               + "\n".join(self.parts) + "\n</svg>\n")
        with open(f"{self.out_dir}/{self.idx:02d}_{self.name}.svg", "w") as f:
            f.write(svg)


def T(x, y, lines, size, fill, bold=False, lead=1.5, anchor=None, opacity=None):
    """줄마다 x, y가 있는 <tspan>으로 한 개의 편집 가능한 <text>를 만든다."""
    if isinstance(lines, str):
        lines = [lines]
    a = f' text-anchor="{anchor}"' if anchor else ""
    b = ' font-weight="bold"' if bold else ""
    o = f' fill-opacity="{opacity}"' if opacity else ""
    rows = "".join(
        f'<tspan x="{x}" y="{round(y + i * size * lead, 1)}">{esc(l)}</tspan>'
        for i, l in enumerate(lines))
    return f'<text font-size="{size}" fill="{fill}"{b}{a}{o}>{rows}</text>'


def G(page, gid, bounds, inner):
    x, y, w, h = bounds
    page.add(f'<g id="{gid}" data-pptx-bounds="{x} {y} {w} {h}">{inner}</g>')


def bgrect(fill):
    return f'<rect x="0" y="0" width="1280" height="720" fill="{fill}"/>'


def img(filename, x, y, w, h, mode="slice", extra=""):
    return (f'<image href="../images/{filename}" x="{x}" y="{y}" width="{w}" height="{h}" '
            f'preserveAspectRatio="xMidYMid {mode}"{extra}/>')


def icon(name, x, y, size, color):
    return (f'<use data-icon="tabler-outline/{name}" x="{x}" y="{y}" width="{size}" '
            f'height="{size}" fill="{color}" stroke-width="1.5"/>')


def line(x1, y1, x2, y2, color="#D9D4CA", width=1):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{width}"/>'


def left_scrim(page, color="#0B1426", a=0.9, b=0.45):
    """왼쪽이 진한 가로 그라디언트 덮개(전면 사진 위에 직접 자식으로 둔다)."""
    page.defs.append(
        f'<linearGradient id="scrimLR" x1="0" y1="0" x2="1" y2="0">'
        f'<stop offset="0" stop-color="{color}" stop-opacity="{a}"/>'
        f'<stop offset="1" stop-color="{color}" stop-opacity="{b}"/></linearGradient>')
    return '<rect id="scrim" data-pptx-role="background" x="0" y="0" width="1280" height="720" fill="url(#scrimLR)"/>'
