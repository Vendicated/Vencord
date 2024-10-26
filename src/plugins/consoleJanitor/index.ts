/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const Noop = () => { };
const NoopLogger = {
    logDangerously: Noop,
    log: Noop,
    verboseDangerously: Noop,
    verbose: Noop,
    info: Noop,
    warn: Noop,
    error: Noop,
    trace: Noop,
    time: Noop,
    fileOnly: Noop
};

const logAllow = new Set();

const settings = definePluginSettings({
    disableLoggers: {
        type: OptionType.BOOLEAN,
        description: "Disables Discords loggers",
        default: false,
        restartNeeded: true
    },
    disableSpotifyLogger: {
        type: OptionType.BOOLEAN,
        description: "Disable the Spotify logger, which leaks account information and access token",
        default: true,
        restartNeeded: true
    },
    whitelistedLoggers: {
        type: OptionType.STRING,
        description: "Semi colon separated list of loggers to allow even if others are hidden",
        default: "GatewaySocket; Routing/Utils",
        onChange(newVal: string) {
            logAllow.clear();
            newVal.split(";").map(x => x.trim()).forEach(logAllow.add.bind(logAllow));
        }
    }
});

export default definePlugin({
    name: "ConsoleJanitor",
    description: "Disables annoying console messages/errors",
    authors: [Devs.Nuckyz, Devs.sadan],
    settings,

    startAt: StartAt.Init,
    start() {
        logAllow.clear();
        this.settings.store.whitelistedLoggers?.split(";").map(x => x.trim()).forEach(logAllow.add.bind(logAllow));
    },

    NoopLogger: () => NoopLogger,
    shouldLog(logger: string) {
        return logAllow.has(logger);
    },

    patches: [
        {
            find: 'react-spring: The "interpolate" function',
            replacement: {
                match: /,console.warn\('react-spring: The "interpolate" function is deprecated in v10 \(use "to" instead\)'\)/,
                replace: ""
            }
        },
        {
            find: 'console.warn("Window state not initialized"',
            replacement: {
                match: /console\.warn\("Window state not initialized",\i\),/,
                replace: ""
            }
        },
        {
            find: "is not a valid locale.",
            replacement: {
                match: /\i\.error\(""\.concat\(\i," is not a valid locale."\)\);/,
                replace: ""
            }
        },
        {
            find: 'console.warn("[DEPRECATED] Please use `subscribeWithSelector` middleware");',
            all: true,
            replacement: {
                match: /console\.warn\("\[DEPRECATED\] Please use `subscribeWithSelector` middleware"\);/,
                replace: ""
            }
        },
        {
            find: "RPCServer:WSS",
            replacement: {
                match: /\i\.error\("Error: "\.concat\((\i)\.message/,
                replace: '!$1.message.includes("EADDRINUSE")&&$&'
            }
        },
        {
            find: "Tried getting Dispatch instance before instantiated",
            replacement: {
                match: /null==\i&&\i\.warn\("Tried getting Dispatch instance before instantiated"\),/,
                replace: ""
            }
        },
        {
            find: "Unable to determine render window for element",
            replacement: {
                match: /console\.warn\("Unable to determine render window for element",\i\),/,
                replace: ""
            }
        },
        {
            find: "failed to send analytics events",
            replacement: {
                match: /console\.error\("\[analytics\] failed to send analytics events query: "\.concat\(\i\)\)/,
                replace: ""
            }
        },
        {
            find: "Slow dispatch on",
            replacement: {
                match: /\i\.totalTime>100&&\i\.verbose\("Slow dispatch on ".+?\)\);/,
                replace: ""
            }
        },
        // Patches discords generic logger function
        {
            find: "Σ:",
            predicate: () => settings.store.disableLoggers,
            replacement: {
                match: /(?<=&&)(?=console)/,
                replace: "$self.shouldLog(arguments[0])&&"
            }
        },
        {
            find: '("Spotify")',
            predicate: () => settings.store.disableSpotifyLogger,
            replacement: {
                match: /new \i\.\i\("Spotify"\)/,
                replace: "$self.NoopLogger()"
            }
        }
    ],
});
