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
import { addNicknameIcon, removeNicknameIcon } from "@api/NicknameIcons";
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
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
    authors: [Devs.Nuckyz, Devs.LordElias, EquicordDevs.omaw],
    dependencies: ["NicknameIconsAPI", "MemberListDecoratorsAPI", "MessageDecorationsAPI"],
    settings,

    patches: [
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
        if (settings.store.showInUserProfileModal) {
            addNicknameIcon("UserVoiceShow", ({ userId }) => <VoiceChannelIndicator userId={userId} isProfile />);
        }
        if (settings.store.showInMemberList) {
            addMemberListDecorator("UserVoiceShow", ({ user }) => user == null ? null : <VoiceChannelIndicator userId={user.id} />);
        }
        if (settings.store.showInMessages) {
            addMessageDecoration("UserVoiceShow", ({ message }) => message?.author == null ? null : <VoiceChannelIndicator userId={message.author.id} isMessageIndicator />);
        }
    },

    stop() {
        removeNicknameIcon("UserVoiceShow");
        removeMemberListDecorator("UserVoiceShow");
        removeMessageDecoration("UserVoiceShow");
    },

    VoiceChannelIndicator
});
