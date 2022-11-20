# Web Installation Guide

## Sections

- [Prerequisites](#prerequisites)
- [Installing (1st time)](#installing-web)
- [Developing for Web](#developing)

## Prerequisites

- Install Git from <https://git-scm.com/download>
- Install Node.js LTS from here: <https://nodejs.dev/en/>
- Install pnpm after Node.js: <https://pnpm.io/installation#using-npm>
- (Firefox only + optional) A Firefox account: <https://accounts.firefox.com/>

## Installing (Web)

If you have already built Vencord already, then you can jump to the section below: [Quick Deploy](#quick-deploy)

Clone the Vencord repository:

```shell
git clone https://github.com/Vendicated/Vencord
cd Vencord
```

Sync npm dependencies:

```shell
pnpm i
```

Build Vencord as a browser extension:

```shell
pnpm buildWeb
```

### Installing to Chrome

Vencord does not and will not support Manifest v3, therefore after January 2024, switch to Ungoogled Chromium instead of
Chrome (no amount of complaining will make it work).

1. Once `buildWeb` is run, the extension will be located at `Vencord/dist/extension-chrome` (yes, a folder)
2. Go to [chrome://extensions/](chrome://extensions/) and enable Developer Mode in the top right
3. Select Load Unpacked and navigate to the extension folder
4. You will have to confirm the "Keep Developer plugins?" popup after every Chrome restart

### Installing to Firefox

Unfortunately, Firefox doesn't support permanent extensions without signing (excluding dev/nightly firefox). However, it
is extremely easy to get signing credentials.
You can still install extensions without signing, however they will only last until you restart Firefox.

1. Once `buildWeb` is run, the extension will be located at `Vencord/dist/extension-firefox.zip`
2. If you are on Firefox nightly or dev, but NOT STABLE:
    1. Open up `about:config` in a new tab
    2. Search for xpinstall.signatures.required and set it to false
    3. Open up `about:addons` in a new tab
    4. Click the settings icon at top left and select `Install Addon from File`
    5. Navigate to the file mentioned earlier and select it, done.
3. If you don't want to make a Firefox account and are on a stable build:
    1. Open up `about:debugging` in a new tab
    2. Go to the "This Firefox" tab
    3. Click "Load Temporary Addon" and navigate to the zip mentioned earlier
    4. You will have to do this every single time you launch Firefox
4. If you want a permanent installation:
    1. Go to [Firefox's addon API key portal](https://addons.mozilla.org/en-US/developers/addon/api/key/)
    2. Log in with your account
    3. Generate new API key credentials and confirm with your email
    4. Save them somewhere safe
    5. Go back to your terminal and run `pnpm firefox:sign --api-key <JWT_KEY> --api-secret <JWT_SECRET>` with your key
       values
    6. The extension will now be located at `Vencord/dist/<some_random_id_-1.0.0.xpi`
    7. Follow steps 2.3 to 2.5 with the xpi just mentioned

### Installing to other Browsers

If your browser does not require signing, then you can run `pnpm buildWeb:zip` which will
generate `extension-unsigned.zip` in your `dist` folder.

## Developing

### Live-reloading

You can launch an instance of FF/Chrome that wil automatically reload the extension when src changes are detected. This
instance will use a new temporary profile not associated with any other ones you currently have. Therefore, no session
data will be kept between restarts.

- Chrome: `pnpm chrome:run`
- Firefox `pnpm firefox:run`
