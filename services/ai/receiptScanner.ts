import { fromMinorUnits, toMinorUnits } from "@shared/lib/money";

export interface ScannedReceiptResult {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  rawText?: string;
  imageUri?: string;
}

const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

/**
 * Sends a base64 encoded receipt image to Gemini Multimodal Vision API to parse
 * merchant, amount, category, date, and item breakdown into structured data.
 */
export async function parseReceiptWithAI(
  base64Data: string,
  mimeType: string = "image/jpeg",
): Promise<ScannedReceiptResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Gemini API key is not configured. Please check your environment settings.",
    );
  }

  const prompt = `You are a high-accuracy receipt and invoice scanner for the Saldo expense tracker.
Analyze this receipt image carefully.
Extract:
1. merchant: The business, restaurant, vendor, or store name (string).
2. amount: The final total amount paid as a positive number (float/number, e.g. 1450.50). Do NOT include currency symbols in the number.
3. date: The transaction date in ISO format (YYYY-MM-DD). If no year is visible, use the current year. If date is completely absent, use today's date.
4. category: The best fitting expense category from: "Food & Dining", "Groceries", "Shopping", "Transport", "Bills & Utilities", "Entertainment", "Health & Wellness", "Education", "Travel", "Electronics", "General".
5. note: A brief 1-line itemized summary (e.g., "2x Latte, 1x Croissant" or "Invoice #1042").

Respond ONLY with a valid JSON object with EXACT keys: "merchant", "amount", "date", "category", "note".
Do NOT surround with backticks or markdown formatting. Output raw JSON only.`;

  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            ...(model.startsWith("gemini-2.5-")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : {}),
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        if (response.status === 404 || response.status === 503) {
          lastError = new Error(`Model ${model} unavailable (${response.status})`);
          continue;
        }
        if (response.status === 429) {
          throw new Error("AI rate limit reached. Please wait a moment and try again.");
        }
        throw new Error(
          errText ? `AI scan failed (${response.status})` : `HTTP ${response.status}`,
        );
      }

      const data = await response.json();
      const rawText: string =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

      if (!rawText) {
        throw new Error("AI returned empty receipt analysis.");
      }

      // Clean markdown code blocks if the model wrapped output
      const cleanedJson = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);

      const parsedAmount =
        typeof parsed.amount === "number"
          ? parsed.amount
          : parseFloat(String(parsed.amount || "0").replace(/[^0-9.]/g, "")) || 0;

      const safeAmount = fromMinorUnits(toMinorUnits(Math.abs(parsedAmount)));

      return {
        merchant: String(parsed.merchant || "Scanned Receipt").trim(),
        amount: safeAmount,
        date: String(parsed.date || new Date().toISOString().slice(0, 10)).trim(),
        category: String(parsed.category || "Shopping").trim(),
        note: String(parsed.note || "").trim(),
        rawText,
      };
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        throw new Error("Could not parse receipt details. Please enter manually.");
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw (
    lastError ??
    new Error("Unable to scan receipt at this time. Please try again.")
  );
}

