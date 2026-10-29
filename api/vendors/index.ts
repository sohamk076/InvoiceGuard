import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateGSTIN } from '../../src/lib/gst';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const { gstin, name, city } = req.body;
    if (!gstin || !name) {
      return res.status(400).json({ error: 'Name and GSTIN are required.' });
    }

    const gstinValidation = validateGSTIN(gstin);
    return res.status(200).json({
      success: true,
      validation: gstinValidation,
      vendor: {
        name,
        gstin,
        city: city || 'Unknown',
        riskRating: gstinValidation.isValid ? 'LOW' : 'HIGH',
      },
    });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'InvoiceGuard Vendors API',
  });
}
