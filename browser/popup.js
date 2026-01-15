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

    document.querySelector("#clear-css").addEventListener("click", async () => {
        if (
            confirm(
                "This will disable QuickCSS, any added themes and will remove all online themes. Do you want to continue?"
            )
        ) {
            const tab = await getDiscordTab();
            await chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                func: () => {
                    const rawSettings = localStorage.getItem("VencordSettings");
                    if (!rawSettings) return;
                    const settings = JSON.parse(rawSettings);
                    settings.useQuickCss = false;
                    localStorage.setItem(
                        "VencordSettings",
                        JSON.stringify(settings)
                    );
                    localStorage.setItem("Vencord_settingsDirty", "true");

                    window.location.reload();
                },
                args: []
            });
        }
    });
    document
        .querySelector("#disable-plugins")
        .addEventListener("click", async () => {
            if (
                confirm(
                    "This will disable all plugins and reload Discord. Do you want to continue?"
                )
            ) {
                const tab = await getDiscordTab();
                await chrome.scripting.executeScript({
                    target: {
                        tabId: tab.id
                    },
                    func: () => {
                        const rawSettings =
                            localStorage.getItem("VencordSettings");
                        if (!rawSettings) return;
                        const settings = JSON.parse(rawSettings);
                        for (const name in settings.plugins) {
                            settings.plugins[name].enabled = false;
                        }
                        localStorage.setItem(
                            "VencordSettings",
                            JSON.stringify(settings)
                        );
                        localStorage.setItem("Vencord_settingsDirty", "true");

                        window.location.reload();
                    },
                    args: []
                });
            }
        });
    document.querySelector("#reset").addEventListener("click", async () => {
        if (
            prompt(
                'This will clear all your Vencord settings in this browser, including plugins, themes and QuickCSS! Make sure that you have a backup before continuing. To continue, type "YES".'
            ) === "YES"
        ) {
            const tab = await getDiscordTab();
            await chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                func: () => {
                    localStorage.removeItem("VencordSettings");
                    localStorage.removeItem("Vencord_settingsDirty");
                    indexedDB.deleteDatabase("VencordData");
                    indexedDB.deleteDatabase("VencordThemes");
                    window.location.reload();
                },
                args: []
            });
        }
    });
    document
        .querySelector("#export-settings")
        .addEventListener("click", async () => {
            const tab = await getDiscordTab();
            await chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                func: async () => {
                    function getVencordQuickCss() {
                        return new Promise((resolve, reject) => {
                            const req = indexedDB.open("VencordData");

                            req.onerror = () => reject(req.error);

                            req.onsuccess = () => {
                                const db = req.result;
                                const tx = db.transaction(
                                    "VencordStore",
                                    "readonly"
                                );
                                const store = tx.objectStore("VencordStore");
                                const getReq = store.get("VencordQuickCss");

                                getReq.onsuccess = () => resolve(getReq.result);
                                getReq.onerror = () => reject(getReq.error);
                            };
                        });
                    }

                    const content = localStorage.getItem("VencordSettings");
                    let quickCss = "";
                    try {
                        quickCss = await getVencordQuickCss();
                    } catch {}

                    if (content) {
                        const filename = `vencord-settings-backup-${
                            new Date().toISOString().split("T")[0]
                        }.json`;

                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(
                            new File(
                                [
                                    new TextEncoder().encode(
                                        JSON.stringify(
                                            {
                                                settings: JSON.parse(content),
                                                quickCss: quickCss || ""
                                            },
                                            null,
                                            4
                                        )
                                    )
                                ],
                                filename,
                                { type: "application/json" }
                            )
                        );
                        a.download = filename;

                        document.body.appendChild(a);
                        a.click();
                        setImmediate(() => {
                            URL.revokeObjectURL(a.href);
                            document.body.removeChild(a);
                        });
                    }
                },
                args: []
            });
        });
    document
        .querySelector("#import-settings")
        .addEventListener("click", async () => {
            const tab = await getDiscordTab();
            await chrome.scripting.executeScript({
                target: {
                    tabId: tab.id
                },
                func: async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (event) => {
                        const file = event.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const content = e.target.result;
                            try {
                                const data = JSON.parse(content);
                                localStorage.setItem(
                                    "VencordSettings",
                                    JSON.stringify(data.settings)
                                );
                                localStorage.setItem(
                                    "Vencord_settingsDirty",
                                    "true"
                                );

                                try {
                                    await new Promise((resolve, reject) => {
                                        const req = indexedDB.open(
                                            "VencordData",
                                            1
                                        );
                                        req.onupgradeneeded = () => {
                                            const db = req.result;
                                            if (
                                                !db.objectStoreNames.contains(
                                                    "VencordStore"
                                                )
                                            ) {
                                                db.createObjectStore(
                                                    "VencordStore"
                                                );
                                            }
                                        };
                                        req.onerror = () => reject(req.error);
                                        req.onsuccess = () => {
                                            const db = req.result;
                                            const tx = db.transaction(
                                                "VencordStore",
                                                "readwrite"
                                            );
                                            const store =
                                                tx.objectStore("VencordStore");
                                            const putReq = store.put(
                                                data.quickCss || "",
                                                "VencordQuickCss"
                                            );
                                            putReq.onsuccess = () => resolve();
                                            putReq.onerror = () =>
                                                reject(putReq.error);
                                            tx.oncomplete = () => db.close();
                                            tx.onerror = () => reject(tx.error);
                                        };
                                    });
                                } catch {}

                                window.location.reload();
                            } catch (error) {
                                alert(
                                    "Failed to import settings. Is this even a Vencord Settings file?"
                                );
                            }
                        };
                        reader.readAsText(file);
                    };
                    input.click();
                },
                args: []
            });
        });
});
