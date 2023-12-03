#!/bin/bash

echo "Checking npm version"
if command -v npm &> /dev/null; then
    echo "npm is installed"
else
    echo "npm is not installed"
    echo "bozo go install npm"
fi

echo "Checking pnpm version"
if command -v pnpm &> /dev/null; then
    echo "pnpm is installed"
else
    echo "pnpm is not installed"
    echo "Installing pnpm"
    npm i -g pnpm
fi

echo "Installing dependencies"
pnpm install --frozen-lockfile

echo "Building project"
pnpm build

echo "Injecting project"
pnpm inject
