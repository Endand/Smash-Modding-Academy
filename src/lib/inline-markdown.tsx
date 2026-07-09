import React from "react";

// Discord-style inline formatting stored as plain text and rendered to React
// nodes. Supported:
//   `code`   ~~strike~~   **bold**   *italic*   __underline__   [text](url)
// Parser finds the earliest-starting marker; on a tie the first rule listed
// wins (so ** beats * and code/link take priority).

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: "0.86em",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-color)",
  borderRadius: "4px",
  padding: "0.08em 0.36em",
  whiteSpace: "pre-wrap",
};

interface Ctx { key: number }

type Rule = {
  re: RegExp;
  literal?: boolean; // inner text is not re-parsed (inline code)
  render: (m: RegExpExecArray, key: number, inner: React.ReactNode) => React.ReactNode;
};

const RULES: Rule[] = [
  { re: /`([^`]+)`/, literal: true, render: (m, key) => (
      <code key={key} style={codeStyle}>{m[1]}</code>
    ) },
  { re: /\[([^\]]+)\]\(([^)]+)\)/, render: (m, key) => {
      const raw = m[2].trim();
      const href = /^https?:\/\/|^mailto:/.test(raw) ? raw : "#";
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer"
          className="transition-opacity hover:opacity-75"
          style={{ color: "#00b0f4", textDecoration: "underline", textUnderlineOffset: "2px" }}>
          {m[1]}
        </a>
      );
    } },
  { re: /~~([^~]+)~~/, render: (m, key, inner) => <s key={key}>{inner}</s> },
  { re: /\*\*([^*]+)\*\*/, render: (m, key, inner) => <strong key={key}>{inner}</strong> },
  { re: /__([^_]+)__/, render: (m, key, inner) => <u key={key}>{inner}</u> },
  { re: /\*([^*]+)\*/, render: (m, key, inner) => <em key={key}>{inner}</em> },
];

function parse(text: string, ctx: Ctx): React.ReactNode[] {
  let best: { rule: Rule; m: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (m && (best === null || m.index < best.m.index)) best = { rule, m };
  }
  if (!best) return text ? [text] : [];

  const { rule, m } = best;
  const before = text.slice(0, m.index);          // no markers by construction
  const after = text.slice(m.index + m[0].length);
  const inner = rule.literal ? m[1] : parse(m[1], ctx);
  const node = rule.render(m, ctx.key++, inner);

  return [
    ...(before ? [before] : []),
    node,
    ...parse(after, ctx),
  ];
}

export function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];
  return parse(text, { key: 0 });
}
