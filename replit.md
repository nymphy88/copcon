# Replit.md

## Overview

This is a **multi-agent AI orchestrator** — a dashboard application where users create conversations, configure multiple AI agents (with different LLM providers), and run multi-turn discussions between those agents. Think of it as a control panel for orchestrating conversations between AI agents from OpenAI, Anthropic, and Google Gemini.

Key features:
- Create and manage conversations with a defined goal/briefing
- Configure multiple AI agents with different providers(API only), models, roles, temperature and system prompts
- Run turns where agents respond based on conversation history (with configurable input scope length)
- Auto-mode that loops agent turns automatically with configurable delay, optional end trigger by custom word detected.
- Execution logs tracking token usage and latency per turn, csv format database for group and individual exported.
- File attachment support on messages. Build for brainstorming disable agent feature such as generating Image and apps.
- Message rewriting capability, human in the loop workflow option.
- Dark-themed professional dashboard UI

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: Wouter (lightweight client-side router) — single page at `/` (Dashboard)
- **State Management**: TanStack React Query for server state, local React state for UI
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for layout transitions
- **Forms**: React Hook Form with Zod resolvers
- **Styling**: Tailwind CSS with CSS variables for theming, dark mode by default
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend is a three-panel layout: sidebar (conversations list), main area (chat interface), and a collapsible agent config panel. Components live in `client/src/components/` with hooks in `client/src/hooks/`.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript, run via `tsx` in development
- **API Style**: RESTful JSON API under `/api/` prefix
- **Route Definitions**: Centralized in `shared/routes.ts` — both input schemas and path definitions shared between client and server
- **LLM Integration**: Multi-provider support via official SDKs:
  - OpenAI (`openai` package)
  - Anthropic (`@anthropic-ai/sdk`)
  - Google Gemini (`@google/genai`)
- **Build**: Custom build script (`script/build.ts`) using Vite for client and esbuild for server, outputs to `dist/`

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema location**: `shared/schema.ts` — defines four tables:
  - `conversations` — title, goal, auto-mode settings
  - `agents` — name, role, task, system prompt, provider, model, temperature, input scope, color, moderator flag
  - `messages` — conversation messages with agent attribution, file attachments, threading, visibility scoping
  - `logs` — execution logs tracking agent ID, token usage, latency per turn
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not migration files)
- **Session store**: `connect-pg-simple` is a dependency (for potential session storage)

### Key Data Flow
1. User creates a conversation with a goal
2. User configures agents (provider, model, system prompt, role, task)
3. User sends input or triggers a turn via `POST /api/turns/run`
4. Server calls the appropriate LLM provider based on agent config
5. Response is stored as a message and execution stats are logged
6. In auto-mode, the frontend loops turn requests with a configurable delay

### Replit Integrations
The `server/replit_integrations/` and `client/replit_integrations/` directories contain pre-built utilities for audio/voice chat, image generation, batch processing, and basic chat. These are supplementary modules — the main app logic is in `server/routes.ts`, `server/storage.ts`, and `server/llm.ts`.

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI credentials
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` / `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic credentials
- `AI_INTEGRATIONS_GEMINI_API_KEY` / `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini credentials

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `pg` Pool with Drizzle ORM

### AI/LLM Providers
- **OpenAI API** — via `openai` SDK, supports GPT-4o and other models
- **Anthropic API** — via `@anthropic-ai/sdk`, supports Claude 3 models
- **Google Gemini API** — via `@google/genai`, supports Gemini Pro models

### Key NPM Packages
- `express` — HTTP server
- `drizzle-orm` + `drizzle-kit` — Database ORM and schema management
- `zod` + `drizzle-zod` — Validation schemas derived from DB schema
- `@tanstack/react-query` — Client-side data fetching and caching
- `wouter` — Client-side routing
- `framer-motion` — Animations
- `react-hook-form` — Form management
- `date-fns` — Date formatting
- `lucide-react` — Icons
- shadcn/ui ecosystem (Radix UI, class-variance-authority, clsx, tailwind-merge)
