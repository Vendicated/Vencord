/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Store } from "../flux/Store";
import type { GuildRecord } from "../general/GuildRecord";
import type { Role } from "../general/Role";
import type { Nullish } from "../internal";

export declare class GuildStore extends Store {
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
