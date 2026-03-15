import { FluxStore } from "..";

interface ExperimentAssignmentOverride {
    type: "user" | "guild";
    revision: number;
    population?: number;
    bucket: number;
    override: boolean;
}

interface UserExperimentAssignment {
    aaMode: boolean;
    assignmentSource: string;
    bucket: number;
    fingerprint: string | null;
    hashResult: number;
    holdoutBucket: number | null;
    holdoutName: string | null;
    holdoutRevision: number | null;
    loadedFromCache: boolean;
    override: boolean;
    population: number;
    revision: number;
    sessionId: string;
    triggerDebuggingEnabled: boolean;
    type: string;
}

interface GuildExperimentAssignment {
    aaMode: boolean;
    assignmentSource: string;
    fingerprint: string | null;
    hashKey: string | null;
    holdoutControlBucket: number | null;
    holdoutName: string | null;
    loadedFromCache: boolean;
    overrides: Record<string, number>;
    overridesFormatted: unknown[];
    populations: unknown[];
    revision: number;
    sessionId: string;
    triggerDebuggingEnabled: boolean;
}

interface ExperimentDescriptor {
    buckets: number[];
    commonTriggerPoint?: string;
    description: string[];
    title: string;
    type: "user" | "guild";
}

interface ExperimentExposureEntry {
    time: number;
    hash: number;
}

type GuildExposureKey = `guild|${string}|${string}`;
type UserExposureKey = `user|${string}`;

interface TrackedExposures {
    [key: UserExposureKey]: ExperimentExposureEntry;
    [key: GuildExposureKey]: ExperimentExposureEntry;
}

interface ExperimentState {
    assignmentFingerprint: string | null;
    assignmentSessionId: string;
    assignmentSource: string;
    cookieOverrides: unknown;
    guildExperimentOverrides: ExperimentAssignmentOverride;
    hasLoadedExperiments: boolean;
    loadedGuildExperiments: GuildExperimentAssignment;
    loadedUserExperiments: UserExperimentAssignment;
    trackedExposureExperiments: TrackedExposures;
    userExperimentOverrides: ExperimentAssignmentOverride;
}

export class ExperimentStore extends FluxStore {
    hasLoadedExperiments: boolean;
    persistKey: string;
    getAllExperimentAssignments(): Record<string, number>;
    getAllExperimentOverrideDescriptors(): ExperimentAssignmentOverride;
    getAllUserExperimentDescriptors(): Record<number, UserExperimentAssignment>;
    getExperimentOverrideDescriptor(experimentId: string): ExperimentAssignmentOverride;
    getGuildExperimentBucket(experimentId: string, guildId: string): number;
    getGuildExperimentDescriptor(experimentId: string, guildId: string): ExperimentAssignmentOverride;
    getGuildExperiments(): Record<number, GuildExperimentAssignment>;
    getLoadedGuildExperiment(experimentId: string): GuildExperimentAssignment;
    getLoadedUserExperiment(experimentId: string): UserExperimentAssignment;
    getRegisteredExperiments(): ExperimentDescriptor;
    getSerializedState(): ExperimentState;
    getUserExperimentBucket(experimentId: string): number;
    getUserExperimentDescriptor(experimentId: string): ExperimentAssignmentOverride;
    hasRegisteredExperiment(experimentId: string): boolean;

    // has two args
    getRecentExposures(): unknown;
    // has four args
    hasExperimentTrackedExposure(): unknown;
}
