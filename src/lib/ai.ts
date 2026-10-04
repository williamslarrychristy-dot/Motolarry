import { Product, Sale, StockMovement, Supplier, Customer, Expense, uid, saveSingleProduct, saveSingleMovement, saveSingleSale, fmt } from '../store';
import { supabase } from './supabase';

const GEMINI_API_KEY = "AQ.Ab8RN6I7qwIhYaDggaDPjACMQDKSpB1A5122wNnChh8IC_zTEw";

export type AIAgentContext = {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
  setProducts: (p: Product[]) => void;
  setSales: (s: Sale[]) => void;
  setMovements: (m: StockMovement[]) => void;
  refresh: () => Promise<void>;
};

export type AIAgentMessage = {
  role: 'user' | 'assistant';
  content: string;
  actionsExecuted?: string[];
};

export type AISearchResult = {
  answer: string;
  matchedProductIds: string[];
};

export async function queryAIAssistant(
  userQuery: string,
  products: Product[]
): Promise<AISearchResult> {
  const q = userQuery.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const matched = products.filter(p => {
    const text = `${p.name} ${p.sku} ${p.category} ${p.fitment} ${p.aliases} ${p.tags}`.toLowerCase();
    return tokens.some(t => text.includes(t));
  });

  return {
    answer: matched.length > 0
      ? `Found ${matched.length} parts matching "${userQuery}" in stock.`
      : `No exact matches found for "${userQuery}". Try searching by category or bike model.`,
    matchedProductIds: matched.map(p => p.id),
  };
}

export async function processAIAgentCommand(
  userCommand: string,
  ctx: AIAgentContext
): Promise<{ text: string; actionsExecuted: string[] }> {
  const executedActions: string[] = [];

  const catalogSummary = ctx.products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    qty: p.qty,
    aliases: p.aliases,
  }));

  const systemPrompt = `You are Motolarry AI Assistant, an autonomous enterprise agent for Motolarry Moto Parts POS & Inventory.
You have FULL READ and WRITE permissions to perform actions directly on the database catalog.

Current Inventory Catalog JSON (${catalogSummary.length} items):
${JSON.stringify(catalogSummary.slice(0, 80))}

User Command: "${userCommand}"

You can execute database actions if requested. Available tools you can call:
1. UPDATE_STOCK: Mode can be 'add', 'subtract', or 'set'.
2. UPDATE_PRICE: Update 'salePrice' or 'costPrice' for a product.
3. UPDATE_DETAILS: Update 'name', 'aliases', 'description', 'fitment', or 'category'.
4. CREATE_PRODUCT: Create a new inventory product.
5. DELETE_PRODUCT: Soft-delete or remove a product.

Respond in JSON with this structure:
{
  "explanation": "Detailed, friendly response explaining what was done or answering the question.",
  "toolCalls": [
    {
      "tool": "UPDATE_STOCK" | "UPDATE_PRICE" | "UPDATE_DETAILS" | "CREATE_PRODUCT" | "DELETE_PRODUCT",
      "params": { ... }
    }
  ]
}
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        const explanation = parsed.explanation || "Action completed.";
        const toolCalls = Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [];

        let updatedProducts = [...ctx.products];

        for (const call of toolCalls) {
          if (call.tool === 'UPDATE_STOCK') {
            const { productId, productName, mode, qty, reason } = call.params || {};
            const target = updatedProducts.find(p => p.id === productId || p.name.toLowerCase().includes((productName || '').toLowerCase()));
            if (target) {
              let newQty = target.qty;
              if (mode === 'add') newQty += Number(qty || 0);
              else if (mode === 'subtract') newQty = Math.max(0, newQty - Number(qty || 0));
              else if (mode === 'set') newQty = Number(qty || 0);

              const qtyDiff = newQty - target.qty;
              target.qty = newQty;
              await saveSingleProduct(target);

              const mv: StockMovement = {
                id: uid(),
                productId: target.id,
                type: qtyDiff >= 0 ? 'restock' : 'adjustment',
                qty: qtyDiff,
                reason: reason || `AI Agent command: ${userCommand}`,
                userId: 'ai_agent',
                timestamp: new Date().toISOString(),
              };
              await saveSingleMovement(mv);
              executedActions.push(`Updated stock of "${target.name}" to ${newQty} units (${qtyDiff >= 0 ? '+' : ''}${qtyDiff}).`);
            }
          } else if (call.tool === 'UPDATE_PRICE') {
            const { productId, productName, salePrice, costPrice } = call.params || {};
            const target = updatedProducts.find(p => p.id === productId || p.name.toLowerCase().includes((productName || '').toLowerCase()));
            if (target) {
              if (salePrice !== undefined && salePrice !== null) target.salePrice = Number(salePrice);
              if (costPrice !== undefined && costPrice !== null) target.costPrice = Number(costPrice);
              await saveSingleProduct(target);
              executedActions.push(`Updated prices for "${target.name}" (Sale: ₦${target.salePrice}, Cost: ₦${target.costPrice}).`);
            }
          } else if (call.tool === 'UPDATE_DETAILS') {
            const { productId, productName, name, aliases, description, category } = call.params || {};
            const target = updatedProducts.find(p => p.id === productId || p.name.toLowerCase().includes((productName || '').toLowerCase()));
            if (target) {
              if (name) target.name = name;
              if (aliases) target.aliases = target.aliases ? `${target.aliases}, ${aliases}` : aliases;
              if (description) target.description = description;
              if (category) target.category = category;
              await saveSingleProduct(target);
              executedActions.push(`Updated details for "${target.name}".`);
            }
          } else if (call.tool === 'CREATE_PRODUCT') {
            const { name, category, salePrice, costPrice, qty, sku, aliases } = call.params || {};
            if (name) {
              const newProd: Product = {
                id: uid(),
                name,
                description: 'Created by AI Assistant',
                sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                barcode: '',
                category: category || 'General',
                subcategory: '',
                brand: '',
                manufacturer: '',
                fitment: '',
                costPrice: Number(costPrice || 0),
                salePrice: Number(salePrice || 0),
                msrp: 0,
                qty: Number(qty || 0),
                reorderPoint: 5,
                reorderQty: 10,
                location: '',
                imageUrl: '',
                aliases: aliases || '',
                active: true,
                tags: 'ai-created',
                serialTracked: false,
                supplierId: '',
                createdAt: new Date().toISOString(),
              };
              await saveSingleProduct(newProd);
              updatedProducts.push(newProd);
              executedActions.push(`Created product "${newProd.name}" (SKU: ${newProd.sku}, Price: ₦${newProd.salePrice}, Stock: ${newProd.qty}).`);
            }
          } else if (call.tool === 'DELETE_PRODUCT') {
            const { productId, productName } = call.params || {};
            const targetIndex = updatedProducts.findIndex(p => p.id === productId || p.name.toLowerCase().includes((productName || '').toLowerCase()));
            if (targetIndex !== -1) {
              const removed = updatedProducts[targetIndex];
              updatedProducts = updatedProducts.filter((_, idx) => idx !== targetIndex);
              await supabase.from('products').delete().eq('id', removed.id);
              executedActions.push(`Deleted product "${removed.name}".`);
            }
          }
        }

        ctx.setProducts(updatedProducts);
        return { text: explanation, actionsExecuted };
      }
    }
  } catch (e) {
    console.warn("AI Gemini call failed, using local agent fallback:", e);
  }

  return fallbackAgentExecution(userCommand, ctx);
}

function fallbackAgentExecution(cmd: string, ctx: AIAgentContext): { text: string; actionsExecuted: string[] } {
  const executedActions: string[] = [];
  const lower = cmd.toLowerCase();

  const activeProducts = ctx.products.filter(p => p.active);
  const totalStockUnits = activeProducts.reduce((sum, p) => sum + (p.qty || 0), 0);
  const totalStockValue = activeProducts.reduce((sum, p) => {
    const priceToUse = (p.costPrice && p.costPrice > 0) ? p.costPrice : (p.salePrice || 0);
    return sum + (priceToUse * (p.qty || 0));
  }, 0);

  // Question 1: Stock value / valuation
  if (lower.includes('stock value') || lower.includes('worth') || lower.includes('valuation')) {
    return {
      text: `Your current total stock valuation is ${fmt(totalStockValue)} across ${totalStockUnits.toLocaleString()} units (${activeProducts.length} active SKUs).`,
      actionsExecuted,
    };
  }

  // Question 2: Low stock
  if (lower.includes('reorder') || lower.includes('low stock')) {
    const lowStock = activeProducts.filter(p => p.qty <= p.reorderPoint);
    return {
      text: `You currently have ${lowStock.length} items at or below their reorder point.`,
      actionsExecuted,
    };
  }

  // Pattern 1: Add/Subtract stock
  if (lower.includes('add') && lower.includes('stock')) {
    const matchQty = lower.match(/\b(\d+)\b/);
    if (matchQty) {
      const qty = parseInt(matchQty[1], 10);
      const target = ctx.products.find(p => lower.includes(p.name.toLowerCase()) || (p.aliases && lower.includes(p.aliases.toLowerCase())));
      if (target) {
        target.qty += qty;
        saveSingleProduct(target).catch(() => {});
        ctx.setProducts([...ctx.products]);
        executedActions.push(`Added ${qty} units to stock of "${target.name}".`);
        return {
          text: `Done! Added ${qty} units to ${target.name}. New total stock is ${target.qty} units.`,
          actionsExecuted,
        };
      }
    }
  }

  // Pattern 2: Total profit question
  if (lower.includes('profit')) {
    const totalProf = ctx.sales.reduce((a, s) => a + s.profit, 0);
    return {
      text: `Your total recorded sales profit to date is ${fmt(totalProf)}. You can view day/week/month profit breakdowns in the Reports & Analytics tab.`,
      actionsExecuted,
    };
  }

  return {
    text: `I'm Motolarry Autonomous AI Assistant. Your current catalog has ${activeProducts.length} active products with a total stock value of ${fmt(totalStockValue)}. You can instruct me to update stock levels, adjust prices, add aliases, create items, or query business metrics!`,
    actionsExecuted,
  };
}
