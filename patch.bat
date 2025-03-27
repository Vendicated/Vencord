@echo off
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm inject