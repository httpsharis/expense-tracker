import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@shared/types/database.types";
import { getAccountsWithBalances } from "../accounts";
import { getBudgets } from "../budget";
import { getCategories } from "../categories";
import { getGroups } from "../splits";
import { getTransactions } from "../transactions";
import { runAgentLoop, type ModelTurnResponse } from "./agentLoop";
import { runReadOnlyOfflineFallback } from "./fallback";
import { buildSystemInstruction } from "./prompt";
import {
  executeConfirmedProposal,
  executeToolCall,
  GEMINI_TOOL_DECLARATIONS,
} from "./tools";
import type {
  AIAgentContext,
  AssistantContext,
  ChatMessage,
  GeminiContent,
  GeminiPart,
  KnownGroup,
  KnownPerson,
  ToolCallAction,
} from "./types";

const MAX_HISTORY_MESSAGES = 10;
const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

async function callGeminiDirect(
  apiKey: string,
  systemInstructionText: string,
  turnContents: GeminiContent[],
): Promise<ModelTurnResponse> {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const bodyPayload: Record<string, unknown> = {
      system_instruction: {
        parts: [{ text: systemInstructionText }],
      },
      contents: turnContents,
      tools: GEMINI_TOOL_DECLARATIONS,
      generationConfig: {
        temperature: 0.2,
        ...(model.startsWith("gemini-2.5-")
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
        parts?: GeminiPart[];
      };
      const parts: GeminiPart[] =
        data?.candidates?.[0]?.content?.parts ??
        (Array.isArray(data?.parts) ? data.parts : []);
      return { parts };
    }

    const errBody = await response.text().catch(() => "");
    if (response.status === 404 || response.status === 503) {
      lastError = new Error(`Model ${model} unavailable (${response.status}).`);
      continue;
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limit reached for Saldo AI. Please wait a moment and try again.",
      );
    }
    throw new Error(
      errBody
        ? `AI request failed (${response.status}).`
        : `AI request failed with status ${response.status}.`,
    );
  }

  throw lastError ?? new Error("All Gemini models are currently unavailable.");
}

let cachedAssistantContext: {
  userId: string;
  timestamp: number;
  data: AssistantContext;
} | null = null;
const CONTEXT_CACHE_TTL_MS = 30_000;

export function invalidateAssistantContextCache(): void {
  cachedAssistantContext = null;
}

async function loadAssistantContext(
  supabase: SupabaseClient<Database>,
  agentContext: AIAgentContext,
): Promise<AssistantContext> {
  if (
    cachedAssistantContext &&
    cachedAssistantContext.userId === agentContext.userId &&
    Date.now() - cachedAssistantContext.timestamp < CONTEXT_CACHE_TTL_MS
  ) {
    return cachedAssistantContext.data;
  }

  const [accounts, categories, recentTransactions, budgets, groups] =
    await Promise.all([
      getAccountsWithBalances(supabase, agentContext.userId).catch(() => []),
      getCategories(supabase, agentContext.userId).catch(() => []),
      getTransactions(supabase, agentContext.userId, { limit: 30 }).catch(
        () => [],
      ),
      getBudgets(supabase, agentContext.userId).catch(() => []),
      getGroups(supabase, agentContext.userId).catch(() => []),
    ]);

  const knownGroups: KnownGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    members: (group.members ?? []).map((member) => member.name),
  }));

  const personByKey = new Map<string, KnownPerson>();
  for (const group of groups) {
    for (const member of group.members ?? []) {
      const trimmed = member.name.trim();
      if (!trimmed || trimmed.toLowerCase() === "you") continue;
      const key = trimmed.toLowerCase();
      if (!personByKey.has(key)) {
        personByKey.set(key, {
          id: member.id,
          name: trimmed,
          groupId: group.id,
        });
      }
    }
  }

  const result: AssistantContext = {
    userId: agentContext.userId,
    currency: agentContext.currency,
    accounts,
    categories,
    recentTransactions,
    budgets,
    knownPeople: Array.from(personByKey.values()),
    knownGroups,
  };

  cachedAssistantContext = {
    userId: agentContext.userId,
    timestamp: Date.now(),
    data: result,
  };

  return result;
}

function buildInitialContents(
  history: readonly ChatMessage[],
  userPrompt: string,
): GeminiContent[] {
  const contents: GeminiContent[] = history
    .filter((msg) => msg.id !== "welcome-msg" && msg.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: msg.content }],
    }));

  contents.push({
    role: "user",
    parts: [{ text: userPrompt }],
  });

  return contents;
}

function isNetworkUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const errObj = error as { name?: string; message?: string; status?: number };
  if (typeof errObj.status === "number") {
    return false;
  }
  const msg = (errObj.message ?? "").toLowerCase();
  return (
    errObj.name === "FunctionsFetchError" ||
    msg.includes("failed to fetch") ||
    msg.includes("network request failed") ||
    msg.includes("failed to send a request to the edge function")
  );
}

/**
 * Sends a user message through the multi-step Saldo AI agent loop (`runAgentLoop`),
 * executing read/write tools and returning any confirmation proposals.
 */
export async function sendChatMessage(
  supabase: SupabaseClient<Database>,
  history: ChatMessage[],
  userPrompt: string,
  context: AIAgentContext,
): Promise<{
  text: string;
  toolAction?: ToolCallAction;
  toolActions?: ToolCallAction[];
}> {
  const assistantContext = await loadAssistantContext(supabase, context);
  const systemInstructionText = buildSystemInstruction(assistantContext);
  const initialContents = buildInitialContents(history, userPrompt);
  const clientGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? "";

  const callModel = async (
    turnContents: GeminiContent[],
  ): Promise<ModelTurnResponse> => {
    // If client Gemini API key is configured, call Gemini directly for immediate sub-second response
    if (clientGeminiKey) {
      try {
        return await callGeminiDirect(
          clientGeminiKey,
          systemInstructionText,
          turnContents,
        );
      } catch (directErr) {
        // Fall back to Supabase Edge Function if direct key fails (e.g. temporary quota or network block)
        const { data, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            context_summary: systemInstructionText,
            system_instruction: {
              parts: [{ text: systemInstructionText }],
            },
            contents: turnContents,
            tools: GEMINI_TOOL_DECLARATIONS,
          },
        });
        if (!error && data) {
          const parts: GeminiPart[] =
            data?.candidates?.[0]?.content?.parts ??
            (Array.isArray(data?.parts) ? data.parts : []);
          return { parts };
        }
        throw directErr;
      }
    }

    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        context_summary: systemInstructionText,
        system_instruction: {
          parts: [{ text: systemInstructionText }],
        },
        contents: turnContents,
        tools: GEMINI_TOOL_DECLARATIONS,
      },
    });

    if (error) {
      let status: number | undefined;
      let serverMessage: string | undefined;

      const httpError = error as { status?: number; context?: Response };
      if (typeof httpError.status === "number") {
        status = httpError.status;
      }
      if (httpError.context && typeof httpError.context.status === "number") {
        status = httpError.context.status;
        try {
          const body = await httpError.context.clone().json();
          if (typeof body === "string") {
            serverMessage = body;
          } else if (body && typeof body === "object") {
            const errObj = body as Record<string, unknown>;
            if (typeof errObj.error === "string") {
              serverMessage = errObj.error;
            } else if (errObj.error && typeof errObj.error === "object") {
              const nested = errObj.error as Record<string, unknown>;
              if (typeof nested.message === "string") {
                serverMessage = nested.message;
              }
            } else if (typeof errObj.message === "string") {
              serverMessage = errObj.message;
            }
          }
        } catch {
          // not JSON
        }
      }

      if (status === 401 || status === 403) {
        throw new Error("Your session expired or is unauthorized. Please sign in again.");
      }
      if (status === 429) {
        throw new Error(
          "Rate limit reached for Saldo AI. Please wait a moment and try again.",
        );
      }
      if (status === 503) {
        throw new Error(
          serverMessage ||
            "Gemini API key is not configured on Supabase yet. Set GEMINI_API_KEY in Supabase secrets, or add EXPO_PUBLIC_GEMINI_API_KEY in your .env file.",
        );
      }
      if (status === 404) {
        throw new Error(
          "AI Edge Function is not deployed to Supabase yet. Deploy it or add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.",
        );
      }

      if (serverMessage) {
        throw new Error(serverMessage);
      }

      throw error;
    }

    const parts: GeminiPart[] =
      data?.candidates?.[0]?.content?.parts ??
      (Array.isArray(data?.parts) ? data.parts : []);

    return { parts };
  };

  try {
    const result = await runAgentLoop({
      contents: initialContents,
      callModel,
      executeTool: (name, args) =>
        executeToolCall(supabase, assistantContext, name, args),
      maxSteps: 4,
    });

    if (result.actions.some((action) => action.status === "executed")) {
      invalidateAssistantContextCache();
    }

    const primaryAction =
      result.actions.find((action) => action.status === "pending_confirmation") ??
      result.actions[result.actions.length - 1];

    return {
      text: result.text,
      toolAction: primaryAction,
      toolActions: result.actions,
    };
  } catch (err) {
    if (isNetworkUnreachableError(err)) {
      return runReadOnlyOfflineFallback(userPrompt, assistantContext);
    }

    const msg = (err instanceof Error ? err.message : "").toLowerCase();
    if (
      msg.includes("not configured") ||
      msg.includes("unavailable") ||
      msg.includes("not deployed")
    ) {
      const fallback = runReadOnlyOfflineFallback(userPrompt, assistantContext);
      if (fallback.toolAction) {
        return fallback;
      }
      return {
        text: "Saldo AI is not configured yet. To use the full AI assistant:\n\n• Add `EXPO_PUBLIC_GEMINI_API_KEY=your_key` to your `.env` file\nOR\n• Run `bun x supabase secrets set GEMINI_API_KEY=your_key`\n\n*(You can still ask me about your current balances and budgets!)*",
      };
    }

    throw err;
  }
}

/**
 * Executes a user-confirmed AI proposal (`log_transactions` batch, `create_split_expense`,
 * `create_loan`, or `propose_delete_transaction`).
 */
export async function confirmToolAction(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: ToolCallAction,
): Promise<string> {
  invalidateAssistantContextCache();
  return executeConfirmedProposal(supabase, userId, action);
}

