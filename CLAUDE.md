# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

UIGen is an AI-powered React component generator with live preview. Users chat with Claude to generate React components, which are stored in a **virtual in-memory file system** (nothing is written to disk), transformed with Babel Standalone, and rendered inside a sandboxed iframe preview.

## Commands

```bash
npm run setup       # install deps + prisma generate + prisma migrate dev
npm run dev         # Next.js dev server (Turbopack) with Node compat shim
npm run dev:daemon  # same, backgrounded, logs to ./logs.txt
npm run build       # production build
npm run lint        # next lint (eslint)
npm run test        # vitest (jsdom)
npm run db:reset    # prisma migrate reset --force
```

Single test run: `npx vitest run path/to/file.test.ts` or `npx vitest -t "test name"`.

Every `next`/`vitest` script injects `--require ./node-compat.cjs` via `NODE_OPTIONS`. This shim deletes `globalThis.localStorage`/`sessionStorage` on the server so Node 25+ experimental Web Storage globals don't break SSR guards in dependencies. Don't remove it.

## Architecture

### Two-process data flow

1. **Client** renders chat + editor + preview. Edits to the virtual FS happen **optimistically** in `FileSystemProvider` via `handleToolCall` — the UI updates the moment a tool call is streamed from the server, before the HTTP response completes.
2. **Server** (`src/app/api/chat/route.ts`) receives `{ messages, files, projectId }`, reconstructs a fresh `VirtualFileSystem` from the serialized `files` payload for each request, streams an LLM response with `streamText` from the Vercel AI SDK, and — on `onFinish` — persists `messages` + serialized FS to the `Project` row if the user is authenticated.

The server's `VirtualFileSystem` is **ephemeral per request**. The client-side `VirtualFileSystem` inside `FileSystemContext` is the source of truth across turns; it replays each tool call to stay in sync with whatever the server's FS did.

### Virtual file system (`src/lib/file-system.ts`)

Single class `VirtualFileSystem` backs everything. Nodes are `{ type, name, path, content?, children? }`. Methods exposed to the LLM as tools:

- `buildStrReplaceTool` (`src/lib/tools/str-replace.ts`) — Anthropic text-editor-style commands: `view`, `create`, `str_replace`, `insert`. `undo_edit` is intentionally unsupported.
- `buildFileManagerTool` (`src/lib/tools/file-manager.ts`) — `rename` (also used as move; creates parent dirs) and `delete`.

Both tools mutate the per-request server FS. The client mirrors these operations by inspecting `toolName` + `args` in `handleToolCall`.

### JSX transformation + preview (`src/lib/transform/jsx-transformer.ts`, `src/components/preview/PreviewFrame.tsx`)

`PreviewFrame` builds an HTML document at runtime: it rewrites imports against an import map, compiles each `.jsx`/`.tsx` file with `@babel/standalone`, stubs out imports for files that don't exist so partial generations still render, collects CSS imports, and loads it all inside an iframe. Entry point search order: `/App.jsx` → `/App.tsx` → `/index.jsx` → `/index.tsx` → `/src/App.*`.

The system prompt (`src/lib/prompts/generation.tsx`) enforces these invariants — changing them requires updating the prompt **and** the preview entry resolution:
- Root must contain `/App.jsx` with a default export
- Tailwind-only styling, no HTML files
- Non-library imports use the `@/` alias

### LLM provider fallback (`src/lib/provider.ts`)

`getLanguageModel()` returns the real Anthropic model (`claude-haiku-4-5`) when `ANTHROPIC_API_KEY` is set, otherwise a handwritten `MockLanguageModel` that streams a canned sequence of tool calls. The app is usable without a key. The chat route caps `maxSteps` at 4 for the mock vs. 40 for the real model to avoid loops.

System messages use ephemeral Anthropic **prompt caching** (`cacheControl: { type: "ephemeral" }`) — preserve this when editing the route.

### Auth + persistence

- `src/lib/auth.ts` — JWT sessions via `jose`, stored in an httpOnly `auth-token` cookie (7-day expiry). Uses `process.env.JWT_SECRET` with an insecure dev fallback.
- `src/middleware.ts` only guards `/api/projects` and `/api/filesystem` (note: no such routes currently exist — middleware is a scaffold).
- Server actions in `src/actions/` handle signup/signin/project CRUD. Prisma + SQLite (`prisma/dev.db`); the generated client is emitted to `src/generated/prisma` (non-default location — import via `@/lib/prisma`, never the generated path directly).
- `Project.messages` and `Project.data` are **JSON-serialized strings**, not Prisma JSON columns.
- Anonymous users get tracked via `src/lib/anon-work-tracker.ts` (sessionStorage). On sign-in, pending anon work is associated with the new account.

### Routing

- `/` (`src/app/page.tsx`) redirects authenticated users to their most recent project, auto-creates one if none exist, and renders `MainContent` for anonymous users.
- `/[projectId]` loads a specific project.
- `/api/chat` is the only API route; it returns `maxDuration = 120`.

## Testing

Vitest with `jsdom`, React Testing Library. Tests live in `__tests__` folders colocated with source. `vite-tsconfig-paths` resolves the `@/` alias in tests.

## Code style

Use comments sparingly. Only comment complex code.
