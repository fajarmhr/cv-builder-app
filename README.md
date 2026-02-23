# CV Builder App

A self-hosted resume/CV builder built with Next.js 16, Prisma (SQLite), and Zustand. Upload an existing resume or build from scratch, customize with 7 ATS-friendly templates, live-preview changes, and export to DOCX.

## Features

- **7 ATS Templates** — single-column and two-column layouts, lazy-loaded for performance
  - ATS Classic, Modern, Compact, Professional, Sidebar, Executive, Minimal
- **Live Preview** — A4-proportioned preview with real-time updates as you edit
- **DOCX Export** — native Word bullet lists, right-aligned dates, structured references
- **Resume Parsing** — upload PDF or DOCX files, auto-extract sections via AI (Grok/xAI)
- **Section Management** — drag-and-drop reordering, hide/show, duplicate any section
- **Template Customization** — colors, fonts (12 families), font size (small/medium/large), line spacing, bullet styles (disc/dash/arrow/square/none)
- **Section Duplication** — clone any built-in section (e.g. two "Work Experience" blocks)
- **Dark/Light Theme** — soft pastel light palette, warm earthy dark palette
- **Auth** — simple admin login with iron-session
- **Docker Ready** — multi-stage Dockerfile + docker-compose

## Resume Sections

Personal Info, Summary, Work Experience, Education, Skills (with expertise level), Certifications (with credential ID), Languages, Projects (with dates), Awards, References, Custom Sections

All dates use **MMM YYYY** format (e.g. Jan 2024).

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | SQLite via Prisma + better-sqlite3 |
| State | Zustand with undo/redo history |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Lucide icons, Sonner toasts |
| Export | `docx` library with native bullet numbering |
| Parsing | `pdf-parse`, `mammoth`, `pdf-to-img`, `canvas` |
| AI | Grok (xAI) for resume structure extraction |
| Auth | iron-session |
| DnD | @dnd-kit/core + sortable |

## Project Structure

```
app/
  (protected)/       # Auth-guarded routes (dashboard, editor)
  api/               # API routes (resume CRUD, export, upload, AI)
  login/             # Login page
components/
  dashboard/         # Resume list, creation
  editor/            # Section forms (WorkExperienceForm, SkillsForm, etc.)
  preview/           # CV preview with zoom controls
  templates/
    ats/             # 7 ATS template components
    TemplateWrapper   # Shared wrapper (font, spacing, scale)
    TemplateRegistry  # Template metadata + lazy loading
    template-helpers  # Shared components (BulletList, RenderClonedSection, etc.)
  ui/                # shadcn/ui components
  upload/            # File upload + parsing UI
lib/
  auth.ts            # Session config
  export/            # DOCX generator + style config
  parser/            # PDF/DOCX parsing, AI structure mapping
  store/             # Zustand resume store
  prisma.ts          # Prisma client singleton
prisma/
  schema.prisma      # SQLite schema
types/
  resume.ts          # TypeScript interfaces
storage/
  uploads/           # Uploaded resume files
  exports/           # Generated DOCX files
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone <repo-url>
cd cv-builder-app
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in the values:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
SESSION_SECRET=random-32-char-string
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="CV Builder"

# Optional: AI Enhancement (Grok by xAI)
XAI_API_KEY=your-xai-api-key
AI_MODEL=grok-3-mini-fast
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Docker

```bash
docker-compose up -d --build
```

This builds and runs the app on port 3000 with persistent storage and database volumes.

## Theme

**Light mode** — soft pastel palette: warm cream (#F6F5F1), light beige (#EFE7DD), soft lavender (#D6CEDB), soft mint (#DFE8E3), light mint (#ECF2F0)

**Dark mode** — warm earthy palette: deep brown (#1C1715), warm dark (#292220), copper (#C47A4A), forest (#373F38), muted clay (#4B3830)

Toggle via the theme button in the UI.

## License

ISC
