/** Shell-level types: which surface is open and what it is pointed at. */

export type ViewId = "chat" | "canvas" | "sandboxes" | "models" | "usage" | "agent" | "settings";

export interface Selection {
  /** Chat thread: "workbench" for the inspector, otherwise an agent id. */
  chat: string;
  agent: string | null;
  sandbox: string;
  model: string;
}

export const viewTitles: Record<ViewId, string> = {
  chat: "Chat",
  canvas: "Canvas",
  sandboxes: "Sandboxes",
  models: "Models",
  usage: "Usage",
  agent: "Agent",
  settings: "Settings",
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  modelId?: string;
  tokens?: number;
  costUsd?: number;
  sources?: string[];
  refused?: string[];
  redacted?: string[];
}
