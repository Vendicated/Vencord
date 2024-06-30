/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { openImageModal } from "@utils/discord";
import definePlugin from "@utils/types";
import type { ChannelRecord, UserRecord } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { ApplicationStreamingStore, ApplicationStreamPreviewStore } from "./webpack/stores";
import type { ApplicationStream, Stream } from "./webpack/types/stores";

export interface UserContextProps {
    channel: ChannelRecord;
    channelSelected: boolean;
    className: string;
    config: { context: string; };
    context: string;
    onHeightUpdate: (...args: unknown[]) => void;
    position: string;
    target: HTMLElement;
    theme: string;
    user?: UserRecord;
}

export interface StreamContextProps {
    appContext: string;
    className: string;
    config: { context: string; };
    context: string;
    exitFullscreen: (...args: unknown[]) => void;
    onHeightUpdate: (...args: unknown[]) => void;
    position: string;
    stream: Stream;
    target: HTMLElement;
    theme: string;
}

export function handleViewPreview({ guildId, channelId, ownerId }: ApplicationStream | Stream) {
    const previewUrl = ApplicationStreamPreviewStore.getPreviewURL(guildId, channelId, ownerId);
    if (previewUrl)
        openImageModal(previewUrl);
}

export const addViewStreamContext = ((children, { userId }: { userId: string; }) => {
    const stream = ApplicationStreamingStore.getAnyStreamForUser(userId);
    if (stream)
        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuItem
                label="View Stream Preview"
                id="view-stream-preview"
                icon={ScreenshareIcon}
                action={() => { handleViewPreview(stream); }}
            />
        );
}) satisfies NavContextMenuPatchCallback;

export const streamContextPatch = ((children, { stream }: StreamContextProps) => {
    addViewStreamContext(children, { userId: stream.ownerId });
}) satisfies NavContextMenuPatchCallback;

export const userContextPatch = ((children, { user }: UserContextProps) => {
    if (user)
        addViewStreamContext(children, { userId: user.id });
}) satisfies NavContextMenuPatchCallback;

export default definePlugin({
    name: "BiggerStreamPreview",
    description: "This plugin allows you to enlarge stream previews",
    authors: [Devs.phil],
    contextMenus: {
        "user-context": userContextPatch,
        "stream-context": streamContextPatch
    }
});
