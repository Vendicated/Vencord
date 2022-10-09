import { waitFor, filters, _resolveReady } from "./webpack";
import type Components from "discord-types/components";
import type Stores from "discord-types/stores";
import type Other from "discord-types/other";
import { lazyWebpack } from "../utils/misc";

export const Margins = lazyWebpack(filters.byProps(["marginTop20"]));

export let FluxDispatcher: Other.FluxDispatcher;
export let React: typeof import("react");
export const UserStore: Stores.UserStore = lazyWebpack(filters.byProps(["getCurrentUser", "initialize"]));
export const GuildStore: Stores.GuildStore = lazyWebpack(filters.byProps(["getGuildCount", "initialize"]));
export const ChannelStore: Stores.ChannelStore = lazyWebpack(filters.byProps(["getChannel", "initialize"]));
export const GuildMemberStore: Stores.GuildMemberStore = lazyWebpack(filters.byProps(["getMember", "initialize"]));
export const MessageStore: Stores.MessageStore = lazyWebpack(filters.byProps(["getMessage", "initialize"]));
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

waitFor("useState", m => React = m);
waitFor(["dispatch", "subscribe"], m => {
    FluxDispatcher = m;
    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        _resolveReady();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});
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
