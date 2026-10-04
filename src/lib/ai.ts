import { Product } from '../store';

const GEMINI_API_KEY = "AQ.Ab8RN6I7qwIhYaDggaDPjACMQDKSpB1A5122wNnChh8IC_zTEw";

export type AISearchResult = {
  answer: string;
  matchedProductIds: string[];
};

export async function queryAIAssistant(
  userQuery: string,
  products: Product[]
): Promise<AISearchResult> {
  const compactCatalog = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    fitment: p.fitment,
    aliases: p.aliases,
    price: p.salePrice,
    qty: p.qty,
  }));

  const prompt = `You are an expert motorcycle parts assistant for Motolarry Moto Parts.
A customer or shop attendant is looking for parts with this description/query: "${userQuery}".

Here is the current inventory catalog JSON:
${JSON.stringify(compactCatalog)}

Identify which product(s) match the query best based on names, aliases, motorcycle fitment, and part categories.
Respond in valid JSON with this structure:
{
  "answer": "A concise, helpful explanation in 2 sentences about which parts match and why.",
  "matchedProductIds": ["id1", "id2"]
}
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error, falling back to local fuzzy match:", errText);
      return localFuzzySearch(userQuery, products);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const parsed = JSON.parse(rawText);
      return {
        answer: parsed.answer || "Found matching parts in stock.",
        matchedProductIds: Array.isArray(parsed.matchedProductIds) ? parsed.matchedProductIds : [],
      };
    }
  } catch (err) {
    console.error("AI Assistant Exception:", err);
  }

  return localFuzzySearch(userQuery, products);
}

function localFuzzySearch(query: string, products: Product[]): AISearchResult {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const matched = products.filter(p => {
    const text = `${p.name} ${p.sku} ${p.category} ${p.fitment} ${p.aliases} ${p.tags}`.toLowerCase();
    return tokens.some(t => text.includes(t));
  });

  return {
    answer: matched.length > 0
      ? `Found ${matched.length} parts matching "${query}" in stock.`
      : `No exact matches found for "${query}". Try searching by category or bike model.`,
    matchedProductIds: matched.map(p => p.id),
  };
}
