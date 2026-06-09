/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { NativeSettings } from "@main/settings";
import { IpcMainInvokeEvent } from "electron";

const WIKIMEDIA_HOSTS = [
    "*.wikipedia.org", "*.wiktionary.org", "*.wikibooks.org", "*.wikinews.org",
    "*.wikiquote.org", "*.wikisource.org", "*.wikiversity.org", "*.wikivoyage.org",
    "*.wikidata.org", "*.wikifunctions.org", "*.wikimedia.org", "*.mediawiki.org",
];

export function allowWikimediaHosts(_: IpcMainInvokeEvent) {
    for (const host of WIKIMEDIA_HOSTS) {
        if (!(host in NativeSettings.store.customCspRules)) {
            NativeSettings.store.customCspRules[host] = ["connect-src"];
        }
    }
}
