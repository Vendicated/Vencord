# Installing

## Prerequisites

-   Git
-   Node.JS v18 / v20

## Installing pnpm

```
npm install --global pnpm
```

## Cloning & Dependencies

```
git clone https://github.com/sinjs/Sencord.git
cd Sencord
pnpm install --frozen-lockfile
```

## Building

```
pnpm build
```

## Injecting (close discord first)

```
pnpm inject
```

# Updating

> :warning: The in-app updater might work, or not, honestly no idea. Try your luck :^) (or use the manual method)

## Pulling

```sh
git pull

# If this doesnt work because of local changes, reset first then run git pull again
git reset --hard
git pull
```

## Build

```
pnpm build
```

Then, restart Discord (no need to re-inject)

# Uninstalling (close discord first)

```
pnpm uninject
```
