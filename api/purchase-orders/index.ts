import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { poNumber, totalAmount, vendorGstin } = req.body;
    if (!poNumber || !totalAmount || !vendorGstin) {
      return res.status(400).json({ error: 'Missing mandatory Purchase Order fields.' });
    }

    return res.status(201).json({
      success: true,
      message: 'Purchase Order created.',
      data: req.body,
    });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'InvoiceGuard Purchase Orders API',
  });
}
