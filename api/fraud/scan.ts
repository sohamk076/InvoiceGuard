import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runFraudScan } from '../../src/lib/fraud-engine/engine';
import { HistoricalContext, InvoicePayload } from '../../src/lib/fraud-engine/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { invoice, context } = req.body as {
      invoice: InvoicePayload;
      context?: HistoricalContext;
    };

    if (!invoice || !invoice.invoiceNumber || !invoice.supplierGstin) {
      return res.status(400).json({
        error: 'Missing required invoice parameters (invoiceNumber, supplierGstin, grandTotal).',
      });
    }

    const defaultContext: HistoricalContext = context || {
      existingInvoices: [],
      vendorsStats: {},
      purchaseOrders: [],
    };

    const scanResult = runFraudScan(invoice, defaultContext);

    return res.status(200).json({
      success: true,
      data: scanResult,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Fraud scan execution failed.',
      message: err?.message || 'Internal server error',
    });
  }
}
