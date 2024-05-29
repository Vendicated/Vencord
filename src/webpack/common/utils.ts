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

// eslint-disable-next-line path-alias/no-relative
import { _resolveDiscordLoaded, filters, find, findByCode, findByProps, waitFor } from "../webpack";
import type * as t from "./types/utils";

export const FluxDispatcher = find<t.FluxDispatcher>(filters.byProps("dispatch", "subscribe"), (m: t.FluxDispatcher) => {
    // Non import call to avoid circular dependency
    Vencord.Plugins.subscribeAllPluginsFluxEvents(m);

    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveDiscordLoaded();
    };
    m.subscribe("CONNECTION_OPEN", cb);

    return m;
});

export const ComponentDispatch = find(filters.byProps("ComponentDispatch", "ComponentDispatcher"), m => m.ComponentDispatch);

export const Constants = findByProps("Endpoints");

export const RestAPI = find<t.RestAPI>(filters.byProps("getAPIBaseURL"), m => m.HTTP ?? m);
export const moment = findByProps<typeof import("moment")>("parseTwoDigitYear");

export const hljs = findByProps<typeof import("highlight.js")>("highlight", "registerLanguage");

export const lodash = findByProps<typeof import("lodash")>("debounce", "cloneDeep");

export const i18n = find<t.i18n>(m => m.Messages?.["en-US"]);

export const SnowflakeUtils = findByProps<t.SnowflakeUtils>("fromTimestamp", "extractTimestamp");

export const Parser = findByProps<t.Parser>("parseTopic");
export const Alerts = findByProps<t.Alerts>("show", "close");

const ToastType = {
    MESSAGE: 0,
    SUCCESS: 1,
    FAILURE: 2,
    CUSTOM: 3
};
const ToastPosition = {
    TOP: 0,
    BOTTOM: 1
};

export const Toasts = {
    Type: ToastType,
    Position: ToastPosition,
    // what's less likely than getting 0 from Math.random()? Getting it twice in a row
    genId: () => (Math.random() || Math.random()).toString(36).slice(2),

    // hack to merge with the following interface, dunno if there's a better way
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
                component?: React.ReactNode,
                duration?: number;
            };
        }): void;
        pop(): void;
    }
};

waitFor(filters.byCode("showToast"), m => {
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

export const UserUtils = findByProps<t.UserUtils>("getUser", "fetchCurrentUser");

export const UploadManager = findByProps("clearAll", "addFile");
export const UploadHandler = findByProps<t.UploadHandler>("showUploadFileSizeExceededError", "promptToUpload");

export const ApplicationAssetUtils = findByProps<t.ApplicationAssetUtils>("fetchAssetIds", "getAssetImage");

export const Clipboard = findByProps<t.Clipboard>("SUPPORTS_COPY", "copy");

export const NavigationRouter = findByProps<t.NavigationRouter>("transitionTo", "replaceWith", "transitionToGuild");

export const SettingsRouter = findByProps("open", "saveAccountChanges");

export const PermissionsBits = find<t.PermissionsBits>(m => typeof m.Permissions?.ADMINISTRATOR === "bigint", m => m.Permissions);

export const zustandCreate = findByCode("will be removed in v4");

const persistFilter = filters.byCode("[zustand persist middleware]");
export const zustandPersist = find(m => m.persist && persistFilter(m.persist), m => m.persist);

export const MessageActions = findByProps("editMessage", "sendMessage");
export const MessageCache = findByProps("clearCache", "_channelMessages");
export const UserProfileActions = findByProps("openUserProfileModal", "closeUserProfileModal");
export const InviteActions = findByProps("resolveInvite");

export const IconUtils = findByProps<t.IconUtils>("getGuildBannerURL", "getUserAvatarURL");
