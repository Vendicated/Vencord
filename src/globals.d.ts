/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LoDashStatic } from "lodash";

declare global {
    /**
     * This exists only at build time, so references to it in patches should insert it
     * via String interpolation OR use different replacement code based on this
     * but NEVER reference it inside the patched code
     *
     * @example
     * // BAD
     * replace: "IS_WEB?foo:bar"
     * // GOOD
     * replace: IS_WEB ? "foo" : "bar"
     * // also good
     * replace: `${IS_WEB}?foo:bar`
     */
    export var IS_WEB: boolean;
    export var IS_DEV: boolean;
    export var IS_STANDALONE: boolean;
    export var IS_DISCORD_DESKTOP: boolean;
    export var IS_VENCORD_DESKTOP: boolean;
    export var VERSION: string;
    export var BUILD_TIMESTAMP: number;

    export var VencordNative: typeof import("./VencordNative").default;
    export var Vencord: typeof import("./Vencord");
    export var VencordStyles: Map<string, {
        name: string;
        source: string;
        classNames: Record<string, string>;
        dom: HTMLStyleElement | null;
    }>;
    export var appSettings: {
        set(setting: string, v: any): void;
    };
    /**
     * Only available when running in Electron, undefined on web.
     * Thus, avoid using this or only use it inside an {@link IS_WEB} guard.
     *
     * If you really must use it, mark your plugin as Desktop App only by naming it Foo.desktop.ts(x)
     */
    export var DiscordNative: any;
    export var VencordDesktop: any;
    export var VencordDesktopNative: any;

    interface Window {
        webpackChunkdiscord_app: {
            push(chunk: any): any;
            pop(): any;
        };
        _: LoDashStatic;
        [k: string]: any;
    }
}

export { };
