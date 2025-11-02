const api = globalThis.browser || globalThis.chrome;

document.addEventListener("DOMContentLoaded", async () => {
    const metadata = await fetch(api.runtime.getURL("metadata.json")).then(
        (r) => r.json()
    );

    document.querySelector("#logo").src = api.runtime.getURL("icon.png");
    document.querySelector(
        "#local-version"
    ).textContent = `v${metadata.version}`;
    document.querySelector("#view-source").href = metadata.remote;
    const commitUrlElement = document.querySelector("#commit-url");
    commitUrlElement.textContent = metadata.gitHash;
    commitUrlElement.href = `${metadata.remote}/commit/${metadata.gitHash}`;
});
