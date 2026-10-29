import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { runFraudScan } from './src/lib/fraud-engine/engine';
import { validateGSTIN } from './src/lib/gst';

// Local Vite API plugin to enable full serverless testing during `npm run dev`
function localApiServerPlugin(): Plugin {
  return {
    name: 'local-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        const url = req.url.split('?')[0];

        // Helper to read incoming JSON body
        const readBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        res.setHeader('Content-Type', 'application/json');

        // Route: /api/stats
        if (url === '/api/stats') {
          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              status: 'ok',
              system: 'InvoiceGuard Fraud Detection Subsystem',
              environment: 'local_development',
              timestamp: new Date().toISOString(),
            })
          );
        }

        // Route: /api/fraud/scan
        if (url === '/api/fraud/scan') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
          }

          const body = await readBody();
          const { invoice, context } = body;

          if (!invoice || !invoice.invoiceNumber || !invoice.supplierGstin) {
            res.statusCode = 400;
            return res.end(
              JSON.stringify({
                error: 'Missing required invoice parameters (invoiceNumber, supplierGstin, grandTotal).',
              })
            );
          }

          const defaultContext = context || {
            existingInvoices: [],
            vendorsStats: {},
            purchaseOrders: [],
          };

          const scanResult = runFraudScan(invoice, defaultContext);
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, data: scanResult }));
        }

        // Route: /api/invoices
        if (url === '/api/invoices') {
          if (req.method === 'POST') {
            const body = await readBody();
            if (!body.invoiceNumber || !body.supplierGstin || body.grandTotal === undefined) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Incomplete invoice payload.' }));
            }

            const scanResult = runFraudScan(body);
            res.statusCode = 201;
            return res.end(
              JSON.stringify({
                success: true,
                data: { invoice: body, scanResult },
              })
            );
          }

          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              status: 'ok',
              service: 'InvoiceGuard Invoices API',
            })
          );
        }

        // Route: /api/vendors
        if (url === '/api/vendors') {
          if (req.method === 'POST') {
            const { gstin, name, city } = await readBody();
            if (!gstin || !name) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Name and GSTIN are required.' }));
            }
            const gstinValidation = validateGSTIN(gstin);
            res.statusCode = 200;
            return res.end(
              JSON.stringify({
                success: true,
                validation: gstinValidation,
                vendor: {
                  name,
                  gstin,
                  city: city || 'Unknown',
                  riskRating: gstinValidation.isValid ? 'LOW' : 'HIGH',
                },
              })
            );
          }

          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              status: 'ok',
              service: 'InvoiceGuard Vendors API',
            })
          );
        }

        // Route: /api/purchase-orders
        if (url === '/api/purchase-orders') {
          if (req.method === 'POST') {
            const body = await readBody();
            res.statusCode = 201;
            return res.end(JSON.stringify({ success: true, data: body }));
          }

          res.statusCode = 200;
          return res.end(
            JSON.stringify({
              status: 'ok',
              service: 'InvoiceGuard Purchase Orders API',
            })
          );
        }

        // Default 404 for unmatched /api routes
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'API Route Not Found' }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localApiServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
