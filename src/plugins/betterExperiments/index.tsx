/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findLazy, findStoreLazy } from "@webpack";
import { Button, FluxDispatcher, GuildStore, IconUtils, RelationshipStore, Tooltip, UserStore } from "@webpack/common";

import { Experiment, fetchExperiments } from "./api";

// TODO: move this to utils package so consoleshortcuts dont have duplicate find
const mm3 = findLazy(m => m?.toString?.().includes?.("0xcc9e2d51"));

const ExperimentStore = findStoreLazy("ExperimentStore");
// const GuildIcon = findByCodeLazy(".PureComponent){render(){return(0,");

const EXPERIMENTS: Map<string, Experiment> = new Map();
export default definePlugin({
    authors: [Devs.mantikafasi],
    name: "BetterExperiments",
    description: "makes guild experiments look better",

    patches: [
        {
            find: "Guild Assignments",
            replacement: [{
                match: /Guild Assignments"}\),\(0,.\.jsx.+?}\)/,
                replace: "Guild Assignments\"}),$self.getExperimentsComponent(e)"
            }, {
                match: /Server Descriptor"}\),\(0,.\.jsx.+?}\)/,
                replace: "Server Descriptor\"}),$self.getExperimentsComponent(e)"
            }],
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
        fetchExperiments().then(experiments => {
            for (const experiment of experiments) {
                EXPERIMENTS.set(experiment.data.id, experiment);
            }
        });

        setInterval(() => {
            fetchExperiments().then(experiments => {
                for (const experiment of experiments) {
                    EXPERIMENTS.set(experiment.data.id, experiment);
                }
            });
        }, 25 * 60 * 1000); // every 25 minutes

    },
    settings: definePluginSettings({
        accountIds: {
            type: OptionType.STRING,
            description: "Account IDs to get hash for, separated with commas",
        },
        apiProvider: {
            type: OptionType.COMPONENT,
            component: () => {
                return <div style={{ padding: "8px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                        API Provided by <a onClick={() => window.open("https://x.com/WumpusCentral")} href="https://x.com/WumpusCentral">WumpusCentral</a>
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
        if (!exp?.buckets) return;

        for (const [i, v] of exp.buckets.entries()) {
            bucketMap[v] = exp.description[i];
        }

        return <div>
            <div key={e.experimentId} className="vc-guild-experiment">
                {Object.keys(bucketMap).map(bucket => {
                    const description = bucketMap[bucket];

                    if (exp.type === "guild") {
                        const guildIcons = guildIds.map(guildId => {
                            const descriptor = ExperimentStore.getGuildExperimentDescriptor(e.experimentId, guildId);
                            const guild = guilds[guildId];
                            if (!descriptor) return null;
                            if (descriptor.bucket === parseInt(bucket)) return (
                                <Tooltip text={guild.name} key={guild.id}>
                                    {(tooltipProps: any) => (
                                        <img
                                            {...tooltipProps}
                                            src={IconUtils.getGuildIconURL(guild)}
                                            alt={guild.name}
                                            style={{ borderRadius: "50%", width: "32px", height: "32px" }}
                                        />
                                    )}
                                </Tooltip>
                            );
                        }).filter(Boolean);

                        return <div key={bucket} className="vc-guild-experiment-bucket">
                            <div className="vc-guild-experiment-bucket-name" style={{
                                color: "var(--text-primary)",
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
                    } else if (exp.type === "user") {
                        const friends = RelationshipStore.getFriendIDs().map(id => ({ id, user: UserStore.getUser(id) }));
                        const expObject = EXPERIMENTS.get(e.experimentId);

                        // rollout[7] is AA-Mode
                        // rollout[3] is populations
                        const ranges = expObject?.rollout[7] !== 1 ? expObject?.rollout[3]?.map(population => {
                            return population[0].filter(range => range[0] === parseInt(bucket)).map(range => range[1]);
                        }) : [];

                        const userIcons = friends.map(friend => {
                            const hash = mm3(e.experimentId + ":" + friend.id) % 10000;

                            const inRange = ranges?.some(range =>
                                range.some(r =>
                                    r?.some(e => hash >= e.s && hash <= e.e)
                                )
                            ) ?? false;

                            if (inRange) return (
                                <Tooltip text={friend.user.username} key={friend.id}>
                                    {(tooltipProps: any) => (
                                        <img
                                            {...tooltipProps}
                                            src={IconUtils.getUserAvatarURL(friend.user)}
                                            alt={friend.user.username}
                                            style={{ borderRadius: "50%", width: "32px", height: "32px" }}
                                        />
                                    )}
                                </Tooltip>
                            );
                        }).filter(Boolean);

                        return <div key={bucket} className="vc-user-experiment-bucket">
                            <div className="vc-user-experiment-bucket-name" style={{
                                color: "var(--text-primary)",
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
                                    userIcons.length > 0 ? userIcons : <div style={{
                                        color: "var(--text-muted)",
                                        fontSize: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        height: "20px",
                                    }}>No users in this bucket</div>
                                }
                            </div>
                        </div>;
                    }
                })}
            </div>;
        </div>;
    }

});
