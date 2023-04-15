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

import type { User } from "discord-types/general";

// eslint-disable-next-line path-alias/no-relative
import { _resolveReady, filters, findByCodeLazy, findByPropsLazy, findLazy, mapMangledModuleLazy, waitFor } from "../webpack";
import type * as t from "./types/utils";

export let FluxDispatcher: t.FluxDispatcher;
export const ComponentDispatch = findLazy(m => m.emitter?._events?.INSERT_TEXT);

export const RestAPI: t.RestAPI = findByPropsLazy("getAPIBaseURL", "get");
export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const hljs: typeof import("highlight.js") = findByPropsLazy("highlight");

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

export const UserUtils = {
    fetchUser: findByCodeLazy(".USER(", "getUser") as (id: string) => Promise<User>,
};

export const Clipboard = mapMangledModuleLazy('document.queryCommandEnabled("copy")||document.queryCommandSupported("copy")', {
    copy: filters.byCode(".default.copy("),
    SUPPORTS_COPY: x => typeof x === "boolean",
});

export const NavigationRouter = mapMangledModuleLazy("transitionToGuild - ", {
    transitionTo: filters.byCode("transitionTo -"),
    transitionToGuild: filters.byCode("transitionToGuild -"),
    goBack: filters.byCode("goBack()"),
    goForward: filters.byCode("goForward()"),
});

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
