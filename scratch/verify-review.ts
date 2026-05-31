// Throwaway file to verify the claude-review pipeline posts inline comments.
// Safe to delete. Contains an intentional, obvious flaw for the reviewer.
import { exec } from "node:child_process";

export function listDir(userInput: string): void {
  // Intentional command injection: user input concatenated into a shell command.
  exec(`ls -la ${userInput}`);
}

export function pickFirst(items: string[]): string {
  // Intentional: no empty-array guard, returns undefined typed as string.
  return items[0];
}
