import type { GeminiContent, GeminiPart, ToolCallAction } from "./types";

export interface ModelTurnResponse {
  parts: GeminiPart[];
}

export interface ToolExecutionOutcome {
  status: "executed" | "pending_confirmation" | "error";
  response: Record<string, unknown>;
  summary?: string;
  action?: ToolCallAction;
}

export interface RunAgentLoopParams {
  contents: readonly GeminiContent[];
  callModel: (contents: GeminiContent[]) => Promise<ModelTurnResponse>;
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<ToolExecutionOutcome>;
  maxSteps?: number;
}

export interface AgentLoopResult {
  status: "completed" | "pending_confirmation" | "max_steps_exceeded";
  text: string;
  contents: GeminiContent[];
  actions: ToolCallAction[];
  stepsUsed: number;
}

const DEFAULT_MAX_STEPS = 4;

function extractTextFromParts(parts: readonly GeminiPart[]): string {
  return parts
    .filter((part) => !part.thought)
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Pure multi-step Gemini tool-calling loop.
 * - Reads all parts from each model turn (text + multiple functionCalls + thoughtSignature).
 * - Echoes back the full model parts array (preserving thoughtSignature) before appending functionResponse parts.
 * - Halts immediately without another model call when any tool returns status: "pending_confirmation".
 * - Caps iterations at maxSteps (default 4).
 */
export async function runAgentLoop({
  contents,
  callModel,
  executeTool,
  maxSteps = DEFAULT_MAX_STEPS,
}: RunAgentLoopParams): Promise<AgentLoopResult> {
  const workingContents: GeminiContent[] = contents.map((turn) => ({
    role: turn.role,
    parts: [...turn.parts],
  }));
  const collectedActions: ToolCallAction[] = [];
  let latestText = "";
  let latestSummary = "";

  for (let stepIndex = 0; stepIndex < maxSteps; stepIndex += 1) {
    const modelResponse = await callModel(workingContents);
    const parts = modelResponse.parts ?? [];
    const stepText = extractTextFromParts(parts);
    if (stepText) {
      latestText = stepText;
    }

    const functionCallParts = parts.filter(
      (part): part is GeminiPart & { functionCall: NonNullable<GeminiPart["functionCall"]> } =>
        Boolean(part.functionCall && typeof part.functionCall.name === "string"),
    );

    if (functionCallParts.length === 0) {
      workingContents.push({
        role: "model",
        parts: parts.length > 0 ? parts : [{ text: latestText || "Done." }],
      });
      return {
        status: "completed",
        text:
          stepText ||
          latestSummary ||
          "I processed your request.",
        contents: workingContents,
        actions: collectedActions,
        stepsUsed: stepIndex + 1,
      };
    }

    workingContents.push({
      role: "model",
      parts,
    });

    const functionResponseParts: GeminiPart[] = [];
    let hasPendingConfirmation = false;
    const stepSummaries: string[] = [];

    for (const part of functionCallParts) {
      const { name, args } = part.functionCall;
      let outcome: ToolExecutionOutcome;

      try {
        outcome = await executeTool(name, args ?? {});
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Tool execution failed.";
        outcome = {
          status: "error",
          response: { error: errorMessage },
          summary: errorMessage,
        };
      }

      if (outcome.action) {
        collectedActions.push(outcome.action);
      }
      if (outcome.summary) {
        stepSummaries.push(outcome.summary);
        latestSummary = outcome.summary;
      }
      if (outcome.status === "pending_confirmation") {
        hasPendingConfirmation = true;
      }

      functionResponseParts.push({
        functionResponse: {
          name,
          response: outcome.response,
        },
      });
    }

    workingContents.push({
      role: "user",
      parts: functionResponseParts,
    });

    if (hasPendingConfirmation) {
      return {
        status: "pending_confirmation",
        text:
          stepText ||
          stepSummaries.join(" ") ||
          "Please review and confirm this action.",
        contents: workingContents,
        actions: collectedActions,
        stepsUsed: stepIndex + 1,
      };
    }
  }

  return {
    status: "max_steps_exceeded",
    text:
      latestText ||
      latestSummary ||
      "I completed the maximum number of tool steps for this turn.",
    contents: workingContents,
    actions: collectedActions,
    stepsUsed: maxSteps,
  };
}

