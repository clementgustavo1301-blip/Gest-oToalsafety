import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

const OFFICE_ZIP_EXTENSIONS = new Set(['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp']);
const IMAGE_MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const MEDIA_PATH_REGEX = /^(word|xl|ppt)\/media\/|^Pictures\//i;
const MIN_EMBEDDED_MEDIA_BYTES = 40 * 1024;
const MIN_PDF_COMPRESS_BYTES = 250 * 1024;

/**
 * Formata uma quantidade de bytes para leitura humana (B, KB, MB, GB).
 */
export function formatFileSize(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((num / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2))} ${sizes[i]}`;
}

function getFileExtension(name = '') {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return '';
  return name.slice(idx + 1).toLowerCase();
}

function replaceExtension(name, newExt) {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return `${name}.${newExt}`;
  return `${name.slice(0, idx)}.${newExt}`;
}

function buildResult(originalFile, finalFile, wasCompressed) {
  const originalSize = originalFile.size;
  const compressedSize = finalFile.size;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  const savedPercent =
    originalSize > 0 && savedBytes > 0
      ? Math.round((savedBytes / originalSize) * 100)
      : 0;

  return {
    file: finalFile,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercent,
    wasCompressed: Boolean(wasCompressed && compressedSize < originalSize),
  };
}

async function runImageCompression(inputFile, compressionOptions) {
  try {
    return await imageCompression(inputFile, {
      useWebWorker: true,
      ...compressionOptions,
    });
  } catch {
    return await imageCompression(inputFile, {
      useWebWorker: false,
      ...compressionOptions,
    });
  }
}

async function compressImageFile(file, options = {}) {
  const ext = getFileExtension(file.name);
  const isBmp = file.type === 'image/bmp' || ext === 'bmp';
  const targetType = isBmp ? 'image/jpeg' : file.type || IMAGE_MIME_BY_EXT[ext] || 'image/jpeg';

  const compressedBlob = await runImageCompression(file, {
    maxSizeMB: options.maxSizeMB ?? 0.8,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1600,
    initialQuality: options.initialQuality ?? 0.78,
    fileType: isBmp ? 'image/jpeg' : undefined,
  });

  if (!compressedBlob || compressedBlob.size >= file.size) {
    return null;
  }

  const finalName = isBmp ? replaceExtension(file.name, 'jpg') : file.name;
  return new File([compressedBlob], finalName, {
    type: compressedBlob.type || targetType,
    lastModified: file.lastModified || Date.now(),
  });
}

async function compressOfficeArchive(file, options = {}) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  for (const entry of entries) {
    if (!MEDIA_PATH_REGEX.test(entry.name)) continue;

    const mediaExt = getFileExtension(entry.name);
    const mediaMime = IMAGE_MIME_BY_EXT[mediaExt];
    if (!mediaMime) continue;

    const originalBytes = await entry.async('uint8array');
    if (originalBytes.byteLength < MIN_EMBEDDED_MEDIA_BYTES) continue;

    try {
      const mediaFile = new File([originalBytes], entry.name.split('/').pop() || `media.${mediaExt}`, {
        type: mediaMime,
      });
      const compressedMedia = await runImageCompression(mediaFile, {
        maxSizeMB: options.embeddedMaxSizeMB ?? 0.5,
        maxWidthOrHeight: options.embeddedMaxWidthOrHeight ?? 1600,
        initialQuality: options.embeddedQuality ?? 0.76,
        fileType: mediaMime,
      });

      if (compressedMedia && compressedMedia.size < originalBytes.byteLength) {
        const compressedBuffer = await compressedMedia.arrayBuffer();
        zip.file(entry.name, compressedBuffer);
      }
    } catch {
      // Mantém a mídia interna original se não for possível comprimir
    }
  }

  const repackedBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  if (repackedBlob.size >= file.size) {
    return null;
  }

  return new File([repackedBlob], file.name, {
    type: file.type || 'application/octet-stream',
    lastModified: file.lastModified || Date.now(),
  });
}

async function compressZipArchive(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const repackedBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  if (repackedBlob.size >= file.size) {
    return null;
  }

  return new File([repackedBlob], file.name, {
    type: file.type || 'application/zip',
    lastModified: file.lastModified || Date.now(),
  });
}

async function compressPdfFile(file, options = {}) {
  if (file.size < MIN_PDF_COMPRESS_BYTES) {
    return null;
  }

  const renderScale = options.pdfScale ?? 1.45;
  const jpegQuality = options.pdfJpegQuality ?? 0.72;
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let outPdf = null;

  try {
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: renderScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        page.cleanup();
        return null;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      const imgDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);

      const widthPt = baseViewport.width;
      const heightPt = baseViewport.height;
      const orientation = widthPt > heightPt ? 'landscape' : 'portrait';

      if (pageNum === 1) {
        outPdf = new jsPDF({
          orientation,
          unit: 'pt',
          format: [widthPt, heightPt],
          compress: true,
        });
      } else {
        outPdf.addPage([widthPt, heightPt], orientation);
      }

      outPdf.addImage(imgDataUrl, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');

      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }

    if (!outPdf) return null;

    const compressedBlob = outPdf.output('blob');
    if (!compressedBlob || compressedBlob.size >= file.size * 0.92) {
      return null;
    }

    return new File([compressedBlob], file.name, {
      type: 'application/pdf',
      lastModified: file.lastModified || Date.now(),
    });
  } finally {
    await pdfDoc.destroy();
  }
}

/**
 * Reduz o tamanho de imagens, PDFs, arquivos Office/OpenDocument e ZIPs no cliente
 * antes do envio ao Supabase Storage. Nunca retorna um arquivo maior que o original.
 */
export async function compressFileForUpload(file, options = {}) {
  if (!file) {
    throw new Error('Nenhum arquivo informado para compressão.');
  }

  const ext = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  try {
    let compressedFile = null;

    if (
      mime === 'image/jpeg' ||
      mime === 'image/png' ||
      mime === 'image/webp' ||
      mime === 'image/bmp' ||
      ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)
    ) {
      compressedFile = await compressImageFile(file, options);
    } else if (OFFICE_ZIP_EXTENSIONS.has(ext)) {
      compressedFile = await compressOfficeArchive(file, options);
    } else if (mime === 'application/pdf' || ext === 'pdf') {
      compressedFile = await compressPdfFile(file, options);
    } else if (mime === 'application/zip' || mime === 'application/x-zip-compressed' || ext === 'zip') {
      compressedFile = await compressZipArchive(file);
    }

    if (compressedFile && compressedFile.size < file.size) {
      return buildResult(file, compressedFile, true);
    }

    return buildResult(file, file, false);
  } catch (err) {
    console.warn('Falha ao comprimir arquivo; mantendo arquivo original:', err);
    return buildResult(file, file, false);
  }
}
