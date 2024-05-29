/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ExtractAction, FluxAction } from "../flux/fluxActions";
import type { GuildRecord } from "../general/GuildRecord";
import type { Role } from "../general/Role";
import type { Nullish } from "../internal";
import type { FluxStore } from "./abstract/FluxStore";

export type GuildStoreAction = ExtractAction<FluxAction, "BACKGROUND_SYNC" | "CACHE_LOADED" | "CACHE_LOADED_LAZY" | "CONNECTION_OPEN" | "GUILD_CREATE" | "GUILD_DELETE" | "GUILD_GEO_RESTRICTED" | "GUILD_MEMBER_ADD" | "GUILD_ROLE_CREATE" | "GUILD_ROLE_DELETE" | "GUILD_ROLE_UPDATE" | "GUILD_SETTINGS_SUBMIT_SUCCESS" | "GUILD_UPDATE" | "OVERLAY_INITIALIZE">;

export class GuildStore<Action extends FluxAction = GuildStoreAction> extends FluxStore<Action> {
    static displayName: "GuildStore";

    getAllGuildsRoles(): { [guildId: string]: { [roleId: string]: Role; }; };
    getGeoRestrictedGuilds(): { [guildId: string]: GuildRecord; };
    getGuild(guildId?: string | Nullish): GuildRecord | undefined;
    getGuildCount(): number;
    getGuildIds(): string[];
    getGuilds(): { [guildId: string]: GuildRecord; };
    getRole(guildId: string, roleId: string): Role | undefined;
    getRoles(guildId: string): { [roleId: string]: Role; };
    isLoaded(): boolean;
}
