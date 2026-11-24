# Step 18 — Google Cloud deployment kit

Unzip over the repo root. No app code or package.json changed. Contents:
- infrastructure/gcp/*.sh + README.md — run in Google Cloud Shell, in order (see README).
- .github/workflows/deploy.yml — builds images and deploys after CI passes on main (with approval).
- apps/api/Dockerfile — adds OpenSSL (Prisma migrations need it).
- apps/website/Dockerfile — passes the homepage variant and cookie categories at build time.

Start with infrastructure/gcp/README.md. Edit PROJECT_ID and GITHUB_REPO in infrastructure/gcp/config.sh first.
