"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

type VerbPair = { progressive: string; past: string };

const STR_REPLACE_VERBS: Record<string, VerbPair> = {
  view: { progressive: "Viewing", past: "Viewed" },
  create: { progressive: "Creating", past: "Created" },
  str_replace: { progressive: "Editing", past: "Edited" },
  insert: { progressive: "Editing", past: "Edited" },
  undo_edit: { progressive: "Reverting", past: "Reverted" },
};

const FILE_MANAGER_VERBS: Record<string, VerbPair> = {
  rename: { progressive: "Renaming", past: "Renamed" },
  delete: { progressive: "Deleting", past: "Deleted" },
};

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolInvocationLabel(toolInvocation: ToolInvocation): string {
  const { toolName, state } = toolInvocation;
  const args = (toolInvocation as { args?: Record<string, unknown> }).args ?? {};
  const isDone = state === "result";

  if (toolName !== "str_replace_editor" && toolName !== "file_manager") {
    return toolName;
  }

  const command = typeof args.command === "string" ? args.command : undefined;
  if (!command) return toolName;

  const verbs =
    toolName === "str_replace_editor"
      ? STR_REPLACE_VERBS[command]
      : FILE_MANAGER_VERBS[command];
  if (!verbs) return toolName;

  const verb = isDone ? verbs.past : verbs.progressive;
  const path = typeof args.path === "string" ? args.path : undefined;
  if (!path) return `${verb} file`;

  const oldName = basename(path);

  if (toolName === "file_manager" && command === "rename") {
    const newPath =
      typeof args.new_path === "string" ? args.new_path : undefined;
    if (newPath) {
      return `${verb} ${oldName} to ${basename(newPath)}`;
    }
    return `${verb} ${oldName}`;
  }

  return `${verb} ${oldName}`;
}

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  const isComplete =
    toolInvocation.state === "result" &&
    Boolean((toolInvocation as { result?: unknown }).result);
  const label = getToolInvocationLabel(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
