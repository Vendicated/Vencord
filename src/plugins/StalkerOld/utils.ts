// stolen from https://github.com/Syncxv/vc-message-logger-enhanced/blob/master/utils/index.ts
import { Logger } from "@utils/Logger";
import { settings } from "./index";


export function addToWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",") : [];
    items.push(id);

    settings.store.whitelistedIds = items.join(",");
}

export function removeFromWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",") : [];
    const index = items.indexOf(id);
    if (index !== -1) items.splice(index, 1);

    settings.store.whitelistedIds = items.join(",");
}

export function isInWhitelist(id: string) {
    const items = settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",") : [];

    return items.indexOf(id) !== -1;
}

// Convert snake_case to camelCase for all keys in an object, including nested objects
export function convertSnakeCaseToCamelCase(obj: any): any {

    if (!Array.isArray(obj) && (typeof obj !== "object" || obj === null)) return obj;

    if (Array.isArray(obj)) return obj.map(convertSnakeCaseToCamelCase);

    return Object.keys(obj).reduce((newObj, key) => {
        const camelCaseKey = key.replace(/_([a-z])/gi, (_, char) => char.toUpperCase());
        const value = convertSnakeCaseToCamelCase(obj[key]);
        return { ...newObj, [camelCaseKey]: value };
    }, {} as any);
};

const logger = new Logger("Stalker");

export { logger };
