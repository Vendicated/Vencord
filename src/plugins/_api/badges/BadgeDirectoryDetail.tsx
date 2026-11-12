/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./badgeDirectory.css";

import { DirectoryBadge } from "@api/Badges";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { LinkIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import DonateButton from "@components/settings/DonateButton";
import { SpecialCard } from "@components/settings/SpecialCard";
import { PluginCard } from "@components/settings/tabs/plugins/PluginCard";
import { DevsById } from "@utils/constants";
import { fetchUserProfile, openInviteModal } from "@utils/discord";
import { pluralise } from "@utils/misc";
import { React, showToast, useEffect, useMemo, UserProfileStore, UserStore, useStateFromStores } from "@webpack/common";

import Plugins from "~plugins";

const DONOR_BACKGROUND_IMAGE = "https://media.discordapp.net/stickers/1311070116305436712.png?size=2048";
const VENNIE_DONATOR_IMAGE = "https://cdn.discordapp.com/emojis/1238120638020063377.png";
const VENCORD_INVITE = "D9uwnFnqmd";

interface BadgeDirectoryDetailProps {
    badge?: DirectoryBadge;
    userId?: string;
    isViewingOtherUser?: boolean;
}

interface BadgeDirectoryDetailContentProps {
    badge?: DirectoryBadge;
    userId?: string;
    isViewingOtherUser?: boolean;
    isContributor: boolean;
    isDonorBadge: boolean;
}

function BadgeDirectoryDetailContent({
    badge,
    userId,
    isViewingOtherUser,
    isContributor,
    isDonorBadge
}: BadgeDirectoryDetailContentProps) {
    useSettings();

    const currentUser = useStateFromStores([UserStore], () => UserStore.getCurrentUser());
    const targetUserId = userId ?? badge?.userId ?? (isViewingOtherUser ? undefined : currentUser?.id);
    const isSelf = currentUser?.id === targetUserId || !isViewingOtherUser;

    const user = useStateFromStores([UserStore], () => targetUserId ? UserStore.getUser(targetUserId) : null);
    const profile = useStateFromStores([UserProfileStore], () => targetUserId ? UserProfileStore.getUserProfile(targetUserId) : null);

    useEffect(() => {
        if (!profile && targetUserId && !user?.bot) {
            fetchUserProfile(targetUserId);
        }
    }, [targetUserId, user?.bot, profile]);

    const plugins = useMemo(() => {
        if (!isContributor || !targetUserId) return [];
        const allPlugins = Object.values(Plugins);
        const pluginsByAuthor = DevsById[targetUserId]
            ? allPlugins.filter(p => p.authors.includes(DevsById[targetUserId]))
            : user?.username
                ? allPlugins.filter(p => p.authors.some(a => a.name === user.username))
                : [];

        return pluginsByAuthor
            .filter(p => !p.name.endsWith("API"))
            .sort((a, b) => Number(a.required ?? false) - Number(b.required ?? false));
    }, [isContributor, targetUserId, user?.username]);

    if (isContributor) {
        if (!plugins.length) return null;

        const ContributedHyperLink = <Link href="https://vencord.dev/source">contributed</Link>;

        return (
            <div className="vc-badge-directory-section">
                <Paragraph>
                    {isSelf
                        ? <>You have {ContributedHyperLink} to {pluralise(plugins.length, "plugin")}!</>
                        : <>This person has {ContributedHyperLink} to {pluralise(plugins.length, "plugin")}!</>}
                </Paragraph>
                <div className="vc-badge-directory-plugins">
                    {plugins.map(p => (
                        <PluginCard
                            key={p.name}
                            plugin={p}
                            disabled={p.required ?? false}
                            onRestartNeeded={() => showToast({ text: "Restart to apply changes!" })}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (isDonorBadge) {
        return (
            <div className="vc-badge-directory-section">
                <SpecialCard
                    title="Donations"
                    subtitle={isSelf ? "Thank you for donating!" : "This user is a donor!"}
                    description={isSelf
                        ? "Manage your perks by messaging @vending.machine."
                        : "Support Vencord to get your own badge and perks!"}
                    cardImage={VENNIE_DONATOR_IMAGE}
                    backgroundImage={DONOR_BACKGROUND_IMAGE}
                    backgroundColor="#ED87A9"
                >
                    <Flex gap="0.5em" style={{ marginTop: "0.75em" }}>
                        <DonateButton variant="overlayPrimary" />
                        <Button
                            variant="secondary"
                            onClick={() => openInviteModal(VENCORD_INVITE).catch(() => VencordNative.native.openExternal(`https://discord.gg/${VENCORD_INVITE}`))}
                        >
                            <Flex alignItems="center" gap="0.25em">
                                Invite <LinkIcon style={{ height: "1em", width: "1em" }} />
                            </Flex>
                        </Button>
                    </Flex>
                </SpecialCard>
            </div>
        );
    }

    return null;
}

export function BadgeDirectoryDetail({
    badge,
    userId,
    isViewingOtherUser
}: BadgeDirectoryDetailProps) {
    const badgeId = typeof badge?.badge_id === "string"
        ? badge.badge_id
        : typeof badge?.badge_id === "number"
            ? String(badge.badge_id)
            : "";
    const originalBadgeId = typeof badge?.originalBadgeId === "string"
        ? badge.originalBadgeId
        : "";

    const isContributor = badgeId.includes("vencord_contributor_badge")
        || originalBadgeId === "vencord_contributor_badge";
    const isDonorBadge = badgeId.includes("vencord_donor_badge_")
        || originalBadgeId.startsWith("vencord_donor_badge_");

    if (!isContributor && !isDonorBadge) return null;

    return (
        <BadgeDirectoryDetailContent
            key={badgeId}
            badge={badge}
            userId={userId}
            isViewingOtherUser={isViewingOtherUser}
            isContributor={isContributor}
            isDonorBadge={isDonorBadge}
        />
    );
}
