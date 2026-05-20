/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import { fetchThemesCatalog } from "../api";
import { installTheme, isThemeInstalled, uninstallTheme } from "../themeInstall";
import type { BDTheme } from "../types";
import { BD_THEME_STORE } from "../types";
import "../styles.css";

import { classNameFactory } from "@utils/css";
import { Button, Forms, React, useEffect, useMemo, useState } from "@webpack/common";
import { showToast, Toasts } from "@webpack/common";

const cl = classNameFactory("vc-oti-");

export interface ThemeBrowserProps {
    fetchHtml: (url: string) => Promise<string>;
}

function filterThemes(themes: BDTheme[], query: string): BDTheme[] {
    const q = query.trim().toLowerCase();
    if (!q) return themes;

    return themes.filter(theme => {
        const haystack = [
            theme.name,
            theme.author,
            theme.description,
            theme.tags.join(" "),
        ].join(" ").toLowerCase();

        return haystack.includes(q);
    });
}

function sortInstalledFirst(themes: BDTheme[]): BDTheme[] {
    return [...themes].sort((a, b) => {
        const aInstalled = isThemeInstalled(a);
        const bInstalled = isThemeInstalled(b);
        if (aInstalled === bInstalled) return 0;
        return aInstalled ? -1 : 1;
    });
}

export function ThemeBrowser({ fetchHtml }: ThemeBrowserProps) {
    const [themes, setThemes] = useState<BDTheme[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [installingId, setInstallingId] = useState<number | null>(null);
    const [installedRevision, setInstalledRevision] = useState(0);

    const refreshInstalled = () => setInstalledRevision(n => n + 1);

    const loadCatalog = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchThemesCatalog(fetchHtml);
            setThemes(list);
            if (!list.length) {
                setError("No themes found. The BetterDiscord store page layout may have changed.");
            }
        } catch (e) {
            console.error("[OnlineThemeInstaller]", e);
            setError(e instanceof Error ? e.message : "Failed to load themes from BetterDiscord.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadCatalog();
    }, []);

    const filtered = useMemo(
        () => sortInstalledFirst(filterThemes(themes, search)),
        [themes, search, installedRevision]
    );

    const handleInstall = async (theme: BDTheme) => {
        if (isThemeInstalled(theme)) {
            uninstallTheme(theme);
            refreshInstalled();
            showToast(`Removed "${theme.name}"`, Toasts.Type.MESSAGE);
            return;
        }

        setInstallingId(theme.id);
        try {
            const result = await installTheme(theme, fetchHtml);
            refreshInstalled();
            if (result.localFile) {
                showToast(
                    `Installed "${theme.name}" as a local theme (${result.localFile})`,
                    Toasts.Type.SUCCESS
                );
            } else {
                showToast(
                    `Installed "${theme.name}" — ${result.urls.length} stylesheet URL(s) added to Online Themes`,
                    Toasts.Type.SUCCESS
                );
            }
        } catch (e) {
            console.error("[OnlineThemeInstaller]", e);
            showToast(
                e instanceof Error ? e.message : "Failed to install theme",
                Toasts.Type.FAILURE
            );
        } finally {
            setInstallingId(null);
        }
    };

    const openStore = () => VencordNative.native.openExternal(BD_THEME_STORE);

    if (loading) {
        return <div className={cl("loading")}>Loading themes…</div>;
    }

    if (error && !themes.length) {
        return (
            <div className={cl("root")}>
                <div className={cl("error")}>{error}</div>
                <Button onClick={() => void loadCatalog()}>Retry</Button>
            </div>
        );
    }

    return (
        <div className={cl("root")}>
            <Forms.FormText className={cl("intro")}>
                Themes from the{" "}
                <a onClick={openStore} style={{ cursor: "pointer" }}>BetterDiscord store</a>.
            </Forms.FormText>

            <div className={cl("toolbar")}>
                <input
                    type="search"
                    className={cl("search-input")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search themes…"
                    spellCheck={false}
                />
                <Button size={Button.Sizes.SMALL} onClick={() => void loadCatalog()}>
                    Refresh
                </Button>
                <span className={cl("meta")}>
                    {filtered.length} / {themes.length}
                </span>
            </div>

            {error && <div className={cl("error")}>{error}</div>}

            {!filtered.length ? (
                <div className={cl("empty")}>No themes match your search.</div>
            ) : (
                <div className={cl("list")}>
                    {filtered.map(theme => {
                        const installed = isThemeInstalled(theme);
                        const busy = installingId === theme.id;
                        return (
                            <div key={theme.id} className={cl("row")}>
                                <div className={cl("text")}>
                                    <div className={cl("name")}>{theme.name}</div>
                                    <div className={cl("desc")}>
                                        {theme.description || "No description provided."}
                                    </div>
                                </div>
                                <Button
                                    size={Button.Sizes.SMALL}
                                    color={installed ? Button.Colors.RED : Button.Colors.BRAND}
                                    disabled={busy}
                                    onClick={() => void handleInstall(theme)}
                                >
                                    {busy ? "…" : installed ? "Remove" : "Install"}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
