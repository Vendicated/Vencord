/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { PresenceStore } from "@webpack/common";

const Text = findComponentByCodeLazy("data-text-variant", "lineClamp");

const lastActive = new Map<string, number>();
const previousStatusMap = new Map<string, string>();

const settings = definePluginSettings({
    showInDms: {
        type: OptionType.BOOLEAN,
        description: "Show last active in DMs",
        default: true
    },
    showInServers: {
        type: OptionType.BOOLEAN,
        description: "Show last active in server member list",
        default: false
    },
    showInFriendsList: {
        type: OptionType.BOOLEAN,
        description: "Show last active in friends list",
        default: false
    }
});

const isOnline = (s: string) => s !== "offline" && s !== "invisible";

const formatElapsed = (ts: number) => {
    const s = ((Date.now() - ts) / 1000) | 0;
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${(s / 60) | 0}m`;
    if (s < 86400) return `${(s / 3600) | 0}h`;
    return `${(s / 86400) | 0}d`;
};

export default definePlugin({
    name: "LastActive",
    description: "Shows how long ago users were last active",
    authors: [Devs.Antrubtor],
    settings,

    patches: [
        // DMs
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(\(0,\i\.\i\)\({[^}]*status:(\i)[^}]*}\)\?\(0,\i\.\i\)\(\i\.\i,\{user:(\i)[^}]*void 0\}\)):(null)/,
                replace: "$1:$self.render($3,$2,'text-xs/medium','dm')"
            }
        },
        // Servers
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(subText:\s*)(\(\d+,\s*\i\.\i\)\(\i,\s*\{[^}]*status:\s*(\i)[^}]*user:\s*(\i)[^}]*\}\))/,
                replace: "$1$self.render($4,$3,'text-xs/medium','server') || $2"
            }
        },
        // Friends
        {
            find: "null!=this.peopleListItemRef.current",
            replacement: {
                match: /(subText:\s*)(\(\d+,\s*\i\.\i\)\(\i\.\i,\s*\{[^}]*status:\s*(\i)[^}]*user:\s*(\i)[^}]*\}\))/,
                replace: "$1$self.render($4,$3,'text-sm/medium','friends') || $2"
            }
        }
    ],

    flux: {
        PRESENCE_UPDATES({ updates }: { updates: Array<{ user: { id: string; }; status: string; }>; }) {
            for (const { user, status } of updates) {
                const prev = previousStatusMap.get(user.id);

                if (prev !== undefined && isOnline(prev) && !isOnline(status))
                    lastActive.set(user.id, Date.now());
                else if (isOnline(status))
                    lastActive.delete(user.id);

                previousStatusMap.set(user.id, status);
            }
        }
    },

    start() {
        // Seed initial presences
        const { statuses } = PresenceStore.getState();
        for (const [userId, status] of Object.entries(statuses)) {
            previousStatusMap.set(userId, status as string);
        }
    },

    stop() {
        lastActive.clear();
        previousStatusMap.clear();
    },

    render(user: User, status: string, variant?: string, ctx?: "dm" | "server" | "friends") {
        if (isOnline(status)) return null;

        if (ctx === "dm" && !settings.store.showInDms) return null;
        if (ctx === "server" && !settings.store.showInServers) return null;
        if (ctx === "friends" && !settings.store.showInFriendsList) return null;

        const ts = lastActive.get(user.id);
        if (!ts) return null;

        const fullDate = new Date(ts).toLocaleString();

        return (
            <Text variant={variant} color="text-muted" lineClamp={1} title={fullDate}>
                Active {formatElapsed(ts)} ago
            </Text>
        );
    }
});
