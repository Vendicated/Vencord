/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { stopAll, useIsPlaying } from "@plugins/soundPanel.desktop/audio/player";
import { refreshLibrary } from "@plugins/soundPanel.desktop/data/library";
import { DEFAULT_TRANSPARENCY, glassOpacity, PanelTab, settings } from "@plugins/soundPanel.desktop/settings";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { openUserProfile } from "@utils/discord";
import type { Channel, User } from "@vencord/discord-types";
import { ContextMenuApi, Menu, useEffect, UserStore, UserUtils, useState, useStateFromStores } from "@webpack/common";
import type { CSSProperties } from "react";

import { cl, useGlassMenu } from "./common";
import { StopIcon, TransparencyIcon } from "./icons";
import { MusicTab } from "./MusicTab";
import { MySoundsTab } from "./MySoundsTab";
import { OutputControls, useTransmitStatus } from "./OutputControls";
import { ServerSoundsTab } from "./ServerSoundsTab";

const AUTHOR = { id: "453743721402466317", username: "c3g" };

const TABS: { id: PanelTab; label: string; }[] = [
    { id: "server", label: "Soundboard" },
    { id: "sounds", label: "My Sounds" },
    { id: "music", label: "Music" }
];

function useAuthor() {
    const cached = useStateFromStores([UserStore], () => UserStore.getUser(AUTHOR.id));
    const [fetched, setFetched] = useState<User | null>(null);

    useEffect(() => {
        if (cached) return;

        let mounted = true;
        UserUtils.getUser(AUTHOR.id).then(user => mounted && setFetched(user), () => { });
        return () => { mounted = false; };
    }, [cached]);

    return cached ?? fetched;
}

function AuthorCredit() {
    const author = useAuthor();

    return (
        <button
            type="button"
            className={cl("credit")}
            title="Open profile"
            onClick={() => openUserProfile(AUTHOR.id).catch(err => showError("Couldn't open the profile", err))}
        >
            {author
                ? <img className={cl("credit-avatar")} src={author.getAvatarURL(undefined, 64)} alt="" />
                : <span className={cl("credit-avatar")} />}
            <span className={cl("credit-text")}>Made by @{author?.username ?? AUTHOR.username}</span>
        </button>
    );
}

function TransparencyMenu() {
    const { transparency } = settings.use(["transparency"]);
    const glass = useGlassMenu();

    return (
        <Menu.Menu navId="vc-soundpanel-transparency" onClose={ContextMenuApi.closeContextMenu} aria-label="Panel transparency" {...glass}>
            <Menu.MenuControlItem
                id="vc-soundpanel-transparency"
                label="Transparency"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        minValue={0}
                        maxValue={100}
                        value={transparency}
                        onChange={(value: number) => settings.store.transparency = Math.round(value)}
                        renderValue={(value: number) => `${Math.round(value)}%`}
                    />
                )}
            />
            <Menu.MenuItem
                id="vc-soundpanel-transparency-reset"
                label="Reset Transparency"
                disabled={transparency === DEFAULT_TRANSPARENCY}
                action={() => settings.store.transparency = DEFAULT_TRANSPARENCY}
            />
        </Menu.Menu>
    );
}

function SoundPanelPopout({ channel }: { channel?: Channel; }) {
    const { activeTab, transparency } = settings.use(["activeTab", "transparency"]);
    const isPlaying = useIsPlaying();
    const status = useTransmitStatus(channel);
    const live = status.level === "live";
    const tabIndex = Math.max(0, TABS.findIndex(tab => tab.id === activeTab));

    useEffect(() => {
        void refreshLibrary();
    }, []);

    return (
        <div
            className={cl("popout", { live, "on-air": live && isPlaying, solid: transparency === 0 })}
            style={{ "--vc-soundpanel-opacity": glassOpacity(transparency) } as CSSProperties}
            role="dialog"
            aria-label="Sound Panel"
        >
            <header className={cl("header")}>
                <div className={cl("title-row")}>
                    <h2 className={cl("title")}>Sound Panel</h2>
                    <AuthorCredit />
                    {isPlaying && (
                        <button type="button" className={cl("stop-all")} onClick={stopAll}>
                            <StopIcon size={14} />
                            Stop all
                        </button>
                    )}
                    <button
                        type="button"
                        className={cl("icon-button", "transparency-button")}
                        aria-label="Transparency"
                        title="Transparency"
                        onClick={e => ContextMenuApi.openContextMenu(e, () => <TransparencyMenu />)}
                    >
                        <TransparencyIcon size={18} />
                    </button>
                </div>
                <nav className={cl("tabs")} role="tablist" style={{ "--vc-soundpanel-tab": tabIndex } as CSSProperties}>
                    <span className={cl("tab-thumb")} aria-hidden="true" />
                    {TABS.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === id}
                            className={cl("tab-button", { "tab-button-active": activeTab === id })}
                            onClick={() => settings.store.activeTab = id}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
            </header>

            <div className={cl("body")}>
                {activeTab === "sounds" ? <MySoundsTab />
                    : activeTab === "music" ? <MusicTab />
                        : <ServerSoundsTab channel={channel} />}
            </div>

            <OutputControls status={status} />
        </div>
    );
}

export default ErrorBoundary.wrap(SoundPanelPopout, { noop: false });
