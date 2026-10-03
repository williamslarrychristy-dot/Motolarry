import { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Database, CheckCircle2, RefreshCw } from 'lucide-react';
import { useData } from '../DataContext';
import { Product, uid } from '../store';

const GROQ_API_KEY = import.meta.env.VITE_OPENAI_COMPATIBLE_API_KEY || "";
const GROQ_BASE_URL = import.meta.env.VITE_OPENAI_COMPATIBLE_API_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = import.meta.env.VITE_OPENAI_COMPATIBLE_MODEL || "openai/gpt-oss-120b";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actionTaken?: string;
}

export default function AIAssist() {
  const { products, sales, customers, expenses, setProducts } = useData();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your Motolarry AI Assistant. I have full read and write access to your inventory database. You can ask me to search items, update product details (like changing a brand, price, or stock), record expenses, or summarize sales!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Execute database action if requested by AI
  function handleDatabaseAction(actionCall: any): string {
    const { action, params } = actionCall;

    if (action === 'update_product_brand') {
      const { productNameOrSku, newBrand } = params;
      const target = products.find(p => p.name.toLowerCase().includes(productNameOrSku.toLowerCase()) || p.sku.toLowerCase() === productNameOrSku.toLowerCase());
      if (!target) return `Product matching "${productNameOrSku}" was not found.`;

      const updated = products.map(p => p.id === target.id ? { ...p, brand: newBrand } : p);
      setProducts(updated);
      return `Successfully updated brand for "${target.name}" (${target.sku}) to "${newBrand}".`;
    }

    if (action === 'update_product_qty') {
      const { productNameOrSku, newQty } = params;
      const target = products.find(p => p.name.toLowerCase().includes(productNameOrSku.toLowerCase()) || p.sku.toLowerCase() === productNameOrSku.toLowerCase());
      if (!target) return `Product matching "${productNameOrSku}" was not found.`;

      const updated = products.map(p => p.id === target.id ? { ...p, qty: Number(newQty) } : p);
      setProducts(updated);
      return `Successfully updated quantity for "${target.name}" to ${newQty}.`;
    }

    if (action === 'update_product_price') {
      const { productNameOrSku, newSalePrice, newCostPrice } = params;
      const target = products.find(p => p.name.toLowerCase().includes(productNameOrSku.toLowerCase()) || p.sku.toLowerCase() === productNameOrSku.toLowerCase());
      if (!target) return `Product matching "${productNameOrSku}" was not found.`;

      const updated = products.map(p => p.id === target.id ? {
        ...p,
        salePrice: newSalePrice !== undefined ? Number(newSalePrice) : p.salePrice,
        costPrice: newCostPrice !== undefined ? Number(newCostPrice) : p.costPrice,
      } : p);
      setProducts(updated);
      return `Successfully updated price for "${target.name}". Sale Price: ₦${newSalePrice ?? target.salePrice}.`;
    }

    if (action === 'add_product') {
      const { name, sku, category, brand, salePrice, costPrice, qty } = params;
      const newProd: Product = {
        id: uid(),
        name,
        description: params.description || '',
        sku: sku || `SKU-${Math.floor(Math.random() * 10000)}`,
        barcode: params.barcode || '',
        category: category || 'General Parts',
        subcategory: '',
        brand: brand || 'Generic',
        manufacturer: '',
        fitment: params.fitment || '',
        costPrice: Number(costPrice) || 0,
        salePrice: Number(salePrice) || 0,
        msrp: Number(salePrice) || 0,
        qty: Number(qty) || 0,
        reorderPoint: 5,
        reorderQty: 10,
        location: params.location || '',
        imageUrl: params.imageUrl || '',
        aliases: params.aliases || '',
        active: true,
        tags: '',
        serialTracked: false,
        supplierId: '',
        createdAt: new Date().toISOString(),
      };
      setProducts([...products, newProd]);
      return `Added new product "${newProd.name}" (${newProd.sku}) with ${newProd.qty} in stock.`;
    }

    return 'Action executed.';
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // System instructions providing current DB state and JSON action instructions
      const systemPrompt = `You are an AI Assistant for Motolarry Moto Parts Inventory App.
You have FULL ACCESS to read and write to the store's database.

Current Database State Summary:
- Products (${products.length} items): ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, sku: p.sku, brand: p.brand, price: p.salePrice, qty: p.qty, category: p.category })))}
- Recent Sales (${sales.length} transactions, total revenue: ₦${sales.reduce((a, s) => a + s.total, 0)}): ${JSON.stringify(sales.slice(-5).map(s => ({ id: s.id, total: s.total, itemsCount: s.items.length, date: s.timestamp })))}
- Customers (${customers.length} registered): ${JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, owes: c.balance })))}
- Expenditures (${expenses.length} entries): ₦${expenses.reduce((a, e) => a + e.amount, 0)} total spent.

If the user asks you to modify, update, change, or add something in the database (for example: "change product X brand to Y", "set quantity of X to 20", "update price of X to 5000", "add product Z"):
Include an explicit JSON action block at the VERY END of your response in this exact format:
\`\`\`action
{
  "action": "update_product_brand" | "update_product_qty" | "update_product_price" | "add_product",
  "params": { ... }
}
\`\`\`

Supported actions and parameters:
1. "update_product_brand": { "productNameOrSku": "string", "newBrand": "string" }
2. "update_product_qty": { "productNameOrSku": "string", "newQty": number }
3. "update_product_price": { "productNameOrSku": "string", "newSalePrice": number, "newCostPrice"?: number }
4. "add_product": { "name": "string", "sku"?: "string", "category"?: "string", "brand"?: "string", "salePrice": number, "costPrice": number, "qty": number }

Be helpful, concise, and professional.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: apiMessages,
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        throw new Error(`Groq API returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const aiReply = data.choices?.[0]?.message?.content || "I couldn't process that request.";

      // Check if response contains an action block
      let actionResultText = '';
      const actionMatch = aiReply.match(/```action\s*([\s\S]*?)\s*```/);
      let cleanReply = aiReply.replace(/```action\s*[\s\S]*?\s*```/, '').trim();

      if (actionMatch && actionMatch[1]) {
        try {
          const actionCall = JSON.parse(actionMatch[1]);
          actionResultText = handleDatabaseAction(actionCall);
        } catch (err) {
          console.error("Action JSON parse error:", err);
        }
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: cleanReply,
          actionTaken: actionResultText || undefined,
        },
      ]);
    } catch (err: any) {
      console.error("AI Assist error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Apologies, I encountered an error communicating with the AI model: ${err.message || 'Network error'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} color="var(--primary)" /> AI Database Assist
          </h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
            Full-stack AI co-pilot with live database read/write access powered by Groq
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', padding: '6px 12px', borderRadius: 20, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
          <Database size={14} /> Full DB Access
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
            )}
            <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                background: m.role === 'user' ? 'var(--primary)' : 'var(--secondary)',
                color: m.role === 'user' ? 'var(--primary-foreground)' : 'var(--foreground)',
                padding: '12px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>

              {m.actionTaken && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#15803d', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Database Executed: {m.actionTaken}
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexShrink: 0 }}>
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Bot size={18} />
            </div>
            <div style={{ background: 'var(--secondary)', padding: '10px 16px', borderRadius: 12, fontSize: 13, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing query & database operations…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask AI e.g. 'Change Rear shock rubber brand to Honda' or 'Add product Clutch Cable ₦3000'..."
          style={{ flex: 1, padding: '12px 16px', fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? 'var(--primary)' : 'var(--secondary)',
            color: input.trim() && !loading ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            padding: '0 20px', borderRadius: 'var(--radius)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
