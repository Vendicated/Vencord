/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export enum BeatmapStatuses {
    Unknown,
    NotSubmitted = 1,
    Pending = 2,
    Ranked = 4,
    Approved = 5,
    Qualified = 6,
    Loved = 7
}

export enum Modes {
    Osu = 0,
    Taiko = 1,
    Fruits = 2,
    Mania = 3
}

export enum BanchoStatusEnum {
    Idle,
    Afk,
    Playing,
    Editing,
    Modding,
    Multiplayer,
    Watching,
    Unknown,
    Testing,
    Submitting,
    Paused,
    Lobby,
    Multiplaying,
    OsuDirect
}

export enum UserLoginStatus {
    Reconnecting = 0,
    Guest = 256,
    Recieving_data = 257,
    Disconnected = 65537,
    Connected = 65793
}

export enum ReleaseStream {
    CuttingEdge,
    Stable,
    Beta,
    Fallback
}

export enum ScoreMeterType {
    None,
    Colour,
    Error
}

export enum LeaderboardType {
    Local,
    Global,
    Selectedmods,
    Friends,
    Country
}

export enum GroupType {
    None,
    Artist,
    BPM,
    Creator,
    Date,
    Difficulty,
    Length,
    Rank,
    MyMaps,
    Search = 12,
    Show_All = 12,
    Title,
    LastPlayed,
    OnlineFavourites,
    ManiaKeys,
    Mode,
    Collection,
    RankedStatus
}

export enum SortType {
    Artist,
    BPM,
    Creator,
    Date,
    Difficulty,
    Length,
    Rank,
    Title
}

export enum ChatStatus {
    Hidden,
    Visible,
    VisibleWithFriendsList
}

export enum ProgressBarType {
    Off,
    Pie,
    TopRight,
    BottomRight,
    Bottom
}

export enum GameState {
    Menu,
    Edit,
    Play,
    Exit,
    SelectEdit,
    SelectPlay,
    SelectDrawings,
    ResultScreen,
    Update,
    Busy,
    Unknown,
    Lobby,
    MatchSetup,
    SelectMulti,
    RankingVs,
    OnlineSelection,
    OptionsOffsetWizard,
    RankingTagCoop,
    RankingTeam,
    BeatmapImport,
    PackageUpdater,
    Benchmark,
    Tourney,
    Charts
}

export type ApiAnswer = TosuApi | { error?: string; };
export type ApiAnswerPrecise = TosuPreciseAnswer | { error?: string; };

export interface TosuApi {
    state: NumberName;
    session: Session;
    settings: Settings;
    profile: Profile;
    beatmap: Beatmap;
    play: Play;
    leaderboard: Leaderboard[];
    performance: Performance;
    resultsScreen: ResultsScreen;
    folders: Folders;
    files: Files;
    directPath: DirectPath;
    tourney: Tourney | undefined;
}

export interface BeatmapTime {
    live: number;
    firstObject: number;
    lastObject: number;
    mp3Length: number;
}

export interface Session {
    playTime: number;
    playCount: number;
}

export interface Settings {
    interfaceVisible: boolean;
    replayUIVisible: boolean;
    chatVisibilityStatus: NumberName;
    leaderboard: SettingsLeaderboard;

    progressBar: NumberName;
    bassDensity: number;

    resolution: Resolution;
    client: Client;

    scoreMeter: ScoreMeter;
    cursor: Cursor;
    mouse: Mouse;
    mania: Mania;

    sort: NumberName;
    group: NumberName;

    skin: Skin;
    mode: NumberName;
    audio: Audio;
    background: Background;

    keybinds: Keybinds;
}

export interface Keybinds {
    osu: KeybindsOsu;
    fruits: KeybindsFruits;
    taiko: KeybindsTaiko;
    quickRetry: string;
}

export interface KeybindsOsu {
    k1: string;
    k2: string;
    smokeKey: string;
}

export interface KeybindsFruits {
    k1: string;
    k2: string;
    Dash: string;
}

export interface KeybindsTaiko {
    innerLeft: string;
    innerRight: string;
    outerLeft: string;
    outerRight: string;
}

export interface Volume {
    master: number;
    music: number;
    effect: number;
}

export interface Audio {
    ignoreBeatmapSounds: boolean;
    useSkinSamples: boolean;
    volume: Volume;
    offset: Offset;
}

export interface Background {
    storyboard: boolean;
    video: boolean;
    dim: number;
}

export interface Client {
    updateAvailable: boolean;
    branch: number;
    version: string;
}

export interface Resolution {
    fullscreen: boolean;
    width: number;
    height: number;
    widthFullscreen: number;
    heightFullscreen: number;
}

export interface Offset {
    universal: number;
}

export interface Cursor {
    useSkinCursor: boolean;
    autoSize: boolean;
    size: number;
}

export interface Mouse {
    disableButtons: boolean;
    disableWheel: boolean;
    rawInput: boolean;
    sensitivity: number;
}

export interface Mania {
    speedBPMScale: boolean;
    usePerBeatmapSpeedScale: boolean;
}

export interface Skin {
    useDefaultSkinInEditor: boolean;
    ignoreBeatmapSkins: boolean;
    tintSliderBall: boolean;
    useTaikoSkin: boolean;
    name: string;
}

export interface SettingsLeaderboard {
    visible: boolean;
    type: NumberName;
}

export interface ScoreMeter {
    type: NumberName;
    size: number;
}

export interface Volume {
    master: number;
    music: number;
    effect: number;
}

export interface NumberName {
    number: number;
    name: string;
}

export interface Profile {
    userStatus: NumberName;
    banchoStatus: NumberName;
    id: number;
    name: string;
    mode: NumberName;
    rankedScore: number;
    level: number;
    accuracy: number;
    pp: number;
    playCount: number;
    globalRank: number;
    countryCode: NumberName;
    backgroundColour: string;
}

export interface Beatmap {
    time: BeatmapTime;
    status: NumberName;
    checksum: string;
    id: number;
    set: number;
    mode: NumberName;
    artist: string;
    artistUnicode: string;
    title: string;
    titleUnicode: string;
    mapper: string;
    version: string;
    stats: Stats;
}

export interface Stats {
    stars: Stars;
    ar: Ar;
    cs: Cs;
    od: Od;
    hp: Hp;
    bpm: Bpm;
    objects: Objects;
    maxCombo: number;
}

export interface Stars {
    live: number;
    aim: number | undefined;
    speed: number | undefined;
    flashlight: number | undefined;
    sliderFactor: number | undefined;
    stamina: number | undefined;
    rhythm: number | undefined;
    color: number | undefined;
    peak: number | undefined;
    hitWindow: number | undefined;
    total: number;
}

export interface Ar {
    original: number;
    converted: number;
}

export interface Cs {
    original: number;
    converted: number;
}

export interface Od {
    original: number;
    converted: number;
}

export interface Hp {
    original: number;
    converted: number;
}

export interface Bpm {
    common: number;
    min: number;
    max: number;
}

export interface Objects {
    circles: number;
    sliders: number;
    spinners: number;
    holds: number;
    total: number;
}

export interface Play {
    playerName: string;
    mode: NumberName;
    score: number;
    accuracy: number;
    healthBar: HealthBar;
    hits: Hits;
    hitErrorArray: any[];
    combo: Combo;
    mods: NumberName;
    rank: Rank;
    pp: Pp;
    unstableRate: number;
}

export interface HealthBar {
    normal: number;
    smooth: number;
}

export interface Hits {
    "0": number;
    "50": number;
    "100": number;
    "300": number;
    geki: number;
    katu: number;
    sliderBreaks: number;
}

export interface Combo {
    current: number;
    max: number;
}

export interface Rank {
    current: string;
    maxThisPlay: string;
}

export interface Pp {
    current: number;
    fc: number;
    maxAchievedThisPlay: number;
}
export interface Pp2 {
    current: number;
    fc: number;
}

export interface Leaderboard {
    isFailed: boolean;
    position: number;
    team: number;
    name: string;
    score: number;
    accuracy: number;
    hits: Hits2;
    combo: Combo2;
    mods: NumberName;
    rank: string;
}

export interface Hits2 {
    "0": number;
    "50": number;
    "100": number;
    "300": number;
    geki: number;
    katu: number;
}

export interface Combo2 {
    current: number;
    max: number;
}

export interface TosuPreciseAnswer {
    currentTime: number;
    keys: KeyOverlay;
    hitErrors: number[];
    tourney: PreciseTourney[];
}

export interface PreciseTourney {
    ipcId: number;
    keys: KeyOverlay;
    hitErrors: number[];
}

interface KeyOverlay {
    k1: KeyOverlayButton;
    k2: KeyOverlayButton;
    m1: KeyOverlayButton;
    m2: KeyOverlayButton;
}

interface KeyOverlayButton {
    isPressed: boolean;
    count: number;
}

export interface Performance {
    accuracy: Accuracy;
    graph: Graph;
}

export interface Accuracy {
    "95": number;
    "96": number;
    "97": number;
    "98": number;
    "99": number;
    "100": number;
}

export interface Graph {
    series: Series[];
    xaxis: number[];
}

export interface Series {
    name: string;
    data: number[];
}

export interface ResultsScreen {
    playerName: string;
    mode: NumberName;
    score: number;
    accuracy: number;
    name: string;
    hits: Hits3;
    mods: NumberName;
    maxCombo: number;
    rank: string;
    pp: Pp2;
    createdAt: string;
}

export interface Hits3 {
    "0": number;
    "50": number;
    "100": number;
    "300": number;
    geki: number;
    katu: number;
}

export interface Folders {
    game: string;
    skin: string;
    songs: string;
    beatmap: string;
}

export interface Files {
    beatmap: string;
    background: string;
    audio: string;
}

export interface DirectPath {
    beatmapFile: string;
    beatmapBackground: string;
    beatmapAudio: string;
    beatmapFolder: string;
    skinFolder: string;
}

export interface Tourney {
    scoreVisible: boolean;
    starsVisible: boolean;

    ipcState: number;
    bestOF: number;

    team: {
        left: string;
        right: string;
    };
    points: {
        left: number;
        right: number;
    };
    totalScore: {
        left: number;
        right: number;
    };

    chat: TourneyChatMessages[];
    clients: TourneyClients[];
}

export interface TourneyChatMessages {
    team: string;
    name: string;
    message: string;
    timestamp: string;
}

export interface TourneyClients {
    ipcId: number;
    team: "left" | "right";
    user: {
        id: number;
        name: string;
        country: string;
        accuracy: number;
        rankedScore: number;
        playCount: number;
        globalRank: number;
        totalPP: number;
    };
    play: Play;
}
