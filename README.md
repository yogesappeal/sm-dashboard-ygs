# SM Dashboard — AusHail

Internal dashboard for Site Managers and Operations team at AusHail. Built with Next.js 16, Supabase, and TypeScript.

## Features

- **Authentication** — Login, forgot password, reset password via Supabase Auth
- **Role-based views** — Site Manager (SM) and Operations (Ops) see different metrics and data
- **Dashboard** — Contract list with status filters (Deposit, Pending, Active) and pagination
- **Contract Detail** — Full contract information with sections and attachments
- **Purchase Orders** — Supplier and subcontractor PO creation and detail views
- **Suppliers** — Supplier directory with slide-over detail panel
- **Scope of Work** — Scope items management
- **Tasks** — Task tracking with priority, status cycling, and create/edit modal (feature-flagged)

## Tech Stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Language** — TypeScript
- **Auth & DB** — Supabase (Auth + Storage)
- **Styling** — Tailwind CSS
- **State** — Zustand
- **Data fetching** — TanStack Query v5
- **Forms** — React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required Edge Functions deployed

### Setup

1. Clone the repository:

```bash
git clone https://github.com/andiradita-appeal/sm-dashboard-web.git
cd sm-dashboard-web
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

NEXT_PUBLIC_COMPANY=AusHail
NEXT_PUBLIC_BASE_IMAGE_URL=https://<your-project>.supabase.co/storage/v1/object/public

NEXT_PUBLIC_PRIMARY_COLOR=#C66EEB

# Feature flags
NEXT_PUBLIC_FEATURE_TASK=false
NEXT_PUBLIC_FEATURE_ATTACHMENTS=false
NEXT_PUBLIC_FEATURE_WORKSPACE_APPS=true

# Roles
NEXT_PUBLIC_ROLE_SM=Site Manager
NEXT_PUBLIC_ROLE_OPS=Operations
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── (auth)/               # Login, register, forgot/reset password
└── (dashboard)/          # Protected dashboard pages
    ├── page.tsx           # Home — metrics + contract table
    ├── contract/[id]/     # Contract detail
    ├── purchase-orders/   # PO list + supplier/subcontractor new & detail
    ├── suppliers/         # Supplier directory
    ├── scope/             # Scope of work
    └── tasks/             # Task management (feature-flagged)

components/
├── cards/                # Domain cards (contract row, metric, task, welcome)
├── forms/                # Create/edit modals
├── layout/               # Sidebar and Header
├── shared/               # AuthProvider, Providers, PageHeader
└── ui/                   # Generic UI (skeleton, badge, pagination, empty state)

lib/
├── api/                  # Supabase Edge Function API calls
├── store/                # Zustand stores (auth, app, task)
├── supabase/             # Supabase client (browser + server)
├── types/                # TypeScript models
└── utils/                # Helpers, validation schemas, formatters
```

## Routing & Auth

Route protection is handled by `proxy.ts` (Next.js middleware equivalent):

- Unauthenticated users are redirected to `/login`
- Authenticated users visiting `/login` are redirected to `/`
- After logout, users are redirected to `/login`

## Feature Flags

| Flag | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_TASK` | `false` | Enables Tasks page and nav item |
| `NEXT_PUBLIC_FEATURE_ATTACHMENTS` | `false` | Enables attachment uploads |
| `NEXT_PUBLIC_FEATURE_WORKSPACE_APPS` | `true` | Enables workspace apps section |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
