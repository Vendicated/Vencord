import { lazyWebpack } from "../utils/misc";
import { _resolveReady, filters, waitFor } from "./webpack";

import type Components from "discord-types/components";
import type Stores from "discord-types/stores";
import type Other from "discord-types/other";
export const Margins = lazyWebpack(filters.byProps(["marginTop20"]));

export let FluxDispatcher: Other.FluxDispatcher;
export let React: typeof import("react");

export let GuildStore: Stores.GuildStore;
export let UserStore: Stores.UserStore;
export let SelectedChannelStore: Stores.SelectedChannelStore;
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

export const Select = lazyWebpack(filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));

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
    getUser: lazyWebpack(filters.byCode(".USER(", "getUser")),
};

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
waitFor("getGuildCount", m => GuildStore = m);

waitFor(["Hovers", "Looks", "Sizes"], m => Button = m);
waitFor(filters.byCode("helpdeskArticleId"), m => Switch = m);
waitFor(["Positions", "Colors"], m => Tooltip = m);
waitFor(m => m.Types?.PRIMARY === "cardPrimary", m => Card = m);

waitFor(m => m.Tags && filters.byCode("errorSeparator")(m), m => Forms.FormTitle = m);
waitFor(m => m.Tags && filters.byCode("titleClassName", "sectionTitle")(m), m => Forms.FormSection = m);
waitFor(m => m.Types?.INPUT_PLACEHOLDER, m => Forms.FormText = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return s.length < 200 && s.includes("divider");
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
    tag?: "div" | "span" | "p" | "strong";
    selectable?: boolean;
    lineClamp?: number;
    id?: string;
    className?: string;
};

export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/bold" | "heading-md/normal" | "heading-md/medium" | "heading-md/bold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/bold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/bold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/bold" | "eyebrow" | "heading-deprecated-14/normal" | "heading-deprecated-14/medium" | "heading-deprecated-14/bold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold" | "display-md" | "display-lg" | "code";
