# Budget Desk

Budget Desk is a local-first monthly budgeting app for tracking spending, income, recurring bills, category limits, and savings goals in your browser.

Your data stays on your machine in browser storage. You can export it to a JSON backup file and import it again later.

<img width="1718" height="1687" alt="080526_1778214051" src="https://github.com/user-attachments/assets/27a4d003-e958-4aea-88b3-f783a76344df" />

## What It Can Do

- Track one-time purchases and income by month.
- Add recurring bills, subscriptions, transfers, or recurring income.
- Switch between separate local budget profiles on the same domain.
- Move between months and see scheduled recurring items automatically.
- Search and filter transactions by merchant, category, or account.
- Review year-to-date income, spending, cash flow, and category mix.
- Compare spending against category limits.
- Import bank or credit-card statement CSV files and preview rows before saving them.
- Track savings goal progress.
- Export and restore your Budget Desk data as JSON.
- Switch between light and dark mode.

## Requirements

- Node.js 20 or newer
- npm

## Install And Run

Install the dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open the local URL printed in the terminal. Vite usually uses:

```text
http://localhost:5173
```

## Build For Production

Create a production build:

```bash
npm run build
```

Preview that build locally:

```bash
npm run preview
```

## Build The Desktop App

Budget Desk can also be packaged as a Windows desktop app with Electron.

Run the app in the Electron shell:

```bash
npm run desktop
```

Create an unpacked executable folder:

```bash
npm run desktop:dir
```

The executable is written to:

```text
release/win-unpacked/Budget Desk.exe
```

Create a Windows installer:

```bash
npm run desktop:installer
```

The installer is written to:

```text
release/Budget Desk-0.1.0-x64-Setup.exe
```

The local desktop build is unsigned, so Windows may show a trust warning the first time it is opened.
The desktop app keeps its own local data separate from the browser version; use JSON export and import to move a budget between them.

## Notes

Statement import works best with CSV files that include date, description or merchant, and either amount or debit/credit columns.

Budget Desk includes starter sample data so you can try the app immediately. You can reset the sample data, clear saved data, or import a previous JSON backup from the Import & data tab.

The selected month and active tab are stored in the URL (`?month=YYYY-MM&tab=...`), so you can bookmark a specific view and the browser back button moves between months you've visited.
