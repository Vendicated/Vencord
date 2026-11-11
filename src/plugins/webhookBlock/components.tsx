/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Text } from "@components/Text";
import { classes } from "@utils/misc";
import { Avatar, GuildStore, IconUtils, useMemo, useStateFromStores } from "@webpack/common";
import type { ReactNode } from "react";

import type { BlockedWebhook } from "./types";
import { blockedClasses, utilClasses } from "./webpack";

export function Container({ className, children }: { className?: string, children?: ReactNode; }) {
    return <div className={classes(utilClasses.container, className)}>
        {children}
    </div>;
}

export function Card({ className, children }: { className?: string, children?: ReactNode; }) {
    return <div className={classes(blockedClasses.card, className)}>
        {children}
    </div>;
}

// recreating existing component so i can edit the use of values
export function BlockedUser({ user, onRemove }: { user: BlockedWebhook, onRemove(): void; }) {
    const guild = useStateFromStores([GuildStore], () => {
        const g = GuildStore.getGuild(user.guildId);
        return g ? {
            name: g.name,
            id: g.id
        } : {
            name: "Unknown",
            id: user.guildId
        };
    }, [user.guildId]);

    const avatar = useMemo(() =>
        user.webhook.avatar
            ? `https://cdn.discordapp.com/avatars/${user.webhook.id}/${user.webhook.avatar}.webp?size=40`
            : IconUtils.getDefaultAvatarURL(user.webhook.id),
        [user.webhook.id, user.webhook.avatar]
    );

    return <div className={blockedClasses.row}>
        <div className={blockedClasses.userInfo}>
            <Avatar size="SIZE_40" src={avatar} />
            <div className={blockedClasses.text}>
                <Text size="md" weight="semibold" color="text-strong">{user.name}</Text>
                <Text size="sm" weight="medium" color="text-default">from {guild.name} ({guild.id})</Text>
            </div>
        </div>
        <Button
            variant="secondary"
            onClick={onRemove}
        >Unblock</Button>
    </div>;
}


