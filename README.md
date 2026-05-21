# Vezloo QMS Suite

> ISO 9001:2015 compliant Quality Management System — Document management, risk registers, CAPA tracking, process interaction maps, and automated audit checks.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite 7 (SWC) + Tailwind CSS 3.4 + shadcn/ui
- **Data:** @tanstack/react-query 5
- **Auth:** Supabase (email/password + Google OAuth)
- **Storage:** Google Sheets API (primary QMS data) + Google Drive API (files)
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GOOGLE_API_KEY` | Google API key (Sheets + Drive read) |
| `VITE_SPREADSHEET_ID` | Main QMS Google Sheet ID |
| `VITE_PROCEDURES_FOLDER_ID` | Google Drive folder ID for procedures |
| `VITE_AUTH_LOCAL_DISABLED` | Disable local auth fallback (default: "true") |

### Production Build

```bash
npm run build
```

Output goes to `dist/`. Deploy `dist/` to Vercel (or any static host).

## Project Structure

```
src/
├── pages/           # Route pages (lazy-loaded)
├── components/      # UI components (layout, ui, dashboard, records, etc.)
├── hooks/           # Custom React hooks
├── lib/             # Services & utilities (Google Sheets, Drive, audit, etc.)
├── data/            # Static data & mock data
├── config/          # Module & navigation configuration
└── assets/          # Images & logos
```

## License

© 2026 Ahmed Khaled — Vezloo Group. All rights reserved.
