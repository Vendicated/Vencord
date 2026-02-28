import { FluxStore } from "..";

export interface RunningGame {
    id?: string;
    name: string;
    exePath: string;
    cmdLine: string;
    distributor: string;
    lastFocused: number;
    lastLaunched: number;
    nativeProcessObserverId: number;
    pid?: number;
    hidden?: boolean;
    isLauncher?: boolean;
    elevated?: boolean;
    sandboxed?: boolean;
}

export interface GameOverlayStatus {
    enabledLegacy: boolean;
    enabledOOP: boolean;
}

export interface SystemServiceStatus {
    state: string;
}

export class RunningGameStore extends FluxStore {
    canShowAdminWarning: boolean;

    addExecutableTrackedByAnalytics(exe: string): void;
    getCandidateGames(): RunningGame[];
    getCurrentGameForAnalytics(): RunningGame | null;
    getCurrentNonGameForAnalytics(): RunningGame | null;
    getGameForName(name: string): RunningGame | null;
    getGameForPID(pid: number): RunningGame | null;
    getGameOrTransformedSubgameForPID(pid: number): RunningGame | null;
    getGameOverlayStatus(game: RunningGame): GameOverlayStatus | null;
    getGamesSeen(includeHidden?: boolean): RunningGame[];
    getLauncherForPID(pid: number): RunningGame | null;
    getObservedAppNameForWindow(windowHandle: number): string | null;
    getOverlayEnabledForGame(game: RunningGame): boolean;
    getOverlayOptionsForPID(pid: number): object | null;
    getOverrideForGame(game: RunningGame): object | null;
    getOverrides(): object[];
    getRunningDiscordApplicationIds(): string[];
    getRunningGames(): RunningGame[];
    getRunningNonGames(): RunningGame[];
    getRunningVerifiedApplicationIds(): string[];
    getSeenGameByName(name: string): RunningGame | null;
    getSystemServiceStatus(service: string): SystemServiceStatus;
    getVisibleGame(): RunningGame | null;
    getVisibleRunningGames(): RunningGame[];
    isDetectionEnabled(type?: string): boolean;
    isGamesSeenLoaded(): boolean;
    isObservedAppRunning(app: string): boolean;
    isSystemServiceInitialized(service: string): boolean;
    shouldContinueWithoutElevatedProcessForPID(pid: number): boolean;
    shouldElevateProcessForPID(pid: number): boolean;
}
