import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, DollarSign, ShoppingBag, Receipt, Layers } from 'lucide-react';
import { fmt } from '../store';
import { useData } from '../DataContext';

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</span>
        <span style={{ color: accent ? 'var(--primary)' : 'var(--muted-foreground)' }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-mono-face)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { products, sales, expenses } = useData();

  const activeProducts = products.filter(p => p.active);
  const totalStockUnits = useMemo(() => activeProducts.reduce((sum, p) => sum + (p.qty || 0), 0), [activeProducts]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.timestamp) >= today);
  const todayRevenue = todaySales.reduce((a, s) => a + s.total, 0);

  // Helper to compute sale profit with cost price fallback (if costPrice == 0, profit = total)
  function getSaleProfit(s: any): number {
    if (s.profit && s.profit > 0) return s.profit;
    return s.items?.reduce((acc: number, item: any) => {
      const cost = (item.costPrice && item.costPrice > 0) ? item.costPrice : 0;
      return acc + (item.unitPrice - cost) * item.qty;
    }, 0) ?? s.total;
  }

  const todayGrossProfit = todaySales.reduce((a, s) => a + getSaleProfit(s), 0);
  const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((a, e) => a + e.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpenses;

  const week = new Date(today); week.setDate(week.getDate() - 7);
  const weekSales = sales.filter(s => new Date(s.timestamp) >= week);
  const weekRevenue = weekSales.reduce((a, s) => a + s.total, 0);
  const weekGrossProfit = weekSales.reduce((a, s) => a + getSaleProfit(s), 0);
  const weekExpenses = expenses.filter(e => new Date(e.date) >= week).reduce((a, e) => a + e.amount, 0);
  const weekNetProfit = weekGrossProfit - weekExpenses;

  const lowStock = activeProducts.filter(p => p.qty <= p.reorderPoint);

  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const ds = sales.filter(s => { const t = new Date(s.timestamp); return t >= d && t < next; });
      const exps = expenses.filter(e => e.date === dStr).reduce((a, e) => a + e.amount, 0);
      days.push({
        day: d.toLocaleDateString('en-NG', { weekday: 'short' }),
        revenue: ds.reduce((a, s) => a + s.total, 0),
        profit: ds.reduce((a, s) => a + getSaleProfit(s), 0) - exps,
      });
    }
    return days;
  }, [sales, expenses]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach(sale => sale.items.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      map[item.productId].qty += item.qty;
      map[item.productId].revenue += item.qty * item.unitPrice;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [sales]);

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Today's Revenue" value={fmt(todayRevenue)} sub={`${todaySales.length} sales`} icon={<DollarSign size={16} />} accent />
        <StatCard label="Today's Net Profit" value={fmt(todayNetProfit)} sub={`Gross ${fmt(todayGrossProfit)} - Exp ${fmt(todayExpenses)}`} icon={<TrendingUp size={16} />} />
        <StatCard label="Week's Revenue" value={fmt(weekRevenue)} sub={`${weekSales.length} sales`} icon={<ShoppingBag size={16} />} />
        <StatCard label="Week's Net Profit" value={fmt(weekNetProfit)} sub={`Gross ${fmt(weekGrossProfit)} - Exp ${fmt(weekExpenses)}`} icon={<TrendingUp size={16} />} />
        <StatCard label="Total Stock Units" value={`${totalStockUnits.toLocaleString()} units`} sub={`${activeProducts.length} active SKUs`} icon={<Layers size={16} />} />
        <StatCard label="Low Stock Alerts" value={String(lowStock.length)} sub="at or below reorder" icon={<AlertTriangle size={16} />} accent={lowStock.length > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Revenue & Net Profit — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barGap={4}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="rgba(37,99,235,0.85)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Net Profit" fill="rgba(37,99,235,0.35)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Fast-Moving Items</div>
          {topProducts.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>No sales recorded yet</div>
          ) : topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? 'var(--primary-foreground)' : 'var(--muted-foreground)', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono-face)' }}>{p.qty} units</div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} /> Low Stock Alert ({lowStock.length} products)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {lowStock.map(p => (
              <div key={p.id} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, padding: '4px 10px', fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: '#ef4444', marginLeft: 8, fontFamily: 'var(--font-mono-face)' }}>{p.qty} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
