// Document OCR & Text Extraction Engine for Images and PDFs
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface OcrResult {
  text: string;
  pagesCount: number;
  isScannedPdf?: boolean;
}

export type OcrProgressCallback = (percent: number, status: string) => void;

/**
 * Extracts text from an image file using Tesseract.js.
 */
export async function extractTextFromImage(
  file: File | Blob,
  onProgress?: OcrProgressCallback
): Promise<string> {
  onProgress?.(5, 'Initializing OCR engine...');

  const worker = await createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const pct = Math.round(15 + m.progress * 80);
        onProgress?.(pct, `Reading document text (${Math.round(m.progress * 100)}%)...`);
      } else if (m.status === 'loading language traineddata') {
        onProgress?.(10, 'Loading OCR dictionary...');
      }
    },
  });

  try {
    onProgress?.(20, 'Analyzing image contrast and typography...');
    const ret = await worker.recognize(file);
    onProgress?.(98, 'Finalizing extracted text...');
    return ret.data.text || '';
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts text from a PDF file. Checks digital text stream first;
 * if empty (scanned PDF), renders page to canvas and performs OCR.
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  onProgress?.(5, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let fullText = '';
  let scannedPagesCount = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pagePct = Math.round((pageNum / numPages) * 70);
    onProgress?.(pagePct, `Extracting page ${pageNum} of ${numPages}...`);

    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str)
      .join(' ')
      .trim();

    if (pageText.length > 30) {
      // PDF has native selectable text
      fullText += `\n--- PAGE ${pageNum} ---\n` + pageText;
    } else {
      // Page appears to be a scanned image; render to canvas and OCR
      scannedPagesCount++;
      onProgress?.(pagePct, `Running optical recognition on page ${pageNum}...`);

      const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for higher OCR clarity
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (page.render({ canvasContext: ctx, viewport } as any).promise);
        
        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });

        if (blob) {
          const ocrText = await extractTextFromImage(blob, (subPct, msg) => {
            const overall = Math.round(pagePct + (subPct / 100) * (30 / numPages));
            onProgress?.(overall, `Page ${pageNum}: ${msg}`);
          });
          fullText += `\n--- PAGE ${pageNum} ---\n` + ocrText;
        }
      }
    }
  }

  onProgress?.(100, 'Document processing completed');
  return {
    text: fullText.trim(),
    pagesCount: numPages,
    isScannedPdf: scannedPagesCount > 0,
  };
}

/**
 * Unified entry point: detects file type and extracts text accordingly.
 */
export async function extractTextFromDocument(
  file: File,
  onProgress?: OcrProgressCallback
): Promise<OcrResult> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return extractTextFromPdf(file, onProgress);
  } else {
    const text = await extractTextFromImage(file, onProgress);
    return {
      text,
      pagesCount: 1,
      isScannedPdf: false,
    };
  }
}
