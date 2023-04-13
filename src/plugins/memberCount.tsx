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
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, Tooltip } from "@webpack/common";

const counts = {} as Record<string, [number, number]>;
let forceUpdate: () => void;

const GuildMemberCountStore = findStoreLazy("GuildMemberCountStore");

function MemberCount() {
    const guildId = getCurrentChannel().guild_id;
    const c = counts[guildId];

    forceUpdate = useForceUpdater();

    if (!c) return null;

    let total = c[0].toLocaleString();
    if (total === "0" && c[1] > 0) {
        const approx = GuildMemberCountStore.getMemberCount(guildId);
        total = approx ? approx.toLocaleString() : "Loading...";
    }

    const online = c[1].toLocaleString();

    return (
        <Flex id="vc-membercount" style={{
            marginTop: "1em",
            marginBottom: "-.5em",
            paddingInline: "1em",
            justifyContent: "center",
            alignContent: "center",
            gap: 0
        }}>
            <Tooltip text={`${online} Online`} position="bottom">
                {props => (
                    <div {...props}>
                        <span
                            style={{
                                backgroundColor: "var(--green-360)",
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                display: "inline-block",
                                marginRight: "0.5em"
                            }}
                        />
                        <span style={{ color: "var(--green-360)" }}>{online}</span>
                    </div>
                )}
            </Tooltip>
            <Tooltip text={`${total} Total Members`} position="bottom">
                {props => (
                    <div {...props}>
                        <span
                            style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                border: "3px solid var(--primary-400)",
                                display: "inline-block",
                                marginRight: "0.5em",
                                marginLeft: "1em"
                            }}
                        />
                        <span style={{ color: "var(--primary-400)" }}>{total}</span>
                    </div>
                )}
            </Tooltip>
        </Flex>
    );
}

export default definePlugin({
    name: "MemberCount",
    description: "Shows the amount of online & total members in the server member list",
    authors: [Devs.Ven, Devs.Commandtechno],

    patches: [{
        find: ".isSidebarVisible,",
        replacement: {
            match: /(var (.)=.\.className.+?children):\[(.\.useMemo[^}]+"aria-multiselectable")/,
            replace: "$1:[$2.startsWith('members')?$self.render():null,$3"
        }
    }],

    onGuildMemberListUpdate({ guildId, groups, memberCount, id }) {
        // eeeeeh - sometimes it has really wrong counts??? like 10 times less than actual
        // but if we only listen to everyone updates, sometimes we never get the count?
        // this seems to work but isn't optional
        if (id !== "everyone" && counts[guildId]) return;

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
