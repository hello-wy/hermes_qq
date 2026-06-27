// Lightweight command registry. Commands register a handler and optional
// aliases/help text; index.js dispatches by name through getCommand().

const registry = new Map();

export function defineCommand(name, handler, { aliases = [], help } = {}) {
  const entry = { name, handler, help };
  registry.set(name, entry);
  for (const alias of aliases) {
    registry.set(alias, entry);
  }
}

export function getCommand(name) {
  return registry.get(name);
}

export function listHelp() {
  const seen = new Set();
  const lines = [];
  for (const { help } of registry.values()) {
    if (help && !seen.has(help)) {
      seen.add(help);
      lines.push(help);
    }
  }
  return lines;
}

export function clearCommands() {
  registry.clear();
}
