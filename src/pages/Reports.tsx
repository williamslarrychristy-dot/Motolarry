import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Calendar, Download, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import { useData } from '../DataContext';
import { fmt } from '../store';

type RangeOption = 'today' | 'week' | 'month' | 'all';

export default function Reports() {
  const { products, sales, expenses } = useData();
  const [range, setRange] = useState<RangeOption>('week');

  const startDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === 'today') return d;
    if (range === 'week') { d.setDate(d.getDate() - 7); return d; }
    if (range === 'month') { d.setDate(d.getDate() - 30); return d; }
    return new Date(0); // All time
  }, [range]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => new Date(s.timestamp) >= startDate);
  }, [sales, startDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.date) >= startDate);
  }, [expenses, startDate]);

  // Metrics
  const totalRevenue = useMemo(() => filteredSales.reduce((a, s) => a + s.total, 0), [filteredSales]);
  const grossProfit = useMemo(() => filteredSales.reduce((a, s) => a + s.profit, 0), [filteredSales]);
  const totalExpenditures = useMemo(() => filteredExpenses.reduce((a, e) => a + e.amount, 0), [filteredExpenses]);
  const netProfit = grossProfit - totalExpenditures;

  // Product sales breakdown
  const productStats = useMemo(() => {
    const statsMap: Record<string, { id: string; name: string; sku: string; category: string; qtySold: number; revenue: number; currentStock: number; costPrice: number }> = {};

    // Initialize all active products in map
    products.forEach(p => {
      statsMap[p.id] = {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        qtySold: 0,
        revenue: 0,
        currentStock: p.qty,
        costPrice: p.costPrice,
      };
    });

    // Populate with sales
    filteredSales.forEach(s => {
      s.items.forEach(item => {
        if (!statsMap[item.productId]) {
          statsMap[item.productId] = {
            id: item.productId,
            name: item.name,
            sku: item.sku,
            category: 'Uncategorized',
            qtySold: 0,
            revenue: 0,
            currentStock: 0,
            costPrice: item.costPrice,
          };
        }
        statsMap[item.productId].qtySold += item.qty;
        statsMap[item.productId].revenue += item.qty * item.unitPrice;
      });
    });

    const allStats = Object.values(statsMap);
    const moving = [...allStats].filter(p => p.qtySold > 0).sort((a, b) => b.qtySold - a.qtySold);
    const unmoving = [...allStats].filter(p => p.qtySold === 0 && p.currentStock > 0).sort((a, b) => b.currentStock - a.currentStock);

    return { moving, unmoving };
  }, [products, filteredSales]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = { cash: 0, transfer: 0, card: 0, credit: 0 };
    filteredSales.forEach(s => {
      if (s.payments && s.payments.length > 0) {
        s.payments.forEach(p => {
          if (p.method in breakdown) breakdown[p.method as keyof typeof breakdown] += p.amount;
        });
      } else if (s.payment in breakdown) {
        breakdown[s.payment as keyof typeof breakdown] += s.total;
      }
    });
    return breakdown;
  }, [filteredSales]);

  function exportCSV() {
    const rows = [
      ['Metric', 'Value'],
      ['Range', range.toUpperCase()],
      ['Total Sales Revenue', totalRevenue],
      ['Gross Profit', grossProfit],
      ['Total Expenditures', totalExpenditures],
      ['Net Profit', netProfit],
      ['Total Transactions', filteredSales.length],
      [],
      ['Fast Moving Products'],
      ['Product Name', 'SKU', 'Units Sold', 'Revenue', 'Current Stock'],
      ...productStats.moving.map(p => [p.name, p.sku, p.qtySold, p.revenue, p.currentStock]),
      [],
      ['Unmoving / Dead Stock'],
      ['Product Name', 'SKU', 'Units Sold', 'Current Stock', 'Stock Capital Tied (NGN)'],
      ...productStats.unmoving.map(p => [p.name, p.sku, 0, p.currentStock, p.currentStock * p.costPrice]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `motolarry_report_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} color="var(--primary)" /> Comprehensive Business Analytics & Reports
          </h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
            Track sales performance, net profitability, fast-moving items, and unmoving dead stock across your business terminals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
            {(['today', 'week', 'month', 'all'] as RangeOption[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '6px 12px', border: 'none', background: range === r ? 'var(--primary)' : 'transparent',
                  color: range === r ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  borderRadius: 4, fontWeight: 600, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 Days' : r === 'month' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--secondary)', color: 'var(--secondary-foreground)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: '8px 12px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
            Sales Revenue
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(totalRevenue)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{filteredSales.length} sales receipts</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
            Gross Profit Margin
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(grossProfit)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
            {totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(1)}% gross margin` : '0%'}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
            Shop Expenditures
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(totalExpenditures)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{filteredExpenses.length} expense logs</div>
        </div>

        <div style={{ background: netProfit >= 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${netProfit >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: netProfit >= 0 ? '#16a34a' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>
            Net Business Profit
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: netProfit >= 0 ? '#16a34a' : '#ef4444', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(netProfit)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>Gross profit minus shop expenses</div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Revenue Breakdown by Payment Method</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, background: 'var(--secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Cash</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmt(paymentBreakdown.cash)}</div>
          </div>
          <div style={{ padding: 12, background: 'var(--secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Bank Transfer</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmt(paymentBreakdown.transfer)}</div>
          </div>
          <div style={{ padding: 12, background: 'var(--secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>POS Card</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmt(paymentBreakdown.card)}</div>
          </div>
          <div style={{ padding: 12, background: 'var(--secondary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Customer Credit / Debt</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmt(paymentBreakdown.credit)}</div>
          </div>
        </div>
      </div>

      {/* Moving vs Unmoving Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' }}>
        {/* Fast Moving */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingUp size={18} color="#16a34a" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Fast-Moving Products ({productStats.moving.length})</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)' }}>Product</th>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)', textAlign: 'center' }}>Sold</th>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)', textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productStats.moving.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'var(--muted-foreground)' }}>No sales recorded in period</td></tr>
                ) : productStats.moving.slice(0, 10).map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono-face)', color: '#16a34a', fontWeight: 700 }}>{p.qtySold}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono-face)' }}>{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unmoving / Dead Stock */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TrendingDown size={18} color="#ef4444" />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Unmoving / Dead Stock ({productStats.unmoving.length})</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)' }}>Product</th>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)', textAlign: 'center' }}>Stock</th>
                  <th style={{ padding: '8px 10px', color: 'var(--muted-foreground)', textAlign: 'right' }}>Tied Capital</th>
                </tr>
              </thead>
              <tbody>
                {productStats.unmoving.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'var(--muted-foreground)' }}>Great! All active stocked items are moving.</td></tr>
                ) : productStats.unmoving.slice(0, 10).map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono-face)', color: '#ef4444', fontWeight: 700 }}>{p.currentStock}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono-face)' }}>{fmt(p.currentStock * p.costPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
