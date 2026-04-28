/* eslint-disable simple-header/header */
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

import { Tooltip } from "@webpack/common";

import { getProfileChangeLabel } from "../store";
import { PresenceLogEntry, ProfileChanges, ProfileSnapshot } from "../types";
import { getAvatarDecorationUrl } from "../utils";

export function ProfileCard({ snapshot, userId, label, changedFields, referenceSnapshot }: { snapshot: ProfileSnapshot; userId: string; label: string; changedFields?: string[]; referenceSnapshot?: ProfileSnapshot; }) {
    const getExt = (hash: string) => hash.startsWith("a_") ? "gif" : "png";
    const avatarUrl = snapshot.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${snapshot.avatar}.${getExt(snapshot.avatar)}?size=80` : null;
    const bannerUrl = snapshot.banner ? `https://cdn.discordapp.com/banners/${userId}/${snapshot.banner}.${getExt(snapshot.banner)}?size=600` : null;
    const bannerColor = snapshot.banner_color;
    const avatarDecorationUrl = snapshot.avatarDecorationData ? getAvatarDecorationUrl(snapshot.avatarDecorationData) : null;

    const isChanged = (field: string) => changedFields?.includes(field);

    const showCustomStatus = snapshot.customStatus || referenceSnapshot?.customStatus;
    const showPronouns = snapshot.pronouns || referenceSnapshot?.pronouns;
    const showBio = snapshot.bio || referenceSnapshot?.bio;
    const showConnections = (snapshot.connected_accounts && snapshot.connected_accounts.length > 0) || (referenceSnapshot?.connected_accounts && referenceSnapshot.connected_accounts.length > 0);
    const showDivider = showBio || showConnections;

    return (
        <div className="stalker-profile-card">
            <div className="stalker-profile-card__label">{label}</div>

            <div className="stalker-profile-card__banner-section" style={{ position: "relative", ...(isChanged("banner") || isChanged("banner_color") ? { outline: "2px solid #5865f2" } : {}) }}>
                {bannerUrl ? (
                    <img src={bannerUrl} alt="Banner" className="stalker-profile-card__banner-img" />
                ) : bannerColor ? (
                    <div className="stalker-profile-card__banner-color" style={{ backgroundColor: bannerColor }} />
                ) : (
                    <div className="stalker-profile-card__banner-default" />
                )}

                <div className="stalker-profile-card__avatar-container" style={isChanged("avatar") || isChanged("avatarDecoration") ? { outline: "2px solid #5865f2", borderRadius: "50%" } : {}}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="stalker-profile-card__avatar" />
                    ) : (
                        <div className="stalker-profile-card__avatar stalker-profile-card__avatar--default">
                            {snapshot.username?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                    )}
                    {avatarDecorationUrl && (
                        <img
                            src={avatarDecorationUrl}
                            alt="Avatar Decoration"
                            className="stalker-profile-card__avatar-decoration"
                        />
                    )}
                </div>

                {showCustomStatus && (
                    <div
                        className="stalker-profile-card__custom-status-bubble"
                        style={{
                            position: "absolute",
                            bottom: "-12px",
                            left: "100px",
                            backgroundColor: "#111214",
                            color: "#ffffff",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            maxWidth: "200px",
                            boxShadow: "var(--elevation-medium)",
                            fontSize: "14px",
                            zIndex: 10,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            ...(isChanged("customStatus") ? { outline: "2px solid #5865f2" } : {})
                        }}
                        title={snapshot.customStatus || "None"}
                    >
                        {snapshot.customStatus || <i style={{ opacity: 0.5 }}>None</i>}
                    </div>
                )}
            </div>

            <div className="stalker-profile-card__body">
                <div className="stalker-profile-card__user-info">
                    <div className="stalker-profile-card__display-name" style={isChanged("global_name") || isChanged("username") ? { backgroundColor: "rgba(88, 101, 242, 0.2)", borderRadius: "4px", padding: "2px 4px" } : {}}>
                        {snapshot.global_name || snapshot.username || "Unknown"}
                        {showPronouns && (
                            <span className="stalker-profile-card__pronouns" style={isChanged("pronouns") ? { backgroundColor: "rgba(88, 101, 242, 0.2)", borderRadius: "4px", padding: "2px" } : {}}> ({snapshot.pronouns || "None"})</span>
                        )}
                    </div>
                    <div className="stalker-profile-card__username-tag">
                        {snapshot.username}
                        {snapshot.discriminator && snapshot.discriminator !== "0" && `#${snapshot.discriminator}`}
                    </div>
                </div>

                {showDivider && (
                    <div className="stalker-profile-card__divider" />
                )}

                {showBio && (
                    <div className="stalker-profile-card__section">
                        <div className="stalker-profile-card__section-title">ABOUT ME</div>
                        <div className="stalker-profile-card__bio" style={isChanged("bio") ? { backgroundColor: "rgba(88, 101, 242, 0.2)", borderRadius: "4px", padding: "4px" } : {}}>{snapshot.bio || <i style={{ opacity: 0.5 }}>None</i>}</div>
                    </div>
                )}

                {showConnections && (
                    <div className="stalker-profile-card__section">
                        <div className="stalker-profile-card__section-title">CONNECTIONS</div>
                        <div className="stalker-profile-card__connections">
                            {snapshot.connected_accounts && snapshot.connected_accounts.length > 0 ? (
                                snapshot.connected_accounts.map((account, i) => (
                                    <div key={i} className="stalker-profile-card__connection">
                                        <div className="stalker-profile-card__connection-icon">
                                            {account.type === "spotify" && "🎵"}
                                            {account.type === "steam" && "🎮"}
                                            {account.type === "xbox" && "🎮"}
                                            {account.type === "youtube" && "📺"}
                                            {account.type === "twitch" && "📺"}
                                            {account.type === "github" && "💻"}
                                            {!["spotify", "steam", "xbox", "youtube", "twitch", "github"].includes(account.type) && "🔗"}
                                        </div>
                                        <div className="stalker-profile-card__connection-name">
                                            {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ opacity: 0.5, fontStyle: "italic", fontSize: "12px" }}>None</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProfileChangeTooltip({ profileChanges, userId }: { profileChanges: ProfileChanges; userId: string; }) {
    return (
        <div className="stalker-profile-comparison">
            <ProfileCard
                snapshot={profileChanges.before}
                userId={userId}
                label="Before"
                changedFields={profileChanges.changedFields}
                referenceSnapshot={profileChanges.after}
            />
            <div className="stalker-profile-comparison__arrow">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
            </div>
            <ProfileCard
                snapshot={profileChanges.after}
                userId={userId}
                label="After"
                changedFields={profileChanges.changedFields}
                referenceSnapshot={profileChanges.before}
            />
        </div>
    );
}

export function renderProfileChangeBadges(entry: PresenceLogEntry) {
    const profileChanges = (entry as any).profileChanges as ProfileChanges | undefined;
    if (!profileChanges || !profileChanges.changedFields?.length) {
        const { activitySummary } = entry;
        if (activitySummary?.startsWith("profile:")) {
            const fields = activitySummary.replace("profile:", "").split(",");
            return (
                <div className="stalker-profile-badges">
                    {fields.map((field, idx) => (
                        <span key={idx} className="stalker-status-badge stalker-status-badge--profile">
                            {getProfileChangeLabel(field)} Updated
                        </span>
                    ))}
                </div>
            );
        }
        return <span className="stalker-status-badge">Profile updated</span>;
    }

    return (
        <Tooltip
            text={<ProfileChangeTooltip profileChanges={profileChanges} userId={entry.userId} />}
            spacing={12}
            tooltipClassName="stalker-profile-tooltip"
        >
            {(tooltipProps: any) => (
                <div {...tooltipProps} className="stalker-profile-badges">
                    {profileChanges.changedFields.map((field, idx) => (
                        <span key={idx} className="stalker-status-badge stalker-status-badge--profile">
                            {getProfileChangeLabel(field)} Updated
                        </span>
                    ))}
                </div>
            )}
        </Tooltip>
    );
}

