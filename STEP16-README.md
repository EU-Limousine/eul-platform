# Step 16 — Enquiries inbox (dashboard)

Apply AFTER step 15 and 15b. Unzip over the repo root (code files only; no package.json changed).
Also fixes a step-15 schema comment (`/** */` → `///`), which Prisma would reject.

## Run (PowerShell, repo root)
```powershell
# If you already ran the step-15 migration, this adds handled_by_id; if not, it creates the table.
npm run db:migrate -- --name enquiry-inbox
# restart the API, then:
npm run api:generate          # adds useEnquiriesList / useEnquiriesUpdate
.\scripts\verify.ps1
npx playwright test -c e2e tests/dashboard-enquiries.spec.ts
```
Log out and in again in the dashboard so your session picks up the new permissions.

## What it does
- Dashboard → Enquiries (sidebar): tabs New / Handled / All, type filter, search, pagination.
- Open a message: all details, Reply by email (opens your mail app), Mark handled / Reopen.
- Who handled it and when is saved; every status change is in the audit log (status only, no personal data).
- Permissions: enquiries.read / enquiries.write for ADMIN, DISPATCHER (and SUPER_ADMIN). Not DEVELOPER or DRIVER.
- The public form endpoint is unchanged; its controller is renamed PublicEnquiriesController
  (generated hook `usePublicEnquiriesCreate`; the website does not use the hook).
