const CORS_PROXY = "https://corsproxy.io?";

function corsUrl(url: string | URL) {
    return CORS_PROXY + encodeURIComponent(url.toString());
}

export function corsFetch(url, ...args) {
    return fetch(corsUrl(url), ...args);
}

export class Mutex {
    current = Promise.resolve();
    lock() {
        let _resolve: () => void;
        const p = new Promise(resolve => {
            _resolve = () => resolve();
        }) as Promise<void>;
        // Caller gets a promise that resolves when the current outstanding
        // lock resolves
        const rv = this.current.then(() => _resolve);
        // Don't allow the next request until the new promise is done
        this.current = p;
        // Return the new promise
        return rv;
    }
}