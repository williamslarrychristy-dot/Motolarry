import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, Package, AlertTriangle, DollarSign, ShoppingBag, Receipt,
  Layers, Coins, CreditCard, Tag, Landmark, Wallet, Layers2, FolderTree,
  Award, AlertCircle, CheckCircle2, Calendar, Clock, Sparkles, Activity,
  Percent, Users, Truck, ArrowUpRight, ArrowDownRight, Hash
} from 'lucide-react';
import { fmt } from '../store';
import { useData } from '../DataContext';

function StatCard({ label, value, sub, icon, accent }: { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      minHeight: 120, height: '100%', boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
        <span style={{ color: accent ? 'var(--primary)' : 'var(--muted-foreground)', flexShrink: 0 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--foreground)', fontFamily: 'var(--font-mono-face)', margin: '8px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {sub ? (
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      ) : (
        <div style={{ fontSize: 11, opacity: 0 }}>-</div>
      )}
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
  const { products, sales, expenses, customers, suppliers } = useData();

  const activeProducts = useMemo(() => products.filter(p => p.active), [products]);

  // Helper to compute sale profit with cost price fallback
  function getSaleProfit(s: any): number {
    if (s.profit && s.profit > 0) return s.profit;
    return s.items?.reduce((acc: number, item: any) => {
      const cost = (item.costPrice && item.costPrice > 0) ? item.costPrice : 0;
      return acc + (item.unitPrice - cost) * item.qty;
    }, 0) ?? s.total;
  }

  // Helper to compute total COGS for a set of sales
  function getSaleCOGS(s: any): number {
    return s.items?.reduce((acc: number, item: any) => {
      const cost = (item.costPrice && item.costPrice > 0) ? item.costPrice : 0;
      return acc + cost * item.qty;
    }, 0) ?? 0;
  }

  // Date filters
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = new Date(today); week.setDate(week.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Sales collections filtered by dates
  const todaySales = useMemo(() => sales.filter(s => new Date(s.timestamp) >= today), [sales, today]);
  const weekSales = useMemo(() => sales.filter(s => new Date(s.timestamp) >= week), [sales, week]);
  const monthSales = useMemo(() => sales.filter(s => new Date(s.timestamp) >= monthStart), [sales, monthStart]);

  // Financial Calculations
  const todayRevenue = useMemo(() => todaySales.reduce((a, s) => a + s.total, 0), [todaySales]);
  const todayGrossProfit = useMemo(() => todaySales.reduce((a, s) => a + getSaleProfit(s), 0), [todaySales]);
  const todayExpenses = useMemo(() => expenses.filter(e => e.date === todayStr).reduce((a, e) => a + e.amount, 0), [expenses, todayStr]);
  const todayNetProfit = todayGrossProfit - todayExpenses;

  const weekRevenue = useMemo(() => weekSales.reduce((a, s) => a + s.total, 0), [weekSales]);
  const weekGrossProfit = useMemo(() => weekSales.reduce((a, s) => a + getSaleProfit(s), 0), [weekSales]);
  const weekExpenses = useMemo(() => expenses.filter(e => new Date(e.date) >= week).reduce((a, e) => a + e.amount, 0), [expenses, week]);
  const weekNetProfit = weekGrossProfit - weekExpenses;

  // 1. Month's Revenue
  const monthRevenue = useMemo(() => monthSales.reduce((a, s) => a + s.total, 0), [monthSales]);

  // 2. Month's Net Profit
  const monthGrossProfit = useMemo(() => monthSales.reduce((a, s) => a + getSaleProfit(s), 0), [monthSales]);
  const monthExpenses = useMemo(() => expenses.filter(e => new Date(e.date) >= monthStart).reduce((a, e) => a + e.amount, 0), [expenses, monthStart]);
  const monthNetProfit = monthGrossProfit - monthExpenses;

  // 3. Total COGS
  const totalCOGS = useMemo(() => sales.reduce((a, s) => a + getSaleCOGS(s), 0), [sales]);

  // 4. Total Discounts Given
  const totalDiscounts = useMemo(() => sales.reduce((a, s) => a + (s.discount || 0), 0), [sales]);

  // 5. Total Credit Outstanding
  const creditOutstanding = useMemo(() => {
    return sales.reduce((a, s) => {
      if (s.paymentMethod === 'credit' || s.paymentMethod === 'debt') {
        return a + (s.total - (s.amountPaid || 0));
      }
      return a;
    }, 0);
  }, [sales]);

  // 6, 7, 8. Payment Method Collections Today
  const cashCollectedToday = useMemo(() => {
    return todaySales.reduce((a, s) => (s.paymentMethod === 'cash' ? a + s.total : a), 0);
  }, [todaySales]);

  const posCollectedToday = useMemo(() => {
    return todaySales.reduce((a, s) => (s.paymentMethod === 'pos' || s.paymentMethod === 'card' ? a + s.total : a), 0);
  }, [todaySales]);

  const transferCollectedToday = useMemo(() => {
    return todaySales.reduce((a, s) => (s.paymentMethod === 'transfer' ? a + s.total : a), 0);
  }, [todaySales]);

  // 5 Original Cards: Stock & Low Stock
  const totalStockUnits = useMemo(() => activeProducts.reduce((sum, p) => sum + (p.qty || 0), 0), [activeProducts]);
  const totalStockValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => {
      const priceToUse = (p.costPrice && p.costPrice > 0) ? p.costPrice : (p.salePrice || 0);
      return sum + (priceToUse * (p.qty || 0));
    }, 0);
  }, [activeProducts]);

  const lowStock = useMemo(() => activeProducts.filter(p => p.qty <= p.reorderPoint), [activeProducts]);

  // Inventory Cards
  // 9. Total Active SKUs
  const totalActiveSKUs = activeProducts.length;

  // 10. Total Categories
  const totalCategories = useMemo(() => new Set(activeProducts.map(p => p.category).filter(Boolean)).size, [activeProducts]);

  // 11. Total Brands
  const totalBrands = useMemo(() => new Set(activeProducts.map(p => p.brand).filter(Boolean)).size, [activeProducts]);

  // 12. Out of Stock Items
  const outOfStockItems = useMemo(() => activeProducts.filter(p => p.qty <= 0), [activeProducts]);

  // 13. Overstocked Items (qty > 3x reorder point or > 100)
  const overstockedItems = useMemo(() => {
    return activeProducts.filter(p => p.qty >= Math.max(p.reorderPoint * 3, 50));
  }, [activeProducts]);

  // 14. New Products Added This Month
  const newProductsThisMonth = useMemo(() => {
    return activeProducts.filter(p => p.createdAt && new Date(p.createdAt) >= monthStart).length;
  }, [activeProducts, monthStart]);

  // 15. Products Not Sold in 30 Days
  const productsNotSold30Days = useMemo(() => {
    const soldProductIds = new Set<string>();
    sales.forEach(s => {
      if (new Date(s.timestamp) >= thirtyDaysAgo) {
        s.items?.forEach(i => soldProductIds.add(i.productId));
      }
    });
    return activeProducts.filter(p => !soldProductIds.has(p.id)).length;
  }, [activeProducts, sales, thirtyDaysAgo]);

  // Top / Slow movers aggregated data
  const itemMovementMap = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    sales.forEach(sale => sale.items?.forEach(item => {
      if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      map[item.productId].qty += item.qty;
      map[item.productId].revenue += item.qty * item.unitPrice;
    }));
    return map;
  }, [sales]);

  // 16. Top 5 Fast Moving Items
  const top5FastMoving = useMemo(() => {
    return Object.values(itemMovementMap).sort((a, b) => b.qty - a.qty)[0];
  }, [itemMovementMap]);

  // 17. Slowest 5 Moving Items
  const slowest5Moving = useMemo(() => {
    return Object.values(itemMovementMap).sort((a, b) => a.qty - b.qty)[0];
  }, [itemMovementMap]);

  // Sales & Customer Cards
  // 18. Total Sales Today count
  const todaySalesCount = todaySales.length;

  // 19. Total Sales Week count
  const weekSalesCount = weekSales.length;

  // 20. Total Sales Month count
  const monthSalesCount = monthSales.length;

  // 21. Average Sale Value
  const avgSaleValue = useMemo(() => {
    if (sales.length === 0) return 0;
    const totalRev = sales.reduce((a, s) => a + s.total, 0);
    return totalRev / sales.length;
  }, [sales]);

  // 22. Total Customers
  const totalCustomers = customers.length;

  // Operational Cards
  // 23. Total Suppliers
  const totalSuppliers = suppliers.length;

  // Daily Chart Data
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
  }, [sales, expenses, today]);

  const topProductsList = useMemo(() => {
    return Object.values(itemMovementMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [itemMovementMap]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard Metrics</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
            {now.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — Realtime Business Insights
          </p>
        </div>
      </div>

      {/* 30 Dynamic Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 14,
        marginBottom: 28
      }}>
        {/* Original 7 Cards */}
        <StatCard label="Today's Revenue" value={fmt(todayRevenue)} sub={`${todaySalesCount} sales recorded`} icon={<DollarSign size={16} />} accent />
        <StatCard label="Today's Net Profit" value={fmt(todayNetProfit)} sub={`Gross ${fmt(todayGrossProfit)} - Exp ${fmt(todayExpenses)}`} icon={<TrendingUp size={16} />} />
        <StatCard label="Week's Revenue" value={fmt(weekRevenue)} sub={`${weekSalesCount} sales recorded`} icon={<ShoppingBag size={16} />} />
        <StatCard label="Week's Net Profit" value={fmt(weekNetProfit)} sub={`Gross ${fmt(weekGrossProfit)} - Exp ${fmt(weekExpenses)}`} icon={<TrendingUp size={16} />} />
        <StatCard label="Total Stock Units" value={`${totalStockUnits.toLocaleString()} units`} sub={`${totalActiveSKUs} active SKUs`} icon={<Layers size={16} />} />
        <StatCard label="Total Stock Value" value={fmt(totalStockValue)} sub="Total valuation" icon={<Coins size={16} />} accent />
        <StatCard label="Low Stock Alerts" value={String(lowStock.length)} sub="At or below reorder" icon={<AlertTriangle size={16} />} accent={lowStock.length > 0} />

        {/* Financial Cards (8 new) */}
        <StatCard label="Month's Revenue" value={fmt(monthRevenue)} sub={`${monthSalesCount} sales this month`} icon={<Calendar size={16} />} accent />
        <StatCard label="Month's Net Profit" value={fmt(monthNetProfit)} sub={`Gross ${fmt(monthGrossProfit)} - Exp ${fmt(monthExpenses)}`} icon={<TrendingUp size={16} />} />
        <StatCard label="Total COGS" value={fmt(totalCOGS)} sub="Cost of Goods Sold" icon={<Receipt size={16} />} />
        <StatCard label="Total Discounts Given" value={fmt(totalDiscounts)} sub="Customer discounts" icon={<Percent size={16} />} />
        <StatCard label="Total Credit Outstanding" value={fmt(creditOutstanding)} sub="Uncollected debts" icon={<CreditCard size={16} />} accent={creditOutstanding > 0} />
        <StatCard label="Cash Collected Today" value={fmt(cashCollectedToday)} sub="Cash transactions" icon={<Wallet size={16} />} />
        <StatCard label="POS Collected Today" value={fmt(posCollectedToday)} sub="Card / POS terminal" icon={<Landmark size={16} />} />
        <StatCard label="Transfers Collected Today" value={fmt(transferCollectedToday)} sub="Bank transfers" icon={<ArrowUpRight size={16} />} />

        {/* Inventory Cards (9 new) */}
        <StatCard label="Total Active SKUs" value={`${totalActiveSKUs} SKUs`} sub="Active catalog items" icon={<Package size={16} />} />
        <StatCard label="Total Categories" value={String(totalCategories)} sub="Product categories" icon={<FolderTree size={16} />} />
        <StatCard label="Total Brands" value={String(totalBrands)} sub="Distinct brands" icon={<Tag size={16} />} />
        <StatCard label="Out of Stock Items" value={String(outOfStockItems.length)} sub="Zero quantity items" icon={<AlertCircle size={16} />} accent={outOfStockItems.length > 0} />
        <StatCard label="Overstocked Items" value={String(overstockedItems.length)} sub="High volume stock" icon={<Layers2 size={16} />} />
        <StatCard label="New Products (Month)" value={String(newProductsThisMonth)} sub="Added this month" icon={<Sparkles size={16} />} />
        <StatCard label="Unsold in 30 Days" value={String(productsNotSold30Days)} sub="Idle inventory" icon={<Clock size={16} />} />
        <StatCard label="Top Fast Mover" value={top5FastMoving ? top5FastMoving.name : 'None'} sub={top5FastMoving ? `${top5FastMoving.qty} units sold` : 'No sales yet'} icon={<ArrowUpRight size={16} />} accent />
        <StatCard label="Slowest Mover" value={slowest5Moving ? slowest5Moving.name : 'None'} sub={slowest5Moving ? `${slowest5Moving.qty} units sold` : 'No sales yet'} icon={<ArrowDownRight size={16} />} />

        {/* Sales & Customer Cards (5 new) */}
        <StatCard label="Sales Today Count" value={`${todaySalesCount} sales`} sub="Total orders today" icon={<Hash size={16} />} />
        <StatCard label="Sales Week Count" value={`${weekSalesCount} sales`} sub="Total orders 7 days" icon={<Hash size={16} />} />
        <StatCard label="Sales Month Count" value={`${monthSalesCount} sales`} sub="Total orders this month" icon={<Hash size={16} />} />
        <StatCard label="Average Sale Value" value={fmt(avgSaleValue)} sub="Per order average" icon={<Activity size={16} />} />
        <StatCard label="Total Customers" value={String(totalCustomers)} sub="Registered clients" icon={<Users size={16} />} />

        {/* Operational Cards (1 new) */}
        <StatCard label="Total Suppliers" value={String(totalSuppliers)} sub="Active vendors" icon={<Truck size={16} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Revenue & Net Profit — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={220}>
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
          {topProductsList.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>No sales recorded yet</div>
          ) : topProductsList.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topProductsList.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? 'var(--primary-foreground)' : 'var(--muted-foreground)', flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
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
