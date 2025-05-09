/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { GuildStore } from "@webpack/common";

const ExperimentStore = findStoreLazy("ExperimentStore");
// const GuildTooltip = findByCodeLazy("GuildTooltip");
const GuildIcon = findByCodeLazy(".PureComponent){render(){return(0,");
// const GuildIcon = wreq(565138).Z;
// .PureComponent){render(){return(0,
export default definePlugin({
    authors: [Devs.mantikafasi],
    name: "BetterExperiments",
    description: "makes guild experiments look better",

    patches: [
        {
            find: "Guild Assignments",
            replacement: {
                match: /Guild Assignments"}\),\(0,.\.jsx.+?}\)/,
                replace: "Guild Assignments\"}),$self.getExperimentsComponent(e)"
            }
        }

    ],
    getExperimentsComponent: (e: any) => {
        const experiments: Object = ExperimentStore.getRegisteredExperiments();

        const guildIds = GuildStore.getGuildIds();
        const guilds = GuildStore.getGuilds();
        const exp = experiments[e.experimentId];
        // bucket to description map
        const bucketMap = {};
        if (!exp.buckets) return;

        for (const [i, v] of exp.buckets.entries()) {
            bucketMap[v] = exp.description[i];
        }

        return <div>
            <div key={e.experimentId} className="vc-guild-experiment">
                {Object.keys(bucketMap).map(bucket => {
                    const description = bucketMap[bucket];
                    const guildIcons = guildIds.map(guildId => {
                        const descriptor = ExperimentStore.getGuildExperimentDescriptor(e.experimentId, guildId);
                        const guild = guilds[guildId];
                        if (!descriptor) return null;
                        if (descriptor.bucket === parseInt(bucket)) return (
                            <GuildIcon showTooltip={true} showBadge={true} guild={guild} key={guild.id} />
                        );
                    }).filter(Boolean);

                    return <div key={bucket} className="vc-guild-experiment-bucket">
                        <div className="vc-guild-experiment-bucket-name" style={{
                            color: "var(--text-normal)",
                            padding: "4px 0px 4px 0px",
                            fontSize: "14px",
                        }}>{description}</div>

                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "4px",
                            marginTop: "4px",
                            flexWrap: "wrap",
                        }}>
                            {
                                guildIcons.length > 0 ? guildIcons : <div style={{
                                    color: "var(--text-muted)",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "20px",
                                }}>No guilds in this bucket</div>
                            }
                        </div>
                    </div>;
                })}
            </div>;
        </div>;
    }

});
