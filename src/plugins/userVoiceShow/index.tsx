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

import "./style.css";

import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { VoiceChannelIndicator } from "./components";

const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's Voice Channel indicator in their profile next to the name",
        default: true,
        restartNeeded: true
    },
    showInMemberList: {
        type: OptionType.BOOLEAN,
        description: "Show a user's Voice Channel indicator in the member and DMs list",
        default: true,
        restartNeeded: true
    },
    showInMessages: {
        type: OptionType.BOOLEAN,
        description: "Show a user's Voice Channel indicator in messages",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows an indicator when a user is in a Voice Channel",
    authors: [Devs.Nuckyz, Devs.LordElias],
    dependencies: ["MemberListDecoratorsAPI", "MessageDecorationsAPI"],
    settings,

    patches: [
        // User Popout, Full Size Profile, Direct Messages Side Profile
        {
            find: "#{intl::USER_PROFILE_LOAD_ERROR}",
            replacement: {
                match: /(\.fetchError.+?\?)null/,
                replace: (_, rest) => `${rest}$self.VoiceChannelIndicator({userId:arguments[0]?.userId})`
            },
            predicate: () => settings.store.showInUserProfileModal
        },
        // To use without the MemberList decorator API
        /* // Guild Members List
        {
            find: ".lostPermission)",
            replacement: {
                match: /\.lostPermission\).+?(?=avatar:)/,
                replace: "$&children:[$self.VoiceChannelIndicator({userId:arguments[0]?.user?.id})],"
            },
            predicate: () => settings.store.showVoiceChannelIndicator
        },
        // Direct Messages List
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /#{intl::CLOSE_DM}.+?}\)(?=])/,
                replace: "$&,$self.VoiceChannelIndicator({userId:arguments[0]?.user?.id})"
            },
            predicate: () => settings.store.showVoiceChannelIndicator
        }, */
        // Friends List
        {
            find: "null!=this.peopleListItemRef.current",
            replacement: {
                match: /\.actions,children:\[(?<=isFocused:(\i).+?)/,
                replace: "$&$self.VoiceChannelIndicator({userId:this?.props?.user?.id,isActionButton:true,shouldHighlight:$1}),"
            },
            predicate: () => settings.store.showInMemberList
        }
    ],

    start() {
        if (settings.store.showInMemberList) {
            addMemberListDecorator("UserVoiceShow", ({ user }) => user == null ? null : <VoiceChannelIndicator userId={user.id} />);
        }
        if (settings.store.showInMessages) {
            addMessageDecoration("UserVoiceShow", ({ message }) => message?.author == null ? null : <VoiceChannelIndicator userId={message.author.id} />);
        }
    },

    stop() {
        removeMemberListDecorator("UserVoiceShow");
        removeMessageDecoration("UserVoiceShow");
    },

    VoiceChannelIndicator
});
