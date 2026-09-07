# Master Data

A reusable Frappe/ERPNext app that provides shared master data DocTypes (e.g. Funders, Schools) for use across multiple sites and installations.

## What this app provides

- **DocTypes** for common reference/master data, version-controlled as JSON + Python (not one-off Custom DocTypes).
- **Seed data** shipped as fixtures — installing this app automatically loads a baseline set of records (e.g. known Funders) into your site.
- A consistent schema and naming convention that other apps (like `vision_empower`) can link against.

## Installation

```bash
cd ~/frappe-bench
bench get-app https://github.com/ffgve-2026/ffg-vision-empower-2026.git --branch feature/master-data
bench --site your-site.local install-app master_data
```

Installing the app will:
1. Create the DocTypes (tables) in your site's database.
2. Automatically load fixture data (seed records) shipped with the app.

## Getting updates

When new master data or DocTypes are added upstream, pull and re-migrate:

```bash
cd ~/frappe-bench/apps/master_data
git pull origin feature/master-data
bench --site your-site.local migrate
```

`bench migrate` re-syncs fixtures on every run — this is how updates (new Funders, new Schools, etc.) get pushed out to everyone using this app.

## ⚠️ Important: fixture data is centrally managed

Records shipped via fixtures (e.g. seeded Funders) are **re-synced from this repo on every `bench migrate`**. This means:

- **Do not edit fixture-shipped records directly** in the UI on your local site — any local changes (e.g. editing a Funder's phone number) will be **silently overwritten** the next time you pull updates and run `bench migrate`.
- **You can safely add your own new records** (e.g. your own local Funders/Schools not part of the shared fixture set) — these are untouched by fixture syncing, since fixtures only manage the specific records they define.
- If you need to propose a change to a centrally-managed record, edit the source data on the maintainer's side and have it flow through as an updated fixture, rather than editing it locally.

