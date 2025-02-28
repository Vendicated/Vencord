#!/bin/bash

git fetch https://github.com/Vendicated/Vencord dev:upstream-dev
git stash
git checkout main
git rebase upstream-dev
git push --force origin main
