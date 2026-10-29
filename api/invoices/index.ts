import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runFraudScan } from '../../src/lib/fraud-engine/engine';
import { InvoicePayload } from '../../src/lib/fraud-engine/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const invoice = req.body as InvoicePayload;
      if (!invoice.invoiceNumber || !invoice.supplierGstin || invoice.grandTotal === undefined) {
        return res.status(400).json({ error: 'Incomplete invoice payload.' });
      }

      const scanResult = runFraudScan(invoice);

      const validatedInvoice = {
        ...invoice,
        riskScore: scanResult.overallRiskScore,
        riskLevel: scanResult.riskLevel,
        findings: scanResult.findings,
      };

      return res.status(201).json({
        success: true,
        data: {
          invoice: validatedInvoice,
          scanResult,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'Invoices API online. Use POST to submit and validate an invoice.',
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
