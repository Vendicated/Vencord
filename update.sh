#!/bin/bash

git fetch https://github.com/Vendicated/Vencord dev:upstream-dev --force
git stash
git checkout main
git rebase upstream-dev
git push --force origin main
pnpm build --dev
