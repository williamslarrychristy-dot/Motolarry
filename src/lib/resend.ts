export const RESEND_API_KEY = "re_FGYyVStJ_6aNYrKJTRre7FEds551o8fot";
export const ADMIN_EMAIL = "williamslarrychristy@gmail.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Motolarry POS <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
      mode: 'cors',
    });
    return res.ok;
  } catch {
    // Graceful fallback if client browser blocks direct cross-origin API calls
    return false;
  }
}

export async function sendStockMovementAlert({
  productName,
  sku,
  type,
  qty,
  newQty,
  reason,
}: {
  productName: string;
  sku: string;
  type: string;
  qty: number;
  newQty: number;
  reason: string;
}): Promise<boolean> {
  const isAddition = qty > 0 || ['restock', 'return'].includes(type.toLowerCase());
  const actionText = isAddition ? 'Stock Addition' : 'Stock Subtraction';
  const color = isAddition ? '#16a34a' : '#dc2626';

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: ${color}; margin-top: 0;">📦 Motolarry Stock Alert: ${actionText}</h2>
      <p>A stock inventory movement has been recorded in Motolarry Moto Parts system.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Product:</td><td style="padding: 8px;">${productName} (${sku})</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Movement Type:</td><td style="padding: 8px; text-transform: capitalize;">${type}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Quantity Changed:</td><td style="padding: 8px; color: ${color}; font-weight: bold;">${qty > 0 ? '+' : ''}${qty}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">New Total Stock:</td><td style="padding: 8px; font-weight: bold;">${newQty}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Reason / Reference:</td><td style="padding: 8px;">${reason || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Timestamp:</td><td style="padding: 8px;">${new Date().toLocaleString()}</td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Automated Admin Notification — Motolarry Inventory Management</p>
    </div>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Motolarry Stock Alert] ${actionText}: ${productName} (${qty > 0 ? '+' : ''}${qty})`,
    html,
  });
}

export async function sendEODSalesReportEmail(sales: any[], totalRevenue: number, totalProfit: number): Promise<boolean> {
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let salesRows = sales.map((s) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px;">#${s.id.slice(-6)}</td>
      <td style="padding: 8px;">${new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td style="padding: 8px;">${s.items.map((i: any) => `${i.name} x${i.qty}`).join(', ')}</td>
      <td style="padding: 8px; text-transform: uppercase; font-size: 11px;">${s.payment}</td>
      <td style="padding: 8px; text-align: right; font-weight: bold;">₦${Number(s.total).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 700px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">📊 Motolarry End-of-Day Sales Report</h2>
      <p style="font-weight: bold; color: #475569;">Date: ${dateStr}</p>

      <div style="display: flex; gap: 15px; margin: 20px 0;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px; flex: 1;">
          <div style="font-size: 12px; color: #1e40af; text-transform: uppercase;">Total Sales Count</div>
          <div style="font-size: 22px; font-weight: bold; color: #1e3a8a;">${sales.length}</div>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; flex: 1;">
          <div style="font-size: 12px; color: #166534; text-transform: uppercase;">Total Revenue</div>
          <div style="font-size: 22px; font-weight: bold; color: #14532d;">₦${totalRevenue.toLocaleString()}</div>
        </div>
        <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 15px; border-radius: 6px; flex: 1;">
          <div style="font-size: 12px; color: #6b21a8; text-transform: uppercase;">Estimated Profit</div>
          <div style="font-size: 22px; font-weight: bold; color: #581c87;">₦${totalProfit.toLocaleString()}</div>
        </div>
      </div>

      <h3>Sales Transactions Summary</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px;">Receipt</th>
            <th style="padding: 8px;">Time</th>
            <th style="padding: 8px;">Items</th>
            <th style="padding: 8px;">Payment</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${salesRows.length > 0 ? salesRows : '<tr><td colspan="5" style="padding: 15px; text-align: center; color: #64748b;">No sales recorded for today.</td></tr>'}
        </tbody>
      </table>

      <p style="margin-top: 25px; font-size: 12px; color: #64748b;">Automated Daily EOD Executive Report — Motolarry Moto Parts</p>
    </div>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Motolarry EOD Report] Daily Sales Summary - ${sales.length} Transactions (₦${totalRevenue.toLocaleString()})`,
    html,
  });
}
