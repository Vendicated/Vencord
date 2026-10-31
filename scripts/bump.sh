#!/bin/bash
set -e

pnpm version "$1" --recursive

version="v$(jq -r '.version' package.json)"

git commit -am "$version"
git tag "$version"
