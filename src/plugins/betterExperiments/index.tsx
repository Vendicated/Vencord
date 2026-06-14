/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@utils/css";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findLazy, findStoreLazy } from "@webpack";
import { GuildStore, IconUtils, RelationshipStore, Tooltip, UserStore } from "@webpack/common";
import ErrorBoundary from "@components/ErrorBoundary";

import { Experiment, ExperimentPopulationRollout, fetchExperiments } from "./api";

const cl = classNameFactory("vc-better-experiments-");

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
let intervalId: ReturnType<typeof setInterval>;

export default definePlugin({
    authors: [Devs.mantikafasi],
    name: "BetterExperiments",
    description: "Makes guild experiments look better",

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
        const load = () => {
            fetchExperiments().then(experiments => {
                for (const experiment of experiments) {
                    EXPERIMENTS.set(experiment.data.id, experiment);
                }
            });
        };
        load();
        intervalId = setInterval(load, 25 * 60 * 1000);
    },
    stop: () => {
        clearInterval(intervalId);
        EXPERIMENTS.clear();
    },
    settings: definePluginSettings({
        apiProvider: {
            type: OptionType.COMPONENT,
            component: () => (
                <div className={cl("api-provider")}>
                    <div className={cl("api-text")}>
                        API Provided by <a onClick={() => window.open("https://x.com/WumpusCentral")} href="https://x.com/WumpusCentral">WumpusCentral</a>
                    </div>
                </div>
            )
        }
    }),
    getExperimentsComponent: ErrorBoundary.wrap((e: { experimentId: string; }) => {
        const experiments = ExperimentStore.getRegisteredExperiments();

        const guildIds = GuildStore.getGuildIds();
        const guilds = GuildStore.getGuilds();
        let exp = experiments[e.experimentId];

        const bucketMap = {};

        if (!exp) {
            exp = ApexExperimentStore.getRegisteredExperiments()[e.experimentId];
            if (!exp) return null;

            for (const k of Object.keys(exp.variations)) {
                bucketMap[k] = "Variant " + k;
            }

            exp.type = exp.kind;
        } else {
            for (const [i, v] of exp.buckets.entries()) {
                bucketMap[v] = exp.description[i];
            }
        }

        const currentUser = UserStore.getCurrentUser();
        const userHash = mm3(e.experimentId + ":" + currentUser.id) % 10000;
        const expObject = EXPERIMENTS.get(e.experimentId);

        if (!expObject) return null;

        const typedExp = getTypedExperiment(expObject);
        let ranges: ExperimentPopulationRollout[] = [];

        if (!typedExp.rollout.aaMode && typedExp.rollout.populations) {
            ranges = typedExp.rollout.populations.flatMap(pop =>
                pop[0].flatMap(range => range[1]?.flatMap(r => r) ?? [])
            );
        }

        return <div key={e.experimentId} className={cl("container")}>
            {exp.type === "user" && (
                <div className={cl("experiment-info")}>
                    <div className={cl("experiment-info-item")}>
                        <span className={cl("experiment-info-label")}>Your Hash:</span>
                        <span className={cl("experiment-info-value")}>{userHash}</span>
                    </div>
                    {ranges.length > 0 && (
                        <div className={cl("experiment-info-item")}>
                            <span className={cl("experiment-info-label")}>Rollout:</span>
                            <span className={cl("experiment-info-value")}>
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

                    return <div key={bucket} className={cl("guild-experiment-bucket")}>
                        <div className={cl("guild-experiment-bucket-name")}>{description}</div>
                        <div className={cl("experiment-bucket-icons")}>
                            {guildIcons.length > 0 ? guildIcons : <div className={cl("experiment-bucket-empty")}>No guilds in this bucket</div>}
                        </div>
                    </div>;
                } else if (exp.type === "user") {
                    const friends = RelationshipStore.getFriendIDs().map(id => ({ id, user: UserStore.getUser(id) }));

                    const bucketRanges = typedExp.rollout.aaMode ? typedExp.rollout.populations.map(population =>
                        population[0].filter(range => range[0] === parseInt(bucket)).map(range => range[1])
                    ) : [];

                    const userIcons = friends.map(friend => {
                        const hash = mm3(e.experimentId + ":" + friend.id) % 10000;
                        const inRange = bucketRanges.some(range =>
                            range.some(r => r?.some(entry => hash >= entry.s && hash <= entry.e))
                        );

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

                    return <div key={bucket} className={cl("user-experiment-bucket")}>
                        <div className={cl("user-experiment-bucket-name")}>{description}</div>
                        <div className={cl("experiment-bucket-icons")}>
                            {userIcons.length > 0 ? userIcons : <div className={cl("experiment-bucket-empty")}>No users in this bucket</div>}
                        </div>
                    </div>;
                }
            })}
        </div>;
    }, { noop: true })

});
