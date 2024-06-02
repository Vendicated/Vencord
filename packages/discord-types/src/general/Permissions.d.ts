/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
// bigint enums are not yet possible: https://github.com/microsoft/TypeScript/issues/37783
export const enum Permissions {
    CREATE_INSTANT_INVITE = 1n << 0n,
    KICK_MEMBERS = 1n << 1n,
    BAN_MEMBERS = 1n << 2n,
    ADMINISTRATOR = 1n << 3n,
    MANAGE_CHANNELS = 1n << 4n,
    MANAGE_GUILD = 1n << 5n,
    ADD_REACTIONS = 1n << 6n,
    VIEW_AUDIT_LOG = 1n << 7n,
    PRIORITY_SPEAKER = 1n << 8n,
    STREAM = 1n << 9n,
    VIEW_CHANNEL = 1n << 10n,
    SEND_MESSAGES = 1n << 11n,
    SEND_TTS_MESSAGES = 1n << 12n,
    MANAGE_MESSAGES = 1n << 13n,
    EMBED_LINKS = 1n << 14n,
    ATTACH_FILES = 1n << 15n,
    READ_MESSAGE_HISTORY = 1n << 16n,
    MENTION_EVERYONE = 1n << 17n,
    USE_EXTERNAL_EMOJIS = 1n << 18n,
    VIEW_GUILD_ANALYTICS = 1n << 19n,
    CONNECT = 1n << 20n,
    SPEAK = 1n << 21n,
    MUTE_MEMBERS = 1n << 22n,
    DEAFEN_MEMBERS = 1n << 23n,
    MOVE_MEMBERS = 1n << 24n,
    USE_VAD = 1n << 25n,
    CHANGE_NICKNAME = 1n << 26n,
    MANAGE_NICKNAMES = 1n << 27n,
    MANAGE_ROLES = 1n << 28n,
    MANAGE_WEBHOOKS = 1n << 29n,
    MANAGE_GUILD_EXPRESSIONS = 1n << 30n,
    USE_APPLICATION_COMMANDS = 1n << 31n,
    REQUEST_TO_SPEAK = 1n << 32n,
    MANAGE_EVENTS = 1n << 33n,
    MANAGE_THREADS = 1n << 34n,
    CREATE_PUBLIC_THREADS = 1n << 35n,
    CREATE_PRIVATE_THREADS = 1n << 36n,
    USE_EXTERNAL_STICKERS = 1n << 37n,
    SEND_MESSAGES_IN_THREADS = 1n << 38n,
    USE_EMBEDDED_ACTIVITIES = 1n << 39n,
    MODERATE_MEMBERS = 1n << 40n,
    VIEW_CREATOR_MONETIZATION_ANALYTICS = 1n << 41n,
    USE_SOUNDBOARD = 1n << 42n,
    CREATE_GUILD_EXPRESSIONS = 1n << 43n,
    CREATE_EVENTS = 1n << 44n,
    USE_EXTERNAL_SOUNDS = 1n << 45n,
    SEND_VOICE_MESSAGES = 1n << 46n,
    USE_CLYDE_AI = 1n << 47n,
    SET_VOICE_CHANNEL_STATUS = 1n << 48n,
    SEND_POLLS = 1n << 49n,
}
*/

export interface PermissionOverwriteMap {
    [roleIdOrUserId: string]: PermissionOverwrite;
}

export interface PermissionOverwrite {
    allow: /* Permissions */ bigint;
    deny: /* Permissions */ bigint;
    id: string;
    type: PermissionOverwriteType;
}

export const enum PermissionOverwriteType {
    ROLE = 0,
    MEMBER = 1,
}
