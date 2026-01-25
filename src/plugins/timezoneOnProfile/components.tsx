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
import { closeModal, ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useTimer } from "@utils/react";
import { User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { Menu, React, SearchableSelect, Timestamp, useEffect, UserStore, useState } from "@webpack/common";

import { settings } from "./settings";
import { formatTimezoneLabel, getOffsetMinutes, getUserTimezone, setUserTimezone, update } from "./utils";

const cl = findByPropsLazy("dotSpacer", "userTag");

export const TimezoneTriggerInline = (props: { userId: string;[key: string]: any; }) => {
    const { userId } = props;
    settings.use(["timezonesByUser"]);
    const [selectedTz, setSelectedTz] = useState(getUserTimezone(userId));
    const [currentTime, setCurrentTime] = useState<Date>(new Date(Date.now()));

    const elapsed = useTimer({
        interval: 60_000 - (Date.now() % 60_000),
        deps: [selectedTz]
    });

    useEffect(() => {
        const tz = getUserTimezone(userId);
        if (tz !== selectedTz) setSelectedTz(tz);
    }, [userId]);

    useEffect(() => {
        if (!selectedTz) return;
        setCurrentTime(update(selectedTz));
    }, [elapsed, selectedTz]);

    if (!selectedTz) return null;

    return (
        <>
            <div className="vc-tzonprofile-container">
                <div className="vc-tzonprofile-selector">
                    <span style={{ fontSize: settings.store.timeFontSize }} className="vc-tzonprofile-time">
                        <Timestamp timestamp={currentTime} />
                    </span>
                </div>
            </div>
            <div className={cl.dotSpacer}></div>
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
                <ModalContent>
                    <ErrorBoundary>
                        <div style={{ padding: "4px 0" }}>
                            <SearchableSelect
                                options={options}
                                value={options.find(o => o.value === currentTimezone)}
                                placeholder="Select a timezone"
                                maxVisibleItems={8}
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
    // don't add context menu entries for the current user
    const self = UserStore.getCurrentUser()?.id;
    if (self && user.id === self) return;

    const group = findGroupChildrenByChildId("close-dm", children) || findGroupChildrenByChildId("block", children) || children;
    if (group) {
        const currentTimezone = getUserTimezone(user.id);
        const timezoneMenuItems = createTimezoneMenuItems(user, currentTimezone);
        group.push(...timezoneMenuItems as any);
    }
};
