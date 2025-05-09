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
