/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import Module from "module";

if (IS_DISCORD_DESKTOP) {
    // Disable Sentry in native by monkeypatching over require
    // `crashReporterSetup.init(sentry, buildInfo)` will only call `initializeSentrySdk` (wrapper for `sentry.init`) if `sentry != null`
    Module.prototype.require = new Proxy(Module.prototype.require, {
        apply(target, thisArg, args) {
            if (args[0] === "@sentry/electron") return null;
            return Reflect.apply(target, thisArg, args);
        }
    });
}
