import { useState, useMemo } from 'react';
import { Plus, Receipt, Search, Calendar, Filter, DollarSign, Trash2 } from 'lucide-react';
import { useData } from '../DataContext';
import { Expense, fmt, uid } from '../store';

const EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Utilities (Electricity, Water)',
  'Rent & Lease',
  'Stationery & Supplies',
  'Transport & Logistics',
  'Maintenance & Repairs',
  'Marketing & Promo',
  'Miscellaneous',
];

export default function Expenditures() {
  const { expenses, addExpense, setExpenses } = useData();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const totalAllTime = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalThisMonth = useMemo(() => expenses.filter(e => e.date.startsWith(currentMonthStr)).reduce((sum, e) => sum + e.amount, 0), [expenses, currentMonthStr]);
  const totalToday = useMemo(() => expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0), [expenses, todayStr]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.note.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'All' || e.category === selectedCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, search, selectedCategory]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid title and expenditure amount.');
      return;
    }

    setSubmitting(true);
    const newExp: Expense = {
      id: uid(),
      title: title.trim(),
      amount: parsedAmount,
      category,
      date,
      note: note.trim(),
      recordedBy: 'admin',
      createdAt: new Date().toISOString(),
    };

    await addExpense(newExp);
    setTitle('');
    setAmount('');
    setNote('');
    setSubmitting(false);
    setShowAddModal(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this expenditure record?')) {
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Receipt size={24} color="var(--primary)" /> Expenditures & Shop Operating Costs
          </h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
            Record and manage all operational expenses including staff salaries, utilities, transport, and stationery.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            border: 'none', borderRadius: 'var(--radius)', padding: '10px 16px',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Record Expenditure
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            Today's Expenditures
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(totalToday)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>Recorded today</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            This Month's Expenditures
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(totalThisMonth)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>Current calendar month</div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>
            Total Expenditures Recorded
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'var(--font-mono-face)' }}>
            {fmt(totalAllTime)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{expenses.length} entries total</div>
        </div>
      </div>

      {/* Controls / Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search by expense title or note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--card)', color: 'var(--foreground)', fontSize: 13,
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} color="var(--muted-foreground)" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '9px 12px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', background: 'var(--card)',
              color: 'var(--foreground)', fontSize: 13,
            }}
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Title</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)' }}>Note</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  No expenditures found. Click <strong>"Record Expenditure"</strong> to log a shop expense.
                </td>
              </tr>
            ) : filtered.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono-face)', color: 'var(--muted-foreground)' }}>
                  {exp.date}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--foreground)' }}>
                  {exp.title}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: 'var(--secondary)', color: 'var(--secondary-foreground)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                  }}>
                    {exp.category}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--muted-foreground)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {exp.note || '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono-face)', color: '#ef4444' }}>
                  {fmt(exp.amount)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    title="Delete entry"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Record New Shop Expenditure</h2>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
                  Expenditure Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. November Staff Salaries, Generator Fuel, Shop Rent"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
                    Amount (NGN) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13,
                  }}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--muted-foreground)' }}>
                  Note / Receipt Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional details, bank receipt number, or beneficiary info..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', background: 'var(--background)', color: 'var(--foreground)', fontSize: 13,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 16px', background: 'var(--secondary)', color: 'var(--secondary-foreground)',
                    border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)',
                    border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Expenditure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
