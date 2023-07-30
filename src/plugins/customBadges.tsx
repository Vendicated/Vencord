/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { addBadge, BadgePosition, ProfileBadge, removeBadge } from "@api/Badges";
import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import { Settings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import { Margins } from "@utils/margins";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Menu, Select, Tooltip, useState } from "@webpack/common";
import { User } from "discord-types/general";

const enum MenuItemParentType {
    User,
}

function ImageIcon(path: string, opts?: { link?: string; tooltip?: string; height?: number; width?: number; }) {
    return ({ tooltip }: { tooltip: string; }) => (
        <Tooltip text={tooltip} >
            {(tooltipProps: any) => (
                <img {...tooltipProps} src={path} height={opts?.height ?? 20} width={opts?.width ?? 20} />
            )}
        </Tooltip>
    );
}
let UsrIcons = {};

// Storage Handle
async function saveDataToDatastore() {
    await DataStore.set("CustomBadges-badges", UsrIcons);
}

async function loadDatastoreToData() {
    const badges = await DataStore.get("CustomBadges-badges");
    function setUsrIcons() {
        UsrIcons = badges;
        if (UsrIcons === undefined || UsrIcons === null) {
            return setUsrIcons();
        }
    }
    if (badges) {
        setUsrIcons();
    } else {
        await saveDataToDatastore();
    }
}
loadDatastoreToData();



const BadgeIcon = ({ user, badgeInfo }: { user: User, badgeInfo: { text: string, Icon: string; }; }) => {
    if (UsrIcons[user.id]) {
        const Icon = ImageIcon(badgeInfo.Icon);
        const tooltip = badgeInfo.text;
        return <Icon tooltip={tooltip} />;
    } else {
        return null;
    }
};

const Preview = ({ tooltip, url }) => {
    const Icon = ImageIcon(url);
    return <Icon tooltip={tooltip} />;
};



const BadgeMain = ({ user, wantMargin = true, wantTopMargin = false }: { user: User; wantMargin?: boolean; wantTopMargin?: boolean; }) => {

    const validBadges = UsrIcons[user.id];
    if (!validBadges) return null;
    const icons = Object.entries(validBadges).map(([num]) => (
        <BadgeIcon
            user={user}
            badgeInfo={validBadges[num]}
        />
    ));

    if (!Object.keys(validBadges).length || Object.keys(validBadges).length === 0) return null;

    return (
        <span
            className="customBadge"
            style={{
                display: "inline-flex",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: wantMargin ? 4 : 0,
                verticalAlign: "top",
                position: "relative",
                top: wantTopMargin ? 2 : 0,
                padding: !wantMargin ? 1 : 0,
                gap: 2
            }}

        >
            {icons}
        </span>
    );
};
const badge: ProfileBadge = {
    component: p => <BadgeMain {...p} wantMargin={false} />,
    position: BadgePosition.START,
    key: "custombadge"
};

const indicatorLocations = {
    badges: {
        onEnable: () => addBadge(badge),
        onDisable: () => removeBadge(badge)
    },
    messages: {
        onEnable: () => addDecoration("custom-badge", props =>
            <ErrorBoundary noop>
                <BadgeMain user={props.message?.author} wantTopMargin={true} />
            </ErrorBoundary>
        ),
        onDisable: () => removeDecoration("custom-badge")
    }
};
const BadgeOptions = ["Add", "Remove"] as const;

const cl = classNameFactory("vc-st-");

function restartResource() {
    const settings = Settings.plugins.CustomBadge;
    // REMOVE ALL BADGES
    Object.entries(indicatorLocations).forEach(([_, value]) => {
        value.onDisable();
    });

    // START BADGES
    Object.entries(indicatorLocations).forEach(([key, value]) => {
        if (settings[key]) value.onEnable();
    });
}

function PickerModal({ rootProps, close, userID }: { rootProps: ModalProps, close(): void; userID: any; }) {
    const [currentVal, setCurrentVal] = useState<string>("Add");
    const [badgeName, setBadgeName] = useState<string>();
    const [badgeTooltip, setBadgeTooltip] = useState<string>();
    const [badgeIcon, setBadgeIcon] = useState<string>();
    const [selectedBadgeID, setSelectedBadgeID] = useState<string>();

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Badge Add/Remover
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Select
                    options={
                        BadgeOptions.map(m => ({
                            label: m,
                            value: m
                        }))
                    }
                    isSelected={v => v === currentVal}
                    select={v => setCurrentVal(v)}
                    serialize={v => v}
                    renderOptionLabel={o => (
                        <div className={cl("format-label")}>
                            {o.label}
                        </div>
                    )}
                    renderOptionValue={() => currentVal}
                />
                {
                    currentVal === "Add" ? <>
                        <Forms.FormTitle>Badge Name for identifiying the badge to remove it</Forms.FormTitle>
                        <input
                            value={badgeName}
                            required={true}
                            onChange={e => setBadgeName(e.currentTarget.value)}
                            style={{
                                colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                            }}
                        />
                        <Forms.FormTitle>Badge Tooltip for when you hover over the badge</Forms.FormTitle>
                        <input
                            value={badgeTooltip}
                            required={true}
                            onChange={e => setBadgeTooltip(e.currentTarget.value)}
                            style={{
                                colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                            }}
                        />
                        <Forms.FormTitle>Badge icon in a link format</Forms.FormTitle>
                        <input
                            value={badgeIcon}
                            required={true}
                            onChange={e => setBadgeIcon(e.currentTarget.value)}
                            style={{
                                colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                            }}
                        />
                    </> : <>
                        <Forms.FormTitle>Remove Badge</Forms.FormTitle>
                        <Select
                            options={
                                Object.entries(UsrIcons[userID]).map(([id, badges]) => ({
                                    label: UsrIcons[userID][id].id,
                                    value: `${UsrIcons[userID][id].id} - ${id} - ${userID}`
                                }))
                            }
                            isSelected={v => v === selectedBadgeID}
                            select={v => setSelectedBadgeID(v)}
                            serialize={v => v}
                            renderOptionLabel={o => (
                                <div className={cl("format-label")}>
                                    {o.label}
                                </div>
                            )}
                            renderOptionValue={() => selectedBadgeID}
                        />

                    </>
                }



                <Forms.FormTitle className={Margins.bottom8}>Preview</Forms.FormTitle>
                <Forms.FormText className={cl("preview-text")}>
                    {
                        selectedBadgeID && currentVal === "Remove" ? <>
                            <span
                                className="customBadge"
                                style={{
                                    display: "inline-flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginLeft: 4,
                                    verticalAlign: "top",
                                    position: "relative",
                                    top: 2,
                                    padding: 1,
                                    gap: 2
                                }}

                            >
                                <Preview tooltip={UsrIcons[selectedBadgeID.split(" - ")[2]][selectedBadgeID.split(" - ")[1]].text} url={UsrIcons[selectedBadgeID.split(" - ")[2]][selectedBadgeID.split(" - ")[1]].Icon} /> <span>{" "}Hover over the icon for the tooltip!</span>
                            </span>

                        </> : currentVal === "Add" ? <>
                            <span
                                className="customBadge"
                                style={{
                                    display: "inline-flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginLeft: 4,
                                    verticalAlign: "top",
                                    position: "relative",
                                    top: 2,
                                    padding: 1,
                                    gap: 2
                                }}

                            >
                                <Preview tooltip={badgeTooltip} url={badgeIcon} /> <span>{" "}Hover over the icon for the tooltip!</span>
                            </span>
                        </> : null
                    }
                </Forms.FormText>
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        if (currentVal === "Add") {
                            if (!UsrIcons[userID] || Object.keys(UsrIcons).length === 0) UsrIcons[userID] = {};
                            UsrIcons[userID][badgeName] = {
                                Icon: badgeIcon,
                                text: badgeTooltip,
                                id: badgeName
                            };
                            saveDataToDatastore();
                        } else {
                            if (selectedBadgeID === undefined) return;
                            delete UsrIcons[selectedBadgeID.split(" - ")[2]][selectedBadgeID.split(" - ")[1]];
                            saveDataToDatastore();
                            setSelectedBadgeID(undefined);
                            restartResource();
                        }
                        insertTextIntoChatInputBox(currentVal + " ");
                        close();
                    }}
                >Execute</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function MenuItem(guildId: string, id?: string, type?: MenuItemParentType) {

    return (
        <Menu.MenuItem
            id="badge-context"
            label="Add/Delete Badge"
            action={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        userID={id}
                        close={() => closeModal(key)}
                    />
                ));
            }}
        />
    );
}

function makeContextMenuPatch(childId: string | string[], type?: MenuItemParentType): NavContextMenuPatchCallback {
    return (children, props) => () => {
        if (!props) return children;

        const group = findGroupChildrenByChildId(childId, children);
        const item = MenuItem(props.guildId, props.user.id, type);

        if (item == null) return;

        if (group)
            group.push(item);
        else if (childId === "close-dm")
            children.splice(-1, 0, <Menu.MenuGroup>{item}</Menu.MenuGroup>);
        else if (childId === "roles" && props.guildId)
            // "roles" may not be present due to the member not having any roles. In that case, add it above "Copy ID"
            children.splice(-1, 0, <Menu.MenuGroup>{item}</Menu.MenuGroup>);
    };
}

export default definePlugin({
    name: "CustomBadges",
    description: "Create custom badges for your friends or anyone!",
    authors: [{ name: "PFearr", id: 147436995679879168n }],
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI"],

    userContextMenuPatch: makeContextMenuPatch("user-profile", MenuItemParentType.User),

    start() {
        const settings = Settings.plugins.CustomBadge;
        const { displayMode } = settings;

        // transfer settings from the old ones, which had a select menu instead of booleans
        if (displayMode) {
            if (displayMode !== "both") settings[displayMode] = true;
            else {
                settings.badges = true;
            }
            settings.messages = true;
            delete settings.displayMode;
        }
        addContextMenuPatch("user-context", this.userContextMenuPatch);
        Object.entries(indicatorLocations).forEach(([key, value]) => {
            if (settings[key]) value.onEnable();
        });
    },

    stop() {
        removeContextMenuPatch("user-context", this.userContextMenuPatch);
        Object.entries(indicatorLocations).forEach(([_, value]) => {
            value.onDisable();
        });
    },


    options: {
        messages: {
            type: OptionType.BOOLEAN,
            description: "Next the the username in messages",
            default: true,
            restartNeeded: true,
        },
    }
});
