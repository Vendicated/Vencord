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

import type { ChannelMessages as $ChannelMessages, ChannelRecord, DraftType, FluxDispatcher as $FluxDispatcher, UserRecord } from "@vencord/discord-types";
import type { ReactNode } from "react";

// eslint-disable-next-line path-alias/no-relative
import { _resolveReady, filters, findByCodeLazy, findByProps, findByPropsLazy, findLazy, proxyLazyWebpack, waitFor } from "../webpack";
import type * as t from "./types/utils";

export let FluxDispatcher: $FluxDispatcher;
waitFor(["dispatch", "subscribe"], (m: $FluxDispatcher) => {
    FluxDispatcher = m;
    // Non import call to avoid circular dependency
    Vencord.Plugins.subscribeAllPluginsFluxEvents(m);

    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveReady();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});

const ToastType = {
    MESSAGE: 0,
    SUCCESS: 1,
    FAILURE: 2,
    CUSTOM: 3,
    CLIP: 4,
    LINK: 5,
    FORWARD: 6,
};

const ToastPosition = {
    TOP: 0,
    BOTTOM: 1,
};

export const Toasts = {
    Type: ToastType,
    Position: ToastPosition,
    // what's less likely than getting 0 from Math.random()? Getting it twice in a row
    genId: () => (Math.random() || Math.random()).toString(36).slice(2),

    // hack to merge with the following interface, dunno if there's a better way
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    ...{} as {
        show(data: {
            message: string,
            id: string,
            /**
             * Toasts.Type
             */
            type: number,
            options?: {
                /**
                 * Toasts.Position
                 */
                position?: number;
                component?: ReactNode,
                duration?: number;
            };
        }): void;
        pop(): void;
    }
};

// This is the same module but this is easier
// ToastStore (zustand)
waitFor("showToast", m => {
    Toasts.show = m.showToast;
    Toasts.pop = m.popToast;
});

/**
 * Show a simple toast. If you need more options, use Toasts.show manually
 */
export function showToast(message: string, type = ToastType.MESSAGE) {
    Toasts.show({
        id: Toasts.genId(),
        message,
        type
    });
}

export let AlertActionCreators: t.AlertActionCreators;
waitFor(["show", "close"], m => AlertActionCreators = m);

export const ApplicationAssetUtils: {
    fetchAssetIds: (applicationId: string, e: string[]) => Promise<string[]>;
} = findByPropsLazy("fetchAssetIds", "getAssetImage");

export const ChannelActionCreators = findByPropsLazy("openPrivateChannel");

export const ChannelMessages: typeof $ChannelMessages = findByPropsLazy("clearCache", "_channelMessages");

export const ClipboardUtils: t.ClipboardUtils = findByPropsLazy("SUPPORTS_COPY", "copy");

export let ComponentDispatch: any;
waitFor(["ComponentDispatch", "ComponentDispatcher"], m => ComponentDispatch = m.ComponentDispatch);

export const Constants = findByPropsLazy("Endpoints");

export const hljs: typeof import("highlight.js").default = findByPropsLazy("highlight", "registerLanguage");

export const i18n: t.I18N = findLazy(m => m.Messages?.["en-US"]);

export const IconUtils: t.IconUtils = findByPropsLazy("getGuildBannerURL", "getUserAvatarURL");

export const InstantInviteActionCreators = findByPropsLazy("resolveInvite");

export const lodash: typeof import("lodash") = findByPropsLazy("debounce", "cloneDeep");

export let MarkupUtils: t.MarkupUtils;
waitFor("parseTopic", m => MarkupUtils = m);

export const MessageActionCreators = findByPropsLazy("editMessage", "sendMessage");

export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const { Permissions }: { Permissions: t.Permissions; } = findLazy(m => typeof m.Permissions?.ADMINISTRATOR === "bigint");

export const RestAPI: t.RestAPI = proxyLazyWebpack(() => {
    const mod = findByProps("getAPIBaseURL");
    return mod.HTTP ?? mod;
});

export const RouterUtils: t.RouterUtils = findByPropsLazy("transitionTo", "replaceWith", "transitionToGuild");

export let SnowflakeUtils: t.SnowflakeUtils;
waitFor(["fromTimestamp", "extractTimestamp"], m => SnowflakeUtils = m);

export const UploadAttachmentActionCreators = findByPropsLazy("clearAll", "addFile");

// Probably named promptToUpload.tsx or *Utils.tsx
export const UploadHandler: {
    promptToUpload: (files: File[], channel: ChannelRecord, draftType: DraftType) => void;
} = findByPropsLazy("showUploadFileSizeExceededError", "promptToUpload");

export const UserActionCreators: {
    getUser: (userId: string) => Promise<UserRecord | undefined>;
} = findByPropsLazy("getUser", "fetchCurrentUser");

export const UserProfileModalActionCreators = findByPropsLazy("openUserProfileModal", "closeUserProfileModal");

export let UserSettingsModalActionCreators: any;
waitFor(["open", "saveAccountChanges"], m => UserSettingsModalActionCreators = m);

export const zustandCreate = findByCodeLazy("will be removed in v4");

const persistFilter = filters.byCode("[zustand persist middleware]");
export const { persist: zustandPersist } = findLazy(m => m.persist && persistFilter(m.persist));
