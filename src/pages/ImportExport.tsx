import { useState, useRef } from 'react';
import { getProducts, saveProducts, getSales, getMovements, uid, Product } from '../store';
import { Download, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const CSV_HEADERS = [
  'name', 'description', 'sku', 'barcode', 'category', 'subcategory',
  'brand', 'manufacturer', 'fitment', 'costPrice', 'salePrice', 'msrp',
  'qty', 'reorderPoint', 'reorderQty', 'location', 'aliases', 'tags',
  'active', 'serialTracked', 'supplierId', 'imageUrl',
];

const CSV_TEMPLATE_ROWS = [
  ['Honda CB400 Chain Kit', 'Complete chain and sprocket kit', 'HCB400-CK', '1234567890',
   'Drivetrain', 'Chain & Sprocket', 'RK', 'RK Excel', 'Honda CB400 2001-2020',
   '7500', '12500', '13000', '8', '3', '10', 'Shelf A1',
   'comp chain, cb400 chain', 'fast-moving,honda', 'true', 'false', '', ''],
  ['Yamaha R15 Brake Pads', 'Front and rear brake pads', 'YR15-BP', '1234567891',
   'Brakes', 'Brake Pads', 'Brembo', 'Brembo S.p.A.', 'Yamaha R15 V3 2017-2023',
   '4200', '7200', '7800', '15', '5', '15', 'Shelf B3',
   'yamaha pads, r15 brakes', 'yamaha,brakes', 'true', 'false', '', ''],
];

function toCSV(headers: string[], rows: string[][]): string {
  return [headers.join(','), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n');
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line => {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += line[i]; }
    }
    result.push(current);
    return result;
  });
}

export default function ImportExport() {
  const [tab, setTab] = useState<'import' | 'export' | 'template'>('template');
  const [importResult, setImportResult] = useState<{ ok: number; skip: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    downloadCSV('inventory_import_template.csv', toCSV(CSV_HEADERS, CSV_TEMPLATE_ROWS));
  }

  function exportProducts() {
    const products = getProducts();
    const rows = products.map(p => CSV_HEADERS.map(h => String((p as any)[h] ?? '')));
    downloadCSV(`products_export_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(CSV_HEADERS, rows));
  }

  function exportSales() {
    const sales = getSales();
    const headers = ['id', 'timestamp', 'total', 'profit', 'payment', 'customerId', 'note', 'items'];
    const rows = sales.map(s => [
      s.id, s.timestamp, String(s.total), String(s.profit), s.payment,
      s.customerId || '', s.note,
      s.items.map(i => `${i.name}×${i.qty}@${i.unitPrice}`).join('; '),
    ]);
    downloadCSV(`sales_export_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows));
  }

  function exportMovements() {
    const movements = getMovements();
    const headers = ['id', 'productId', 'type', 'qty', 'reason', 'userId', 'timestamp'];
    const rows = movements.map(m => [m.id, m.productId, m.type, String(m.qty), m.reason, m.userId, m.timestamp]);
    downloadCSV(`stock_movements_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(headers, rows));
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = parseCSV(text);
      if (lines.length < 2) { setImportResult({ ok: 0, skip: 0, errors: ['File is empty or has no data rows'] }); return; }
      const headers = lines[0].map(h => h.trim().replace(/^"|"$/g, ''));
      const result = { ok: 0, skip: 0, errors: [] as string[] };
      const existing = getProducts();
      const newProducts: Product[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 3 || !row[0]) { result.skip++; continue; }
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h] = (row[idx] || '').replace(/^"|"$/g, '').trim(); });
        const name = obj.name; const sku = obj.sku;
        if (!name || !sku) { result.errors.push(`Row ${i + 1}: missing name or SKU`); continue; }
        // Check if SKU already exists
        if (existing.find(p => p.sku === sku)) { result.skip++; continue; }
        newProducts.push({
          id: uid(), createdAt: new Date().toISOString(),
          name, description: obj.description || '', sku, barcode: obj.barcode || '',
          category: obj.category || '', subcategory: obj.subcategory || '',
          brand: obj.brand || '', manufacturer: obj.manufacturer || '',
          fitment: obj.fitment || '',
          costPrice: parseFloat(obj.costPrice) || 0,
          salePrice: parseFloat(obj.salePrice) || 0,
          msrp: parseFloat(obj.msrp) || 0,
          qty: parseInt(obj.qty) || 0,
          reorderPoint: parseInt(obj.reorderPoint) || 5,
          reorderQty: parseInt(obj.reorderQty) || 10,
          location: obj.location || '',
          imageUrl: obj.imageUrl || '',
          aliases: obj.aliases || '',
          active: obj.active !== 'false',
          tags: obj.tags || '',
          serialTracked: obj.serialTracked === 'true',
          supplierId: obj.supplierId || '',
        });
        result.ok++;
      }

      if (newProducts.length > 0) { saveProducts([...existing, ...newProducts]); }
      setImportResult(result);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Import / Export</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>Bulk import and export your product catalog and sales data</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['template', 'import', 'export'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 'var(--radius)', fontSize: 13,
            background: tab === t ? 'var(--primary)' : 'var(--secondary)',
            color: tab === t ? 'var(--primary-foreground)' : 'var(--foreground)',
            textTransform: 'capitalize',
          }}>{t === 'template' ? 'CSV Template' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'template' && (
        <div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(249,115,22,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={22} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>Product Import CSV Template</h3>
                <p style={{ margin: '0 0 16px', color: 'var(--muted-foreground)', fontSize: 13, lineHeight: 1.6 }}>
                  Download this template to understand the correct column format for importing products. Fill in your data following the example rows, then use the Import tab to upload.
                </p>
                <button onClick={downloadTemplate} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '9px 18px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Download size={14} /> Download Template CSV
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
              Column Reference — {CSV_HEADERS.length} fields
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--secondary)' }}>
                    {['Column', 'Type', 'Required', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['name', 'text', '✓', 'Product display name'],
                    ['description', 'text', '', 'Short description'],
                    ['sku', 'text', '✓', 'Unique internal code — duplicates skipped on import'],
                    ['barcode', 'text', '', 'Scannable barcode value'],
                    ['category', 'text', '', 'e.g. Engine, Brakes, Drivetrain'],
                    ['subcategory', 'text', '', 'e.g. Air Filter, Chain & Sprocket'],
                    ['brand', 'text', '', 'Brand name (e.g. NGK, Brembo)'],
                    ['manufacturer', 'text', '', 'Full manufacturer name'],
                    ['fitment', 'text', '', 'Which models it fits (e.g. Honda CB400 2001-2020)'],
                    ['costPrice', 'number', '', 'Purchase cost in NGN (no symbol)'],
                    ['salePrice', 'number', '', 'Retail price in NGN'],
                    ['msrp', 'number', '', "Manufacturer's suggested retail price"],
                    ['qty', 'number', '', 'Current stock quantity'],
                    ['reorderPoint', 'number', '', 'Alert threshold (default 5)'],
                    ['reorderQty', 'number', '', 'How many to reorder (default 10)'],
                    ['location', 'text', '', 'Bin location (e.g. Shelf A1)'],
                    ['aliases', 'text', '', 'Comma-separated alternate names for search'],
                    ['tags', 'text', '', 'Comma-separated tags (e.g. fast-moving, honda-specific)'],
                    ['active', 'true/false', '', 'true = visible in POS (default true)'],
                    ['serialTracked', 'true/false', '', 'true = requires serial number per unit'],
                    ['supplierId', 'text', '', 'Supplier ID from your supplier records'],
                    ['imageUrl', 'text', '', 'Full URL to product image'],
                  ].map(([col, type, req, notes], i, arr) => (
                    <tr key={col} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono-face)', fontSize: 12, color: 'var(--primary)' }}>{col}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-face)' }}>{type}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: req ? '#22c55e' : 'var(--muted-foreground)' }}>{req || '—'}</td>
                      <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--muted-foreground)' }}>{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>Import Products from CSV</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              Upload a CSV file matching the template format. Products with an existing SKU will be skipped (no duplicate check on name). New products are added to your catalog immediately.
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileImport} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', padding: '11px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <Upload size={15} /> Choose CSV File to Import
            </button>
            {importResult && (
              <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: importResult.ok > 0 ? '#22c55e' : 'var(--muted-foreground)' }}>
                  <CheckCircle size={16} /> <span style={{ fontWeight: 600 }}>Import complete</span>
                </div>
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>✓ <strong>{importResult.ok}</strong> products imported</div>
                  <div style={{ color: 'var(--muted-foreground)' }}>↷ {importResult.skip} rows skipped (duplicate SKU or empty)</div>
                  {importResult.errors.map((e, i) => (
                    <div key={i} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <AlertCircle size={12} /> {e}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560 }}>
          {[
            { title: 'Export Product Catalog', desc: 'All products with full details — prices, stock levels, fitment, categories, and more. Use for backup or migration.', action: exportProducts, label: 'Export Products CSV' },
            { title: 'Export Sale History', desc: 'All recorded sales with date, items, totals, profit, payment method. Use for accounting and reconciliation.', action: exportSales, label: 'Export Sales CSV' },
            { title: 'Export Stock Movements', desc: 'Every stock change record — sales, restocks, adjustments, returns. Full audit trail.', action: exportMovements, label: 'Export Movements CSV' },
          ].map(({ title, desc, action, label }) => (
            <div key={title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
              </div>
              <button onClick={action} style={{ background: 'var(--secondary)', color: 'var(--foreground)', borderRadius: 'var(--radius)', padding: '9px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Download size={13} /> {label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
