import { DataStore } from "@api/index";
import { SessionInfo } from "./types";
import { UserStore } from "@webpack/common";

const getDataKey = () => `BetterSessions_savedNames_${UserStore.getCurrentUser().id}`;

export const savedNamesCache: Map<string, string> = new Map();

export function getDefaultName(clientInfo: SessionInfo["session"]["client_info"]) {
    return `${clientInfo.os} · ${clientInfo.platform}`;
}

export function saveNamesToDataStore() {
    return DataStore.set(getDataKey(), savedNamesCache);
}

export async function fetchNamesFromDataStore() {
    const savedNames = await DataStore.get<Map<string, string>>(getDataKey()) || new Map();
    savedNames.forEach((name, idHash) => {
        savedNamesCache.set(idHash, name);
    });
}
