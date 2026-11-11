/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { defineDefault, OptionType } from "@utils/types";
import { FluxDispatcher, Menu } from "@webpack/common";
import type { ComponentType } from "react";

import { BlockedUser, Card, Container } from "./components";
import type { BlockedWebhook } from "./types";
import { blockedClasses } from "./webpack";

// left here and not in webpack.ts as it's set dynamically
let BlockedHeader: ComponentType<{
    listType: "blocked" | "ignored";
    numberOfUsers: number;
}> | null = null;

const settings = definePluginSettings({
    matchBy: {
        type: OptionType.SELECT,
        displayName: "Match by...",
        description: "Determines what should webhook be matched by. Name+ID is useful for bridges.",
        options: [
            { label: "Name + ID", value: "nameid" as const, default: true },
            { label: "Name", value: "name" as const },
            { label: "ID", value: "id" as const }
        ],
        onChange: () => FluxDispatcher.dispatch({ type: "VC_WEBHOOKBLOCK_REFRESH" })
    },
    ignoreCaseName: {
        type: OptionType.BOOLEAN,
        displayName: "Ignore Case",
        description: "When matching by name, should match it ignoring case? (aBc = ABC = abc)",
        default: true,
        disabled: () => !shouldMatch.name(),
        onChange: () => FluxDispatcher.dispatch({ type: "VC_WEBHOOKBLOCK_REFRESH" })
    },
    users: {
        type: OptionType.COMPONENT,
        default: defineDefault<BlockedWebhook[]>([]),
        component({ setValue }: {
            setValue: (users: BlockedWebhook[]) => void;
        }) {
            const { users } = settings.use(["users"]);

            if (!BlockedHeader) return null;

            return <Container>
                <Card>
                    <BlockedHeader listType="blocked" numberOfUsers={users.length} />
                    <div className={blockedClasses.usersList}>
                        {users.map((blocked, i) =>
                            <BlockedUser
                                key={`${blocked.webhook.id}-${blocked.name}`}
                                user={blocked}
                                onRemove={() => {
                                    setValue(settings.plain.users.filter((_, j) => j !== i));
                                    FluxDispatcher.dispatch({ type: "VC_WEBHOOKBLOCK_REFRESH" });
                                }}
                            />
                        )}
                    </div>
                </Card>
            </Container>;
        },
    }
});

const shouldMatch = {
    name: () => settings.store.matchBy === "name"
        || settings.store.matchBy === "nameid",
    id: () => settings.store.matchBy === "id"
        || settings.store.matchBy === "nameid"
};

const matching = {
    name: (a: string, b: string) => {
        if (!shouldMatch.name()) return true;
        return settings.store.ignoreCaseName
            ? a.toLowerCase() === b.toLowerCase()
            : a === b;
    },
    id: (a: string, b: string) => !shouldMatch.id() || a === b
};

export default definePlugin({
    name: "WebhookBlock",
    description: "Lets you block webhooks like normal user. Useful for servers using bridge bots",
    tags: ["Utility", "Chat"],
    authors: [Devs.jakeayy],
    settings,

    set BlockedHeader(v: typeof BlockedHeader) { BlockedHeader = v; },

    patches: [
        {
            find: "numberOfBlockedUsers:",
            replacement: {
                match: /function (\i).{0,50}?listType:.{0,10}?numberOfUsers:/,
                replace: "$self.BlockedHeader=$1;$&"
            }
        },
        {
            find: 'displayName="RelationshipStore"',
            replacement: {
                match: /isBlockedForMessage\((\i)\){/,
                replace: "$&if($self.isBlockedWebhookMessage($1))return!0;"
            }
        },
        {
            find: '"MessageStore"',
            replacement: {
                match: /RELATIONSHIP_ADD:(\i),/,
                replace: "$&VC_WEBHOOKBLOCK_REFRESH:$1,"
            }
        },
    ],

    contextMenus: {
        message(children, { message: { author: user, webhookId }, channel: { guild_id: guildId } }) {
            if (!webhookId) return;

            const blockedIndex = settings.store.users
                .findIndex(u =>
                    u.name === user.username
                    && u.webhook.id === webhookId
                ),
                isBlocked = blockedIndex !== -1;

            children.push(
                <Menu.MenuItem
                    id="vc-webhookblock-block"
                    key="vc-webhookblock-block"
                    label={`${isBlocked ? "Unblock" : "Block"} Webhook`}
                    color="danger"
                    action={() => {
                        if (isBlocked) settings.store.users = settings.plain.users.toSpliced(blockedIndex, 1);
                        else settings.store.users.push({
                            name: user.username,
                            guildId,
                            webhook: {
                                id: webhookId,
                                avatar: user.avatar
                            }
                        });

                        FluxDispatcher.dispatch({ type: "VC_WEBHOOKBLOCK_REFRESH" });
                    }}
                />
            );
        }
    },

    isBlockedWebhookMessage({ webhook_id, webhookId, author }) {
        const id = webhook_id ?? webhookId;
        if (!id) return false;

        return settings.store.users
            .some(blocked =>
                matching.name(blocked.name, author.username)
                && matching.id(blocked.webhook.id, id)
            );
    }
});
