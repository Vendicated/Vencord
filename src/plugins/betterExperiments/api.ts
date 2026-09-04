/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ExperimentsResponse = Experiment[];

// https://docs.discord.food/topics/experiments#guild-experiments

export interface Experiment {
    data: ExperimentMetadata;
    rollout: ExperimentData;
}

export interface ExperimentMetadata {
    type: string;
    title: string;
    id: string;
    hash: number;
    hashkey?: string;
    buckets: number[];
    description: string[];
}

export interface ExperimentData {
    /**
     * 32-bit unsigned Murmur3 hash of the experiment's name
     */
    0: number; // hash
    /**
     * A human-readable experiment name (formatted as year-month_name ) to use for hashing calculations, prioritized over the client name
     */
    1: string; // hash_key
    /**
     * Current version of the rollout
     */
    2: number; // revision
    /**
     * The experiment rollout's populations
     */
    3: ExperimentPopulation[];
    /**
     * Specific bucket overrides for the experiment
     */
    4: ExperimentBucketOverride[];
    /**
     * Populations of overrides for the experiment
     */
    5: ExperimentPopulation[][];
    /**
     * A human-readable experiment name (formatted as year-month_name ) that disables the experiment
     */
    6: string;
    /**
     * The holdout experiment bucket that disables the experiment
     */
    7: number;
    /**
     * The experiment's A/A testing mode, represented as an integer-casted boolean
     */
    8: number;
    /**
     * Whether the experiment's analytics trigger debugging is enabled, represented as an integer-casted boolean
     */
    9: number;
}

/**
 * This object is represented as an array of the following fields:
 */
export interface ExperimentPopulation {
    /**
     * The ranges for this population
     */
    0: ExperimentPopulationRange[];
    /**
     * The filters that the resource must satisfy to be in this population
     */
    1: ExperimentPopulationFilters;
}

/**
 * This object is represented as an array of the following fields:
 */
export interface ExperimentPopulationRange {
    /**
     * The bucket this range grants
     */
    0: number;
    /**
     * The range rollout
     */
    1: ExperimentPopulationRollout[];
}

export interface ExperimentPopulationRollout {
    /**
     * The start of this range
     */
    s: number;
    /**
     * The end of this range
     */
    e: number;
}

export interface ExperimentPopulationFilters {
    /**
     * The guild features that are eligible
     */
    guild_has_feature?: ExperimentPopulationGuildFeatureFilter;
    /**
     * The range of snowflake resource IDs that are eligible
     */
    guild_id_range?: ExperimentPopulationRangeFilter;
    /**
     * The range of guild ages (in days) that are eligible
     */
    guild_age_range_days?: ExperimentPopulationRangeFilter;
    /**
     * The range of guild member counts that are eligible
     */
    guild_member_count_range?: ExperimentPopulationRangeFilter;
    /**
     * A list of resource IDs that are eligible
     */
    guild_ids?: ExperimentPopulationIdFilter;
    /**
     * A list of hub types that are eligible
     */
    guild_hub_types?: ExperimentPopulationHubTypeFilter;
    /**
     * Whether the guild must or must not have a vanity to be eligible
     */
    guild_has_vanity_url?: ExperimentPopulationVanityUrlFilter;
    /**
     * The special rollout position limits on the population
     */
    guild_in_range_by_hash?: ExperimentPopulationRangeByHashFilter;
}

export interface ExperimentPopulationGuildFeatureFilter {
    /**
     * The guild features eligible for this population; only one feature is required for eligibility
     */
    guild_features: string[];
}

export interface ExperimentPopulationRangeFilter {
    /**
     * The exclusive minimum for this range, if any
     */
    min_id: string;
    /**
     * The exclusive maximum for this range, if any
     */
    max_id: string;
}

export interface ExperimentPopulationIdFilter {
    /**
     * The list of snowflake resource IDs that are eligible for this population
     */
    guild_ids: string[];
}

export interface ExperimentPopulationHubTypeFilter {
    /**
     * The type of hubs that are eligible for this population
     */
    guild_hub_types: number;
}

export interface ExperimentPopulationVanityUrlFilter {
    /**
     * The required vanity URL holding status for this population
     */
    guild_has_vanity_url: boolean;
}

/**
 * This filter is used to limit rollout position by an additional hash key. The calculated rollout position must be less than the given target. The rollout position can be calculated using the following pseudocode, where hash_key is the provided hash key and resource_id is the guild ID:
 *
 *
 *
 * hashed = mmh3.hash('hash_key:resource_id', signed=False)
 *
 * if hashed > 0:
 *
 *     # Double the hash
 *
 *     hashed += hashed
 *
 * else:
 *
 *     # Unsigned right shift by 0
 *
 *     hashed = (hashed % 0x100000000) >> 0
 *
 * result = hashed % 10000
 */
export interface ExperimentPopulationRangeByHashFilter {
    /**
     * The 32-bit unsigned Murmur3 hash of the key used to determine eligibility
     */
    hash_key: number;
    /**
     * The rollout position limit for this population
     */
    target: number;
}

export interface ExperimentBucketOverride {
    /**
     * Bucket assigned to these resources
     */
    b: number;
    /**
     * Resources granted access to this bucket
     */
    k: string[];
}

export interface QueryStringParameters {
    /**
     * Whether to include guild experiments in the returned data
     */
    with_guild_experiments?: boolean;
    /**
     * Whether to also include experiments for the given platform
     */
    platform?: string;
}

export enum ExperimentPlatform {
    /**
     * The developer portal
     *
     * Value: DEVELOPER_PORTAL
     */
    DEVELOPER_PORTAL,
}

export async function fetchExperiments(): Promise<ExperimentsResponse> {
    const response = await fetch("https://experiments.mantikafasi.dev");
    if (!response.ok) {
        throw new Error(`Failed to fetch experiments: ${response.statusText}`);
    }
    return await response.json() as ExperimentsResponse;
}
