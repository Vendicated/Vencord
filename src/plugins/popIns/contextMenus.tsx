/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Menu, SelectedChannelStore } from "@webpack/common";

import { getWebcamWindowKey, getWindowKey, logger } from "./constants";
import {
    closeStreamWindow,
    closeWebcamWindow,
    createStreamWindow,
    createWebcamWindow,
    currentChannelId,
    openWindows
} from "./components/FloatingWindow";
import { StreamingStore } from "./stores";
import { Stream, StreamContextProps, UserContextProps } from "./types";

/**
 * Context menu patch for stream context - adds "Pop Out Stream" option.
 */
export const streamContextPatch: NavContextMenuPatchCallback = (children, { stream }: StreamContextProps) => {
    const windowKey = getWindowKey(stream);
    const isOpen = openWindows.has(windowKey);

    logger.info(`streamContextPatch called, children.length before: ${children.length}`);

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="pop-out-stream"
            label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
            icon={ScreenshareIcon}
            action={(e: any) => {
                const doc = e?.view?.document || document;
                const participantsBtn = doc.querySelector('[class*="-participantsButton"]') as HTMLElement;
                const svg = participantsBtn?.querySelector("svg");
                const svgClasses = svg?.className?.baseVal || svg?.getAttribute("class") || "";

                const hasUpCaret = svgClasses.includes("upCaret");
                const hasDownCaret = svgClasses.includes("downCaret");

                logger.info(`[StreamClick] Button found: ${!!participantsBtn}, SVG classes: "${svgClasses}"`);
                logger.info(`[StreamClick] upCaret: ${hasUpCaret}, downCaret: ${hasDownCaret}`);
                logger.info(`[StreamClick] Participants are: ${hasUpCaret ? "HIDDEN" : hasDownCaret ? "SHOWN" : "UNKNOWN"}`);

                if (isOpen) {
                    closeStreamWindow(stream);
                } else {
                    createStreamWindow(stream, doc);
                }
            }}
        />
    );
};

/**
 * Context menu patch for user context - adds stream and webcam popout options.
 */
export const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    const channelId = currentChannelId || SelectedChannelStore.getVoiceChannelId() || "";

    // Check for stream first
    if (StreamingStore) {
        const stream = StreamingStore.getAnyStreamForUser(user.id);
        if (stream) {
            const windowKey = getWindowKey(stream as Stream);
            const isOpen = openWindows.has(windowKey);

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="pop-out-stream"
                    label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
                    icon={ScreenshareIcon}
                    action={(e: any) => {
                        const doc = e?.view?.document || document;
                        if (isOpen) {
                            closeStreamWindow(stream as Stream);
                        } else {
                            createStreamWindow(stream as Stream, doc);
                        }
                    }}
                />
            );
        }
    }

    // Always offer webcam popout option (for users in voice with camera)
    if (channelId) {
        const webcamKey = getWebcamWindowKey(user.id, channelId);
        const isWebcamOpen = openWindows.has(webcamKey);

        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuItem
                id="pop-out-webcam"
                label={isWebcamOpen ? "Close Webcam Popout" : "Pop Out Webcam"}
                icon={ScreenshareIcon}
                action={(e: any) => {
                    const doc = e?.view?.document || document;
                    if (isWebcamOpen) {
                        closeWebcamWindow(user.id, channelId);
                    } else {
                        createWebcamWindow(user.id, channelId, doc);
                    }
                }}
            />
        );
    }
};
