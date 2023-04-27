const CORS_PROXY = "https://corsproxy.io?";

function corsUrl(url: string | URL) {
    return CORS_PROXY + encodeURIComponent(url.toString());
}

export function corsFetch(url, ...args) {
    return fetch(corsUrl(url), ...args);
}