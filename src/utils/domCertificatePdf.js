const assetCache = new Map();
const fontBinaryCache = new Map();
const preparedDocuments = new WeakSet();

const FONT_BASE = '/certificate-templates/fonts';
const FONT_FILES = [
  ['Roboto-Regular.ttf', 'RobotoRegular'],
  ['Roboto-Medium.ttf', 'RobotoMedium'],
  ['Roboto-Bold.ttf', 'RobotoBold'],
  ['Roboto-Black.ttf', 'RobotoBlack'],
  ['Lato-Regular.ttf', 'LatoRegular'],
  ['Lato-Bold.ttf', 'LatoBold'],
  ['Lato-Black.ttf', 'LatoBlack'],
  ['Montserrat-ExtraBold.ttf', 'MontserratExtraBold']
];

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

async function fetchFontBase64(fileName) {
  if (!fontBinaryCache.has(fileName)) {
    fontBinaryCache.set(fileName, (async () => {
      const response = await fetch(`${FONT_BASE}/${fileName}`, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Fonte ${fileName} não encontrada.`);
      return arrayBufferToBase64(await response.arrayBuffer());
    })());
  }

  return fontBinaryCache.get(fileName);
}

export async function prepareCertificatePdfFonts(pdf) {
  if (preparedDocuments.has(pdf)) return;

  const fonts = await Promise.all(FONT_FILES.map(async ([fileName, family]) => ({
    fileName,
    family,
    base64: await fetchFontBase64(fileName)
  })));

  fonts.forEach(({ fileName, family, base64 }) => {
    pdf.addFileToVFS(fileName, base64);
    pdf.addFont(fileName, family, 'normal');
  });

  preparedDocuments.add(pdf);
}

function resolveAssetUrl(source) {
  if (!source || source.startsWith('data:')) return source;
  return new URL(source, window.location.href).href;
}

function imageFormatFromMime(mime = '', source = '') {
  if (/jpe?g/i.test(mime) || /\.jpe?g(?:$|\?)/i.test(source)) return 'JPEG';
  if (/webp/i.test(mime) || /\.webp(?:$|\?)/i.test(source)) return 'WEBP';
  return 'PNG';
}

function losslessImageCompression(format) {
  return format === 'PNG' ? 'SLOW' : 'NONE';
}

async function loadImageAsset(source) {
  const resolvedSource = resolveAssetUrl(source);
  if (!resolvedSource) throw new Error('Imagem sem origem para exportação.');

  if (resolvedSource.startsWith('data:')) {
    return {
      data: resolvedSource,
      format: imageFormatFromMime(resolvedSource.slice(5, resolvedSource.indexOf(';')), resolvedSource)
    };
  }

  if (!assetCache.has(resolvedSource)) {
    assetCache.set(resolvedSource, (async () => {
      const response = await fetch(resolvedSource, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Imagem não encontrada: ${resolvedSource}`);
      return {
        data: new Uint8Array(await response.arrayBuffer()),
        format: imageFormatFromMime(response.headers.get('content-type') || '', resolvedSource)
      };
    })());
  }

  return assetCache.get(resolvedSource);
}

function getBackgroundUrl(element) {
  const backgroundImage = window.getComputedStyle(element).backgroundImage;
  const match = backgroundImage?.match(/^url\(["']?(.*?)["']?\)$/);
  return match?.[1] || '';
}

function hashSource(source = '') {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseCssColor(value, fallback = [0, 0, 0]) {
  if (!value || value === 'transparent') return fallback;

  const rgba = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (rgba) {
    const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
    return [1, 2, 3].map(index => Math.round((Number(rgba[index]) * alpha) + (255 * (1 - alpha))));
  }

  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex) {
    const normalized = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
    return [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16));
  }

  return fallback;
}

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && Number(style.opacity || 1) > 0
    && !element.closest('[aria-hidden="true"]');
}

function selectPdfFont(style) {
  const family = (style.fontFamily || '').toLowerCase();
  const parsedWeight = Number.parseInt(style.fontWeight, 10);
  const weight = Number.isFinite(parsedWeight)
    ? parsedWeight
    : (/bold/i.test(style.fontWeight) ? 700 : 400);
  const italic = style.fontStyle === 'italic' || style.fontStyle === 'oblique';

  if (family.includes('times')) {
    return {
      family: 'times',
      style: weight >= 600 ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal')
    };
  }

  if (family.includes('montserrat')) return { family: 'MontserratExtraBold', style: 'normal' };

  if (family.includes('roboto')) {
    if (weight >= 850) return { family: 'RobotoBlack', style: 'normal' };
    if (weight >= 650) return { family: 'RobotoBold', style: 'normal' };
    if (weight >= 500) return { family: 'RobotoMedium', style: 'normal' };
    return { family: 'RobotoRegular', style: 'normal' };
  }

  if (weight >= 850) return { family: 'LatoBlack', style: 'normal' };
  if (weight >= 650) return { family: 'LatoBold', style: 'normal' };
  return { family: 'LatoRegular', style: 'normal' };
}

function drawElementBorders(pdf, root, rootRect, scaleX, scaleY) {
  const elements = root.querySelectorAll('*');

  elements.forEach(element => {
    if (!isElementVisible(element)) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const style = window.getComputedStyle(element);
    const x1 = (rect.left - rootRect.left) * scaleX;
    const x2 = (rect.right - rootRect.left) * scaleX;
    const y1 = (rect.top - rootRect.top) * scaleY;
    const y2 = (rect.bottom - rootRect.top) * scaleY;

    const borders = [
      ['Top', x1, y1, x2, y1],
      ['Right', x2, y1, x2, y2],
      ['Bottom', x1, y2, x2, y2],
      ['Left', x1, y1, x1, y2]
    ];

    borders.forEach(([side, startX, startY, endX, endY]) => {
      const width = Number.parseFloat(style[`border${side}Width`]);
      const borderStyle = style[`border${side}Style`];
      if (!Number.isFinite(width) || width <= 0 || borderStyle === 'none') return;
      const [red, green, blue] = parseCssColor(style[`border${side}Color`], [0, 0, 0]);
      pdf.setDrawColor(red, green, blue);
      pdf.setLineWidth(Math.max(0.08, width * (side === 'Top' || side === 'Bottom' ? scaleY : scaleX)));
      pdf.line(startX, startY, endX, endY);
    });
  });
}

async function drawInlineImages(pdf, root, rootRect, scaleX, scaleY) {
  const images = [...root.querySelectorAll('img')];

  for (const image of images) {
    if (!isElementVisible(image)) continue;
    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const source = image.currentSrc || image.src;
    if (!source) continue;

    try {
      const asset = await loadImageAsset(source);
      const x = (rect.left - rootRect.left) * scaleX;
      const y = (rect.top - rootRect.top) * scaleY;
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;
      pdf.addImage(
        asset.data,
        asset.format,
        x,
        y,
        width,
        height,
        `img-${hashSource(source)}`,
        losslessImageCompression(asset.format)
      );
    } catch (error) {
      console.warn('Não foi possível incorporar uma imagem do certificado no PDF.', error);
    }
  }
}

function drawTextRun(pdf, text, rect, style, rootRect, scaleX, scaleY) {
  if (!text || rect.width <= 0 || rect.height <= 0) return;

  const fontSizePx = Number.parseFloat(style.fontSize) || 12;
  const fontSizePt = fontSizePx * scaleY * (72 / 25.4);
  const x = (rect.left - rootRect.left) * scaleX;
  const baselinePx = rect.bottom - Math.max(0.8, fontSizePx * 0.16);
  const y = (baselinePx - rootRect.top) * scaleY;
  const [red, green, blue] = parseCssColor(style.color, [0, 0, 0]);
  const font = selectPdfFont(style);
  const letterSpacingPx = Number.parseFloat(style.letterSpacing);

  pdf.setFont(font.family, font.style);
  pdf.setFontSize(Math.max(1, fontSizePt));
  pdf.setTextColor(red, green, blue);
  pdf.setCharSpace(Number.isFinite(letterSpacingPx) ? letterSpacingPx * scaleX : 0);
  pdf.text(text, x, y, { baseline: 'alphabetic' });
}

function drawTextNode(pdf, textNode, rootRect, scaleX, scaleY) {
  const parent = textNode.parentElement;
  if (!parent || !isElementVisible(parent)) return;
  const content = textNode.nodeValue || '';
  if (!content.trim()) return;

  const style = window.getComputedStyle(parent);
  const range = document.createRange();
  const tokenMatcher = /\S+/gu;
  let match;

  while ((match = tokenMatcher.exec(content))) {
    range.setStart(textNode, match.index);
    range.setEnd(textNode, match.index + match[0].length);
    const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);

    if (rects.length === 1) {
      drawTextRun(pdf, match[0], rects[0], style, rootRect, scaleX, scaleY);
      continue;
    }

    // Palavras excepcionalmente longas podem quebrar no navegador. Nessa situação,
    // cada caractere é posicionado pela geometria real da pré-visualização.
    for (let offset = 0; offset < match[0].length; offset += 1) {
      range.setStart(textNode, match.index + offset);
      range.setEnd(textNode, match.index + offset + 1);
      const charRect = range.getBoundingClientRect();
      drawTextRun(pdf, match[0][offset], charRect, style, rootRect, scaleX, scaleY);
    }
  }

  range.detach?.();
}

function drawVectorText(pdf, root, rootRect, scaleX, scaleY) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.nodeValue?.trim()
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT
  });

  let current = walker.nextNode();
  while (current) {
    drawTextNode(pdf, current, rootRect, scaleX, scaleY);
    current = walker.nextNode();
  }

  pdf.setCharSpace(0);
}

/**
 * Reproduz uma página da pré-visualização em PDF sem achatar o certificado em canvas.
 * O fundo e as assinaturas são incorporados a partir dos arquivos originais; textos e
 * linhas continuam vetoriais, selecionáveis e nítidos em qualquer ampliação.
 */
export async function renderCertificateDomPage(pdf, root) {
  if (!root) throw new Error('Pré-visualização do certificado indisponível.');

  await prepareCertificatePdfFonts(pdf);

  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) {
    throw new Error('A pré-visualização não possui dimensões válidas para exportação.');
  }

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scaleX = pageWidth / rootRect.width;
  const scaleY = pageHeight / rootRect.height;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  const backgroundUrl = getBackgroundUrl(root);
  if (backgroundUrl) {
    const background = await loadImageAsset(backgroundUrl);
    pdf.addImage(
      background.data,
      background.format,
      0,
      0,
      pageWidth,
      pageHeight,
      `background-${hashSource(backgroundUrl)}`,
      losslessImageCompression(background.format)
    );
  }

  drawElementBorders(pdf, root, rootRect, scaleX, scaleY);
  await drawInlineImages(pdf, root, rootRect, scaleX, scaleY);
  drawVectorText(pdf, root, rootRect, scaleX, scaleY);
}
