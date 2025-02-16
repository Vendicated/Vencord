/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./donationHelper.css";

import { Flex } from "@components/Flex";
import { Grid } from "@components/Grid";
import { Link } from "@components/Link";
import { SettingsTab, wrapTab } from "@components/VencordSettings/shared";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin, { StartAt } from "@utils/types";
import { chooseFile } from "@utils/web";
import { Button, Forms, GuildStore, TabBar, Text, TextInput, Tooltip, UserStore, useState } from "@webpack/common";
import React from "react";

import Plugins from "~plugins";

enum SponsorTab {
    EDIT,
    PENDING,
}

interface Badge {
    id: number,
    image: string,
    description: string;
}

enum PendingChangeStatus {
    ACCEPTED,
    REJECTED,
    PENDING,
}

interface PendingChange {
    badges: Badge[],
    date: Date,
    state: PendingChangeStatus,
}

function formatSubmissionDate(date: Date): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    const daySuffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    return `Submitted on ${month} ${day}${daySuffix(day)} ${year} at ${hours}:${minutes}:${seconds}`;
}

function imageToDataUrl(image: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            if (reader.result) {
                resolve(reader.result.toString());
            } else {
                reject(new Error("Failed to read image/convert to base64"));
            }
        };

        reader.onerror = reject;
        reader.readAsDataURL(image as Blob);
    });
}

function PendingChangeEntry({ data }: { data: PendingChange; }) {
    const gridLength = Math.min(5, data.badges.length);
    let statusDisplay = "Pending";
    let fontColor = "var(--status-warning)";

    switch (data.state) {
        case PendingChangeStatus.ACCEPTED:
            statusDisplay = "Accepted";
            fontColor = "var(--status-positive)";
            break;
        case PendingChangeStatus.REJECTED:
            statusDisplay = "Rejected";
            fontColor = "var(--status-danger)";
    }

    return (
        <div className="pending-changes-entry">
            <Text
                variant="heading-lg/semibold"
                tag="h2"
                className={Margins.bottom8}
                style={{ color: fontColor }}
            >
                {statusDisplay}
            </Text>

            <Forms.FormText type="description" className={Margins.bottom20}>
                {formatSubmissionDate(data.date)}
            </Forms.FormText>

            <div
                className="pending-changes-entry-badges"
                style={{ gridTemplateColumns: `repeat(${gridLength}, 18%)` }}
            >
                {data.badges.map(badge =>
                    <Flex flexDirection="column" className="pending-changes-entry-badge">
                        <img className="pending-changes-entry-image" src={badge.image} alt={badge.description} />

                        <Forms.FormText className="pending-changes-entry-description">
                            {badge.description}
                        </Forms.FormText>
                    </Flex>
                )}
            </div>
        </div>
    );
}

function BadgePendingTab({ entries }: { entries: PendingChange[]; }) {
    return (
        <Flex flexDirection="column" className="vc-sponsor-pending-changes">
            {entries.map(data =>
                <PendingChangeEntry data={data} />
            )}
        </Flex>
    );
}

interface BadgeOptionEntryProps {
    badge: Badge,
    onUpdate?: (badgeId: number, badge: Badge) => void;
}

function BadgeOptionEntry({ badge, onUpdate = () => { } }: BadgeOptionEntryProps) {
    const [image, setImage] = useState(badge.image);
    const [description, setDescription] = useState(badge.description);
    const [editingTooltip, setEditingTooltip] = useState(false);
    const [newTooltip, setNewTooltip] = useState(description);

    const editImage = async () => {
        const imageFile = await chooseFile("image/*");

        if (!imageFile) {
            return;
        }

        const dataUrl = await imageToDataUrl(imageFile);
        setImage(dataUrl);
        onUpdate(badge.id, { id: badge.id, image: image, description: description });
    };

    const editTooltip = () => {
        setEditingTooltip(true);
        setNewTooltip(description);
    };

    const finishEditTooltip = () => {
        setDescription(newTooltip);
        setEditingTooltip(false);
        onUpdate(badge.id, { id: badge.id, image: image, description: description });
    };

    return (
        <div className="badge-edit-entry">
            <Tooltip text="Click to change the image">
                {tooltipProps => (
                    <img {...tooltipProps} className="badge-edit-entry-image" src={image} alt={description} onClick={editImage} />
                )}
            </Tooltip>

            {editingTooltip ?
                <Flex flexDirection="column">
                    <TextInput autoFocus value={newTooltip} maxLength={30} onChange={setNewTooltip} />
                    <Button size={Button.Sizes.SMALL} onClick={finishEditTooltip}>Save</Button>
                </Flex>
                :
                <Tooltip text="Click to change the tooltip">
                    {tooltipProps => (
                        <Forms.FormText {...tooltipProps} className="badge-edit-entry-description" onClick={editTooltip}>
                            {description}
                        </Forms.FormText>
                    )}
                </Tooltip>
            }
        </div>
    );
}

function BadgeEditTab({ onUpdate = () => { } }: { onUpdate?: (badges: Badge[]) => void; }) {
    const badgeApi = Plugins.BadgeAPI as unknown as typeof import("../../_api/badges").default;
    const badges = badgeApi.getDonorBadges(UserStore.getCurrentUser().id) as unknown as Badge[] ?? [];

    badges.forEach((badge, index) => {
        (badge).id = index;
    });

    const [displayedBadges, setDisplayedBadges] = useState(badges);
    const badgeAmount = badges.length;
    const isServerMember = GuildStore.getGuild("1015060230222131221") !== undefined;
    const [updated, setUpdated] = useState(false);

    const onBadgeUpdated = (badgeId, badgeData) => {
        badges[badgeId] = badgeData;
        setDisplayedBadges(badges);
        setUpdated(true);
    };

    const onSubmit = () => {
        setUpdated(false);
        setDisplayedBadges(badges);
        onUpdate(badges);
    };

    return (
        <Flex flexDirection="column" className="vc-sponsor-badge-edit">
            <Forms.FormText type="description">
                You currently have {badgeAmount} badge{badgeAmount !== 1 && <>s</>} available
                {badgeAmount === 0 &&
                    <>
                        <br />Consider donating&nbsp;
                        <Link href="https://github.com/sponsors/Vendicated">
                            here
                        </Link>
                        &nbsp;to get badges!
                    </>
                }
            </Forms.FormText>

            {badgeAmount !== 0 &&
                <Grid columns={3} className="badge-edit-grid">
                    {displayedBadges.map(badge =>
                        <BadgeOptionEntry badge={badge} onUpdate={onBadgeUpdated} />
                    )}
                </Grid>
            }

            {!isServerMember ?
                <Forms.FormText>
                    You must be in the Vencord Discord server to use this feature.&nbsp;
                    <Link href="https://discord.gg/vencord">Join here</Link>
                </Forms.FormText>
                :
                <>
                    <Button size={Button.Sizes.SMALL} disabled={!isServerMember || !updated} onClick={onSubmit}>
                        Submit changes
                    </Button>

                    <Forms.FormText type="description">
                        Badges will be reviewed manually, do not upload any NSFW or Staff Badges as doing so could lead to the removal of badges.
                    </Forms.FormText>
                </>
            }
        </Flex>
    );
}

function BadgeSection() {
    const [currentTab, setCurrentTab] = useState(SponsorTab.EDIT);

    // @TODO: Load actual data from somewhere
    const pendingChanges: PendingChange[] = [];

    const onBadgeUpdate = () => {
        setCurrentTab(SponsorTab.PENDING);
    };

    return (
        <SettingsTab title="Sponsor">
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
                className="vc-settings-tab-bar"
            >
                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={SponsorTab.EDIT}
                >
                    Edit Badges
                </TabBar.Item>

                <TabBar.Item
                    className="vc-settings-tab-bar-item"
                    id={SponsorTab.PENDING}
                >
                    Pending Changes
                </TabBar.Item>
            </TabBar>

            {currentTab === SponsorTab.EDIT && <BadgeEditTab onUpdate={onBadgeUpdate} />}
            {currentTab === SponsorTab.PENDING && <BadgePendingTab entries={[]} />}
        </SettingsTab>
    );
}
export default definePlugin({
    name: "DonationHelper",
    authors: [Devs.surgedevs],
    description: "",
    required: true,
    dependencies: ["BadgeAPI"],
    startAt: StartAt.Init,

    start() {
        const settingsPlugin = Plugins.Settings as unknown as typeof import("../settings").default;
        settingsPlugin.customSections.push(() => ({
            section: "VencordSponsor",
            label: "Sponsor",
            element: wrapTab(BadgeSection, "Sponsor"),
            className: "vc-sponsor",
        }));
    },
});
