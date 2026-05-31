// Harness-neutral wall-clock stamp injected into the agent's context each
// turn so it never reasons against a stale session-start date. Shared by the
// Claude Code hook (UserPromptSubmit) and the Pi adapter (input). Format:
// `2026-05-12 (Tue) 10:25 AM PST`.

export function formatCurrentTime(): string {
  const d = new Date();
  const isoDate = d.toISOString().slice(0, 10);
  const dayTime = d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  // dayTime renders as "Tue, 10:25 AM PST" — promote the comma to parens
  // around the weekday so the line reads cleaner alongside the ISO date.
  const [weekday, ...rest] = dayTime.split(", ");

  return `${isoDate} (${weekday}) ${rest.join(", ")}`;
}
