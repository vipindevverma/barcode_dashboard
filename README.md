# Barcode Label Generator

A fully client-side dashboard for generating Code 128 barcode labels with live preview and PNG/PDF export. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Features

- Code 128 barcode rendering (via [JsBarcode](https://github.com/lindell/JsBarcode))
- Live preview as you type
- Custom label size (presets + manual width/height in mm)
- Title, subtitle, and unlimited extra fields
- Configurable bar height, font size, and value display
- Export as **PNG** or **PDF** at 300 DPI

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploying to Vercel

1. Push this directory to a GitHub/GitLab/Bitbucket repo.
2. Import the repo at <https://vercel.com/new>.
3. Vercel auto-detects Next.js — no environment variables or build settings needed.
4. Click **Deploy**.

The app is fully client-side, so it runs anywhere Next.js static/edge output is supported.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- `jsbarcode`, `html2canvas`, `jspdf`
