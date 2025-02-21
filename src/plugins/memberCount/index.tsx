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
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxStore } from "@webpack/types";

import { MemberCount } from "./MemberCount";

export const GuildMemberCountStore = findStoreLazy("GuildMemberCountStore") as FluxStore & { getMemberCount(guildId?: string): number | null; };
export const ChannelMemberStore = findStoreLazy("ChannelMemberStore") as FluxStore & {
    getProps(guildId?: string, channelId?: string): { groups: { count: number; id: string; }[]; };
};
export const ThreadMemberListStore = findStoreLazy("ThreadMemberListStore") as FluxStore & {
    getMemberListSections(channelId?: string): { [sectionId: string]: { sectionId: string; userIds: string[]; }; };
};


const settings = definePluginSettings({
    toolTip: {
        type: OptionType.BOOLEAN,
        description: "If the member count should be displayed on the server tooltip",
        default: true,
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        description: "If the member count should be displayed on the member list",
        default: true,
        restartNeeded: true
    }
});

const sharedIntlNumberFormat = new Intl.NumberFormat();
export const numberFormat = (value: number) => sharedIntlNumberFormat.format(value);
export const cl = classNameFactory("vc-membercount-");

export default definePlugin({
    name: "MemberCount",
    description: "Shows the amount of online & total members in the server member list and tooltip",
    authors: [Devs.Ven, Devs.Commandtechno],
    settings,

    patches: [
        {
            find: "{isSidebarVisible:",
            replacement: [
                {
                    // FIXME(Bundler spread transform related): Remove old compatiblity once enough time has passed, if they don't revert
                    match: /(?<=let\{className:(\i),.+?children):\[(\i\.useMemo[^}]+"aria-multiselectable")/,
                    replace: ":[$1?.startsWith('members')?$self.render():null,$2",
                    noWarn: true
                },
                {
                    match: /(?<=var\{className:(\i),.+?children):\[(\i\.useMemo[^}]+"aria-multiselectable")/,
                    replace: ":[$1?.startsWith('members')?$self.render():null,$2",
                },
            ],
            predicate: () => settings.store.memberList
        },
        {
            find: ".invitesDisabledTooltip",
            replacement: {
                match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/,
                replace: "$&,$self.renderTooltip(arguments[0].guild)"
            },
            predicate: () => settings.store.toolTip
        }
    ],
    render: ErrorBoundary.wrap(MemberCount, { noop: true }),
    renderTooltip: ErrorBoundary.wrap(guild => <MemberCount isTooltip tooltipGuildId={guild.id} />, { noop: true })
});
