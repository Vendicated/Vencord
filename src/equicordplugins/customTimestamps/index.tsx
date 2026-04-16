/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings, useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { Heading, HeadingPrimary } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Devs, EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { moment, TextInput, useEffect, useState } from "@webpack/common";

import { DemoMessageContainer, timeFormats } from "./utils";

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
            <Heading>{props.format.name}</Heading>
            <Paragraph>{props.format.description}</Paragraph>
            <TextInput value={state} onChange={handleChange} />
        </>
    );
};

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
                        <section key={key}>
                            {key === "sameDayFormat" && (
                                <div className={Margins.bottom20}>
                                    <Divider style={{ marginBottom: "10px" }} />
                                    <Heading tag="h1">Calendar formats</Heading>
                                    <Paragraph>
                                        How to format the [calendar] value if used in the above timestamps.
                                    </Paragraph>
                                </div>
                            )}
                            <TimeRow
                                id={key}
                                format={value}
                                onChange={setNewValue}
                                pluginSettings={settingsState}
                            />
                        </section>
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
            <HeadingPrimary>How to use:</HeadingPrimary>
            <Paragraph>
                <Link href="https://momentjs.com/docs/#/displaying/format/">Moment.js formatting documentation</Link>
                <div className={Margins.top8}>
                    Additionally you can use these in your inputs:<br />
                    <b>[calendar]</b> enables dynamic date formatting such
                    as &quot;Today&quot; or &quot;Yesterday&quot;.<br />
                    <b>[relative]</b> gives you times such as &quot;4 hours ago&quot;.<br />
                </div>
            </Paragraph>
        </div>
    ),
    patches: [
        {
            find: "#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}",
            replacement: [
                {
                    // Aria label on timestamps
                    match: /\i.useMemo\(.{0,10}\i\.\i\)\(.{0,10}\]\)/,
                    replace: "$self.renderTimestamp(arguments[0].timestamp,'ariaLabel')"
                },
                {
                    // Timestamps on messages
                    match: /\i\.useMemo\(.{0,50}"LT".{0,30}\]\)/,
                    replace: "$self.renderTimestamp(arguments[0].timestamp,arguments[0].compact?'compact':'cozy')",
                },
                {
                    // Tooltips when hovering over message timestamps
                    match: /(__unsupportedReactNodeAsText:).{0,25}"LLLL"\)/,
                    replace: "$1$self.renderTimestamp(arguments[0].timestamp,'tooltip')",
                },
            ]
        },
        {
            find: /.full,.{0,15}children:/,
            replacement: {
                // Tooltips for timestamp markdown (e.g. <t:1234567890>)
                match: /(__unsupportedReactNodeAsText:)\i.full/,
                replace: "$1$self.renderTimestamp(new Date(arguments[0].node.timestamp*1000),'tooltip')"
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
