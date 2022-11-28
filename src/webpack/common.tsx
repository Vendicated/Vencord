/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import type Components from "discord-types/components";
import { User } from "discord-types/general";
import type Other from "discord-types/other";
import type Stores from "discord-types/stores";

import { LazyComponent } from "../utils/misc";
import { proxyLazy } from "../utils/proxyLazy";
import { _resolveReady, filters, findByCode, findByCodeLazy, findByPropsLazy, mapMangledModule, mapMangledModuleLazy, waitFor } from "./webpack";

export const Margins = findByPropsLazy("marginTop20");

export let FluxDispatcher: Other.FluxDispatcher;
export const Flux = findByPropsLazy("connectStores");
export let React: typeof import("react");
export const ReactDOM: typeof import("react-dom") = findByPropsLazy("createPortal", "render");

export const RestAPI = findByPropsLazy("getAPIBaseURL", "get");
export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export const MessageStore = findByPropsLazy("getRawMessages") as Omit<Stores.MessageStore, "getMessages"> & {
    getMessages(chanId: string): any;
};
export const PermissionStore = findByPropsLazy("can", "getGuildPermissions");
export const PrivateChannelsStore = findByPropsLazy("openPrivateChannel");
export const GuildChannelStore = findByPropsLazy("getChannels");
export const ReadStateStore = findByPropsLazy("lastMessageId");
export const PresenceStore = findByPropsLazy("setCurrentUserOnConnectionOpen");
export let GuildStore: Stores.GuildStore;
export let UserStore: Stores.UserStore;
export let SelectedChannelStore: Stores.SelectedChannelStore;
export let SelectedGuildStore: any;
export let ChannelStore: Stores.ChannelStore;

export const Forms = {} as {
    FormTitle: Components.FormTitle;
    FormSection: any;
    FormDivider: any;
    FormText: Components.FormText;
};
export let Card: Components.Card;
export let Button: any;
export let Switch: any;
export let Tooltip: Components.Tooltip;
export let Router: any;
export let TextInput: any;
export let Text: (props: TextProps) => JSX.Element;

export const Select = LazyComponent(() => findByCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
export const Slider = LazyComponent(() => findByCode("closestMarkerIndex", "stickToMarkers"));

export let Parser: any;
export let Alerts: {
    show(alert: {
        title: any;
        body: React.ReactNode;
        className?: string;
        confirmColor?: string;
        cancelText?: string;
        confirmText?: string;
        secondaryConfirmText?: string;
        onCancel?(): void;
        onConfirm?(): void;
        onConfirmSecondary?(): void;
    }): void;
    /** This is a noop, it does nothing. */
    close(): void;
};
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

export const NavigationRouter = mapMangledModuleLazy("Transitioning to external path", {
    transitionTo: filters.byCode("Transitioning to external path"),
    transitionToGuild: filters.byCode("transitionToGuild"),
    goBack: filters.byCode("goBack()"),
    goForward: filters.byCode("goForward()"),
});

waitFor("useState", m => React = m);

waitFor(["dispatch", "subscribe"], m => {
    FluxDispatcher = m;
    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveReady();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});

waitFor(["getCurrentUser", "initialize"], m => UserStore = m);
waitFor("getSortedPrivateChannels", m => ChannelStore = m);
waitFor("getCurrentlySelectedChannelId", m => SelectedChannelStore = m);
waitFor("getLastSelectedGuildId", m => SelectedGuildStore = m);
waitFor("getGuildCount", m => GuildStore = m);

waitFor(["Hovers", "Looks", "Sizes"], m => Button = m);
waitFor(filters.byCode("helpdeskArticleId"), m => Switch = m);
waitFor(["Positions", "Colors"], m => Tooltip = m);
waitFor(m => m.Types?.PRIMARY === "cardPrimary", m => Card = m);

waitFor(filters.byCode("errorSeparator"), m => Forms.FormTitle = m);
waitFor(filters.byCode("titleClassName", "sectionTitle"), m => Forms.FormSection = m);
waitFor(m => m.Types?.INPUT_PLACEHOLDER, m => Forms.FormText = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return s.length < 200 && s.includes("().divider");
}, m => Forms.FormDivider = m);

// This is the same module but this is easier
waitFor(filters.byCode("currentToast?"), m => Toasts.show = m);
waitFor(filters.byCode("currentToast:null"), m => Toasts.pop = m);

waitFor(["show", "close"], m => Alerts = m);
waitFor("parseTopic", m => Parser = m);

waitFor(["open", "saveAccountChanges"], m => Router = m);
waitFor(["defaultProps", "Sizes", "contextType"], m => TextInput = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return (s.length < 1500 && s.includes("data-text-variant") && s.includes("always-white"));
}, m => Text = m);

export type TextProps = React.PropsWithChildren & {
    variant: TextVariant;
    style?: React.CSSProperties;
    color?: string;
    tag?: "div" | "span" | "p" | "strong" | `h${1 | 2 | 3 | 4 | 5 | 6}`;
    selectable?: boolean;
    lineClamp?: number;
    id?: string;
    className?: string;
};

export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/bold" | "heading-md/normal" | "heading-md/medium" | "heading-md/bold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/bold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/bold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/bold" | "eyebrow" | "heading-deprecated-14/normal" | "heading-deprecated-14/medium" | "heading-deprecated-14/bold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold" | "display-sm" | "display-md" | "display-lg" | "code";

type RC<C> = React.ComponentType<React.PropsWithChildren<C & Record<string, any>>>;
interface Menu {
    ContextMenu: RC<{
        navId: string;
        onClose(): void;
        className?: string;
        style?: React.CSSProperties;
        hideScroller?: boolean;
        onSelect?(): void;
    }>;
    MenuSeparator: React.ComponentType;
    MenuGroup: RC<any>;
    MenuItem: RC<{
        id: string;
        label: string;
        render?: React.ComponentType;
        onChildrenScroll?: Function;
        childRowHeight?: number;
        listClassName?: string;
    }>;
    MenuCheckboxItem: RC<{
        id: string;
    }>;
    MenuRadioItem: RC<{
        id: string;
    }>;
    MenuControlItem: RC<{
        id: string;
        interactive?: boolean;
    }>;
}

/**
 * Discord's Context menu items.
 * To use anything but Menu.ContextMenu, your plugin HAS TO
 * depend on MenuItemDeobfuscatorAPI. Otherwise they will throw
 */
export const Menu = proxyLazy(() => {
    const hasDeobfuscator = Vencord.Settings.plugins.MenuItemDeobfuscatorAPI.enabled;
    const menuItems = ["MenuSeparator", "MenuGroup", "MenuItem", "MenuCheckboxItem", "MenuRadioItem", "MenuControlItem"];

    const map = mapMangledModule("♫ ⊂(｡◕‿‿◕｡⊂) ♪", {
        ContextMenu: filters.byCode("getContainerProps"),
        ...Object.fromEntries((hasDeobfuscator ? menuItems : []).map(s => [s, (m: any) => m.name === s]))
    }) as Menu;

    if (!hasDeobfuscator) {
        for (const m of menuItems)
            Object.defineProperty(map, m, {
                get() {
                    throw new Error("MenuItemDeobfuscator must be enabled to use this.");
                }
            });
    }

    return map;
});

export const ContextMenu = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN"', {
    open: filters.byCode("stopPropagation"),
    openLazy: m => m.toString().length < 50,
    close: filters.byCode("CONTEXT_MENU_CLOSE")
}) as {
    close(): void;
    open(
        event: React.UIEvent,
        render?: Menu["ContextMenu"],
        options?: { enableSpellCheck?: boolean; },
        renderLazy?: () => Promise<Menu["ContextMenu"]>
    ): void;
    openLazy(
        event: React.UIEvent,
        renderLazy?: () => Promise<Menu["ContextMenu"]>,
        options?: { enableSpellCheck?: boolean; }
    ): void;
};
