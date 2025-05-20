/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { makeCodeblock } from "@utils/text";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { Button, FluxDispatcher, Parser } from "@webpack/common";

import { SetCustomWallpaperModal, SetDiscordWallpaperModal } from "./modal";

export const ChatWallpaperStore = findStoreLazy("ChatWallpaperStore");
export const fetchWallpapers = findByCodeLazy('type:"FETCH_CHAT_WALLPAPERS_SUCCESS"');

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
                openModal(props => <SetCustomWallpaperModal props={props} onSelect={setGlobal} />);
            }}>Set a global custom wallpaper</Button>

            <Button onClick={async () => {
                ChatWallpaperStore.shouldFetchWallpapers && await fetchWallpapers();
                openModal(props => <SetDiscordWallpaperModal props={props} onSelect={setGlobal} />);
            }}>Set a global Discord wallpaper</Button>

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
    [class^=wallpaperContainer] {
        transform: scaleX(-1); /* flip it horizontally */
        filter: blur(4px); /* apply a blur */
        opacity: 0.7; /* self-explanatory */
    }`;
    return Parser.parse(makeCodeblock(tipText, "css"));
}

export interface Wallpaper {
    id: string;
    label: string;
    default: Default;
    variants: Variants;
    isBlurred: boolean;
    designGroupId: string;
}

export interface Default {
    asset: string;
    icon: string;
    thumbhash: string;
    opacity?: number;
}

export interface Variants {
    dark: Default;
}
