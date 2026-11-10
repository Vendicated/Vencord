import { Application, ApplicationExecutable, ApplicationThirdPartySku, FluxStore } from "..";
import { RunningGame } from "./RunningGameStore";

export interface DetectableGameExecutable {
    os: ApplicationExecutable["os"];
    name: string;
    arguments?: string;
    isLauncher?: boolean;
}

export interface DetectableGame {
    id: string;
    name: string;
    executables: DetectableGameExecutable[];
    aliases: string[];
    thirdPartySkus: ApplicationThirdPartySku[];
}

export interface GameStoreState {
    detectableGamesEtag: string;
    detectableGames: DetectableGame[];
    blocklistEtag: string;
    /** lowercased executable names */
    blocklistExecutables: string[];
    /** case-insensitive regex sources */
    blocklistPatterns: string[];
}

export interface GameBlockReason {
    matchedExe: string | null;
    matchedPattern: string | null;
}

export type GameApplicationMatchType = "none" | "linked_game" | "name";

export class GameStore extends FluxStore {
    getState(): GameStoreState;
    get games(): DetectableGame[];
    getDetectableGame(applicationId: string): DetectableGame | undefined;
    /** returns matching application ids */
    searchGamesByName(name: string | null | undefined): string[];
    findGame(game: RunningGame, onNameMatch?: (game: DetectableGame) => void): DetectableGame | undefined;
    getOfficialGame(application: Application | null | undefined): DetectableGame | null | undefined;
    getGameByApplication(application: Application): DetectableGame | undefined;
    isGameInDatabase(game: RunningGame): boolean;
    get fetching(): boolean;
    get detectableGamesEtag(): string;
    get blocklistEtag(): string;
    get lastFetched(): number | null;
    get hasAttemptedFetch(): boolean;
    /** ms */
    get detectableGamesTtl(): number;
    canFetchDetectableGames(): boolean;
    canFetchExecutableBlocklist(): boolean;
    /** accepts a file name or the last two path segments */
    getGameByExecutable(executable: string | null | undefined): DetectableGame | undefined;
    shouldBlock(game: RunningGame): boolean;
    getBlockReason(game: RunningGame): GameBlockReason | null;
    maybeTrackApplicationLookupFallthrough(application: Application, matchType: GameApplicationMatchType, game: DetectableGame | undefined): void;
    trackNameMatchFallback(name: string, game: DetectableGame, exePath?: string): void;
    maybeTrackBlock(game: RunningGame, blockType: "explicit_list" | "pattern_match", matchedEntry: string): void;
}
