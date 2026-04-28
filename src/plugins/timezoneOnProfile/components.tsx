/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import {classes} from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useTimer } from "@utils/react";
import { User } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Menu, React, SearchableSelect, Timestamp, Tooltip, useEffect, UserStore, useState } from "@webpack/common";

import { settings } from "./settings";
import { formatTimezoneLabel, getOffsetMinutes, getUserTimezone, setUserTimezone, update } from "./utils";

const cl = findCssClassesLazy("dotSpacer", "userTagUsername");

function useSelectedTimezone(userId: string) {
    const { timezonesByUser } = settings.use(["timezonesByUser"]);

    return (timezonesByUser as unknown as Record<string, string>)[userId] ?? "";
}

export const TimezoneTriggerProfile = (props: { userId: string;[key: string]: any; }) => {
    const { userId, className } = props;
    const selectedTz = useSelectedTimezone(userId);
    const [currentTime, setCurrentTime] = useState<Date>(new Date(Date.now()));

    const elapsed = useTimer({
        interval: 60_000 - (Date.now() % 60_000),
        deps: [selectedTz]
    });

    useEffect(() => {
        if (!selectedTz) return;
        setCurrentTime(update(selectedTz));
    }, [elapsed, selectedTz]);

    if (!selectedTz) return null;

    const getDotSpacer = () => {
        try {
            return cl.dotSpacer ?? Object.values(cl).find(v => String(v).includes("dotSpacer")) ?? "vc-tzonprofile-dotSpacer";
        } catch {
            return "vc-tzonprofile-dotSpacer"; // if this fallback starts happening often, genuinely heartbreaking
        }
    };

    return (
        <>
            <div className="vc-tzonprofile-container" onClick={ e => { e.stopPropagation(); createTimezoneMenuItems(UserStore.getUser(userId), selectedTz).props.action(); }}>
                <div className="vc-tzonprofile-selector">
                    <span style={{ fontSize: settings.store.timeFontSize }} className={classes(className,"vc-tzonprofile-profiletime")}>
                        <Timestamp timestamp={currentTime} />
                    </span>
                </div>
            </div>
            <div aria-hidden="true" className={getDotSpacer()} />
        </>
    );
};

export const TimezoneTriggerUsername = (props: { userId: string; timestamp?: string | number | Date; isDM?: boolean; [key: string]: any; }) => {
    const { userId, timestamp, isDM = false } = props;
    const selectedTz = useSelectedTimezone(userId);
    const { messageTimeMode } = settings.use(["messageTimeMode"]);

    const shouldShow =
        messageTimeMode !== "off";

    const shouldUseSentTime =
        messageTimeMode === "sent"
        || (messageTimeMode === "dm-sent-server-current" && isDM);

    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    const elapsed = useTimer({
        interval: 60_000 - (Date.now() % 60_000),
        deps: [selectedTz, messageTimeMode, timestamp, isDM]
    });

    const user = UserStore.getUser(userId);
    const username = user?.globalName || user?.username || "Their";

    useEffect(() => {
        if (!selectedTz) return;

        const sourceDate =
            shouldUseSentTime && timestamp
                ? new Date(timestamp)
                : new Date();

        setCurrentTime(update(selectedTz, sourceDate));
    }, [elapsed, selectedTz, timestamp, shouldUseSentTime]);

    if (!shouldShow || !selectedTz) return null;

    return (
        <>
            <Tooltip
                tooltipClassName="vc-tzonprofile-tooltip-outer"
                text={
                    <div className="vc-tzonprofile-tooltip">
                        <div style={{ padding: "0 0 4px 0" }}>{username}'s Timezone</div>
                        <div>{formatTimezoneLabel(selectedTz)}</div>
                    </div>
                }
            >
                {tooltipProps => (
                    <span
                        {...tooltipProps}
                        style={{ fontSize: settings.store.timeFontSize }}
                        className="vc-tzonprofile-time"
                    >
                        {" "}
                        <Timestamp timestamp={currentTime} />
                    </span>
                )}
            </Tooltip>
        </>
    );
};

export function createTimezoneMenuItems(user: User, currentTimezone: string) {
    const hasTimezone = !!currentTimezone;
    const intlTzs = Intl.supportedValuesOf("timeZone");

    const tzWithOffsets = intlTzs.map(tz => ({ tz, offset: getOffsetMinutes(tz) }));
    tzWithOffsets.sort((a, b) => {
        if (a.offset !== b.offset) return a.offset - b.offset;
        return a.tz.localeCompare(b.tz);
    });

    const orderedTimezones = ["None", ...tzWithOffsets.map(t => t.tz)];

    const options = orderedTimezones.map(tz => {
        if (tz === "None") return { label: "None", value: "" };
        return { label: formatTimezoneLabel(tz), value: tz };
    });

    const openSelectModal = () => {
        const modalKey = openModal(props => (
            <ModalRoot {...props} size={ModalSize.SMALL} className="vc-tzonprofile-modal">
                <ModalHeader>
                    <BaseText tag="h3" size="lg" weight="semibold" style={{ flexGrow: 1 }}>Select Timezone</BaseText>
                    <ModalCloseButton onClick={() => closeModal(modalKey)} />
                </ModalHeader>
                <ModalContent className="vc-tzonprofile-modalcontent">
                    <ErrorBoundary>
                        <div className="vc-tzonprofile-modalinformation">
                            <div className="vc-tzonprofile-current-timezone">
                                <span>Selected Timezone: </span>
                                <strong>
                                    {currentTimezone ? formatTimezoneLabel(currentTimezone) : "None"}
                                </strong>
                            </div>

                            <SearchableSelect
                                options={options}
                                value={options.find(o => o.value === currentTimezone)}
                                placeholder="Select a timezone"
                                maxVisibleItems={12}
                                closeOnSelect={true}
                                onChange={(optOrValue: any) => {
                                    const v = typeof optOrValue === "string" ? optOrValue : optOrValue?.value ?? "";
                                    try { setUserTimezone(user.id, v); }
                                    catch (e) { console.error("[TimezoneOnProfile] Failed to update timezone:", e); }
                                    closeModal(modalKey);
                                }}
                            />
                        </div>
                    </ErrorBoundary>
                </ModalContent>
            </ModalRoot>
        ));
    };

    return <Menu.MenuItem
        key="set-timezone"
        id={hasTimezone ? "change-timezone" : "set-timezone"}
        label={hasTimezone ? "Change Timezone" : "Set Timezone"}
        action={openSelectModal}
    />;
}

export const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user || user.bot) return;
    const self = UserStore.getCurrentUser()?.id;
    if (self && user.id === self) return;

    const group = findGroupChildrenByChildId("close-dm", children) || findGroupChildrenByChildId("block", children) || children;
    if (group) {
        const currentTimezone = getUserTimezone(user.id);
        const timezoneMenuItems = createTimezoneMenuItems(user, currentTimezone);
        group.push(timezoneMenuItems as any); // had to remove "..."
    }
};
