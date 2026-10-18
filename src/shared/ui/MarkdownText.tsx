import React, { useMemo } from "react";
import { Text, View } from "react-native";

interface InlineToken {
  type: "text" | "bold" | "italic" | "boldItalic" | "code";
  text: string;
}

interface MarkdownBlock {
  type:
    | "heading1"
    | "heading2"
    | "heading3"
    | "bullet"
    | "numbered"
    | "codeblock"
    | "quote"
    | "paragraph";
  content: string;
  number?: string;
}

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex =
    /(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[2]) {
      tokens.push({ type: "boldItalic", text: match[2] });
    } else if (match[4]) {
      tokens.push({ type: "bold", text: match[4] });
    } else if (match[6]) {
      tokens.push({ type: "italic", text: match[6] });
    } else if (match[8]) {
      tokens.push({ type: "code", text: match[8] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", text }];
}

function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const lines = raw.split("\n");
  const blocks: MarkdownBlock[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "codeblock",
          content: codeBuffer.join("\n"),
        });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading3", content: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      blocks.push({ type: "heading2", content: trimmed.slice(3) });
    } else if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading1", content: trimmed.slice(2) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({ type: "bullet", content: trimmed.slice(2) });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
      if (numMatch) {
        blocks.push({
          type: "numbered",
          number: numMatch[1],
          content: numMatch[2],
        });
      } else {
        blocks.push({ type: "paragraph", content: trimmed });
      }
    } else if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", content: trimmed.slice(2) });
    } else {
      blocks.push({ type: "paragraph", content: trimmed });
    }
  }

  if (codeBuffer.length > 0) {
    blocks.push({ type: "codeblock", content: codeBuffer.join("\n") });
  }

  return blocks;
}

interface MarkdownTextProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

export function MarkdownText({
  content,
  isUser = false,
  className = "",
}: MarkdownTextProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  const renderInline = (text: string, baseStyle: string) => {
    const tokens = parseInlineTokens(text);
    return (
      <Text className={baseStyle}>
        {tokens.map((token, idx) => {
          if (token.type === "boldItalic") {
            return (
              <Text
                key={idx}
                className={`font-black italic ${isUser ? "text-white" : "text-ink"}`}
              >
                {token.text}
              </Text>
            );
          }
          if (token.type === "bold") {
            return (
              <Text
                key={idx}
                className={`font-black ${isUser ? "text-white font-black" : "text-ink"}`}
              >
                {token.text}
              </Text>
            );
          }
          if (token.type === "italic") {
            return (
              <Text
                key={idx}
                className={`italic ${isUser ? "text-white/90" : "text-ink-muted"}`}
              >
                {token.text}
              </Text>
            );
          }
          if (token.type === "code") {
            return (
              <Text
                key={idx}
                className={`font-mono text-xs px-1.5 py-0.5 rounded-md ${
                  isUser
                    ? "bg-white/20 text-white font-semibold"
                    : "bg-surface-muted text-primary"
                }`}
              >
                {token.text}
              </Text>
            );
          }
          return <Text key={idx}>{token.text}</Text>;
        })}
      </Text>
    );
  };

  const defaultTextStyle = isUser
    ? "text-[15px] leading-6 text-white font-medium"
    : "text-[15px] leading-6 text-ink font-medium";

  return (
    <View className={`gap-2.5 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading1":
            return (
              <View key={idx} className="mt-1 mb-0.5">
                {renderInline(
                  block.content,
                  `text-xl font-black ${isUser ? "text-white" : "text-ink"} tracking-tight`,
                )}
              </View>
            );
          case "heading2":
            return (
              <View key={idx} className="mt-1 mb-0.5">
                {renderInline(
                  block.content,
                  `text-lg font-black ${isUser ? "text-white" : "text-ink"} tracking-tight`,
                )}
              </View>
            );
          case "heading3":
            return (
              <View key={idx} className="mt-0.5">
                {renderInline(
                  block.content,
                  `text-base font-bold ${isUser ? "text-white" : "text-ink"} tracking-tight`,
                )}
              </View>
            );
          case "bullet":
            return (
              <View key={idx} className="flex-row items-start gap-2.5 my-0.5">
                <View
                  className={`w-1.5 h-1.5 rounded-full mt-2.5 ${
                    isUser ? "bg-white" : "bg-primary"
                  }`}
                />
                <View className="flex-1">
                  {renderInline(block.content, defaultTextStyle)}
                </View>
              </View>
            );
          case "numbered":
            return (
              <View key={idx} className="flex-row items-start gap-2 my-0.5">
                <Text
                  className={`text-[14px] font-bold ${
                    isUser ? "text-white/80" : "text-ink-muted"
                  } mt-0.5 min-w-[18px]`}
                >
                  {block.number}
                </Text>
                <View className="flex-1">
                  {renderInline(block.content, defaultTextStyle)}
                </View>
              </View>
            );
          case "codeblock":
            return (
              <View
                key={idx}
                className="my-1.5 p-3 rounded-2xl bg-surface-muted border border-surface-border overflow-hidden"
              >
                <Text className="font-mono text-xs text-ink leading-5">
                  {block.content}
                </Text>
              </View>
            );
          case "quote":
            return (
              <View
                key={idx}
                className="my-1 pl-3 border-l-2 border-primary py-0.5"
              >
                {renderInline(
                  block.content,
                  `italic text-[14px] leading-5 ${isUser ? "text-white/90" : "text-ink-muted"}`,
                )}
              </View>
            );
          case "paragraph":
          default:
            return (
              <View key={idx}>
                {renderInline(block.content, defaultTextStyle)}
              </View>
            );
        }
      })}
    </View>
  );
}

