#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import struct
from dataclasses import dataclass, field
from typing import Iterable


PAGE_W = 612
PAGE_H = 792
MARGIN_X = 54
MARGIN_TOP = 58
MARGIN_BOTTOM = 54

NAVY = (18, 48, 71)
TEAL = (47, 124, 138)
PALE_TEAL = (233, 246, 247)
SAND = (207, 163, 90)
INK = (33, 55, 70)
MUTED = (91, 117, 131)
LINE = (216, 232, 232)
WHITE = (255, 255, 255)


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def rgb(color: tuple[int, int, int]) -> str:
    r, g, b = color
    return f"{r / 255:.4f} {g / 255:.4f} {b / 255:.4f}"


def text_width(text: str, size: float, bold: bool = False) -> float:
    factor = 0.51 if not bold else 0.54
    width = 0.0
    for ch in text:
        if ch in "il.,' ":
            width += size * 0.26
        elif ch in "mwMW":
            width += size * 0.78
        elif ch.isupper():
            width += size * (factor + 0.07)
        else:
            width += size * factor
    return width


def wrap_text(text: str, max_width: float, size: float, bold: bool = False) -> list[str]:
    words = text.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_width(candidate, size, bold) <= max_width:
            current = candidate
            continue

        if current:
            lines.append(current)
            current = word
        else:
            lines.append(word)
            current = ""

    if current:
        lines.append(current)
    return lines


@dataclass
class Page:
    commands: list[str] = field(default_factory=list)
    images: list[tuple[str, str]] = field(default_factory=list)

    def rect(self, x: float, y: float, w: float, h: float, color: tuple[int, int, int]) -> None:
        self.commands.append(f"{rgb(color)} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f")

    def stroke_rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        color: tuple[int, int, int],
        line_width: float = 1,
    ) -> None:
        self.commands.append(
            f"{rgb(color)} RG {line_width:.2f} w {x:.2f} {y:.2f} {w:.2f} {h:.2f} re S"
        )

    def line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        color: tuple[int, int, int],
        line_width: float = 1,
    ) -> None:
        self.commands.append(
            f"{rgb(color)} RG {line_width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S"
        )

    def text(
        self,
        x: float,
        y: float,
        text: str,
        size: float = 11,
        font: str = "F1",
        color: tuple[int, int, int] = INK,
    ) -> None:
        self.commands.append(
            f"BT /{font} {size:.2f} Tf {rgb(color)} rg {x:.2f} {y:.2f} Td ({esc(text)}) Tj ET"
        )

    def image(self, path: str, x: float, y: float, w: float, h: float) -> None:
        name = f"Im{len(self.images) + 1}"
        self.images.append((name, path))
        self.commands.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /{name} Do Q")

    def stream(self) -> bytes:
        return ("\n".join(self.commands) + "\n").encode("latin-1", "replace")


class ManualPdf:
    def __init__(self, title: str, subtitle: str, version: str, date: str):
        self.title = title
        self.subtitle = subtitle
        self.version = version
        self.date = date
        self.pages: list[Page] = []
        self.page = Page()
        self.y = PAGE_H - MARGIN_TOP
        self.section_toc: list[tuple[str, int]] = []
        self.screenshot_headers = False
        self.screenshot_index = 0
        self.screenshots = [
            ("Home schedule", "docs/screenshots/home.jpg"),
            ("My Account", "docs/screenshots/account.jpg"),
            ("Experiences", "docs/screenshots/events.jpg"),
        ]

    def add_page(self) -> None:
        if self.page.commands:
            self._footer(self.page, len(self.pages) + 1)
            self.pages.append(self.page)
        self.page = Page()
        self.y = PAGE_H - MARGIN_TOP
        if self.screenshot_headers:
            self._screenshot_header()

    def ensure(self, height: float) -> None:
        if self.y - height < MARGIN_BOTTOM:
            self.add_page()

    def _footer(self, page: Page, number: int) -> None:
        page.line(MARGIN_X, 42, PAGE_W - MARGIN_X, 42, LINE)
        page.text(MARGIN_X, 26, "Bluewater Scheduler Regular User Manual", 8.5, "F1", MUTED)
        page.text(PAGE_W - MARGIN_X - 42, 26, f"Page {number}", 8.5, "F1", MUTED)

    def _draw_screenshot_panel(
        self,
        page: Page,
        label: str,
        path: str,
        x: float,
        y: float,
        w: float,
        h: float,
    ) -> None:
        image_w, image_h = jpeg_dimensions(path)
        image_ratio = image_w / image_h
        box_ratio = w / h
        draw_w = w
        draw_h = h
        if image_ratio > box_ratio:
            draw_h = w / image_ratio
        else:
            draw_w = h * image_ratio
        draw_x = x + (w - draw_w) / 2
        draw_y = y + (h - draw_h) / 2

        page.rect(x - 4, y - 4, w + 8, h + 24, WHITE)
        page.stroke_rect(x - 4, y - 4, w + 8, h + 24, LINE)
        page.image(path, draw_x, draw_y, draw_w, draw_h)
        page.rect(x, y + h - 18, w, 18, NAVY)
        page.text(x + 10, y + h - 13, f"Printscreen: {label}", 8.5, "F2", WHITE)

    def _screenshot_header(self) -> None:
        available = [(label, path) for label, path in self.screenshots if os.path.exists(path)]
        if not available:
            return
        label, path = available[self.screenshot_index % len(available)]
        self.screenshot_index += 1
        image_w = PAGE_W - (MARGIN_X * 2)
        image_h = 250
        y0 = PAGE_H - MARGIN_TOP - image_h
        self._draw_screenshot_panel(self.page, label, path, MARGIN_X, y0, image_w, image_h)
        self.y = y0 - 18

    def cover(self) -> None:
        p = self.page
        p.rect(0, 0, PAGE_W, PAGE_H, WHITE)
        p.rect(0, PAGE_H - 225, PAGE_W, 225, NAVY)
        p.rect(0, PAGE_H - 225, PAGE_W, 18, SAND)
        p.rect(54, PAGE_H - 165, 92, 5, SAND)
        p.text(54, PAGE_H - 112, "BLUEWATER ESCAPES", 11, "F2", PALE_TEAL)
        p.text(54, PAGE_H - 151, self.title, 31, "F2", WHITE)
        p.text(54, PAGE_H - 187, self.subtitle, 18, "F1", WHITE)
        p.text(54, PAGE_H - 284, "For Regular Users", 18, "F2", NAVY)
        p.text(54, PAGE_H - 312, "Create an account, request reservations, book events, and manage your profile.", 12, "F1", MUTED)
        p.text(54, PAGE_H - 336, "Web address: https://bluewater-scheduler.onrender.com/account", 10.5, "F2", TEAL)
        p.rect(54, PAGE_H - 410, PAGE_W - 108, 84, PALE_TEAL)
        p.stroke_rect(54, PAGE_H - 410, PAGE_W - 108, 84, LINE)
        p.text(76, PAGE_H - 360, f"{self.version}", 12, "F2", NAVY)
        p.text(76, PAGE_H - 386, f"Prepared {self.date}", 11, "F1", MUTED)
        cover_image = "docs/screenshots/home.jpg"
        if os.path.exists(cover_image):
            self._draw_screenshot_panel(p, "Home schedule", cover_image, 54, 112, PAGE_W - 108, 300)
        p.text(54, 96, "Customer workflow guide", 11, "F2", TEAL)
        self.add_page()

    def table_of_contents(self, sections: list[str]) -> None:
        self.page.rect(0, PAGE_H - 96, PAGE_W, 96, PALE_TEAL)
        self.y = PAGE_H - 62
        self.page.text(MARGIN_X, self.y, "Table of Contents", 24, "F2", NAVY)
        self.y -= 42
        for idx, title in enumerate(sections, start=1):
            self.ensure(24)
            self.page.text(MARGIN_X, self.y, f"{idx}.", 11, "F2", TEAL)
            self.page.text(MARGIN_X + 28, self.y, title, 11, "F1", INK)
            self.y -= 22
        toc_image = "docs/screenshots/events.jpg"
        if os.path.exists(toc_image):
            self._draw_screenshot_panel(
                self.page,
                "Experiences",
                toc_image,
                MARGIN_X,
                58,
                PAGE_W - (MARGIN_X * 2),
                210,
            )
        self.add_page()
        self.screenshot_headers = True
        self._screenshot_header()

    def heading(self, text: str, level: int) -> None:
        if level == 2:
            self.ensure(72)
            if self.y < PAGE_H - MARGIN_TOP - 6:
                self.y -= 10
            self.section_toc.append((text, len(self.pages) + 1))
            self.page.rect(MARGIN_X, self.y - 11, 42, 4, SAND)
            self.y -= 34
            self.page.text(MARGIN_X, self.y, text, 19, "F2", NAVY)
            self.y -= 22
            self.page.line(MARGIN_X, self.y + 9, PAGE_W - MARGIN_X, self.y + 9, LINE)
        else:
            self.ensure(42)
            self.y -= 8
            self.page.text(MARGIN_X, self.y, text, 13, "F2", TEAL)
            self.y -= 17

    def paragraph(self, text: str) -> None:
        lines = wrap_text(text, PAGE_W - (MARGIN_X * 2), 10.4)
        self.ensure(len(lines) * 15 + 8)
        for line in lines:
            self.page.text(MARGIN_X, self.y, line, 10.4, "F1", INK)
            self.y -= 15
        self.y -= 5

    def bullet(self, text: str, ordered: str | None = None) -> None:
        indent = 18
        marker = ordered if ordered else "-"
        lines = wrap_text(text, PAGE_W - (MARGIN_X * 2) - 28, 10.2)
        self.ensure(len(lines) * 15 + 4)
        self.page.text(MARGIN_X, self.y, marker, 10.2, "F2", TEAL)
        self.page.text(MARGIN_X + indent, self.y, lines[0], 10.2, "F1", INK)
        self.y -= 15
        for line in lines[1:]:
            self.page.text(MARGIN_X + indent, self.y, line, 10.2, "F1", INK)
            self.y -= 15
        self.y -= 2

    def callout(self, title: str, body: str) -> None:
        lines = wrap_text(body, PAGE_W - (MARGIN_X * 2) - 34, 10.2)
        height = 30 + len(lines) * 15
        self.ensure(height + 8)
        y0 = self.y - height + 14
        self.page.rect(MARGIN_X, y0, PAGE_W - (MARGIN_X * 2), height, PALE_TEAL)
        self.page.stroke_rect(MARGIN_X, y0, PAGE_W - (MARGIN_X * 2), height, LINE)
        self.page.text(MARGIN_X + 16, self.y - 7, title, 10.5, "F2", NAVY)
        yy = self.y - 25
        for line in lines:
            self.page.text(MARGIN_X + 16, yy, line, 10.2, "F1", INK)
            yy -= 15
        self.y = y0 - 12

    def finish(self) -> bytes:
        self.add_page()
        return build_pdf(self.pages)


def parse_markdown(path: str) -> tuple[str, str, str, str, list[tuple[str, str]]]:
    with open(path, "r", encoding="utf-8") as f:
        lines = [line.rstrip() for line in f]

    title = lines[0].lstrip("# ").strip()
    subtitle = lines[2].strip()
    version = lines[4].strip()
    date = lines[6].strip()
    body_lines = lines[8:]

    blocks: list[tuple[str, str]] = []
    paragraph_lines: list[str] = []

    def flush() -> None:
        if paragraph_lines:
            blocks.append(("p", " ".join(paragraph_lines).strip()))
            paragraph_lines.clear()

    for raw in body_lines:
        line = raw.rstrip()
        if not line:
            flush()
            continue
        if line.startswith("## "):
            flush()
            blocks.append(("h2", line[3:].strip()))
        elif line.startswith("### "):
            flush()
            blocks.append(("h3", line[4:].strip()))
        elif line.startswith("- "):
            flush()
            blocks.append(("li", line[2:].strip()))
        elif re.match(r"^\d+\. ", line):
            flush()
            number, text = line.split(" ", 1)
            blocks.append(("ol", f"{number}|{text.strip()}"))
        elif line.startswith("NOTE: "):
            flush()
            blocks.append(("note", line[6:].strip()))
        else:
            paragraph_lines.append(line.strip())
    flush()
    return title, subtitle, version, date, blocks


def build_manual(md_path: str) -> bytes:
    title, subtitle, version, date, blocks = parse_markdown(md_path)
    sections = [text for kind, text in blocks if kind == "h2"]
    pdf = ManualPdf(title, subtitle, version, date)
    pdf.cover()
    pdf.table_of_contents(sections)

    for kind, text in blocks:
        if kind == "h2":
            pdf.heading(text, 2)
        elif kind == "h3":
            pdf.heading(text, 3)
        elif kind == "p":
            pdf.paragraph(text)
        elif kind == "li":
            pdf.bullet(text)
        elif kind == "ol":
            number, body = text.split("|", 1)
            pdf.bullet(body, number)
        elif kind == "note":
            pdf.callout("Note", text)

    return pdf.finish()


def pdf_obj(data: bytes | str) -> bytes:
    if isinstance(data, str):
        data = data.encode("latin-1", "replace")
    return data


def jpeg_dimensions(path: str) -> tuple[int, int]:
    with open(path, "rb") as f:
        data = f.read()
    if not data.startswith(b"\xff\xd8"):
        raise ValueError(f"Not a JPEG file: {path}")
    i = 2
    while i < len(data):
        while i < len(data) and data[i] == 0xFF:
            i += 1
        marker = data[i]
        i += 1
        if marker in (0xD8, 0xD9):
            continue
        length = struct.unpack(">H", data[i : i + 2])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            height = struct.unpack(">H", data[i + 3 : i + 5])[0]
            width = struct.unpack(">H", data[i + 5 : i + 7])[0]
            return width, height
        i += length
    raise ValueError(f"Could not read JPEG dimensions: {path}")


def build_pdf(pages: Iterable[Page]) -> bytes:
    pages = list(pages)
    objects: list[bytes] = []

    def add(data: bytes | str) -> int:
        objects.append(pdf_obj(data))
        return len(objects)

    catalog_id = add("PLACEHOLDER")
    pages_id = add("PLACEHOLDER")
    font_regular_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids: list[int] = []
    for page in pages:
        image_resource_parts: list[str] = []
        for image_name, image_path in page.images:
            with open(image_path, "rb") as f:
                image_data = f.read()
            width, height = jpeg_dimensions(image_path)
            image_id = add(
                (
                    f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
                    f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode "
                    f"/Length {len(image_data)} >>\nstream\n"
                ).encode("latin-1")
                + image_data
                + b"\nendstream"
            )
            image_resource_parts.append(f"/{image_name} {image_id} 0 R")

        stream = page.stream()
        content_id = add(f"<< /Length {len(stream)} >>\nstream\n".encode("latin-1") + stream + b"endstream")
        xobjects = ""
        if image_resource_parts:
            xobjects = f"/XObject << {' '.join(image_resource_parts)} >>"
        page_id = add(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> {xobjects} >> "
            f"/Contents {content_id} 0 R >>"
        )
        page_ids.append(page_id)

    objects[catalog_id - 1] = pdf_obj(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_id - 1] = pdf_obj(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{idx} 0 obj\n".encode("latin-1"))
        out.extend(obj)
        out.extend(b"\nendobj\n")

    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    out.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode(
            "latin-1"
        )
    )
    return bytes(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="docs/regular-user-manual.md")
    parser.add_argument("--output", default="docs/regular-user-manual.pdf")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    pdf = build_manual(args.input)
    with open(args.output, "wb") as f:
        f.write(pdf)


if __name__ == "__main__":
    main()
