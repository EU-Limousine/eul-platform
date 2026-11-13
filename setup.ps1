#Requires -Version 7
<#
  EU Limousine — first-time setup on Windows (PowerShell 7).
  Run from the repo root:   pwsh ./setup.ps1
  Needs: Node 22, Docker Desktop running. Installs the newest compatible packages with npm.
#>
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
Set-Location $PSScriptRoot

function Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# npm install with one retry using --legacy-peer-deps (some tools lag behind TypeScript 6 in their peer ranges).
function Install([string[]]$npmArgs) {
  try {
    npm install @npmArgs
  } catch {
    Write-Host "Retrying with --legacy-peer-deps: npm install $($npmArgs -join ' ')" -ForegroundColor Yellow
    npm install @npmArgs --legacy-peer-deps
  }
}

Step 'Checking tools'
$node = node -v
if (-not $node.StartsWith('v22')) { throw "Node 22 is required (found $node). Run: nvm use 22" }
docker info *> $null
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host 'Created .env from .env.example — edit SEED_ADMIN_* before seeding.' }

Step 'Root tools'
Install @('-D', 'turbo', 'typescript@~6.0.0', 'prettier', '@types/node@^22')

Step 'Database package (Prisma pinned to 7.10.1)'
Install @('-w', '@eul/db', '--save-exact', 'prisma@7.10.1', '@prisma/client@7.10.1', '@prisma/adapter-pg@7.10.1')
Install @('-w', '@eul/db', 'pg', 'dotenv', 'argon2')
Install @('-w', '@eul/db', '-D', 'tsx', '@types/pg')

Step 'API'
Install @('-w', '@eul/api',
  '@nestjs/common', '@nestjs/core', '@nestjs/platform-express', '@nestjs/config', '@nestjs/swagger',
  '@nestjs/passport', '@nestjs/jwt', '@nestjs/terminus', '@nestjs/throttler',
  'passport', 'passport-jwt', 'class-validator', 'class-transformer', 'cookie-parser', 'argon2',
  'nestjs-pino', 'pino-http', 'reflect-metadata', 'rxjs', '@nestjs/bullmq', 'bullmq', 'ioredis')
Install @('-w', '@eul/api', '-D',
  '@nestjs/cli', '@nestjs/schematics', '@nestjs/testing', '@types/express', '@types/cookie-parser',
  '@types/passport-jwt', 'jest', 'ts-jest', '@types/jest', 'supertest', '@types/supertest', 'pino-pretty')

Step 'Worker'
Install @('-w', '@eul/worker',
  '@nestjs/common', '@nestjs/core', '@nestjs/platform-express', '@nestjs/config', '@nestjs/bullmq',
  '@nestjs/terminus', 'bullmq', 'ioredis', 'nodemailer', 'nestjs-pino', 'pino-http', 'reflect-metadata', 'rxjs')
Install @('-w', '@eul/worker', '-D', '@nestjs/cli', '@nestjs/schematics', '@types/nodemailer', 'pino-pretty')

Step 'API client (Orval)'
Install @('-w', '@eul/api-client', '@tanstack/react-query')
Install @('-w', '@eul/api-client', '-D', 'orval')

Step 'Dashboard'
Install @('-w', '@eul/dashboard',
  'react', 'react-dom', '@tanstack/react-router', '@tanstack/react-query', 'zustand',
  'i18next', 'react-i18next', 'lucide-react', '@fontsource/inter', '@fontsource/playfair-display')
Install @('-w', '@eul/dashboard', '-D',
  'vite', '@vitejs/plugin-react', 'tailwindcss', '@tailwindcss/vite', '@types/react', '@types/react-dom', 'vitest')

Step 'Website'
Install @('-w', '@eul/website', 'next', 'react', 'react-dom', 'next-intl')
Install @('-w', '@eul/website', '-D', 'tailwindcss', '@tailwindcss/postcss', '@types/react', '@types/react-dom')

Step 'Starting Postgres, Redis and Mailpit (Docker)'
docker compose up -d --wait

Step 'Database: first migration + seed'
npm run db:migrate -- --name init
npm run db:generate   # Prisma 7: migrate no longer generates the client
npm run db:seed

Step 'Checks'
npx turbo run typecheck test --filter=@eul/api --filter=@eul/worker --filter=@eul/dashboard

Write-Host "`nDone. Start everything with:  npx turbo run dev" -ForegroundColor Green
Write-Host 'API http://localhost:8080/docs · Dashboard http://localhost:5173 · Website http://localhost:3000 · Mail http://localhost:8025'
