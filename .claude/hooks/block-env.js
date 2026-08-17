#!/usr/bin/env node
/**
 * PreToolUse hook: refuse any tool call that would expose the contents of a
 * .env file to the model.
 *
 * Covers direct file tools (Read/Edit/Write/NotebookEdit), content search
 * (Grep/Glob) and shell commands (Bash/PowerShell) that name a .env file.
 *
 * Placeholder files are allowed: .env.example, .env.sample, .env.template.
 */

const ALLOWED = /^\.env\.(example|sample|template|dist)$/i;
const SECRET_BASENAME = /^\.env(\..+)?$/i;

// Matches ".env" / ".env.local" / "path/to/.env" as a standalone token.
const SECRET_IN_TEXT = /(^|[\s"'`=:;,(|&$])((?:[^\s"'`|&;]*[\\/])?\.env(?:\.[A-Za-z0-9_-]+)*)/g;

function isSecretPath(p) {
  if (typeof p !== 'string' || p.length === 0) return false;
  const base = p.split(/[\\/]/).pop();
  return SECRET_BASENAME.test(base) && !ALLOWED.test(base);
}

function textMentionsSecret(text) {
  if (typeof text !== 'string') return false;
  SECRET_IN_TEXT.lastIndex = 0;
  let m;
  while ((m = SECRET_IN_TEXT.exec(text)) !== null) {
    if (isSecretPath(m[2])) return true;
  }
  return false;
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0); // Malformed input: stay out of the way.
  }

  const tool = payload.tool_name;
  const input = payload.tool_input || {};
  const blocked =
    '.env files are off limits. Read .env.example for the variable names, ' +
    'or ask the user to paste any specific value you need.';

  if (['Read', 'Edit', 'Write', 'NotebookEdit'].includes(tool)) {
    if (isSecretPath(input.file_path) || isSecretPath(input.notebook_path)) {
      deny(blocked);
    }
  }

  if (tool === 'Grep' || tool === 'Glob') {
    if (isSecretPath(input.path) || textMentionsSecret(input.glob || input.pattern)) {
      deny(blocked);
    }
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    if (textMentionsSecret(input.command)) {
      deny(
        blocked +
          ' (This command names a .env file; rerun it without touching that file.)'
      );
    }
  }

  process.exit(0);
});
