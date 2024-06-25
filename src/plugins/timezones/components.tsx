/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ErrorBoundary, Link } from "@components/index";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, React, SearchableSelect, Text, Tooltip, useEffect, useState } from "@webpack/common";
import { SelectOption } from "@webpack/types";

import { Snowflake } from "./api";
import { getUserTimezone } from "./cache";
import settings, { TimezoneOverrides } from "./settings";
import { formatTimestamp, getTimezonesLazy } from "./utils";

// Based on Syncxv's vc-timezones user plugin //

const messageClasses = findByPropsLazy("timestamp", "compact", "contentOnly");

interface LocalTimestampProps {
    userId: Snowflake;
    timestamp?: Date;
    type: "message" | "profile";
}

export function LocalTimestamp(props: LocalTimestampProps): JSX.Element {
    return <ErrorBoundary noop={true} wrappedProps={props}>
        <LocalTimestampInner {...props} />
    </ErrorBoundary>;
}

function LocalTimestampInner(props: LocalTimestampProps): JSX.Element | null {
    const [timezone, setTimezone] = useState<string | null>();
    const [timestamp, setTimestamp] = useState(props.timestamp ?? Date.now());

    useEffect(() => {
        if (!timezone) {
            getUserTimezone(props.userId, props.type === "profile").then(setTimezone);
            return;
        }

        let timer: NodeJS.Timeout;

        if (props.type === "profile") {
            setTimestamp(Date.now());

            const now = new Date();
            const delay = (60 - now.getSeconds()) * 1000 + 1000 - now.getMilliseconds();

            timer = setTimeout(() => setTimestamp(Date.now()), delay);
        }

        return () => timer && clearTimeout(timer);
    }, [timezone, timestamp]);

    if (!timezone) return null;

    const longTime = formatTimestamp(timezone, timestamp, true);
    const shortTime = formatTimestamp(timezone, timestamp, false);

    if (props.type === "message" && !shortTime)
        return null;

    const shortTimeFormatted = props.type === "message"
        ? `• ${shortTime}`
        : shortTime ?? "Error";
    const classes = props.type === "message"
        ? `vc-timezones-message-display ${messageClasses.timestamp}`
        : "vc-timezones-profile-display";

    return <>
        <Tooltip
            position="top"
            // @ts-ignore
            delay={750}
            allowOverflow={false}
            spacing={8}
            hideOnClick={true}
            tooltipClassName="vc-timezones-tooltip"
            hide={!longTime}
            text={longTime}
        >
            {toolTipProps => <>
                <span {...toolTipProps}
                    className={classes}
                    onClick={() => {
                        toolTipProps.onClick();
                        openTimezoneOverrideModal(props.userId);
                    }}>
                    {shortTimeFormatted}
                </span>
            </>}
        </Tooltip>
    </>;
}

interface TimezoneOverrideModalProps {
    userId: string,
    modalProps: ModalProps,
}

function SetTimezoneOverrideModal(props: TimezoneOverrideModalProps) {
    const [availableTimezones, setAvailableTimezones] = useState<SelectOption[]>();
    const [timezone, setTimezone] = useState<string | "NONE" | undefined>();

    useEffect(() => {
        getTimezonesLazy().then(timezones => {
            const options: SelectOption[] = timezones.map(tz => {
                const offset = new Intl.DateTimeFormat(undefined, { timeZone: tz, timeZoneName: "shortOffset" })
                    .formatToParts(Date.now())
                    .find(part => part.type === "timeZoneName")!.value;

                return { label: `${tz} (${offset})`, value: tz };
            });

            options.unshift({
                label: "None (Ignore TimezoneDB)",
                value: "NONE", // I would use null but SearchableSelect is bugged in that null values get converted into undefined
            });

            options.unshift({
                label: "Auto (Retrieved from TimezoneDB)",
                value: undefined,
            });

            setAvailableTimezones(options);
        });

        const overrides: TimezoneOverrides = settings.store.timezoneOverrides ?? {};
        const override = overrides[props.userId];
        setTimezone(override === null ? "NONE" : override);
    }, []);

    function saveOverride() {
        if (availableTimezones === undefined) return;

        const overrides: TimezoneOverrides = {
            [props.userId]: timezone === "NONE" ? null : timezone,
            ...settings.store.timezoneOverrides,
        };
        if (timezone === undefined)
            delete overrides[props.userId];

        settings.store.timezoneOverrides = overrides;

        props.modalProps.onClose();
    }

    return <ModalRoot {...props.modalProps}>
        <ModalHeader className="vc-timezones-modal-header">
            <Forms.FormTitle tag="h2">
                Set Timezone Override for User
            </Forms.FormTitle>
            <ModalCloseButton onClick={props.modalProps.onClose} />
        </ModalHeader>

        <ModalContent className="vc-timezones-modal-content">
            <Text variant="text-md/normal">
                This override will only be visible locally and to any synchronized clients via Vencord Cloud.
                <br />
                <br />
                To set your own Timezone for other users to see,
                click <Link onClick={/* TODO */ _ => _}>here</Link> to
                authorize the public TimezoneDB API.
            </Text>

            <Forms.FormTitle tag="h3" className={Margins.top16}>
                Set Timezone
            </Forms.FormTitle>

            <section className={classes(Margins.bottom8, Margins.top8)}>
                <SearchableSelect
                    options={availableTimezones ?? []}
                    value={availableTimezones?.find(opt => opt.value === timezone)}
                    placeholder="Select a Timezone"
                    maxVisibleItems={7}
                    closeOnSelect={true}
                    onChange={setTimezone}
                />
            </section>
        </ModalContent>

        <ModalFooter className="vc-timezones-modal-footer">
            <Button
                color={Button.Colors.BRAND}
                disabled={availableTimezones === undefined}
                onClick={saveOverride}>
                Save
            </Button>
            <Button color={Button.Colors.RED} onClick={props.modalProps.onClose}>
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}

export function openTimezoneOverrideModal(userId: string) {
    openModal(modalProps => <>
        <ErrorBoundary>
            <SetTimezoneOverrideModal userId={userId} modalProps={modalProps} />
        </ErrorBoundary>
    </>);
}
