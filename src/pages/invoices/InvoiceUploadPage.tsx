import React, { useState, useRef } from 'react';
import { store } from '../../services/store';
import { useAuth } from '../../services/auth';
import { UploadCloud } from 'lucide-react';
import { extractTextFromDocument } from '../../lib/ocr/ocr-engine';
import { parseInvoiceText, ExtractedInvoice } from '../../lib/ocr/invoice-parser';
import { InvoiceReviewModal } from './InvoiceReviewModal';
import { InvoicePayload } from '../../lib/fraud-engine/types';

interface InvoiceUploadPageProps {
  onNavigateToInvoice: (id: string) => void;
}

export const InvoiceUploadPage: React.FC<InvoiceUploadPageProps> = ({
  onNavigateToInvoice,
}) => {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProcessDirectPayload = (invoiceData: any, originalFileName?: string) => {
    setProcessing(true);
    setProgressPercent(80);
    setUploadStatus('Executing deterministic rule-based fraud detection engine...');

    setTimeout(() => {
      const { invoice } = store.addInvoice({
        ...invoiceData,
        originalFileName: originalFileName || 'direct_payload.json',
      });
      setProcessing(false);
      onNavigateToInvoice(invoice.id);
    }, 500);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = async (file: File) => {
    setUploadedFileName(file.name);

    // If structured JSON file, parse directly
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          handleProcessDirectPayload(parsed, file.name);
        } catch {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Document image or PDF: run real OCR extraction
    try {
      setProcessing(true);
      setProgressPercent(5);
      setUploadStatus('Reading uploaded document...');

      const ocrResult = await extractTextFromDocument(file, (pct, status) => {
        setProgressPercent(pct);
        setUploadStatus(status);
      });

      setUploadStatus('Parsing document text into structured invoice fields...');
      setProgressPercent(95);

      const parsedInvoice = parseInvoiceText(ocrResult.text, {
        organizationName: user?.organizationName,
        organizationGstin: user?.organizationGstin,
      });

      setExtractedData(parsedInvoice);
      setProcessing(false);
      setIsReviewOpen(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setProcessing(false);
      alert(`Text extraction failed: ${err?.message || 'Could not parse document'}`);
    }
  };

  const handleReviewConfirm = (confirmedData: InvoicePayload) => {
    setIsReviewOpen(false);
    setProcessing(true);
    setProgressPercent(100);
    setUploadStatus('Executing deterministic fraud detection engine on confirmed data...');

    setTimeout(() => {
      const { invoice } = store.addInvoice({
        ...confirmedData,
        currency: confirmedData.currency || 'INR',
        source: 'OCR_UPLOAD',
        status: 'PENDING_REVIEW',
        originalFileName: uploadedFileName,
        items: confirmedData.items.map((it, idx) => ({
          id: it.id || `item-${idx + 1}-${Date.now()}`,
          invoiceId: '',
          itemDescription: it.itemDescription,
          hsnCode: it.hsnCode,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountAmount: it.discountAmount,
          taxableAmount: it.taxableAmount,
          gstRate: it.gstRate,
          cgstAmount: it.cgstAmount,
          sgstAmount: it.sgstAmount,
          igstAmount: it.igstAmount,
          totalAmount: it.totalAmount,
        })),
      });
      setProcessing(false);
      onNavigateToInvoice(invoice.id);
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Upload Invoice
        </h1>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        onClick={() => !processing && fileInputRef.current?.click()}
        className={`bg-white border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-colors shadow-sm ${
          isDragging
            ? 'border-blue-600 bg-blue-50/40'
            : 'border-slate-300 hover:border-slate-400'
        } ${processing ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelected(e.target.files[0]);
            }
          }}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.json"
          className="hidden"
        />

        <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 mb-3 shadow-sm">
          <UploadCloud className="h-6 w-6" />
        </div>

        <h3 className="text-sm font-semibold text-slate-900">
          Upload commercial invoice document
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Drag and drop PDF, PNG, JPG, or structured JSON file, or browse files on your machine.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400 font-mono">
          <span>Supported: PDF, PNG, JPG, WEBP, JSON</span>
          <span>•</span>
          <span>Max File Size: 25 MB</span>
        </div>
      </div>

      {/* Real-time OCR Progress Bar */}
      {processing && (
        <div className="bg-blue-50/70 border border-blue-200/90 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-900 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full shrink-0" />
              {uploadStatus}
            </span>
            <span className="font-mono font-semibold text-blue-700">{progressPercent}%</span>
          </div>
          <div className="w-full bg-blue-200/70 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-700 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(Math.max(progressPercent, 5), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Interactive Invoice Review Modal */}
      {extractedData && (
        <InvoiceReviewModal
          isOpen={isReviewOpen}
          fileName={uploadedFileName}
          extractedData={extractedData}
          userStoreName={user?.organizationName}
          userStoreGstin={user?.organizationGstin}
          onConfirm={handleReviewConfirm}
          onCancel={() => {
            setIsReviewOpen(false);
            setExtractedData(null);
          }}
        />
      )}
    </div>
  );
};
