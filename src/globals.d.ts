/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Style } from "@api/Styles";

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
     * // also okay
     * replace: `${IS_WEB}?foo:bar`
     */
    export var IS_WEB: boolean;
    export var IS_EXTENSION: boolean;
    export var IS_USERSCRIPT: boolean;
    export var IS_STANDALONE: boolean;
    export var IS_UPDATER_DISABLED: boolean;
    export var IS_DEV: boolean;
    export var IS_REPORTER: boolean;
    export var IS_ANTI_CRASH_TEST: boolean;
    export var IS_DISCORD_DESKTOP: boolean;
    export var IS_VESKTOP: boolean;
    export var VERSION: string;
    export var BUILD_TIMESTAMP: number;

    export var VencordNative: typeof import("./VencordNative").default;
    export var Vencord: typeof import("./Vencord");
    export var VencordStyles: Map<string, Style>;
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
    export var Vesktop: any;
    export var VesktopNative: any;

    interface Window extends Record<PropertyKey, any> { }
}

export { };
