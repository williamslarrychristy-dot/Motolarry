import { useState } from 'react';
import { Bot, Send, Sparkles, CheckCircle2, ShieldCheck, HelpCircle, CornerDownLeft, RefreshCw, Zap } from 'lucide-react';
import { useData } from '../DataContext';
import { processAIAgentCommand, AIAgentMessage } from '../lib/ai';

const QUICK_PROMPTS = [
  "What is my total stock value and profit this week?",
  "Add 5 to the stock of Lippo Brake Shoe",
  "Add an alias 'brake pad' to all brake shoe products",
  "How many products are currently below reorder point?",
  "Create a new product called HJG G7 Light with price 5000 and stock 10",
  "Teach me how to use the Motolarry POS app",
];

export default function AIAgent() {
  const dataCtx = useData();
  const [messages, setMessages] = useState<AIAgentMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am Motolarry Autonomous AI Assistant. I have full read and write access to your Supabase database. You can instruct me in plain English to adjust stock, update prices, add product aliases, create items, or analyze sales and profit. How can I assist your shop today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [processing, setSubmitting] = useState(false);

  async function handleSend(textToSend?: string) {
    const cmd = (textToSend || input).trim();
    if (!cmd || processing) return;

    const userMsg: AIAgentMessage = { role: 'user', content: cmd };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setSubmitting(true);

    try {
      const result = await processAIAgentCommand(cmd, dataCtx);
      const assistantMsg: AIAgentMessage = {
        role: 'assistant',
        content: result.text,
        actionsExecuted: result.actionsExecuted,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an issue processing that command. Please try again or rephrase your request.",
      }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bot size={26} color="var(--primary)" /> Autonomous AI Assistant Terminal
          </h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '4px 0 0', fontSize: 13 }}>
            Full read & write database access — execute inventory actions, price updates, stock changes, and business queries in natural English.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#16a34a', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
          <ShieldCheck size={16} /> Supabase DB Execution Enabled
        </div>
      </div>

      {/* Quick Action Chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12 }}>
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={processing}
            style={{
              whiteSpace: 'nowrap', background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500,
              color: 'var(--foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Sparkles size={12} color="var(--primary)" /> {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div style={{
        flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16,
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex', gap: 12,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
            )}

            <div style={{
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)',
              color: msg.role === 'user' ? 'var(--primary-foreground)' : 'var(--foreground)',
              padding: '12px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
            }}>
              <div>{msg.content}</div>

              {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> Executed Database Actions
                  </div>
                  {msg.actionsExecuted.map((action, aIdx) => (
                    <div key={aIdx} style={{ fontSize: 12, background: 'rgba(34,197,94,0.1)', color: '#15803d', padding: '4px 8px', borderRadius: 4, fontFamily: 'var(--font-mono-face)' }}>
                      • {action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {processing && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>
            <RefreshCw size={16} style={{ animation: 'spin 1.2s linear infinite' }} />
            Motolarry AI Assistant is querying database & executing command...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        style={{ display: 'flex', gap: 10, position: 'relative' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask AI or give command e.g. 'Add 10 stock to Honda chain', 'Set cost price of tyres to 12000'..."
          disabled={processing}
          style={{
            flex: 1, padding: '14px 18px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', background: 'var(--card)', color: 'var(--foreground)',
            fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
        />
        <button
          type="submit"
          disabled={processing || !input.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            border: 'none', borderRadius: 'var(--radius)', padding: '0 20px',
            fontWeight: 700, fontSize: 14, cursor: processing || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: processing || !input.trim() ? 0.6 : 1,
          }}
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
