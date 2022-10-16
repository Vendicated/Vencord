import { debounce } from "../../utils";
import { PronounCode, PronounsResponse } from "./types";

// A map of cached pronouns so the same request isn't sent twice
const cache: Record<string, PronounCode> = {};
// A map of ids and callbacks that should be triggered on fetch
const requestQueue: Record<string, ((pronouns: PronounCode) => void)[]> = {};

// Executes all queued requests and calls their callbacks
const bulkFetch = debounce(async () => {
    const ids = Object.keys(requestQueue);
    const pronouns = await bulkFetchPronouns(ids);
    for (const [id, callbacks] of Object.entries(requestQueue)) {
        // Call all callbacks for the id
        callbacks.forEach(c => c(pronouns[id]));
    }
});

// Fetches the pronouns for one id, returning a promise that resolves if it was cached, or once the request is completed
export function fetchPronouns(id: string): Promise<PronounCode> {
    return new Promise(res => {
        // If cached, return the cached pronouns
        if (id in cache) res(cache[id]);
        // If there is already a request added, then just add this callback to it
        else if (id in requestQueue) requestQueue[id].push(res);
        // If not already added, then add it and call the debounced function to make sure the request gets executed
        else {
            requestQueue[id] = [res];
            bulkFetch();
        }
    });
}

async function bulkFetchPronouns(ids: string[]): Promise<PronounsResponse> {
    const params = new URLSearchParams();
    params.append("platform", "discord");
    params.append("ids", ids.join(","));
    const req = await fetch("https://pronoundb.org/api/v1/lookup-bulk?" + params, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });
    return await req.json()
        .then((res: PronounsResponse) => {
            for (const [id, pronouns] of Object.entries(res)) {
                cache[id] = pronouns;
            }
            return res;
        })
        .catch(e => {
            // If the request errors, treat it as if no pronouns were found for all ids
            for (const id of ids) cache[id] = "unspecified";
            return Object.fromEntries(ids.map(id => [id, "unspecified"]));
        });
}
