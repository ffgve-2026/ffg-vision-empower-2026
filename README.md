# Vision Empower

Vision Empower is a custom application built on the Frappe Framework.

This repository contains the **Vision Empower application code**. It does not contain the complete Frappe bench, database, Redis data, Python virtual environment, site configuration, or generated assets.

---

# 1. Architecture

Vision Empower runs as a custom Frappe application inside a Frappe Bench.

The expected directory structure is:

    frappe-bench/
    ├── apps/
    │   ├── frappe/
    │   └── vision_empower/
    ├── sites/
    │   └── vision.local/
    ├── env/
    ├── config/
    └── logs/

The Vision Empower Git repository corresponds to:

    apps/vision_empower/

The Frappe Bench itself should NOT be committed to this repository.

---

# 2. Repository

GitHub repository:

    https://github.com/ffgve-2026/ffg-vision-empower-2026

Main branch:

    main

Development work should normally be done in feature branches.

---

# 3. Prerequisites

Install the following before setting up the application.

## Required

- Git
- Python 3.14
- Node.js 24.x
- npm
- Yarn 1.x
- Frappe Bench
- MariaDB/MySQL compatible with the Frappe version
- Redis

The current development environment uses:

    Frappe 17.x
    Python 3.14
    Node.js 24.x

---

# 4. Clone the Frappe Bench

If a developer already has a working Frappe Bench, skip this section.

Create/use a Frappe Bench using the appropriate Frappe 17 setup.

For example:

    mkdir -p ~/frapee
    cd ~/frapee

The final bench directory should look similar to:

    ~/frapee/vision-empower/

---

# 5. Get the Vision Empower Application

From the Frappe Bench directory:

    cd ~/frapee/vision-empower

Get the application:

    bench get-app https://github.com/ffgve-2026/ffg-vision-empower-2026.git

This should create:

    apps/vision_empower/

Verify:

    ls -lah apps/vision_empower

---

# 6. Verify the Application

From the bench directory:

    cd ~/frapee/vision-empower

Run:

    bench --version

Then:

    bench list-apps

The application should be visible in the bench.

You can also check:

    find apps/vision_empower -maxdepth 2 -type f | sort

---

# 7. Activate the Python Environment

From the bench directory:

    cd ~/frapee/vision-empower

Activate the virtual environment:

    source env/bin/activate

Verify Python:

    python --version

Expected:

    Python 3.14.x

---

# 8. Configure Node.js

Vision Empower is currently developed using Node.js 24.x.

If NVM is installed:

    nvm use 24

Verify:

    node -v

Expected:

    v24.x.x

Also verify:

    which node
    npm -v
    yarn -v

If Node.js is not installed, install Node.js 24.x before continuing.

---

# 9. Create a Frappe Site

If a local site already exists, skip this section.

Create the site:

    cd ~/frapee/vision-empower

    bench new-site vision.local

During site creation, Frappe will ask for the database/root credentials and the Administrator password.

Keep the Administrator password safe.

---

# 10. Install Vision Empower on the Site

Install the application:

    bench --site vision.local install-app vision_empower

Verify:

    bench --site vision.local list-apps

Expected output should include:

    frappe
    vision_empower

---

# 11. Build Application Assets

Before running the application, build the Vision Empower assets:

    cd ~/frapee/vision-empower

    nvm use 24

    bench build --app vision_empower

A successful build should finish without errors.

You may see Node.js deprecation warnings. These are not necessarily build failures.

The important result is that the build completes successfully.

---

# 12. Run Database Migrations

After installing or updating the application, run:

    bench --site vision.local migrate

This ensures the site database is synchronized with the installed applications.

---

# 13. Start the Frappe Application

From the Frappe Bench directory:

    cd ~/frapee/vision-empower

    source env/bin/activate

    nvm use 24

Start the development server:

    bench start

Keep this terminal running.

Frappe should start the web server and supporting services.

---

# 14. Open Vision Empower

Open the following in a browser:

    http://127.0.0.1:8000

The Frappe Desk can normally be accessed from:

    http://127.0.0.1:8000/app

If the setup wizard is required:

    http://127.0.0.1:8000/desk/setup-wizard/0

Log in using the Administrator credentials created when the site was created.

---

# 15. Verify the Installation

Open another terminal while `bench start` is running.

Go to the bench:

    cd ~/frapee/vision-empower

Activate the environment:

    source env/bin/activate

Check installed applications:

    bench --site vision.local list-apps

Expected:

    frappe
    vision_empower

Check the site:

    bench use vision.local

Run the Frappe console:

    bench --site vision.local console

Inside the console:

    import frappe
    print(frappe.local.site)
    print(frappe.get_installed_apps())

Expected:

    vision.local

and:

    ['frappe', 'vision_empower']

Exit:

    exit()

---

# 16. Normal Startup After Initial Installation

Once the application and site have already been configured, developers normally only need:

    cd ~/frapee/vision-empower
    source env/bin/activate
    nvm use 24
    bench start

Then open:

    http://127.0.0.1:8000

There is no need to recreate the site or reinstall the application every time.

---

# 17. Updating the Application

If the application has already been cloned and the developer wants the latest code:

    cd ~/frapee/vision-empower/apps/vision_empower

Check the current branch:

    git branch --show-current

Fetch changes:

    git fetch origin

For the main branch:

    git checkout main
    git pull origin main

For a feature branch:

    git checkout <branch-name>
    git pull origin <branch-name>

Return to the bench:

    cd ~/frapee/vision-empower

---

# 18. After Updating the Application

After pulling new application code, run:

    source env/bin/activate

    nvm use 24

Run migrations:

    bench --site vision.local migrate

Build assets:

    bench build --app vision_empower

Then start:

    bench start

---

# 19. Development Workflow

Application source code is located at:

    apps/vision_empower/

Make application changes there.

Check changes:

    cd ~/frapee/vision-empower/apps/vision_empower

    git status

Review changes:

    git diff

Build if required:

    cd ~/frapee/vision-empower

    bench build --app vision_empower

Run migrations if database/DocType changes were introduced:

    bench --site vision.local migrate

---

# 20. Git Workflow

Do NOT push directly to `main`.

Create a feature branch:

    cd ~/frapee/vision-empower/apps/vision_empower

    git checkout main
    git pull origin main

Create a feature branch:

    git checkout -b feature/<feature-name>

Example:

    git checkout -b feature/customer-management

Make changes.

Check:

    git status

Review:

    git diff

Stage:

    git add .

Commit:

    git commit -m "feat: add customer management"

Push:

    git push -u origin feature/customer-management

Create a Pull Request from the feature branch to:

    main

---

# 21. Pull Request Workflow

The repository's `main` branch is protected.

Changes should therefore follow:

    feature branch
          |
          v
       git push
          |
          v
    GitHub Pull Request
          |
          v
        main

Do not force push or directly update `main` unless repository administrators explicitly allow it.

---

# 22. Useful Bench Commands

## List sites

    bench list-sites

## List installed applications

    bench --site vision.local list-apps

## Run migrations

    bench --site vision.local migrate

## Build Vision Empower

    bench build --app vision_empower

## Start development environment

    bench start

## Open Frappe console

    bench --site vision.local console

## Open site in browser

    bench --site vision.local browse

## Clear cache

    bench --site vision.local clear-cache

## Restart services

    bench restart

---

# 23. Database / Site Information

The Git repository does NOT contain the site's database.

The following are local/developer-specific:

- MariaDB/MySQL database
- Redis
- Administrator password
- Site configuration
- Private files
- Public uploaded files
- Python virtual environment
- Node modules
- Generated assets

Do not commit passwords, API keys, tokens, or other credentials.

---

# 24. What a New Developer Needs to Do

After checking out this application for the first time:

    1. Install prerequisites
    2. Create/use a Frappe 17 Bench
    3. Get the Vision Empower app
    4. Activate the Python environment
    5. Configure Node.js 24
    6. Create a local Frappe site
    7. Install vision_empower on the site
    8. Build application assets
    9. Run database migrations
   10. Start the bench
   11. Open http://127.0.0.1:8000
   12. Log in to Frappe Desk

In command form:

    cd ~/frapee/vision-empower

    source env/bin/activate

    nvm use 24

    bench --site vision.local install-app vision_empower

    bench build --app vision_empower

    bench --site vision.local migrate

    bench start

Then open:

    http://127.0.0.1:8000

---

# 25. Troubleshooting

## Node.js is the wrong version

Check:

    node -v
    which node

Use Node 24:

    nvm use 24

Then verify again:

    node -v

---

## `bench build` reports an invalid Node version

Check:

    which node
    node -v

Make sure the old system/Homebrew Node executable is not being selected.

With NVM:

    nvm use 24

Then:

    which node
    node -v

Expected:

    /Users/<username>/.nvm/versions/node/v24.x.x/bin/node

---

## `vision_empower` is not installed

Run:

    bench --site vision.local install-app vision_empower

Then:

    bench --site vision.local list-apps

---

## Site does not exist

Check:

    bench list-sites

Create it if necessary:

    bench new-site vision.local

Then:

    bench --site vision.local install-app vision_empower

---

## Application changes are not visible

Build assets:

    bench build --app vision_empower

Then restart:

    bench restart

Or stop `bench start` with:

    Ctrl+C

and start it again:

    bench start

Clear cache if necessary:

    bench --site vision.local clear-cache

---

## Database migration errors

Run:

    bench --site vision.local migrate

Review the error shown in the terminal.

Do not delete the database unless the problem has been understood.

---

# 26. Current Development Environment

The application has been developed and tested with:

    Frappe Framework: 17.x
    Python: 3.14.x
    Node.js: 24.x
    Yarn: 1.x
    Application: vision_empower
    Application version: 0.0.1
    Site: vision.local

---

# 27. Important Distinction

This repository is the **Vision Empower application**.

It is NOT the complete Frappe installation.

The relationship is:

    GitHub
       |
       v
    vision_empower
       |
       v
    Frappe Bench
       |
       +---- frappe
       +---- vision_empower
       +---- sites
       +---- database
       +---- redis
       +---- environment
       |
       v
    Frappe Web Application

A developer should therefore install the Vision Empower application into their own local Frappe Bench and create/use their own local Frappe site.

---

# 28. Support / Development

For development questions, first check:

    bench --site vision.local list-apps

    node -v

    python --version

    bench --version

    git status

These commands provide the basic environment information required to diagnose most setup issues.

## UI Development

The Vision Empower staff interface uses **Vue 3** with **Frappe UI**, embedded within a Frappe Desk Page.

The UI is intentionally integrated with Frappe rather than being a separate Vue/Vite application. This allows the application to continue using native Frappe features such as authentication, permissions, DocTypes, Lists, Forms and Workflows.

### UI Structure

The main Vue application is located at:

```text
vision_empower/public/js/vision_empower/
├── VisionEmpower.vue
└── vision_empower.bundle.js
```

The Vue application is loaded from the Frappe Page:

```text
vision_empower/page/vision_empower/
├── vision_empower.js
└── vision_empower.json
```

The Frappe Page loads the Vue bundle using `frappe.require()`.

### Frontend Dependencies

Vue and Frappe UI are managed through `package.json`.

Install the frontend dependencies:

```bash
cd apps/vision_empower
yarn install
```

### Running the UI Locally

Start the Frappe development environment from the bench root:

```bash
cd ~/frappe-bench
bench start
```

If the Vue source or frontend dependencies have changed, rebuild the application:

```bash
bench build --app vision_empower
```

Then open the Vision Empower page in the browser:

```text
http://localhost:8000/app/vision-empower
```

### Development Flow

For changes to the Vue UI:

```text
Edit .vue files
     ↓
bench build --app vision_empower
     ↓
Refresh browser
```

For changes to Frappe Pages, DocTypes or backend code, use the normal Frappe development workflow.

### UI Architecture

The staff-facing UI should use Vue + Frappe UI for custom experiences such as:

* Dashboards
* Custom navigation
* Multi-step workflows
* Specialised data-entry screens

Native Frappe functionality should be preferred for standard:

* DocType CRUD
* Lists
* Forms
* Permissions
* Workflows
* Reports

The goal is to provide a polished Vision Empower experience while continuing to leverage the Frappe/ERPNext platform.
