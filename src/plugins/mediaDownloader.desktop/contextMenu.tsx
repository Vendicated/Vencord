/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Flex } from "@components/Flex";
import { PluginNative } from "@utils/types";
import { Menu } from "@webpack/common";

import mediaDownloaderDesktop from ".";
import { DownloadImagesIcon } from "./DownloadImagesIcon";

const Native = VencordNative.pluginHelpers.MediaDownloader as PluginNative<typeof import("./native")>;


function makeDownloadItem(src: string, proxy: string) {
    return (
        <Menu.MenuItem
            label={
                <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                    Quick Save
                    <DownloadImagesIcon height={16} width={16} />
                </Flex>
            }
            key="download-image"
            id="download-image"
            action={() => Native.downloadFile(src, proxy)}
        />
    );
}

export const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    // console.log(props);
    // if (props?.reverseImageSearchType !== "img") return;
    if (!mediaDownloaderDesktop.settings.store.showInContextMenu) return;

    const src = props.itemHref ?? props.itemSrc;
    // TODO: find a way to extract the full proxied video URI if it's a video
    const proxy = props.itemSafeSrc; // will just be a preview jpg if it's an animation.
    if (!src && !proxy) return;

    const group = findGroupChildrenByChildId("save-image", children) ?? children;
    group?.push(makeDownloadItem(src, proxy));
};

export const imageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    // console.log(props);
    if (!mediaDownloaderDesktop.settings.store.showInContextMenu) return;

    const proxy = props.src;
    // TODO: find a way to extract the original URI
    const src = proxy;
    if (!src && !proxy) return;

    const group = findGroupChildrenByChildId("save-image", children) ?? children;

    group.push(makeDownloadItem(src, proxy));
};
