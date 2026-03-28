/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { FluxStore } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";

import { MemberCount } from "./MemberCount";

export const ChannelMemberStore = findStoreLazy("ChannelMemberStore") as FluxStore & {
    getProps(guildId?: string, channelId?: string): { groups: { count: number; id: string; }[]; };
};
export const ThreadMemberListStore = findStoreLazy("ThreadMemberListStore") as FluxStore & {
    getMemberListSections(channelId?: string): { [sectionId: string]: { sectionId: string; userIds: string[]; }; };
};

export const settings = definePluginSettings({
    toolTip: {
        type: OptionType.BOOLEAN,
        description: "Show member count on the server tooltip",
        default: true,
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        description: "Show member count in the member list",
        default: true,
        restartNeeded: true
    },
    voiceActivity: {
        type: OptionType.BOOLEAN,
        description: "Show voice activity with member count in the member list",
        default: true
    }
});

const sharedIntlNumberFormat = new Intl.NumberFormat();
export const numberFormat = (value: number) => sharedIntlNumberFormat.format(value);
export const cl = classNameFactory("vc-membercount-");

export default definePlugin({
    name: "MemberCount",
    description: "Shows the number of online members, total members, and users in voice channels on the server — in the member list and tooltip.",
    authors: [Devs.Ven, Devs.Commandtechno, Devs.Apexo],
    settings,

    patches: [
        {
            find: "{isSidebarVisible:",
            replacement: [
                {
                    match: /children:\[(\i\.useMemo[^}]+"aria-multiselectable")(?<=className:(\i),.+?)/,
                    replace: "children:[$2?.includes('members')?$self.render():null,$1",
                },
            ],
            predicate: () => settings.store.memberList
        },
        {
            find: "GuildTooltip - ",
            replacement: {
                match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/,
                replace: "$&,$self.renderTooltip(arguments[0].guild)"
            },
            predicate: () => settings.store.toolTip
        }
    ],
    render: ErrorBoundary.wrap(() => <MemberCount />, { noop: true }),
    renderTooltip: ErrorBoundary.wrap(guild => <MemberCount isTooltip tooltipGuildId={guild.id} />, { noop: true })
});
