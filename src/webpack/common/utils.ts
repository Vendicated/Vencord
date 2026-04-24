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

import type * as t from "@vencord/discord-types";
import { _resolveReady, filters, findByCodeLazy, findByPropsLazy, findLazy, mapMangledModuleLazy, waitFor } from "@webpack";
import type * as TSPattern from "ts-pattern";

export let FluxDispatcher: t.FluxDispatcher;
waitFor(["dispatch", "subscribe"], m => {
    FluxDispatcher = m;
    // Importing this directly causes all webpack commons to be imported, which can easily cause circular dependencies.
    // For this reason, use a non import access here.
    Vencord.Api.PluginManager.subscribeAllPluginsFluxEvents(m);

    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveReady();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});

export let ComponentDispatch: any;
waitFor(["dispatchToLastSubscribed"], m => ComponentDispatch = m);

export const Constants: t.Constants = mapMangledModuleLazy('ME:"/users/@me"', {
    Endpoints: filters.byProps("USER", "ME"),
    UserFlags: filters.byProps("STAFF", "SPAMMER"),
    FriendsSections: m => m.PENDING === "PENDING" && m.ADD_FRIEND
});

export const RestAPI: t.RestAPI = findLazy(m => typeof m === "object" && m.del && m.put);
export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const hljs: typeof import("highlight.js").default = findByPropsLazy("highlight", "registerLanguage");

export const useDrag = findByCodeLazy("useDrag::spec.begin was deprecated");
// you cant make a better finder i love that they remove display names sm
export const useDrop = findByCodeLazy(".options);return", ".collect,");

export const { match, P }: { match: typeof TSPattern["match"], P: typeof TSPattern["P"]; } = mapMangledModuleLazy("@ts-pattern/matcher", {
    match: filters.byCode("return new"),
    P: filters.byProps("when")
});

export const lodash: typeof import("lodash") = findByPropsLazy("debounce", "cloneDeep");

export const i18n = mapMangledModuleLazy(['defaultLocale:"en-US"', /initialLocale:\i/], {
    t: m => m?.[Symbol.toStringTag] === "IntlMessagesProxy",
    intl: m => m != null && Object.getPrototypeOf(m)?.withFormatters != null
}, true);

export let SnowflakeUtils: t.SnowflakeUtils;
waitFor(["fromTimestamp", "extractTimestamp"], m => SnowflakeUtils = m);

export let Parser: t.Parser;
waitFor("parseTopic", m => Parser = m);
export let Alerts: t.Alerts;
waitFor(["show", "close"], m => Alerts = m);

const ToastType = {
    MESSAGE: "message",
    SUCCESS: "success",
    FAILURE: "failure",
    CUSTOM: "custom",
    CLIP: "clip",
    LINK: "link",
    FORWARD: "forward",
    BOOKMARK: "bookmark",
    CLOCK: "clock"
};

const ToastPosition = {
    TOP: 0,
    BOTTOM: 1
};

export interface ToastData {
    message: string,
    id: string,
    /**
     * Toasts.Type
     */
    type: string,
    options?: ToastOptions;
}

export interface ToastOptions {
    /**
     * Toasts.Position
     */
    position?: number;
    component?: React.ReactNode,
    duration?: number;
}

export const Toasts = {
    Type: ToastType,
    Position: ToastPosition,
    // what's less likely than getting 0 from Math.random()? Getting it twice in a row
    genId: () => (Math.random() || Math.random()).toString(36).slice(2),

    // hack to merge with the following interface, dunno if there's a better way
    ...{} as {
        show(data: ToastData): void;
        pop(): void;
        create(message: string, type: string, options?: ToastOptions): ToastData;
    }
};

// seems like discord killed off toasts mostly so merged them into notifications
// waiting on vencords team to look into it further
// this code is terrible

const ToastTypeToNotificationColor: Record<string, string> = {
    [ToastType.SUCCESS]: "#3ba55d",
    [ToastType.FAILURE]: "#ed4245",
    [ToastType.MESSAGE]: "#5865f2",
    [ToastType.CUSTOM]: "#5865f2",
    [ToastType.CLIP]: "#5865f2",
    [ToastType.LINK]: "#00b0f4",
    [ToastType.FORWARD]: "#5865f2",
    [ToastType.BOOKMARK]: "#faa61a",
    [ToastType.CLOCK]: "#faa61a",
};

const ToastTypeToNotificationTitle: Record<string, string> = {
    [ToastType.MESSAGE]: "Notice",
    [ToastType.SUCCESS]: "Success",
    [ToastType.FAILURE]: "Error",
    [ToastType.CUSTOM]: "Notice",
    [ToastType.CLIP]: "Copied to Clipboard",
    [ToastType.LINK]: "Link",
    [ToastType.FORWARD]: "Forwarded",
    [ToastType.BOOKMARK]: "Saved",
    [ToastType.CLOCK]: "Reminder",
};

Toasts.create = (message: string, type: string, options?: ToastOptions): ToastData => ({
    id: Toasts.genId(),
    message,
    type,
    options,
});

Toasts.show = () => { };

Toasts.pop = () => { };

/**
 * Show a simple toast. If you need more options, use Toasts.show manually
 */
export function showToast(message: string, type = ToastType.MESSAGE, options?: ToastOptions) {
    Toasts.show(Toasts.create(message, type, options));
}

export const UserUtils = {
    getUser: findByCodeLazy(".USER(")
};

export const UploadManager = findByPropsLazy("clearAll", "addFile");
export const UploadHandler = {
    promptToUpload: findByCodeLazy("Unexpected mismatch between files and file metadata") as (files: File[], channel: t.Channel, draftType: Number) => Promise<void>
};

export const ApplicationAssetUtils = mapMangledModuleLazy("getAssetImage: size must === [", {
    fetchAssetIds: filters.byCode('.startsWith("http:")', ".dispatch({"),
    getAssetFromImageURL: filters.byCode("].serialize(", ":null"),
    getAssetImage: filters.byCode("getAssetImage: size must === ["),
    getAssets: filters.byCode(".assets")
});

export const NavigationRouter: t.NavigationRouter = mapMangledModuleLazy("transitionTo - Transitioning to", {
    transitionTo: filters.byCode("transitionTo -"),
    transitionToGuild: filters.byCode("transitionToGuild -"),
    back: filters.byCode("goBack()"),
    forward: filters.byCode("goForward()"),
});
export const ChannelRouter: t.ChannelRouter = mapMangledModuleLazy('"Thread must have a parent ID."', {
    transitionToChannel: filters.byCode(".preload"),
    transitionToThread: filters.byCode('"Thread must have a parent ID."')
});

export let SettingsRouter: any;
waitFor(["openUserSettings", "USER_SETTINGS_MODAL_KEY"], m => SettingsRouter = m);

export const PermissionsBits: t.PermissionsBits = findLazy(m => typeof m.ADMINISTRATOR === "bigint");

export const { zustandCreate } = mapMangledModuleLazy(["useSyncExternalStoreWithSelector:", "Object.assign"], {
    zustandCreate: filters.byCode(/=>(\i)\?\i\(\1/)
});

export const { zustandPersist } = mapMangledModuleLazy(".onRehydrateStorage)?", {
    zustandPersist: filters.byCode(/(\(\i,\i\))=>.+?\i\1/)
});

export const MessageActions = findByPropsLazy("editMessage", "sendMessage");
export const MessageCache = findByPropsLazy("clearCache", "_channelMessages");
export const UserProfileActions = findByPropsLazy("openUserProfileModal", "closeUserProfileModal");
export const InviteActions = findByPropsLazy("resolveInvite");
export const ChannelActionCreators = findByPropsLazy("openPrivateChannel");

export const VoiceActions = findByPropsLazy("toggleSelfMute");
export const GuildActions = findByPropsLazy("setServerMute", "setServerDeaf");
export const ChannelActions = findByPropsLazy("selectChannel", "selectVoiceChannel");
export const DraftActions = findByPropsLazy("saveDraft", "changeDraft");
export const PinActions = findByPropsLazy("pinMessage", "unpinMessage");

export const IconUtils: t.IconUtils = findByPropsLazy("getGuildBannerURL", "getUserAvatarURL");

export const ColorUtils = mapMangledModuleLazy("Invalid hex color format", {
    rgbToHex: filters.byCode(".toString(16).slice(1)"),
    hexToRgba: filters.byCode("`rgba(${"),
    hexToRgb: filters.byCode(".rgb();return"),
    rgbToHsl: filters.byCode("saturation:", "lightness:"),
    mixColors: filters.byCode(".substring(1,3),16)"),
    hexWithAlpha: filters.byCode("Invalid hex color format"),
    getDominantColor: filters.byCode("hex:", "hsv:"),
    generatePalette: filters.byCode("360/("),
});

export const ImageUtils = mapMangledModuleLazy("Input data is not a valid image.", {
    extractColors: filters.byCode('"number"==typeof'),
    fileToDataURL: filters.byCode("Result must be a string"),
    dataURLToBlob: filters.byCode("new Uint8Array("),
    dataURLToFile: filters.byCode("new File(["),
    fitDimensions: filters.byCode("minWidth:", "minHeight:"),
    loadImage: filters.byCode('addEventListener("load"'),
    isAnimatedPNG: filters.byCode("File is not a PNG"),
    base64Size: filters.byCode("Input data is not a valid image."),
});

export const ReadStateUtils = mapMangledModuleLazy('type:"ENABLE_AUTOMATIC_ACK",', {
    ackChannel: filters.byCode(".isForumLikeChannel(")
});

export const ExpressionPickerStore: t.ExpressionPickerStore = mapMangledModuleLazy("expression-picker-last-active-view", {
    openExpressionPicker: filters.byCode(/setState\({activeView:(?:(?!null)\i),activeViewType:/),
    closeExpressionPicker: filters.byCode("setState({activeView:null"),
    toggleMultiExpressionPicker: filters.byCode(".EMOJI,"),
    toggleExpressionPicker: filters.byCode(/getState\(\)\.activeView===\i\?\i\(\):\i\(/),
    setExpressionPickerView: filters.byCode(/setState\({activeView:\i,lastActiveView:/),
    setSearchQuery: filters.byCode("searchQuery:"),
    useExpressionPickerStore: filters.byCode(/\(\i,\i=\i\)=>/)
});

export const PopoutActions: t.PopoutActions = mapMangledModuleLazy('type:"POPOUT_WINDOW_OPEN"', {
    open: filters.byCode('type:"POPOUT_WINDOW_OPEN"'),
    close: filters.byCode('type:"POPOUT_WINDOW_CLOSE"'),
    setAlwaysOnTop: filters.byCode('type:"POPOUT_WINDOW_SET_ALWAYS_ON_TOP"'),
});

export const UsernameUtils: t.UsernameUtils = findByPropsLazy("useName", "getGlobalName");
export const DisplayProfileUtils: t.DisplayProfileUtils = mapMangledModuleLazy(/=\i\.getUserProfile\(\i\),\i=\i\.getGuildMemberProfile\(/, {
    getDisplayProfile: filters.byCode(".getGuildMemberProfile("),
    useDisplayProfile: filters.byCode(/\[\i\.\i,\i\.\i],\(\)=>/)
});

export const DateUtils: t.DateUtils = mapMangledModuleLazy("millisecondsInUnit:", {
    calendarFormat: filters.byCode('<-1?"sameElse":'),
    dateFormat: filters.byCode('<2?"nextDay":"sameElse";'),
    isSameDay: filters.byCode(/Math\.abs\(\i-\i\)/),
    diffAsUnits: filters.byCode("days:0", "millisecondsInUnit")
});

export const MessageTypeSets: t.MessageTypeSets = findByPropsLazy("REPLYABLE", "FORWARDABLE");

export const fetchApplicationsRPC = findByCodeLazy('"Invalid Origin"', ".application");

export const CloudUploader = findLazy(m => m.prototype?.trackUploadFinished) as typeof t.CloudUpload;

export const URLUtils: t.URLUtils = findByPropsLazy("URL_REGEX", "makeUrl", "isDiscordUrl");
export const Humanize: t.Humanize = findByPropsLazy("filesize", "relativeTime", "ordinal");
export const EmojiUtils: t.EmojiUtils = findByPropsLazy("getEmojiColors", "getURL");
