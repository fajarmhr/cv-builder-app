# CV Builder App

A self-hosted resume/CV builder built with Next.js 16, Prisma/PostgreSQL, and Zustand. Upload an existing resume or build from scratch, customize ATS-friendly templates, preview changes live, export to PDF/DOCX, and publish a read-only API for portfolio integrations.

## Features

- **7 ATS Templates** - single-column and two-column layouts, lazy-loaded for performance
  - ATS Classic, Modern, Compact, Professional, Sidebar, Executive, Minimal
- **Live Preview** - A4-proportioned preview with real-time updates as you edit
- **PDF and DOCX Export** - download authenticated resumes as PDF or Word documents
- **Portfolio Sharing API** - publish a stable share token for JSON data, PDF preview, PDF download, and DOCX download
- **Resume Parsing** - upload PDF or DOCX files and auto-extract structured sections via AI
- **Section Management** - drag-and-drop reordering, hide/show, duplicate any section
- **Template Customization** - colors, fonts, font size, line spacing, and bullet styles
- **Section Duplication** - clone any built-in section, such as separate Work Experience blocks
- **Photo Uploads** - store CV photos through Supabase Storage
- **Dark/Light Theme** - soft pastel light palette, warm earthy dark palette
- **Auth** - username/password login with iron-session

## Resume Sections

Personal Info, Summary, Work Experience, Education, Skills, Certifications, Languages, Projects, Awards, References, and Custom Sections.

All dates use **MMM YYYY** format, such as Jan 2024.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 App Router |
| Database | PostgreSQL via Prisma + `@prisma/adapter-pg` |
| Storage | Supabase Storage |
| State | Zustand with undo/redo history |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Lucide icons, Sonner toasts |
| Export | `@react-pdf/renderer` for PDF, `docx` for Word |
| Parsing | `pdfjs-dist`, `mammoth` |
| AI | Grok/xAI for resume structure extraction and enhancement |
| Auth | iron-session |
| DnD | @dnd-kit/core + sortable |

## Portfolio API

Enable sharing from the editor's **Share** dialog. The app creates one stable token per resume and keeps the external URLs synced with future edits.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/public/resume/{token}` | Public resume JSON plus link metadata |
| GET | `/api/public/resume/{token}/pdf` | Inline PDF preview |
| GET | `/api/public/resume/{token}/pdf?download=1` | PDF download |
| GET | `/api/public/resume/{token}/docx` | DOCX download |

Example public JSON shape:

```json
{
  "resume": {
    "title": "Resume title",
    "templateId": "ats-001",
    "personalInfo": {},
    "workExperience": [],
    "updatedAt": "2026-06-09T00:00:00.000Z"
  },
  "links": {
    "data": "https://your-domain.com/api/public/resume/{token}",
    "previewPdf": "https://your-domain.com/api/public/resume/{token}/pdf",
    "downloadPdf": "https://your-domain.com/api/public/resume/{token}/pdf?download=1",
    "downloadDocx": "https://your-domain.com/api/public/resume/{token}/docx"
  }
}
```

Public endpoints are read-only, require `isPublished = true`, and expose CORS headers for portfolio apps.

## Project Structure

```text
app/
  (protected)/       # Auth-guarded routes (dashboard, editor)
  api/               # Auth, resume CRUD, export, public sharing, upload, AI
  login/             # Login page
  register/          # Registration page
components/
  dashboard/         # Resume list, creation
  editor/            # Section forms and share dialog
  preview/           # CV preview with zoom controls
  templates/
    ats/             # 7 ATS template components
    TemplateWrapper  # Shared wrapper (font, spacing, scale)
    TemplateRegistry # Template metadata + lazy loading
    template-helpers # Shared template helpers
  ui/                # UI primitives
  upload/            # File upload + parsing UI
lib/
  auth.ts            # Session config
  export/            # PDF/DOCX generators + style config
  parser/            # PDF/DOCX parsing, AI structure mapping
  storage.ts         # Supabase Storage helper
  store/             # Zustand resume store
  prisma.ts          # Prisma client singleton
prisma/
  schema.prisma      # PostgreSQL schema
types/
  resume.ts          # TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL database, such as Supabase Postgres
- Supabase Storage bucket for photo uploads

### Installation

```bash
git clone <repo-url>
cd cv-builder-app
npm install
```

### Environment

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

SESSION_SECRET=random-32-char-string

SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET="cv-assets"

NEXT_PUBLIC_APP_NAME="CV Builder"

# Optional: AI enhancement and resume parsing
XAI_API_KEY=your-xai-api-key
AI_MODEL=grok-3-mini-fast
```

### Database Setup

```bash
npm exec -- prisma generate
npm exec -- prisma migrate deploy
```

For local development without migrations, you can use:

```bash
npm exec -- prisma db push
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

## Theme

**Light mode** - soft pastel palette: warm cream (#F6F5F1), light beige (#EFE7DD), soft lavender (#D6CEDB), soft mint (#DFE8E3), light mint (#ECF2F0)

**Dark mode** - warm earthy palette: deep brown (#1C1715), warm dark (#292220), copper (#C47A4A), forest (#373F38), muted clay (#4B3830)

Toggle via the theme button in the UI.

## License

ISC
