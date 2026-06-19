# CV Builder — Fog & Slate redesign (handoff)

Editorial re-skin blended from the **fajarmhr portfolio** (Fog & Slate + Clay
accent). Token/auth/sharing architecture preserved. This package is a set of
**drop-in replacements** — copy each file to the matching path in
`cv-builder-app/`. Paths below mirror your repo.

---

## Phase 1 — visual reskin & sharing

| File | What changed |
|---|---|
| `app/globals.css` | Core reskin via `--c-*` tokens: navy `#1b2230` primary, Clay `#a3585c` accent, fonts → Newsreader / Hanken Grotesk / Space Grotesk / JetBrains Mono; slate dark mode. |
| `app/layout.tsx` | Loads the UI fonts + all résumé template fonts. |
| `app/login/page.tsx` | **Direction A** — editorial split. |
| `app/register/page.tsx` | Mirrors login A. |
| `app/(protected)/dashboard/page.tsx` | Editorial list + **guest mode** (see Phase 3). |
| `components/dashboard/ResumeGrid.tsx`, `ResumeCard.tsx` | Hairline editorial rows. |
| `components/editor/ShareDialog.tsx` | **Copy token** button + public-page URL. |
| `app/p/[token]/page.tsx` | **New** public read-only résumé view. |

---

## Phase 2 — top-3 templates + matching exports

### Curated to 3 templates for international recruiters
`components/templates/TemplateRegistry.ts` now exposes only:
- **ats-001 “Classic”** — left untouched (your “already the best”).
- **ats-002 “Modern”** — polished.
- **ats-007 “Minimal”** — polished.

All single-column, photo-free, reverse-chronological — the safest formats for
US/UK/EU/CA/AU. The photo/two-column ones (003, 005) and 004/006 are dropped
because photos hurt international ATS parsing and consistency.
`getTemplateComponent` + new `normalizeTemplateId()` fall back any legacy
`templateId` (e.g. an old `ats-004` in the DB) to Classic, so nothing breaks.
You can delete `ats/Ats003/004/005/006Template.tsx` — no longer referenced.

### Polish (`Ats002Template.tsx`, `Ats007Template.tsx`)
- Fixed raw-date bug (`2021-01` → `Jan 2021`, with “Present”).
- Full contact line (Modern); summary now renders as a lead paragraph in both
  (007 previously hid it).
- Tightened spacing/typography; accent uses the theme Clay by default.

### Preview now matches the exported file
Previously **the PDF & DOCX always rendered one generic layout** regardless of
template — so ats-002/007 exports didn’t match their on-screen preview. Fixed:
- `lib/export/pdf-generator.tsx` — rewritten with a per-template **variant**
  (classic / modern / minimal): header (centered vs left vs name-left/contact-right)
  and section-rule (black / accent / hairline-gray) now match each preview.
  `generatePdf(resume, config, templateId)` (falls back to `resume.templateId`).
- `lib/export/docx-generator.ts` + `docx-styles.ts` — header alignment, name
  casing, and heading-rule colour now branch by template; summary is a lead
  paragraph (no heading) to match. `getDocxStyles(config, templateId)`.
- `app/api/export/pdf/route.ts` & `app/api/public/resume/[token]/pdf/route.ts`
  pass `resume.templateId` through.

> DOCX is inherently an approximation of HTML — alignment + rule colour + casing
> match per template; pixel-exactness isn’t possible in Word. PDF is faithful.

---

## Phase 3 — résumé output colours + optional login

### Output colours match the app theme (request 2)
Default résumé palette is now navy ink `#1b2230` + Clay accent `#a3585c`
(`TemplateRegistry.DEFAULT_TEMPLATE_CONFIG`, `TemplateWrapper` fallbacks,
`docx-styles`, `resume-store`). `TemplateCustomizer` presets re-themed
(Ink/Clay/Slate/Teal/Sage/Plum/Ochre/Charcoal) and all earthy chrome literals
(`#d8b88f`, `#8b6a55`, …) swapped for `--c-*` tokens (also in `TemplateSelector`,
`SectionEditor`).

### Login optional for viewing (request 3)
- `app/(protected)/layout.tsx` — **no longer redirects guests**; nav shows
  *Log in / Sign up* when logged out, profile + *Log out* when logged in.
- `app/(protected)/editor/layout.tsx` — **new** server guard: editing still
  requires login (redirects to `/login`).
- `app/(protected)/dashboard/page.tsx` — detects a guest (401 from
  `/api/resumes`) and shows a **template gallery** with placeholder data instead
  of “your résumés”. *New résumé / Upload* send guests to `/login`.
- `app/templates/[id]/page.tsx` — **new** public, login-free full preview of a
  template, rendered with **John Doe + lorem ipsum** (`lib/sample-resume.ts`).
- `lib/sample-resume.ts` — **new** shared placeholder résumé (no real data).

No changes to the auth model, session, DB, or the public token API itself.

---

## Verify after dropping in
`npm run dev`, then:
1. Logged out → `/dashboard` shows the 3-template gallery; click one → public
   `/templates/[id]` preview; *New résumé* → `/login`.
2. Log in → dashboard list, editor.
3. In the editor switch between Classic / Modern / Minimal and **export PDF** —
   the file should match the on-screen preview for each.
4. Share → **Copy token**; open `/p/<token>` logged out.
