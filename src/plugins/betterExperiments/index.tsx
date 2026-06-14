/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findLazy, findStoreLazy } from "@webpack";
import { GuildStore, IconUtils, RelationshipStore, Tooltip, UserStore } from "@webpack/common";

import { Experiment, ExperimentPopulationRollout, fetchExperiments } from "./api";

const mm3 = findLazy(m => m?.toString?.().includes?.("0xcc9e2d51"));
const ExperimentStore = findStoreLazy("ExperimentStore");
const ApexExperimentStore = findStoreLazy("ApexExperimentStore");

interface ExperimentRollout {
    hash: number;
    hashKey: string;
    revision: number;
    populations: Experiment["rollout"][3];
    bucketOverrides: Experiment["rollout"][4];
    populationOverrides: Experiment["rollout"][5];
    holdoutName: string;
    holdoutBucket: number;
    aaMode: boolean;
    triggerDebuggingEnabled: boolean;
}

interface TypedExperiment {
    data: Experiment["data"];
    rollout: ExperimentRollout;
}

function getTypedExperiment(experiment: Experiment): TypedExperiment {
    return {
        data: experiment.data,
        rollout: {
            hash: experiment.rollout[0],
            hashKey: experiment.rollout[1],
            revision: experiment.rollout[2],
            populations: experiment.rollout[3],
            bucketOverrides: experiment.rollout[4],
            populationOverrides: experiment.rollout[5],
            holdoutName: experiment.rollout[6],
            holdoutBucket: experiment.rollout[7],
            aaMode: experiment.rollout[8] === 1,
            triggerDebuggingEnabled: experiment.rollout[9] === 1,
        }
    };
}

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
        apiProvider: {
            type: OptionType.COMPONENT,
            component: () => {
                return <div className="vc-better-experiments-api-provider">
                    <div className="vc-better-experiments-api-text">
                        API Provided by <a onClick={() => window.open("https://x.com/WumpusCentral")} href="https://x.com/WumpusCentral">WumpusCentral</a>
                    </div>
                </div>;
            }
        }
    }),
    getExperimentsComponent: (e: { experimentId: string; }) => {

        const experiments = ExperimentStore.getRegisteredExperiments();

        const guildIds = GuildStore.getGuildIds();
        const guilds = GuildStore.getGuilds();
        let exp = experiments[e.experimentId];

        // bucket to description map
        const bucketMap = {};

        if (!exp) {
            exp = ApexExperimentStore.getRegisteredExperiments()[e.experimentId];
            if (!exp) return;

            for (const k of Object.keys(exp.variations)) {
                bucketMap[k] = "Variant " + k;
            }

            exp.type = exp.kind; // CAN THEY BE CONSISTENT FOR A SECOND
        } else {
            for (const [i, v] of exp.buckets.entries()) {
                bucketMap[v] = exp.description[i];
            }
        }

        const currentUser = UserStore.getCurrentUser();
        const userHash = mm3(e.experimentId + ":" + currentUser.id) % 10000;
        const expObject = EXPERIMENTS.get(e.experimentId);

        // Get rollout ranges if available
        let ranges: ExperimentPopulationRollout[] = [];

        if (!expObject) return;

        const typedExp = getTypedExperiment(expObject);
        if (!typedExp.rollout.aaMode && typedExp.rollout.populations) {
            const allRanges = typedExp.rollout.populations.flatMap(pop =>
                pop[0].flatMap(range => range[1]?.flatMap(r => r) || [])
            );
            ranges = allRanges;
        }

        return <div>
            <div key={e.experimentId} className="vc-better-experiments-container">
                {exp.type === "user" && (
                    <div className="vc-experiment-info">
                        <div className="vc-experiment-info-item">
                            <span className="vc-experiment-info-label">Your Hash:</span>
                            <span className="vc-experiment-info-value">{userHash}</span>
                        </div>
                        {ranges && (
                            <div className="vc-experiment-info-item">
                                <span className="vc-experiment-info-label">Rollout:</span>
                                <span className="vc-experiment-info-value">
                                    {
                                        typedExp.rollout.aaMode ? "AA Mode (Testing)"
                                            : ranges.map(r => `${r.s}-${r.e}`).join(", ")
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                )}
                {Object.keys(bucketMap).map(bucket => {
                    const description = bucketMap[bucket];

                    if (exp.type === "guild") {
                        const guildIcons = guildIds.map(guildId => {
                            const descriptor = ExperimentStore.getGuildExperimentDescriptor(e.experimentId, guildId);
                            const guild = guilds[guildId];
                            if (!descriptor) return null;
                            if (descriptor.bucket === parseInt(bucket)) return (
                                <Tooltip text={guild.name} key={guild.id}>
                                    {tooltipProps => (
                                        <img
                                            {...tooltipProps}
                                            src={IconUtils.getGuildIconURL(guild)}
                                            alt={guild.name}
                                        />
                                    )}
                                </Tooltip>
                            );
                        }).filter(Boolean);

                        return <div key={bucket} className="vc-guild-experiment-bucket">
                            <div className="vc-guild-experiment-bucket-name">{description}</div>

                            <div className="vc-experiment-bucket-icons">
                                {
                                    guildIcons.length > 0 ? guildIcons : <div className="vc-experiment-bucket-empty">No guilds in this bucket</div>
                                }
                            </div>
                        </div>;
                    } else if (exp.type === "user") {
                        const friends = RelationshipStore.getFriendIDs().map(id => ({ id, user: UserStore.getUser(id) }));
                        const expObject = EXPERIMENTS.get(e.experimentId);

                        // rollout[7] is AA-Mode
                        // rollout[3] is populations
                        const ranges = typedExp.rollout.aaMode ? typedExp.rollout.populations.map(population => {
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
                                    {tooltipProps => (
                                        <img
                                            {...tooltipProps}
                                            src={IconUtils.getUserAvatarURL(friend.user)}
                                            alt={friend.user.username}
                                        />
                                    )}
                                </Tooltip>
                            );
                        }).filter(Boolean);

                        return <div key={bucket} className="vc-user-experiment-bucket">
                            <div className="vc-user-experiment-bucket-name">{description}</div>

                            <div className="vc-experiment-bucket-icons">
                                {
                                    userIcons.length > 0 ? userIcons : <div className="vc-experiment-bucket-empty">No users in this bucket</div>
                                }
                            </div>
                        </div>;
                    }
                })}
            </div>
        </div>;
    }

});
