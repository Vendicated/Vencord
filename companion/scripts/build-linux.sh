#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

git submodule update --init --recursive
mkdir -p dist

platform="${1:-linux/amd64}"

docker buildx build \
    --platform "$platform" \
    --target export \
    --output type=local,dest=dist \
    .

ls -lh dist/vencord-rpc
