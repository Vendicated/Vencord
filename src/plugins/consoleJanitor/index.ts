/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

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

const settings = definePluginSettings({
    disableNoisyLoggers: {
        type: OptionType.BOOLEAN,
        description: "Disable noisy loggers like the MessageActionCreators",
        default: false,
        restartNeeded: true
    },
    disableSpotifyLogger: {
        type: OptionType.BOOLEAN,
        description: "Disable the Spotify logger, which leaks account information and access token",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "ConsoleJanitor",
    description: "Disables annoying console messages/errors",
    authors: [Devs.Nuckyz],
    settings,

    NoopLogger: () => NoopLogger,

    patches: [
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
        ...[
            '("MessageActionCreators")', '("ChannelMessages")',
            '("Routing/Utils")', '("RTCControlSocket")',
            '("ConnectionEventFramerateReducer")', '("RTCLatencyTestManager")',
            '("OverlayBridgeStore")', '("RPCServer:WSS")', '("RPCServer:IPC")'
        ].map(logger => ({
            find: logger,
            predicate: () => settings.store.disableNoisyLoggers,
            all: true,
            replacement: {
                match: new RegExp(String.raw`new \i\.\i${logger.replace(/([()])/g, "\\$1")}`),
                replace: `$self.NoopLogger${logger}`
            }
        })),
        {
            find: '"Experimental codecs: "',
            predicate: () => settings.store.disableNoisyLoggers,
            replacement: {
                match: /new \i\.\i\("Connection\("\.concat\(\i,"\)"\)\)/,
                replace: "$self.NoopLogger()"
            }
        },
        {
            find: '"Handling ping: "',
            predicate: () => settings.store.disableNoisyLoggers,
            replacement: {
                match: /new \i\.\i\("RTCConnection\("\.concat.+?\)\)(?=,)/,
                replace: "$self.NoopLogger()"
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
    ]
});
