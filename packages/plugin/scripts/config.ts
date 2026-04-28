import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type MnemeConfig = {
  server: { url: string };
  auth: { key: string };
  machine: { id: string; name?: string };
};

export function configPath(): string {
  return join(homedir(), ".mneme", "config.json");
}

export function loadConfig(): MnemeConfig {
  const path = configPath();
  const raw = readFileSync(path, "utf8");
  const cfg = JSON.parse(raw) as MnemeConfig;
  if (!cfg.server?.url) throw new Error("config missing server.url");
  if (!cfg.auth?.key) throw new Error("config missing auth.key");
  if (!cfg.machine?.id) throw new Error("config missing machine.id");
  return cfg;
}

export function serverUrl(cfg: MnemeConfig, path: string): string {
  return `${cfg.server.url.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}
