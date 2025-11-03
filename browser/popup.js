const api = globalThis.browser || globalThis.chrome;

async function getDiscordTab() {
    let [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    });
    if (!tab.url) return undefined; // not a discord tab since it doesn't have the permissions
    return tab;
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("#logo").src = api.runtime.getURL("icon-popup.webp");

    const metadata = await fetch(api.runtime.getURL("metadata.json")).then(
        (r) => r.json()
    );

    document.querySelector(
        "#local-version"
    ).textContent = `v${metadata.version}`;
    document.querySelector("#view-source").href = metadata.remote;
    const commitUrlElement = document.querySelector("#commit-url");
    commitUrlElement.textContent = `(${metadata.gitHash})`;
    commitUrlElement.href = `${metadata.remote}/commit/${metadata.gitHash}`;

    if (!(await getDiscordTab())) document.querySelector(".buttons").remove();
});
