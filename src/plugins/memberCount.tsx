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

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { useForceUpdater } from "@utils/misc";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const counts = {} as Record<string, [number, number]>;
let forceUpdate: () => void;

function MemberCount() {
    const guildId = getCurrentChannel().guild_id;
    const c = counts[guildId];

    forceUpdate = useForceUpdater();

    if (!c) return null;

    let total = String(c[0]);
    if (total === "0" && c[1] > 0) {
        total = "Loading...";
    }

    return (
        <Flex id="vc-membercount" style={{
            marginTop: "1em",
            marginBottom: "-.5em",
            paddingInline: "1em",
            justifyContent: "center",
            alignContent: "center",
            gap: 0
        }}>
            <div>
                <span
                    style={{
                        backgroundColor: "var(--status-green-600)",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        display: "inline-block",
                        marginRight: "0.5em"
                    }}
                />
                <span style={{ color: "var(--status-green-600)" }}>{c[1]}</span>
            </div>
            <div>
                <span
                    style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        border: "3px solid var(--status-grey-500)",
                        display: "inline-block",
                        marginRight: "0.5em",
                        marginLeft: "1em"
                    }}
                />
                <span style={{ color: "var(--status-grey-500)" }}>{total}</span>
            </div>
        </Flex>
    );
}

export default definePlugin({
    name: "MemberCount",
    description: "Shows the amount of online & total members in the server member list",
    authors: [Devs.Ven],

    patches: [{
        find: ".isSidebarVisible,",
        replacement: {
            match: /(var (.)=.\.className.+?children):\[(.\.useMemo[^}]+"aria-multiselectable")/,
            replace: "$1:[$2.startsWith('members')?Vencord.Plugins.plugins.MemberCount.render():null,$3"
        }
    }],

    onGuildMemberListUpdate({ guildId, groups, memberCount }) {
        let count = 0;
        for (const group of groups) {
            if (group.id !== "offline")
                count += group.count;
        }
        counts[guildId] = [memberCount, count];
        forceUpdate?.();
    },

    start() {
        FluxDispatcher.subscribe("GUILD_MEMBER_LIST_UPDATE", this.onGuildMemberListUpdate);
    },

    stop() {
        FluxDispatcher.unsubscribe("GUILD_MEMBER_LIST_UPDATE", this.onGuildMemberListUpdate);
    },

    render: () => (
        <ErrorBoundary noop>
            <MemberCount />
        </ErrorBoundary>
    )
});
