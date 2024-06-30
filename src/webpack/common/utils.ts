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

import { canonicalizeMatch } from "@utils/patches";
import type { ChannelMessages as $ChannelMessages, ChannelRecord, DraftType, FluxDispatcher as $FluxDispatcher, FormattedMessage as $FormattedMessage, I18N, UserRecord } from "@vencord/discord-types";
import type { ReactNode } from "react";

// eslint-disable-next-line path-alias/no-relative
import { _resolveReady, filters, findByCodeLazy, findByPropsLazy, findLazy, mapMangledModuleLazy, waitFor } from "../webpack";
import type * as t from "./types/utils";

export let FluxDispatcher: $FluxDispatcher;
waitFor(["dispatch", "subscribe"], (m: $FluxDispatcher) => {
    FluxDispatcher = m;
    // Non import call to avoid circular dependency
    Vencord.Plugins.subscribeAllPluginsFluxActions(m);

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

export const ClipboardUtils: t.ClipboardUtils = mapMangledModuleLazy('queryCommandEnabled("copy")', {
    copy: filters.byCode(".copy("),
    SUPPORTS_COPY: e => typeof e === "boolean"
});

export let ComponentDispatch: any;
waitFor(["ComponentDispatch", "ComponentDispatcher"], m => ComponentDispatch = m.ComponentDispatch);

export const Constants = findByPropsLazy("Endpoints");

const openExpressionPickerMatcher = canonicalizeMatch(/setState\({activeView:\i,activeViewType:/);

// TODO: type
// zustand store
export const ExpressionPickerStore = mapMangledModuleLazy("expression-picker-last-active-view", {
    closeExpressionPicker: filters.byCode("setState({activeView:null"),
    openExpressionPicker: m => typeof m === "function" && openExpressionPickerMatcher.test(m.toString()),
});

export const FormattedMessage: typeof $FormattedMessage = findByCodeLazy('(this,"intlMessage",');

export const hljs: typeof import("highlight.js").default = findByPropsLazy("highlight", "registerLanguage");

export const i18n: I18N = findLazy(m => m.Messages?.["en-US"]);

export const IconUtils: t.IconUtils = findByPropsLazy("getGuildBannerURL", "getUserAvatarURL");

export const InstantInviteActionCreators = findByPropsLazy("resolveInvite");

export const lodash: typeof import("lodash") = findByPropsLazy("debounce", "cloneDeep");

export let MarkupUtils: t.MarkupUtils;
waitFor("parseTopic", m => MarkupUtils = m);

export const MessageActionCreators = findByPropsLazy("editMessage", "sendMessage");

export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const Permissions: t.Permissions = findLazy(m => typeof m.ADMINISTRATOR === "bigint");

export const PopoutWindowActionCreators: t.PopoutWindowActionCreators = mapMangledModuleLazy('type:"POPOUT_WINDOW_OPEN"', {
    open: filters.byCode('type:"POPOUT_WINDOW_OPEN"'),
    close: filters.byCode('type:"POPOUT_WINDOW_CLOSE"'),
    setAlwaysOnTop: filters.byCode('type:"POPOUT_WINDOW_SET_ALWAYS_ON_TOP"'),
});

export const promptToUpload: (files: File[], channel: ChannelRecord, draftType: DraftType) => void
    = findByCodeLazy(".ATTACHMENT_TOO_MANY_ERROR_TITLE,");

export const RestAPI: t.RestAPI = findLazy(m => typeof m === "object" && m.del && m.put);

export const RouterUtils: t.RouterUtils = mapMangledModuleLazy("Transitioning to ", {
    transitionTo: filters.byCode("transitionTo -"),
    transitionToGuild: filters.byCode("transitionToGuild -"),
    back: filters.byCode("goBack()"),
    forward: filters.byCode("goForward()"),
});

export let SnowflakeUtils: t.SnowflakeUtils;
waitFor(["fromTimestamp", "extractTimestamp"], m => SnowflakeUtils = m);

export const UploadAttachmentActionCreators = findByPropsLazy("clearAll", "addFile");

export const UserActionCreators = {
    getUser: findByCodeLazy(".USER(") as (userId: string) => Promise<UserRecord | undefined>
};

export const UserProfileModalActionCreators = findByPropsLazy("openUserProfileModal", "closeUserProfileModal");

export let UserSettingsModalActionCreators: any;
waitFor(["open", "saveAccountChanges"], m => UserSettingsModalActionCreators = m);

export const zustandCreate = findByCodeLazy("will be removed in v4");

export const zustandPersist = findByCodeLazy("[zustand persist middleware]");
