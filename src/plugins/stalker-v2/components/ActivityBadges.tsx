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

import { ApplicationStore, Tooltip } from "@webpack/common";

import { PresenceLogEntry } from "../types";

function getAssetUrl(appId: string | undefined, assetId: string | undefined) {
    if (!assetId) return null;
    if (assetId.startsWith("mp:")) return assetId.replace("mp:", "https://media.discordapp.net/");
    if (assetId.includes("://")) return assetId;
    if (assetId.startsWith("spotify:")) return `https://i.scdn.co/image/${assetId.replace("spotify:", "")}`;
    if (appId) {
        return `https://cdn.discordapp.com/app-assets/${appId}/${assetId}.png`;
    }
    return null;
}

function getApplicationIconUrl(appId: string | undefined) {
    if (!appId) return null;
    const app = ApplicationStore?.getApplication?.(appId);
    if (app?.icon) {
        return `https://cdn.discordapp.com/app-icons/${appId}/${app.icon}.png`;
    }
    return null;
}

function getPartyState(activity: any) {
    const size = activity.party?.size;
    if (Array.isArray(size) && size.length >= 2 && size[0] > 0) {
        return {
            long: `In a party (${size[0]} out of ${size[1] ?? "?"})`,
            short: `${size[0]}/${size[1] ?? "?"}`
        };
    }
    if (typeof size === "number" && size > 0) {
        return { long: `In a party (${size})`, short: `${size}` };
    }
    const memberCount = Array.isArray(activity.party?.members) ? activity.party.members.length : undefined;
    if (typeof memberCount === "number" && memberCount > 0) {
        return { long: `In a party (${memberCount} members)`, short: `${memberCount}` };
    }
    return null;
}

function renderActivityTooltip(activity: any) {
    const appId = activity.application_id ?? activity.applicationId;
    let largeImage = getAssetUrl(appId, activity.assets?.large_image ?? activity.assets?.largeImage);
    const smallImage = getAssetUrl(appId, activity.assets?.small_image ?? activity.assets?.smallImage);

    if (!largeImage && appId) {
        largeImage = getApplicationIconUrl(appId);
    }

    const largeText = activity.assets?.large_text ?? activity.assets?.largeText;
    const smallText = activity.assets?.small_text ?? activity.assets?.smallText;

    const title = activity.name ?? "Activity";
    const { details, state } = activity;
    const party = getPartyState(activity);

    const emojiUrl = activity.emoji?.id
        ? `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? "gif" : "png"}?size=32`
        : null;

    return (
        <div className="stalker-activity-tooltip-body">
            {largeImage && (
                <div className="stalker-activity-assets">
                    <img src={largeImage} alt={largeText || "Activity"} className="stalker-activity-large-image" title={largeText} />
                    {smallImage && (
                        <img src={smallImage} alt={smallText || ""} className="stalker-activity-small-image" title={smallText} />
                    )}
                </div>
            )}
            <div className="stalker-activity-meta">
                <strong className="stalker-activity-name">
                    {emojiUrl && <img src={emojiUrl} alt="" style={{ width: 16, height: 16, marginRight: 4, verticalAlign: "text-bottom" }} />}
                    {!emojiUrl && activity.emoji?.name && <span style={{ marginRight: 4 }}>{activity.emoji.name}</span>}
                    {title}
                </strong>
                {details && <span className="stalker-activity-details">{details}</span>}
                {state && <span className="stalker-activity-state">{state}</span>}
                {party?.long && <span className="stalker-activity-party">{party.long}</span>}
            </div>
        </div>
    );
}

function renderActivityBadge(activity: any, key: string) {
    const party = getPartyState(activity);
    const isSpotify = activity.type === 2 && ((activity.name?.toLowerCase?.() === "spotify") || ((activity.application_id ?? activity.applicationId) === "spotify"));
    const isYouTubeMusic = activity.name === "YouTube Music";

    let labelBase = activity.name ?? "activity";
    if (isSpotify) labelBase = "spotify";
    else if (isYouTubeMusic) labelBase = "yt music";


    const label = party?.short ? `${labelBase} (${party.short})` : labelBase;
    const classNames = [
        "stalker-status-badge",
        "stalker-status-badge--activity",
        isSpotify ? "stalker-status-badge--spotify" : "",
        isYouTubeMusic ? "stalker-status-badge--ytmusic" : ""
    ].filter(Boolean).join(" ");

    const emojiUrl = activity.emoji?.id
        ? `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${activity.emoji.animated ? "gif" : "png"}?size=16`
        : null;

    return (
        <Tooltip key={key} text={renderActivityTooltip(activity)} spacing={12} tooltipClassName="stalker-activity-tooltip">
            {(tooltipProps: any) => (
                <span {...tooltipProps} className={classNames} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {emojiUrl && <img src={emojiUrl} alt="" style={{ width: 14, height: 14 }} />}
                    {!emojiUrl && activity.emoji?.name && <span>{activity.emoji.name}</span>}
                    {label}
                </span>
            )}
        </Tooltip>
    );
}

export function renderPresenceActivitySummary(entry: PresenceLogEntry) {
    const activities = (entry as any).activities as any[] | undefined;
    if (!activities || activities.length === 0) {
        if (entry.activitySummary) return <span>Activity: {entry.activitySummary}</span>;
        return null;
    }

    const filteredActivities = activities.filter(act => act.name !== "Hang Status");
    if (filteredActivities.length === 0) return null;

    // Deduplicate activities by application_id or name
    const seen = new Set<string>();
    const uniqueActivities = filteredActivities.filter(act => {
        const key = (act.application_id ?? act.applicationId) || act.name || Math.random().toString();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return (
        <div className="stalker-activity-badges">
            {uniqueActivities.map((act, idx) => renderActivityBadge(act, `${entry.userId}-${entry.timestamp}-act-${idx}`))}
        </div>
    );
}

