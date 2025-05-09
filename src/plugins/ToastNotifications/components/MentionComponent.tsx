/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";

import { MentionType } from "../types";
import { getUserDisplayName } from "./Notifications";

interface MentionableComponentProps {
    /**
     * The type of mention.
     */
    type: MentionType;
    /**
     * The user, channel, or role ID being mentioned.
     */
    id: string;
    /**
     * The guild ID for role mentions.
     */
    guildId?: string;
}

export default ErrorBoundary.wrap(function MentionComponent(props: MentionableComponentProps) {
    let name: string = "unknown";

    switch (props.type) {
        case MentionType.USER: {
            name = `@${getUserDisplayName(UserStore.getUser(props.id)) || "unknown-user"}`;
            break;
        }
        case MentionType.CHANNEL: {
            name = `#${ChannelStore.getChannel(props.id)?.name || "unknown-channel"}`;
            break;
        }
        case MentionType.ROLE: {
            name = (props?.guildId && `@${GuildStore.getGuild(props.guildId).getRole(props.id)?.name}`) || "unknown-role";
            break;
        }
    }

    return (
        <span key={`${props.type}-${props.id}`} className={"toastnotifications-mention-class"}>
            {name}
        </span>
    );
});
