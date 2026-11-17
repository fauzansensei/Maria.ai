// Pure Canvas2D Computed-Style DOM Viewport Capture
// Renders styled UI layout, cards, gradients, buttons, SVG icons, inputs, and text nodes
// without SVG <foreignObject> CORS/stylesheet/oklch failures or tainted canvas errors.

let reusableCanvas: HTMLCanvasElement | null = null;
let colorProbeCtx: CanvasRenderingContext2D | null = null;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}

function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function oklchToRgba(input: string): string | null {
  const m = input.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/i
  );
  if (!m) return null;
  let L = parseFloat(m[1]);
  if (m[2] === '%') L /= 100;
  const C = parseFloat(m[3]);
  const Hdeg = parseFloat(m[4]);
  let alpha = 1;
  if (m[5]) {
    alpha = m[5].endsWith('%') ? parseFloat(m[5]) / 100 : parseFloat(m[5]);
  }
  const hRad = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const mVal = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * mVal + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * mVal - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * mVal + 1.707614701 * s;

  const r = clampByte(linearToSrgb(rLin));
  const g = clampByte(linearToSrgb(gLin));
  const bl = clampByte(linearToSrgb(bLin));
  return `rgba(${r}, ${g}, ${bl}, ${Math.max(0, Math.min(1, alpha))})`;
}

function normalizeCanvasColor(color: string | null | undefined, fallback = '#0f172a'): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (!trimmed || trimmed === 'none') return fallback;

  if (/^oklch\(/i.test(trimmed)) {
    const converted = oklchToRgba(trimmed);
    if (converted) return converted;
  }

  if (!colorProbeCtx && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    colorProbeCtx = c.getContext('2d');
  }

  if (colorProbeCtx) {
    colorProbeCtx.fillStyle = '#010203';
    colorProbeCtx.fillStyle = trimmed;
    if (colorProbeCtx.fillStyle !== '#010203') {
      return trimmed;
    }
  }

  return fallback;
}

function isTransparentColor(color: string | null | undefined): boolean {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  if (c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'rgba(0,0,0,0)') return true;
  const norm = normalizeCanvasColor(c, 'rgba(0,0,0,0)').toLowerCase();
  return norm === 'rgba(0, 0, 0, 0)' || norm.endsWith(', 0)') || norm.endsWith(',0)');
}

function buildRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTL: number,
  rTR: number,
  rBR: number,
  rBL: number
) {
  const maxR = Math.min(w, h) / 2;
  const tl = Math.min(maxR, Math.max(0, rTL));
  const tr = Math.min(maxR, Math.max(0, rTR));
  const br = Math.min(maxR, Math.max(0, rBR));
  const bl = Math.min(maxR, Math.max(0, rBL));

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  if (tr > 0) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  else ctx.lineTo(x + w, y);

  ctx.lineTo(x + w, y + h - br);
  if (br > 0) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  else ctx.lineTo(x + w, y + h);

  ctx.lineTo(x + bl, y + h);
  if (bl > 0) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  else ctx.lineTo(x, y + h);

  ctx.lineTo(x, y + tl);
  if (tl > 0) ctx.quadraticCurveTo(x, y, x + tl, y);
  else ctx.lineTo(x, y);
  ctx.closePath();
}

function paintGradientBackground(
  ctx: CanvasRenderingContext2D,
  bgImage: string,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (!bgImage || bgImage === 'none') return false;

  const colorMatches = bgImage.match(
    /(rgba?\([^)]+\)|oklch\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/g
  );
  if (!colorMatches || colorMatches.length < 2) return false;

  if (bgImage.includes('radial-gradient')) {
    const grad = ctx.createRadialGradient(
      x + w * 0.5,
      y + h * 0.8,
      2,
      x + w * 0.5,
      y + h * 0.5,
      Math.max(w, h) * 0.75
    );
    colorMatches.forEach((col, idx) => {
      grad.addColorStop(
        idx / Math.max(1, colorMatches.length - 1),
        normalizeCanvasColor(col, '#2563eb')
      );
    });
    ctx.fillStyle = grad;
    ctx.fill();
    return true;
  }

  if (bgImage.includes('linear-gradient')) {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    colorMatches.forEach((col, idx) => {
      grad.addColorStop(
        idx / Math.max(1, colorMatches.length - 1),
        normalizeCanvasColor(col, '#2563eb')
      );
    });
    ctx.fillStyle = grad;
    ctx.fill();
    return true;
  }

  return false;
}

function drawSvgElement(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  rect: DOMRect,
  cs: CSSStyleDeclaration
) {
  const vbAttr = svg.getAttribute('viewBox');
  let vbX = 0;
  let vbY = 0;
  let vbW = parseFloat(svg.getAttribute('width') || '') || rect.width || 24;
  let vbH = parseFloat(svg.getAttribute('height') || '') || rect.height || 24;
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      [vbX, vbY, vbW, vbH] = parts;
    }
  }
  if (!vbW || !vbH) return;

  const defaultColor = cs.color || '#0f172a';
  const defaultStrokeWidth = parseFloat(svg.getAttribute('stroke-width') || '2') || 2;
  const rootFill = svg.getAttribute('fill') || 'none';
  const rootStroke = svg.getAttribute('stroke') || 'none';

  ctx.save();
  ctx.translate(rect.left, rect.top);
  ctx.scale(rect.width / vbW, rect.height / vbH);
  ctx.translate(-vbX, -vbY);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const shapes = svg.querySelectorAll('path, circle, rect, line, polyline, polygon');
  shapes.forEach((shape) => {
    const shapeStyle = window.getComputedStyle(shape);
    const attrFill = shape.getAttribute('fill');
    const attrStroke = shape.getAttribute('stroke');

    let fillVal = attrFill ?? rootFill;
    if (fillVal === 'currentColor') fillVal = shapeStyle.color || defaultColor;
    if (fillVal === 'none' && !isTransparentColor(shapeStyle.fill) && attrFill === null) {
      fillVal = shapeStyle.fill;
    }

    let strokeVal = attrStroke ?? rootStroke;
    if (strokeVal === 'currentColor') strokeVal = shapeStyle.color || defaultColor;
    if (strokeVal === 'none' && !isTransparentColor(shapeStyle.stroke) && attrStroke === null) {
      strokeVal = shapeStyle.stroke;
    }

    const sw =
      parseFloat(shape.getAttribute('stroke-width') || '') ||
      parseFloat(shapeStyle.strokeWidth || '') ||
      defaultStrokeWidth;

    const tag = shape.tagName.toLowerCase();
    let path: Path2D | null = null;

    if (tag === 'path') {
      const d = shape.getAttribute('d');
      if (d) {
        try {
          path = new Path2D(d);
        } catch {}
      }
    } else if (tag === 'circle') {
      const cx = parseFloat(shape.getAttribute('cx') || '0');
      const cy = parseFloat(shape.getAttribute('cy') || '0');
      const r = parseFloat(shape.getAttribute('r') || '0');
      if (r > 0) {
        path = new Path2D();
        path.arc(cx, cy, r, 0, Math.PI * 2);
      }
    } else if (tag === 'rect') {
      const rx = parseFloat(shape.getAttribute('x') || '0');
      const ry = parseFloat(shape.getAttribute('y') || '0');
      const rw = parseFloat(shape.getAttribute('width') || '0');
      const rh = parseFloat(shape.getAttribute('height') || '0');
      const cr = parseFloat(shape.getAttribute('rx') || '0');
      if (rw > 0 && rh > 0) {
        path = new Path2D();
        if (cr > 0 && typeof (path as any).roundRect === 'function') {
          (path as any).roundRect(rx, ry, rw, rh, cr);
        } else {
          path.rect(rx, ry, rw, rh);
        }
      }
    } else if (tag === 'line') {
      const x1 = parseFloat(shape.getAttribute('x1') || '0');
      const y1 = parseFloat(shape.getAttribute('y1') || '0');
      const x2 = parseFloat(shape.getAttribute('x2') || '0');
      const y2 = parseFloat(shape.getAttribute('y2') || '0');
      path = new Path2D();
      path.moveTo(x1, y1);
      path.lineTo(x2, y2);
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pts = (shape.getAttribute('points') || '')
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter((n) => Number.isFinite(n));
      if (pts.length >= 4) {
        path = new Path2D();
        path.moveTo(pts[0], pts[1]);
        for (let i = 2; i + 1 < pts.length; i += 2) {
          path.lineTo(pts[i], pts[i + 1]);
        }
        if (tag === 'polygon') path.closePath();
      }
    }

    if (!path) return;

    if (fillVal && fillVal !== 'none' && !isTransparentColor(fillVal)) {
      ctx.fillStyle = normalizeCanvasColor(fillVal, defaultColor);
      ctx.fill(path);
    }
    if (strokeVal && strokeVal !== 'none' && !isTransparentColor(strokeVal)) {
      ctx.strokeStyle = normalizeCanvasColor(strokeVal, defaultColor);
      ctx.lineWidth = sw;
      ctx.stroke(path);
    }
  });

  ctx.restore();
}

function drawTextNode(
  ctx: CanvasRenderingContext2D,
  textNode: Text,
  parentCs: CSSStyleDeclaration,
  range: Range,
  vw: number,
  vh: number
) {
  const raw = textNode.textContent || '';
  if (!raw.trim()) return;

  try {
    range.selectNodeContents(textNode);
  } catch {
    return;
  }

  const clientRects = range.getClientRects();
  if (!clientRects || clientRects.length === 0) return;

  const fontSize = Math.max(9, parseFloat(parentCs.fontSize) || 14);
  const fontWeight = parentCs.fontWeight || '400';
  const fontStyle = parentCs.fontStyle === 'italic' ? 'italic ' : '';
  const fontFamily = parentCs.fontFamily || 'system-ui, sans-serif';
  ctx.font = `${fontStyle}${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = normalizeCanvasColor(parentCs.color, '#0f172a');
  ctx.textBaseline = 'alphabetic';

  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return;

  if (clientRects.length === 1) {
    const r = clientRects[0];
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || r.width < 0.5) return;
    const baselineY = r.top + (r.height > 0 ? r.height * 0.78 : fontSize * 0.85);
    ctx.fillText(normalized, r.left, baselineY);
    return;
  }

  // Multi-line wrapped text: map exact substrings to each rendered visual line rect
  const len = raw.length;
  const lines: Array<{ text: string; left: number; top: number; height: number }> = [];
  let tokenStart = 0;

  while (tokenStart < len) {
    while (tokenStart < len && /\s/.test(raw[tokenStart])) tokenStart++;
    if (tokenStart >= len) break;
    let tokenEnd = tokenStart;
    while (tokenEnd < len && !/\s/.test(raw[tokenEnd])) tokenEnd++;

    const word = raw.slice(tokenStart, tokenEnd);
    try {
      range.setStart(textNode, tokenStart);
      range.setEnd(textNode, tokenEnd);
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom >= 0 && r.top <= vh) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(r.top - last.top) <= fontSize * 0.5) {
          last.text += ' ' + word;
        } else {
          lines.push({ text: word, left: r.left, top: r.top, height: r.height });
        }
      }
    } catch {}
    tokenStart = tokenEnd + 1;
  }

  for (const line of lines) {
    const baselineY = line.top + (line.height > 0 ? line.height * 0.78 : fontSize * 0.85);
    ctx.fillText(line.text, line.left, baselineY);
  }
}

export function captureAppViewportToDataUrl(options?: {
  excludeSelector?: string;
  includeMariaLiveDock?: boolean;
}): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const rootEl = document.getElementById('root') || document.body;
    if (!rootEl) return null;

    const vw = Math.max(320, window.innerWidth || 390);
    const vh = Math.max(480, window.innerHeight || 844);
    const maxEdge = 1080;
    const scale = Math.min(2, maxEdge / Math.max(vw, vh));
    const cw = Math.max(1, Math.round(vw * scale));
    const ch = Math.max(1, Math.round(vh * scale));

    if (!reusableCanvas) {
      reusableCanvas = document.createElement('canvas');
    }
    const canvas = reusableCanvas;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const isDark = document.documentElement.classList.contains('dark');
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    ctx.fillStyle = !isTransparentColor(bodyBg)
      ? normalizeCanvasColor(bodyBg, isDark ? '#0e0f12' : '#ffffff')
      : isDark
      ? '#0e0f12'
      : '#ffffff';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.scale(scale, scale);

    const sharedRange = document.createRange();

    const paintNode = (el: Element) => {
      if (!(el instanceof HTMLElement || el instanceof SVGSVGElement)) return;
      if (el.getAttribute('data-maria-screen-modal') === 'true') return;
      if (options?.excludeSelector && el.matches?.(options.excludeSelector)) return;
      if (
        options?.includeMariaLiveDock === false &&
        el.getAttribute('data-maria-live-dock') === 'true'
      ) {
        return;
      }

      const cs = window.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const opacity = parseFloat(cs.opacity || '1');
      if (!Number.isFinite(opacity) || opacity <= 0.01) return;

      const rect = el.getBoundingClientRect();
      const hasOverflowClip =
        cs.overflowX !== 'visible' || cs.overflowY !== 'visible';

      if (
        hasOverflowClip &&
        (rect.width <= 0 ||
          rect.height <= 0 ||
          rect.bottom < -4 ||
          rect.top > vh + 4 ||
          rect.right < -4 ||
          rect.left > vw + 4)
      ) {
        return;
      }

      const rTL = parseFloat(cs.borderTopLeftRadius) || 0;
      const rTR = parseFloat(cs.borderTopRightRadius) || 0;
      const rBR = parseFloat(cs.borderBottomRightRadius) || 0;
      const rBL = parseFloat(cs.borderBottomLeftRadius) || 0;

      ctx.save();
      if (opacity < 0.99) {
        ctx.globalAlpha *= opacity;
      }

      const isVisibleRect =
        rect.width > 0.5 &&
        rect.height > 0.5 &&
        rect.bottom >= 0 &&
        rect.top <= vh &&
        rect.right >= 0 &&
        rect.left <= vw;

      if (isVisibleRect) {
        // 1. Background fill / gradient
        const hasBgColor = !isTransparentColor(cs.backgroundColor);
        const hasBgGrad = cs.backgroundImage && cs.backgroundImage !== 'none' && cs.backgroundImage.includes('gradient');
        if (hasBgColor || hasBgGrad) {
          buildRoundedRectPath(ctx, rect.left, rect.top, rect.width, rect.height, rTL, rTR, rBR, rBL);
          if (hasBgColor) {
            ctx.fillStyle = normalizeCanvasColor(cs.backgroundColor, 'transparent');
            ctx.fill();
          }
          if (hasBgGrad) {
            paintGradientBackground(ctx, cs.backgroundImage, rect.left, rect.top, rect.width, rect.height);
          }
        }

        // 2. Border stroke
        const bw =
          parseFloat(cs.borderTopWidth) ||
          parseFloat(cs.borderBottomWidth) ||
          parseFloat(cs.borderLeftWidth) ||
          parseFloat(cs.borderRightWidth) ||
          0;
        const bc =
          parseFloat(cs.borderTopWidth) > 0
            ? cs.borderTopColor
            : parseFloat(cs.borderBottomWidth) > 0
            ? cs.borderBottomColor
            : parseFloat(cs.borderLeftWidth) > 0
            ? cs.borderLeftColor
            : cs.borderRightColor;

        if (bw > 0 && !isTransparentColor(bc)) {
          // Handle single-side borders cleanly (like border-b or border-t)
          const bt = parseFloat(cs.borderTopWidth) || 0;
          const bb = parseFloat(cs.borderBottomWidth) || 0;
          const bl = parseFloat(cs.borderLeftWidth) || 0;
          const br = parseFloat(cs.borderRightWidth) || 0;
          if (bt === bb && bt === bl && bt === br) {
            buildRoundedRectPath(ctx, rect.left, rect.top, rect.width, rect.height, rTL, rTR, rBR, rBL);
            ctx.strokeStyle = normalizeCanvasColor(bc, '#e2e8f0');
            ctx.lineWidth = bt;
            ctx.stroke();
          } else {
            if (bt > 0 && !isTransparentColor(cs.borderTopColor)) {
              ctx.strokeStyle = normalizeCanvasColor(cs.borderTopColor, '#e2e8f0');
              ctx.lineWidth = bt;
              ctx.beginPath();
              ctx.moveTo(rect.left, rect.top);
              ctx.lineTo(rect.right, rect.top);
              ctx.stroke();
            }
            if (bb > 0 && !isTransparentColor(cs.borderBottomColor)) {
              ctx.strokeStyle = normalizeCanvasColor(cs.borderBottomColor, '#e2e8f0');
              ctx.lineWidth = bb;
              ctx.beginPath();
              ctx.moveTo(rect.left, rect.bottom);
              ctx.lineTo(rect.right, rect.bottom);
              ctx.stroke();
            }
            if (bl > 0 && !isTransparentColor(cs.borderLeftColor)) {
              ctx.strokeStyle = normalizeCanvasColor(cs.borderLeftColor, '#e2e8f0');
              ctx.lineWidth = bl;
              ctx.beginPath();
              ctx.moveTo(rect.left, rect.top);
              ctx.lineTo(rect.left, rect.bottom);
              ctx.stroke();
            }
            if (br > 0 && !isTransparentColor(cs.borderRightColor)) {
              ctx.strokeStyle = normalizeCanvasColor(cs.borderRightColor, '#e2e8f0');
              ctx.lineWidth = br;
              ctx.beginPath();
              ctx.moveTo(rect.right, rect.top);
              ctx.lineTo(rect.right, rect.bottom);
              ctx.stroke();
            }
          }
        }
      }

      // Apply overflow clip for child elements
      if (hasOverflowClip && rect.width > 0 && rect.height > 0) {
        buildRoundedRectPath(ctx, rect.left, rect.top, rect.width, rect.height, rTL, rTR, rBR, rBL);
        ctx.clip();
      }

      // Skip recursing inside the miniature screen-share preview card itself to avoid visual recursion
      if (el.getAttribute('data-maria-live-preview-thumb') === 'true') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // 3. Special visual elements: SVG, IMG, CANVAS, INPUT, TEXTAREA
      if (el instanceof SVGSVGElement) {
        if (isVisibleRect) {
          drawSvgElement(ctx, el, rect, cs);
        }
        ctx.restore();
        return;
      }

      if (el instanceof HTMLImageElement) {
        if (isVisibleRect && el.complete && el.naturalWidth > 0) {
          const src = el.currentSrc || el.src || '';
          const isSafeSameOrigin =
            src.startsWith('data:') ||
            src.startsWith('blob:') ||
            src.startsWith('/') ||
            src.startsWith(window.location.origin);

          ctx.save();
          buildRoundedRectPath(ctx, rect.left, rect.top, rect.width, rect.height, rTL, rTR, rBR, rBL);
          ctx.clip();
          if (isSafeSameOrigin) {
            try {
              ctx.drawImage(el, rect.left, rect.top, rect.width, rect.height);
            } catch {}
          } else {
            // Safe placeholder badge for cross-origin avatars (prevents Canvas tainting)
            ctx.fillStyle = isDark ? '#1e3a8a' : '#dbeafe';
            ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
            const initial = (el.alt || 'U').trim().charAt(0).toUpperCase() || 'U';
            ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8';
            ctx.font = `600 ${Math.max(10, Math.round(rect.height * 0.45))}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initial, rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
          ctx.restore();
        }
        ctx.restore();
        return;
      }

      if (el instanceof HTMLCanvasElement && el !== canvas) {
        if (isVisibleRect) {
          try {
            ctx.drawImage(el, rect.left, rect.top, rect.width, rect.height);
          } catch {}
        }
        ctx.restore();
        return;
      }

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (isVisibleRect) {
          const val = el.value || '';
          const display = val || el.placeholder || '';
          if (display) {
            const padL = parseFloat(cs.paddingLeft) || 8;
            const padT = parseFloat(cs.paddingTop) || 6;
            const fontSize = Math.max(10, parseFloat(cs.fontSize) || 14);
            ctx.font = `${cs.fontWeight || '400'} ${fontSize}px ${cs.fontFamily || 'sans-serif'}`;
            ctx.fillStyle = val ? cs.color || '#0f172a' : isDark ? '#64748b' : '#94a3b8';
            ctx.textBaseline = 'alphabetic';
            const y =
              el instanceof HTMLInputElement
                ? rect.top + rect.height * 0.5 + fontSize * 0.35
                : rect.top + padT + fontSize * 0.85;
            ctx.fillText(display.slice(0, 140), rect.left + padL, y, Math.max(20, rect.width - padL * 2));
          }
        }
        ctx.restore();
        return;
      }

      // 4. Child nodes ordered so positioned/z-indexed layers render after normal flow
      const childElements: Array<{ el: Element; z: number; order: number }> = [];
      let orderIdx = 0;

      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          drawTextNode(ctx, child as Text, cs, sharedRange, vw, vh);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const cEl = child as Element;
          const cStyle = window.getComputedStyle(cEl);
          const rawZ = parseInt(cStyle.zIndex, 10);
          const z =
            cStyle.position !== 'static' && Number.isFinite(rawZ)
              ? rawZ
              : cStyle.position === 'fixed'
              ? 100
              : 0;
          childElements.push({ el: cEl, z, order: orderIdx++ });
        }
      }

      if (childElements.length > 1) {
        childElements.sort((a, b) => (a.z !== b.z ? a.z - b.z : a.order - b.order));
      }

      for (const item of childElements) {
        paintNode(item.el);
      }

      ctx.restore();
    };

    paintNode(rootEl);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return null;
  }
}
