# Job Tracker

A simple job application tracker. Add each role you apply for, keep its
status up to date, and see at a glance what needs a follow-up.

Live at: https://bobuildington.github.io/jobsearch/

## What it does

- Add applications: company, job title, platform/source, job link, date
  applied, status, follow-up date, notes.
- Statuses: Wishlist, Applied, Screening, Interview, Offer, Rejected,
  Ghosted. Change status right from the card — no need to open the form.
- Search across company, role, platform, and notes. Filter by status or
  show only follow-ups that are due.
- Summary counts: total, applied, interviews, follow-ups due.
- Follow-up dates: applications with a follow-up date of today or earlier
  (and not Offer/Rejected/Ghosted) get a highlighted card and a
  "Follow-up due" badge.

## Your data

Everything is stored in your browser's localStorage — no accounts, no
server, nothing leaves your device. That also means clearing browser data
wipes it, so use **Export backup (.json)** now and then, and **Import
backup** to restore (import replaces what's currently saved, after asking
first).

## Files

- `index.html` — page structure and the add/edit form
- `styles.css` — light, phone-first styling
- `app.js` — all tracker logic (localStorage key `job-tracker-v1`)
- `manifest.json`, `icon.svg` — installable-app metadata and icon
