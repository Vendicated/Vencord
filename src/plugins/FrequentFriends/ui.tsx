/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import {
    Avatar,
    PresenceStore,
    RelationshipStore,
    Tooltip,
    UserStore,
    useEffect,
    useMemo,
    useState,
    useStateFromStores
} from "@webpack/common";
import { getRankedFriendIds, subscribeToScoreChanges } from "./scoring";
import settings from "./settings";
import { isPluginEnabled, setForceUpdateWidget } from "./state";
import type { PresenceStatus } from "./types";
import { JSX } from "react";

const ChannelNavActions = findByPropsLazy("selectPrivateChannel");
const PrivateChannelActions = findByPropsLazy("openPrivateChannel", "ensurePrivateChannel");

function normalizeStatus(raw: string): PresenceStatus {
    switch (raw) {
        case "online": case "idle": case "dnd": case "invisible": return raw;
        default: return "offline";
    }
}

function useStatus(userId: string): PresenceStatus {
    return useStateFromStores(
        [PresenceStore],
        () => normalizeStatus((PresenceStore as any)?.getStatus?.(userId) ?? "offline")
    );
}

function UserAvatar({ userId, isFirst, isLast }: {
    userId: string;
    isFirst: boolean;
    isLast: boolean;
}) {
    const user = UserStore.getUser(userId);
    const status = useStatus(userId);
    const [isHovered, setIsHovered] = useState(false);

    if (!user) return null;

    const name = user.globalName ?? user.username ?? "Unknown";

    // Memoize the decoration URL so repeated renders (hover, presence changes)
    // don't allocate a new string on every call — noticeable with many avatars.
    const avatarDecorationUrl = useMemo(() => {
        const asset = user.avatarDecorationData?.asset;
        if (!asset) return undefined;
        const ext = isHovered ? "png" : "webp";
        const pt = isHovered ? "true" : "false";
        return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.${ext}?size=48&passthrough=${pt}`;
    }, [user.avatarDecorationData?.asset, isHovered]);

    let badge: JSX.Element | null = null;
    if (isFirst) {
        badge = (
            <Tooltip text="Most Frequent" position="top">
                {(props: any) => (
                    <div {...props} className="ff-badge ff-badge-fire">
                        <svg width="10" height="12" viewBox="0 0 10 14">
                            <path d="M5 0C3 3 0 6 0 9.5C0 12 2.2 14 5 14S10 12 10 9.5C10 7 8 4.5 7 3C8 5 8 7 7 9C6 6 5.5 3 5 0Z" fill="white" />
                            <path d="M5 7C4 8.5 3 10 3 11.5C3 12.9 3.9 13.5 5 13.5S7 12.9 7 11.5C7 10 6 8.5 5 7Z" fill="var(--background-secondary-alt,#2b2d31)" />
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
    } else if (isLast) {
        badge = (
            <Tooltip text="Cooling off" position="top">
                {(props: any) => (
                    <div {...props} className="ff-badge ff-badge-snow">
                        <svg width="12" height="12" viewBox="-11 -11 22 22" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {[0, 72, 144, 216, 288].map(r => (
                                <g key={r} transform={r ? `rotate(${r})` : undefined}>
                                    <line x1="0" y1="0" x2="0" y2="-9" />
                                    <line x1="0" y1="-4.5" x2="-2.5" y2="-7" />
                                    <line x1="0" y1="-4.5" x2="2.5" y2="-7" />
                                </g>
                            ))}
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
    }

    return (
        <div
            className="ff-avatar-wrap"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => PrivateChannelActions?.ensurePrivateChannel?.(userId)?.then?.((cid: string) => ChannelNavActions?.selectPrivateChannel?.(cid))}
        >
            <Tooltip text={name} position="top">
                {(props: any) => (
                    <div {...props} className="ff-avatar-inner-wrapper">
                        <Avatar
                            className="ff-avatar-inner"
                            src={user.getAvatarURL(undefined, 128, true)}
                            size="SIZE_32"
                            status={status}
                            isMobile={false}
                            isTyping={false}
                            aria-label={name}
                            {...({ avatarDecoration: avatarDecorationUrl } as any)}
                        />
                    </div>
                )}
            </Tooltip>

            {badge}
        </div>
    );
}

function InfoTooltip() {
    return (
        <Tooltip text="Friends you talk to the most in chat and voice channels" position="top">
            {(props: any) => (
                <div {...props} className="ff-info-wrapper">
                    <span className="ff-info-icon">i</span>
                </div>
            )}
        </Tooltip>
    );
}

export function FrequentFriendsWidget() {
    const [tick, setTick] = useState(0);
    const { showOffline, maxFriends, customLabel } = settings.use(["showOffline", "maxFriends", "customLabel", "ignoreAffinities"]);

    // SLIDER may return a float on some Vencord builds even with stickToMarkers.
    // Round defensively so slice/comparison logic always gets a whole number.
    const maxFriendsInt = Math.round(maxFriends);

    useEffect(() => {
        const unsub = subscribeToScoreChanges(() => setTick(t => t + 1));
        setForceUpdateWidget(() => setTick(t => t + 1));
        return () => {
            unsub();
            setForceUpdateWidget(() => {});
        };
    }, []);

    if (!isPluginEnabled()) return null;

    const allRankedIds = useMemo(() => getRankedFriendIds(), [tick]);
    const ids: string[] = [];
    const addedIds = new Set<string>();

    for (const id of allRankedIds) {
        if (!showOffline) {
            const status = normalizeStatus((PresenceStore as any)?.getStatus?.(id) ?? "offline");
            if (status === "offline" || status === "invisible") continue;
        }
        ids.push(id);
        addedIds.add(id);
        if (ids.length >= maxFriendsInt) break;
    }

    if (ids.length < maxFriendsInt) {
        const friendIds = RelationshipStore.getFriendIDs();
        for (const id of friendIds) {
            if (addedIds.has(id)) continue;
            if (!showOffline) {
                const status = normalizeStatus((PresenceStore as any)?.getStatus?.(id) ?? "offline");
                if (status === "offline" || status === "invisible") continue;
            }
            ids.push(id);
            addedIds.add(id);
            if (ids.length >= maxFriendsInt) break;
        }
    }

    // Label length is capped by settings.maxLength: 30.
    // Truncation is handled via CSS text-overflow:ellipsis (see style.css).
    const label = customLabel || "Frequent Friends";

    return (
        <div id="frequentFriends-root">
            <div className="ff-label">
                <span className="ff-label-text">{label}</span>
                <InfoTooltip />
            </div>
            {ids.length === 0 ? (
                <div className="ff-empty">No frequent friends yet.</div>
            ) : (
                <div className="ff-avatars">
                    {ids.map((id, i) => (
                        <UserAvatar
                            key={id}
                            userId={id}
                            isFirst={i === 0 && ids.length > 1}
                            isLast={i === ids.length - 1 && ids.length > 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
