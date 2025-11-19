/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { WallpaperFreeStore } from "@equicordplugins/wallpaperFree/store";
import { openModal } from "@utils/modal";
import { makeCodeblock } from "@utils/text";
import { Button, FluxDispatcher, Parser } from "@webpack/common";

import { SetWallpaperModal } from "./modal";

export function GlobalDefaultComponent() {
    const setGlobal = (url?: string) => {
        FluxDispatcher.dispatch({
            // @ts-ignore
            type: "VC_WALLPAPER_FREE_CHANGE_GLOBAL",
            url,
        });
    };

    return (
        <>
            <Button onClick={() => {
                openModal(props => <SetWallpaperModal props={props} onSelect={setGlobal} initialUrl={WallpaperFreeStore.globalDefault} />);
            }}>Set a global wallpaper</Button>

            <Button
                color={Button.Colors.RED}
                onClick={() => setGlobal(void 0)}
            >Remove global default wallpaper</Button>

            <Button
                color={Button.Colors.RED}
                onClick={() => {
                    // @ts-ignore
                    FluxDispatcher.dispatch({ type: "VC_WALLPAPER_FREE_RESET" });
                }}
            >Reset wallpaper data</Button>
        </>
    );
}

export function TipsComponent() {
    const tipText = `
    .vc-wpfree-wp-container {
        transform: scaleX(-1); /* flip it horizontally */
        filter: blur(4px); /* apply a blur */
        opacity: 0.7; /* self-explanatory */
    }

    /* If you don't like embeds being transparent */

    [class*=embedFull__] {
        background: var(--background-surface-high) !important;
    }

    /* the same for codeblocks (or use ShikiCodeblocks) */

    .hljs {
        background-color: var(--background-base-lowest) !important;
    }`;
    return (
        <div style={{ userSelect: "text" }}>
            {!IS_WEB && (
                <>
                    <BaseText>
                        you can use local files by having them in the vencord theme directory, and using the url <code>vencord:///themes/filename.ext</code>
                    </BaseText>
                    <Button onClick={() => VencordNative.themes.openFolder()}>
                        Open Theme Directory
                    </Button>
                </>
            )}
            {Parser.parse(makeCodeblock(tipText, "css"))}
            <Button onClick={() => VencordNative.quickCss.openEditor()}>
                Open QuickCSS
            </Button>
        </div>
    );
}
