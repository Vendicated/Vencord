/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ActiveSessions, TMDBMovie } from "../types/default";

export abstract class BaseClient {
    abstract tmdbApiKey: string;

    abstract getActiveSessions(users: Array<string>): Promise<ActiveSessions | null>;
    abstract uploadArtImage(thumb: string): Promise<string>;
    async getInformationFromTMDB(query: string, type: "movie" | "tv"): Promise<TMDBMovie> {
        const res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${this.tmdbApiKey}&query=${query}`);
        const data = await res.json();

        return data.results[0];
    }
}
