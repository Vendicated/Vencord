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

import { proxyLazy } from "@utils/lazy";
import type { Channel, User } from "discord-types/general";

// eslint-disable-next-line path-alias/no-relative
import { _resolveReady, find, findByPropsLazy, findLazy, waitFor } from "../webpack";
import type * as t from "./types/utils";

export let FluxDispatcher: t.FluxDispatcher;
export let ComponentDispatch;
waitFor(["ComponentDispatch", "ComponentDispatcher"], m => ComponentDispatch = m.ComponentDispatch);


export const RestAPI: t.RestAPI = findByPropsLazy("getAPIBaseURL", "get");
export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const hljs: typeof import("highlight.js") = findByPropsLazy("highlight", "registerLanguage");

export const lodash: typeof import("lodash") = findByPropsLazy("debounce", "cloneDeep");

export const i18n: t.i18n = findLazy(m => m.Messages?.["en-US"]);

export let SnowflakeUtils: t.SnowflakeUtils;
waitFor(["fromTimestamp", "extractTimestamp"], m => SnowflakeUtils = m);

export let Parser: t.Parser;
export let Alerts: t.Alerts;

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

export const UserUtils = findByPropsLazy("getUser", "fetchCurrentUser") as { getUser: (id: string) => Promise<User>; };
export const UploadHandler = findByPropsLazy("showUploadFileSizeExceededError", "promptToUpload") as {
    promptToUpload: (files: File[], channel: Channel, draftType: Number) => void;
};

export const ApplicationAssetUtils = findByPropsLazy("fetchAssetIds", "getAssetImage") as {
    fetchAssetIds: (applicationId: string, e: string[]) => Promise<string[]>;
};

export const Clipboard: t.Clipboard = findByPropsLazy("SUPPORTS_COPY", "copy");

export const NavigationRouter: t.NavigationRouter = findByPropsLazy("transitionTo", "replaceWith", "transitionToGuild");

waitFor(["dispatch", "subscribe"], m => {
    FluxDispatcher = m;
    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveReady();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});


// This is the same module but this is easier
waitFor("showToast", m => {
    Toasts.show = m.showToast;
    Toasts.pop = m.popToast;
});

waitFor(["show", "close"], m => Alerts = m);
waitFor("parseTopic", m => Parser = m);

export let SettingsRouter: any;
waitFor(["open", "saveAccountChanges"], m => SettingsRouter = m);

export const PermissionsBits: t.PermissionsBits = proxyLazy(() => find(m => typeof m.Permissions?.ADMINISTRATOR === "bigint").Permissions);
