# QBase

A quality management system (QMS) web app built with AI-assisted development. It is a working prototype that I use to explore how ISO 9001 style record keeping can be organised in a browser.

Live demo: https://qbase-sable.vercel.app

## What it covers

Pages in `src/pages` include:

- Record creation, record lists and record views
- Forms registry and procedures
- Risk management and SWOT analysis
- Approval queue, archive, notifications and activity log
- KPI dashboard and KPI reports
- Audit and data integrity pages
- Projects, traceability and admin pages

## Tech stack

- React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- TanStack Query
- Supabase for authentication
- Google Sheets and Google Drive APIs for data and files
- Deployed on Vercel

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your own values. Never commit real keys.

## Status

Prototype. The repository also holds working notes and one-off migration scripts from development. Features and data shown in any public demo are for demonstration only.
