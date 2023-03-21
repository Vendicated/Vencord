/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import IpcEvents from "@utils/IpcEvents";
import { NonMethodKeys } from "@utils/types";
import { useStateFromStores } from "@webpack/common";

import { SpotifyApi } from "./api";
import { PlayerStore } from "./store";
import { Resource } from "./types";
export * from "./types";

type PlayerStoreStates = NonMethodKeys<PlayerStore>;

export const Spotify = {
    openExternal(path: string) {
        VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://open.spotify.com" + path);
    },

    ...SpotifyApi,

    // Player
    PlayerStore,
    usePlayer<T, K extends PlayerStoreStates, S = Pick<PlayerStore, K>>(keys: K[], compare?: (old: S, newer: S) => boolean) {
        return useStateFromStores(
            [PlayerStore],
            () => Object.fromEntries(keys.map(key => [key, PlayerStore[key]])) as S,
            null,
            compare,
        );
    },
};

export const MARKET_CODES = "AD AE AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CG CH CI CL CM CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IS IT JM JO JP KE KG KH KI KM KN KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RW SA SB SC SE SG SI SK SL SM SN SR ST SV SZ TD TG TH TJ TL TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK ZA ZM ZW".split(" ");

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export function getMarketName(code: string) {
    return regionNames.of(code);
}

export function getImageSmallestAtLeast(resource: Resource, size: number) {
    const images = (() => {
        if ("images" in resource) return resource.images;
        else if (resource.type === "track") return resource.album.images;
        return null;
    })();

    if (!images?.length) return null;

    return images.reduce((prev, curr) => {
        let prevDiff = prev.width - size;
        let currDiff = curr.width - size;
        if (prevDiff < 0) prevDiff = Infinity;
        if (currDiff < 0) currDiff = Infinity;
        return currDiff < prevDiff ? curr : prev;
    });
}
