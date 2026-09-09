// Flags hard-to-reverse shell commands with a visible notice.
//
// This project runs with permissions.defaultMode "bypassPermissions", so there
// is no prompt to catch a destructive command. The risk that leaves is not the
// commands Claude knows are dangerous (it says so) but the ones it does not
// notice. This hook covers that case: it never blocks, it only makes the
// command visible before it runs.
//
// Deliberately narrow. A notice on every `git push` or every `rm` would be
// noise, and noise is how a warning stops being read.

const PATTERNS = [
  [/\brm\s+(-\w*[rf]\w*\s+)+/, "recursive or forced delete"],
  [/\bgit\s+reset\s+--hard\b/, "discards uncommitted work"],
  [/\bgit\s+checkout\s+--\s/, "discards changes in those files"],
  [/\bgit\s+restore\b(?!.*--staged\s*$)/, "discards changes in those files"],
  [/\bgit\s+clean\s+-\w*[fdx]/, "deletes untracked files"],
  [/\bgit\s+push\b.*(--force|(?<![\w-])-f\b)/, "force push, rewrites remote history"],
  [/\bgit\s+branch\s+-D\b/, "deletes a branch without a merge check"],
  [/\bgit\s+stash\s+(drop|clear)\b/, "discards stashed work"],
  [/\bdrop\s+(table|column|policy|trigger|function|index|database)\b/i, "drops a database object"],
  [/\btruncate\s+(table\s+)?\w/i, "empties a table"],
  [/\bdelete\s+from\b/i, "deletes database rows"],
  [/\bupdate\s+[\w."]+\s+set\b/i, "overwrites database rows"],
  [/\bnpm\s+publish\b/, "publishes to the registry"],
  [/\bvercel\s+(rm|remove)\b/, "removes a deployment"],
];

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const cmd = JSON.parse(raw)?.tool_input?.command;
    if (typeof cmd !== "string") return;

    const hits = PATTERNS.filter(([re]) => re.test(cmd)).map(([, why]) => why);
    if (hits.length === 0) return;

    process.stdout.write(
      JSON.stringify({
        systemMessage: `Destructive: ${[...new Set(hits)].join("; ")}\n  ${cmd.trim().slice(0, 300)}`,
      })
    );
  } catch {
    // A hook that throws must not stop the session. Stay silent instead.
  }
  process.exit(0);
});
