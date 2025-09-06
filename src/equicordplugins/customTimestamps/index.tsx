/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings, useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Devs, EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { Forms, moment, TextInput, useEffect, useRef, UserStore, useState } from "@webpack/common";

type TimeFormat = {
    name: string;
    description: string;
    default: string;
    offset: number;
};
type TimeRowProps = {
    id: string;
    format: TimeFormat;
    onChange: (key: string, value: string) => void;
    pluginSettings: any;
};

const timeFormats: Record<string, TimeFormat> = {
    cozyFormat: {
        name: "Cozy mode",
        description: "Time format to use in messages on cozy mode",
        default: "[calendar]",
        offset: 0,
    },
    compactFormat: {
        name: "Compact mode",
        description: "Time format on compact mode and hovering messages",
        default: "LT",
        offset: 0,
    },
    tooltipFormat: {
        name: "Tooltip",
        description: "Time format to use on tooltips",
        default: "LLLL • [relative]",
        offset: 0,
    },
    ariaLabelFormat: {
        name: "Aria label",
        description: "Time format to use on aria labels",
        default: "[calendar]",
        offset: 0,
    },
    sameDayFormat: {
        name: "Same day",
        description: "[calendar] format for today",
        default: "[Today at ] HH:mm:ss",
        offset: 0,
    },
    lastDayFormat: {
        name: "Last day",
        description: "[calendar] format for yesterday",
        default: "[Yesterday at ] HH:mm:ss",
        offset: -1000 * 60 * 60 * 24,
    },
    lastWeekFormat: {
        name: "Last week",
        description: "[calendar] format for within the last week",
        default: "ddd DD.MM.YYYY HH:mm:ss",
        offset: -1000 * 60 * 60 * 24 * 6, // setting an offset of a week exactly pushes it into "older date" territory as soon as a second passes
    },
    sameElseFormat: {
        name: "Older date",
        description: "[calendar] format for older dates",
        default: "ddd DD.MM.YYYY HH:mm:ss",
        offset: -1000 * 60 * 60 * 24 * 31,
    }
};

const format = (date: Date, formatTemplate: string): string => {
    const mmt = moment(date);

    moment.relativeTimeThreshold("s", 60);
    moment.relativeTimeThreshold("ss", -1);
    moment.relativeTimeThreshold("m", 60);

    const sameDayFormat = settings.store?.formats?.sameDayFormat || timeFormats.sameDayFormat.default;
    const lastDayFormat = settings.store?.formats?.lastDayFormat || timeFormats.lastDayFormat.default;
    const lastWeekFormat = settings.store?.formats?.lastWeekFormat || timeFormats.lastWeekFormat.default;
    const sameElseFormat = settings.store?.formats?.sameElseFormat || timeFormats.sameElseFormat.default;

    return mmt.format(formatTemplate)
        .replace("calendar", () => mmt.calendar(null, {
            sameDay: sameDayFormat,
            lastDay: lastDayFormat,
            lastWeek: lastWeekFormat,
            sameElse: sameElseFormat
        }))
        .replace("relative", () => mmt.fromNow());
};

const TimeRow = (props: TimeRowProps) => {
    const [state, setState] = useState(props.pluginSettings?.[props.id] || props.format.default);

    const handleChange = (value: string) => {
        setState(value);
        props.onChange(props.id, value);
    };

    return (
        <>
            <Forms.FormTitle tag="h5">{props.format.name}</Forms.FormTitle>
            <Forms.FormText>{props.format.description}</Forms.FormText>
            <TextInput value={state} onChange={handleChange} />
        </>
    );
};

const MessagePreview = findComponentByCodeLazy<{
    author: any,
    message: any,
    compact: boolean,
    isGroupStart: boolean,
    className: string,
    hideSimpleEmbedContent: boolean;
}>(/previewGuildId:\i,preview:\i,/);
const createBotMessage = findByCodeLazy('username:"Clyde"');
const populateMessagePrototype = findByCodeLazy("isProbablyAValidSnowflake", "messageReference:");

const DemoMessage = (props: { msgId, compact, message, date: Date | undefined, isGroupStart?: boolean; }) => {
    const message = createBotMessage({ content: props.message, channelId: "1337", embeds: [] });
    message.author = UserStore.getCurrentUser();
    message.id = props.msgId;
    message.timestamp = moment(props.date ?? new Date());
    const user = UserStore.getCurrentUser();
    const populatedMessage = message && populateMessagePrototype(message);
    return populatedMessage ? (
        <div className="vc-cmt-demo-message">
            <MessagePreview
                author={{ ...user, nick: user.globalName || user.username }}
                message={populatedMessage}
                compact={props.compact}
                isGroupStart={props.isGroupStart || false}
                className="vc-cmt-demo-message-preview"
                hideSimpleEmbedContent={true}
            />
        </div>
    ) : <div className="vc-cmt-demo-message">
        <Forms.FormText>
            {/* @ts-ignore */}
            <b>Preview:</b> {Vencord.Plugins.plugins.CustomTimestamps.renderTimestamp(date, "cozy")}
        </Forms.FormText>
    </div>;
};

const DemoMessageContainer = ErrorBoundary.wrap(() => {
    const [isCompact, setIsCompact] = useState(false);
    const today = useRef<Date>(new Date());
    const yesterday = useRef<Date>(new Date(Date.now() + timeFormats.lastDayFormat.offset));
    const lastWeek = useRef<Date>(new Date(Date.now() + timeFormats.lastWeekFormat.offset));
    const aMonthAgo = useRef<Date>(new Date(Date.now() + timeFormats.sameElseFormat.offset));

    return (
        <div className={"vc-cmt-demo-message-container"} onClick={() => setIsCompact(!isCompact)}>
            <DemoMessage compact={isCompact} msgId={"1337"}
                message={`Click me to switch to ${isCompact ? "cozy" : "compact"} mode`} isGroupStart={true}
                date={aMonthAgo.current} />
            <DemoMessage compact={isCompact} msgId={"1338"} message={"This message was sent in the last week"}
                isGroupStart={true} date={lastWeek.current} />
            <DemoMessage compact={isCompact} msgId={"1339"} message={"Hover over timestamps to see tooltip formats"}
                isGroupStart={true} date={yesterday.current} />
            <DemoMessage compact={isCompact} msgId={"1340"} message={"Edit the formats below to see them live update here"} isGroupStart={true}
                date={today.current} />
        </div>
    );
}, { noop: true });

const settings = definePluginSettings({
    formats: {
        type: OptionType.COMPONENT,
        description: "Customize the timestamp formats",
        component: componentProps => {
            const [settingsState, setSettingsState] = useState(useSettings().plugins?.CustomTimestamps?.formats ?? {});

            const setNewValue = (key: string, value: string) => {
                const newSettings = { ...settingsState, [key]: value };
                setSettingsState(newSettings);
                componentProps.setValue(newSettings);
            };

            return (
                <>
                    <DemoMessageContainer />
                    {Object.entries(timeFormats).map(([key, value]) => (
                        <Forms.FormSection key={key}>
                            {key === "sameDayFormat" && (
                                <div className={Margins.bottom20}>
                                    <Forms.FormDivider style={{ marginBottom: "10px" }} />
                                    <Forms.FormTitle tag="h1">Calendar formats</Forms.FormTitle>
                                    <Forms.FormText>
                                        How to format the [calendar] value if used in the above timestamps.
                                    </Forms.FormText>
                                </div>
                            )}
                            <TimeRow
                                id={key}
                                format={value}
                                onChange={setNewValue}
                                pluginSettings={settingsState}
                            />
                        </Forms.FormSection>
                    ))}
                </>);
        }
    }
}).withPrivateSettings<{
    formats: {
        cozyFormat: string;
        compactFormat: string;
        tooltipFormat: string;
        ariaLabelFormat: string;
        sameDayFormat: string;
        lastDayFormat: string;
        lastWeekFormat: string;
        sameElseFormat: string;
    };
}>();

export default definePlugin({
    name: "CustomTimestamps",
    description: "Custom timestamps on messages and tooltips",
    authors: [Devs.Rini, EquicordDevs.nvhhr, EquicordDevs.Suffocate, Devs.Obsidian],
    settings,
    settingsAboutComponent: () => (
        <div className={"vc-cmt-info-card"}>
            <Forms.FormTitle tag="h2">How to use:</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://momentjs.com/docs/#/displaying/format/">Moment.js formatting documentation</Link>
                <div className={Margins.top8}>
                    Additionally you can use these in your inputs:<br />
                    <b>[calendar]</b> enables dynamic date formatting such
                    as &quot;Today&quot; or &quot;Yesterday&quot;.<br />
                    <b>[relative]</b> gives you times such as &quot;4 hours ago&quot;.<br />
                </div>
            </Forms.FormText>
        </div>
    ),
    patches: [
        {
            find: "#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}",
            replacement: [
                {
                    // Aria label on timestamps
                    match: /\i.useMemo\(\(\)=>\(0,\i\.\i\)\((\i)\),\[\i]\),/,
                    replace: "$self.renderTimestamp($1,'ariaLabel'),"
                },
                {
                    // Timestamps on messages
                    match: /\i\.useMemo\(\(\)=>null!=\i\?\(0,\i\.\i\)\(\i,\i\):(\i)\?\(0,\i\.\i\)\((\i),"LT"\):\(0,\i\.\i\)\(\i,!0\),\[\i,\i,\i]\)/,
                    replace: "$self.renderTimestamp($2,$1?'compact':'cozy')",
                },
                {
                    // Tooltips when hovering over message timestamps
                    match: /(?<=text:)\(\)=>\(0,\i.\i\)\((\i),"LLLL"\)(?=,)/,
                    replace: "$self.renderTimestamp($1,'tooltip')",
                },
            ]
        },
        {
            find: ".full,tooltipClassName:",
            replacement: {
                // Tooltips for timestamp markdown (e.g. <t:1234567890>)
                match: /text:(\i).full,/,
                replace: "text: $self.renderTimestamp(new Date($1.timestamp*1000),'tooltip'),"
            }
        }
    ],

    renderTimestamp: (date: Date, type: "cozy" | "compact" | "tooltip" | "ariaLabel") => {
        const forceUpdater = useForceUpdater();
        let formatTemplate: string;

        switch (type) {
            case "cozy":
                formatTemplate = settings.store.formats?.cozyFormat || timeFormats.cozyFormat.default;
                break;
            case "compact":
                formatTemplate = settings.store.formats?.compactFormat || timeFormats.compactFormat.default;
                break;
            case "tooltip":
                formatTemplate = settings.store.formats?.tooltipFormat || timeFormats.tooltipFormat.default;
                break;
            case "ariaLabel":
                formatTemplate = settings.store.formats?.ariaLabelFormat || timeFormats.ariaLabelFormat.default;
        }

        useEffect(() => {
            if (formatTemplate.includes("calendar") || formatTemplate.includes("relative")) {
                const interval = setInterval(forceUpdater, 1000);
                return () => clearInterval(interval);
            }
        }, []);

        return format(date, formatTemplate);
    }
});
