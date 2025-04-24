/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary, Flex } from "@components/index";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { defineDefault, OptionType, StartAt } from "@utils/types";
import { Checkbox, Forms, Text } from "@webpack/common";

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

interface AllowLevels {
    error: boolean;
    warn: boolean;
    trace: boolean;
    log: boolean;
    info: boolean;
    debug: boolean;
}

interface AllowLevelSettingProps {
    settingKey: keyof AllowLevels;
}

function AllowLevelSetting({ settingKey }: AllowLevelSettingProps) {
    const { allowLevel } = settings.use(["allowLevel"]);
    const value = allowLevel[settingKey];

    return (
        <Checkbox
            value={value}
            onChange={(_, newValue) => settings.store.allowLevel[settingKey] = newValue}
            size={20}
        >
            <Text variant="text-sm/normal">{settingKey[0].toUpperCase() + settingKey.slice(1)}</Text>
        </Checkbox>
    );
}

const AllowLevelSettings = ErrorBoundary.wrap(() => {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Filter List</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8} type={Forms.FormText.Types.DESCRIPTION}>Always allow loggers of these types</Forms.FormText>
            <Flex flexDirection="row">
                {Object.keys(settings.store.allowLevel).map(key => (
                    <AllowLevelSetting key={key} settingKey={key as keyof AllowLevels} />
                ))}
            </Flex>
        </Forms.FormSection>
    );
});

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
    },
    allowLevel: {
        type: OptionType.COMPONENT,
        component: AllowLevelSettings,
        default: defineDefault<AllowLevels>({
            error: true,
            warn: false,
            trace: false,
            log: false,
            info: false,
            debug: false
        })
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

    Noop,
    NoopLogger: () => NoopLogger,

    shouldLog(logger: string, level: keyof AllowLevels) {
        return logAllow.has(logger) || settings.store.allowLevel[level] === true;
    },

    patches: [
        {
            find: "https://github.com/highlightjs/highlight.js/issues/2277",
            replacement: {
                match: /\(console.log\(`Deprecated.+?`\),/,
                replace: "("
            }
        },
        {
            find: 'The "interpolate" function is deprecated in v10 (use "to" instead)',
            replacement: {
                match: /,console.warn\(\i\+'The "interpolate" function is deprecated in v10 \(use "to" instead\)'\)/,
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
                match: /\i\.error(?=\(""\.concat\(\i," is not a valid locale."\)\))/,
                replace: "$self.Noop"
            }
        },
        {
            find: '"AppCrashedFatalReport: getLastCrash not supported."',
            replacement: {
                match: /console\.log(?=\("AppCrashedFatalReport: getLastCrash not supported\."\))/,
                replace: "$self.Noop"
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
                match: /\i\.totalTime>\i&&\i\.verbose\("Slow dispatch on ".+?\)\);/,
                replace: ""
            }
        },
        // Patches Discord generic logger function
        {
            find: "Σ:",
            predicate: () => settings.store.disableLoggers,
            replacement: {
                match: /(?<=&&)(?=console)/,
                replace: "$self.shouldLog(arguments[0],arguments[1])&&"
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
