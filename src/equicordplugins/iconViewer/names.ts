/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Icon } from "@vencord/discord-types";

// name: pattern
export const IconsFinds: Record<string, string> = {
    Discord: "1.6 5.64-2.87",
    XboxNeutral: "8.68-.62c.89-.81 1.5",
    PlaystationNeutral: "2.04Zm-9.35",
    TwitterNeutral: "M13.86 10.47", // even discord calls it twitter lmao
    InstagramNeutral: "4.12.07Zm.1 2c-",
    YoutubeNeutral: "11.5s0 3.95.5 5.85a3.",
    FacebookNeutral: "2.8V12h2.8V9",
    NintendoSwitchNeutral: "14V2.32c0",
    Pencil: "0-2.82 0l-1.38 1.38a1",
    AngleBrackets: "0-.4.8v1.98c0",
    NitroWheel: "2h3a1 1 0 1 1 0 2H5.5",
    Bill: "75.34.75.75C6 7.99 5 9",
    Chat: "2.2 22H12Z\",",
    ChatVoice: "22H12Zm2-5.26c0",
    ChatX: ".23.46-.48.47L12 22H2.",
    ChatSmile: "04-.61A10 10 0 1 1 22 ",
    ChatRetry: "14.07.3.09.44.04a7",
    ChatPlus: "1.24-.37V12a10 10 0 1 ",
    Bug: "1.1.27.1.37 0a6.66 6.6",
    B: "9V2.9c0-.5.4-.9.9-.9h7",
    Eye: "19.1 21 12 21c-7.11 0-",
    EyeSlash: "2.63-2.63c",
    EyePlus: "3.32ZM19 14a1 ",
    Heart: "0C9.43 20.48 1 15.09 1",
    Star: ".73-2.25h6.12l1.9-5.83Z",
    StarOutline: "3.1h5.26l1.62",
    StarShooting: "1.35l2.95 2.14",
    QrCode: "0v3ZM20",
    Friends: "12h1a8",
    PlusSmall: "0v-5h5a1",
    CircleQuestion: "10.58l-3.3-3.3a1",
    Pin: "1-.06-.63L6.16",
    PinUpright: "5H8v4.35l-3.39",
    PinUprightSlash: "1.56ZM11.08 ",
    ArrowsLeftRight: "18.58V3a1",
    XSmall: "13.42l5.3",
    XLarge: "13.42l7.3 7.3Z",
    XSmallBold: "12l4.94-4.94a1.5",
    XLargeBold: "12l6.94-6.94a1.5",
    Lock: "3Zm9-3v3H9V6a3",
    LockUnlocked: "1-1.33-1.5ZM14",
    Video: "1.45-.9V7.62a1",
    VideoSlash: "1.4l20-20ZM9.2",
    VideoLock: "1.32-.5V7.62a1",
    Fire: "14Zm9.26-.84a.57.57",
    Warning: "3.15H3.29c-1.74",
    Download: "1.42l3.3 3.3V3a1",
    Upload: "0ZM3 20a1 1",
    // QuestionMark: "0ZM5.5 7a1.5" Unknown name
    Quest: "10.47a.76.76",
    Play: "4.96v14.08c0",
    Emoji: " 0 0 0 0 22ZM6.5",
    Gif: "3H5Zm2.18 13.8",
    Trash: "2.81h8.36a3",
    Bell: "9.5v2.09c0",
    Screen: "0-3-3H5ZM13.5",
    ScreenArrow: "3V5Zm16",
    ScreenStream: " 2-2h3a2",
    ScreenSystemRequirements: "3V5Zm3", // a guess
    ScreenSlash: "5.8ZM17.15",
    ScreenX: "1-3-3V5Zm6.3.3a1",
    Plus: "0v8H3a1 1 0 1 0 0 2h8v8a1",
    Id: "15h2.04V7.34H6V17Zm4",
    Tv: "0-3-3H4ZM6 20a1",
    Crown: "1.18l.82.82-3.61",
    React: "04-4ZM16.96 4.08c",
    Camera: "1.34 1.71 1.34H20a3",
    Sticker: "1-.58.82l-4.24",
    StageX: "13.07-1.38ZM16.7",
    StageLock: "7.14-3.85ZM18.98",
    Stage: "20.03c-.25.72.12",
    ConnectionFine: "1 0 1 1-2 0A17 17 ",
    ConnectionAverage: "\"M3 7a1 1 0 0",
    ConnectionBad: "\"M2 13a1 1 0 0",
    ConnectionUnknown: "15.86-.6.9-.2.02",
    ChatWarning: ".54.5H2.2a1",
    ChatCheck: "22H12c.22",
    Hammer: "1.42ZM7.76",
    StickerSmall: "1-.5.5H7a4",
    StickerSad: "1.66-1.12 5.5",
    StickerDeny: "\"M21.76 14.83a", // a guess
    MagnifyingGlassPlus: "M11 7a1 1 0",
    MagnifyingGlassMinus: "3v12H5.5a1.5 1.5",
    // MagnifyingGlass: "???", // not quite possible
    ChatArrowRight: "2.43l.06",
    Bookmark: "1-1.67.74l",
    ChannelList: "1-1-1ZM2 8a1",
    ChannelListMagnifyingGlass: "2h18a1 1 0 1 0 0-2H3ZM2",
    Activities: "1h3a3 3 0 0 0 3-3Z\"",
    ActivitiesPlus: "14.35v1.29a",
    AnnouncementsLock: "1-2.46-1.28 3.86",
    AnnouncementsWarning: "1-2.46-1.28 3.85",
    Announcements: ".42.27.79.62",
    ShieldLock: "2.83v2.67a.5.5",
    ShieldUser: "9.77V6.75c0-.57.17",
    ShieldAt: "14.42-.35.75",
    Shield: "M4.27 5.22A2.66", // a guess
    Slash: "1-.43-.76L15.78",
    SlashBox: "0-3-3H5Zm12.79",
    Apps: "2.95H20a2 2 0",
    CheckmarkLarge: "1.4l-12 12a1",
    CheckmarkLargeBold: "2.12-2.12L9",
    CheckmarkSmallBold: "13.88l6.94-6.94a1.5",
    CheckmarkSmall: "1-1.4 0l-4-4a1",
    DoubleCheckmark: "1.4l4.5 4.5a1",
    NewUser: "0-.92h-.03a2", // a guess
    UserCheck: "0l1.8-1.8c.17",
    User: "2.9.06.24.26.",
    UserMinus: "3-3h5.02c.38",
    UserPlus: "2.07ZM12",
    UserPlay: "0-3.61-.71h-.94Z",
    UserBox: "0-3-3H5Zm10 6a3", // a guess
    Settings: "0ZM16 12a4",
    SettingsInfo: "10Zm1-4a1",
    Hashtag: "8 4.84a1", // a guess
    HashtagLocked: "2.02.31.03", // a guess
    HashtagWarning: "8h1.26Z", // a guess
    HashtagPlay: "52.88H9.85l", // a guess
    Flag: "5.85v7.3a2",
    Language: "5.43h3.85l",
    Lightbulb: "8.5ZM15.1 19c.5",
    Key: "23-.24ZM10 16a2",
    InBox: "3H5ZM4 5.5C4",
    BookmarkOutline: "0-1-1ZM7 2a3",
    Food: "7.58V8a1 1",
    CircleShield: "8 10.9999V17.9999C8"
};

// 13l4.91-8.05a1.8

const namePatterns = new Map(Object.entries(IconsFinds));

export function getNameByIcon(Icon: Icon, defaultName: string) {
    for (const [name, pattern] of namePatterns) {
        if (String(Icon).includes(pattern)) {
            namePatterns.delete(name);
            return name;
        }
    }
    return defaultName;
}
