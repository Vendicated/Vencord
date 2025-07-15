/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findLazy, findStoreLazy } from "@webpack";
import { Button, FluxDispatcher, GuildStore } from "@webpack/common";

const ExperimentStore = findStoreLazy("ExperimentStore");
// const GuildTooltip = findByCodeLazy("GuildTooltip");
const GuildIcon = findByCodeLazy(".PureComponent){render(){return(0,");
const mm3 = findLazy(m => m?.toString?.().includes?.("0xcc9e2d51"));

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
            },
        },
        // stole from experiments plugin troll
        {
            find: 'H1,title:"Experiments"',
            replacement: {
                match: 'title:"Experiments",children:[',
                replace: "$&$self.refreshButton(),"
            }
        },
    ],
    start: () => {
        window.mm3 = mm3;

        window.getAccountsHash = (experiment: string, accountIds: string[]) => {
            if (accountIds.length === 0) {
                // set from settings;
            }

            return accountIds.map(id => {
                return mm3(`${experiment}:${id}`);
            });
        };
    },
    settings: definePluginSettings({
        accountIds: {
            type: OptionType.CUSTOM,
            description: "Account IDs to get hash for",
            component: () => {
                return <div style={{ padding: "8px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>

                    </div>
                </div>;
            }
        }
    }),
    refreshButton: () => {
        return <Button
            size={Button.Sizes.LARGE}
            color={Button.Colors.PRIMARY}
            look={Button.Looks.FILLED}
            onClick={() => {
                FluxDispatcher.dispatch({ type: "EXPERIMENTS_FETCH", withGuildExperiments: true });
            }}
            // TODO should probably move these to css file
            style={{
                marginTop: "4px",
                marginBottom: "8px",
                fontSize: "16px",
            }}
        >
            Refresh Experiments
        </Button>;
    },
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
