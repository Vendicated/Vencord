import { DataStore } from "@api/index";
import { SessionInfo } from "./types";

export const savedNamesCache: Map<string, string> = new Map();

export function getDefaultName(clientInfo: SessionInfo["session"]["client_info"]) {
    return `${clientInfo.os} · ${clientInfo.platform}`;
}

export function saveNamesToDataStore() {
    return DataStore.set("BetterSessions_savedNamesCache", savedNamesCache);
}

export async function fetchNamesFromDataStore() {
    const savedNames = await DataStore.get<Map<string, string>>("BetterSessions_savedNamesCache") || new Map();
    savedNames.forEach((name, idHash) => {
        savedNamesCache.set(idHash, name);
    });
}
