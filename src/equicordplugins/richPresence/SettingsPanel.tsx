/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Switch } from "@components/Switch";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Select, Slider, TabBar, TextInput, useState } from "@webpack/common";

import { onServiceChange, settings, SettingsStore } from "./settings";
import { NameFormat, ServiceTab } from "./types";

type SettingsKey = keyof SettingsStore;

function SwitchSetting({ name, description, settingsKey }: { name: string; description: string; settingsKey: SettingsKey; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? false);
    return (
        <SettingsSection tag="label" name={name} description={description} inlineSetting>
            <Switch checked={!!value} onChange={v => { setValue(v); (settings.store[settingsKey] as boolean) = v; onServiceChange?.(); }} />
        </SettingsSection>
    );
}

function TextSetting({ name, description, settingsKey, placeholder }: { name: string; description: string; settingsKey: SettingsKey; placeholder?: string; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? "");
    return (
        <SettingsSection name={name} description={description}>
            <TextInput
                type="text"
                value={String(value)}
                onChange={v => { setValue(v); (settings.store[settingsKey] as string) = v; }}
                placeholder={placeholder ?? "Enter a value"}
            />
        </SettingsSection>
    );
}

function SelectSetting({ name, description, settingsKey, options }: { name: string; description: string; settingsKey: SettingsKey; options: { label: string; value: string; }[]; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? options[0]?.value);
    return (
        <SettingsSection name={name} description={description}>
            <Select
                options={options}
                isSelected={v => v === value}
                select={v => { setValue(v); (settings.store[settingsKey] as string) = v; }}
                serialize={String}
                closeOnSelect
                maxVisibleItems={5}
            />
        </SettingsSection>
    );
}

function AudioBookShelfSettings() {
    return (
        <>
            <SettingsSection name="" description="Display your currently playing audiobooks as Discord Rich Presence. Requires your AudioBookShelf server URL, username, and password." />
            <TextSetting name="Server URL" description="AudioBookShelf server URL." settingsKey="abs_serverUrl" placeholder="https://abs.example.com" />
            <TextSetting name="Username" description="AudioBookShelf username." settingsKey="abs_username" />
            <TextSetting name="Password" description="AudioBookShelf password." settingsKey="abs_password" />
        </>
    );
}

function TosuSettings() {
    return (
        <SettingsSection name="" description="Connects to tosu via WebSocket on port 24050. No configuration needed, just make sure tosu is running alongside osu!." />
    );
}

const nameFormatOptions = [
    { label: "Use custom status name", value: NameFormat.StatusName },
    { label: "Use format 'artist - song'", value: NameFormat.ArtistFirst },
    { label: "Use format 'song - artist'", value: NameFormat.SongFirst },
    { label: "Use artist name only", value: NameFormat.ArtistOnly },
    { label: "Use song name only", value: NameFormat.SongOnly },
    { label: "Use album name", value: NameFormat.AlbumName },
];

function StatsFmSettings() {
    return (
        <>
            <SettingsSection name="" description="Show what you're currently listening to via stats.fm. Requires your listening history to be public." />
            <TextSetting name="Username" description="Stats.fm username." settingsKey="sfm_username" placeholder="stats.fm username" />
            <TextSetting name="Custom Status Text" description="Custom status text." settingsKey="sfm_statusName" placeholder="Stats.fm" />
            <SelectSetting name="Name Format" description="Name format." settingsKey="sfm_nameFormat" options={nameFormatOptions} />
            <SelectSetting name="Missing Art Fallback" description="Fallback when art is missing." settingsKey="sfm_missingArt" options={[
                { label: "Use large Stats.fm logo", value: "StatsFmLogo" },
                { label: "Use generic placeholder", value: "placeholder" },
            ]} />
            <SwitchSetting name="Show Listening Status" description="Show listening status." settingsKey="sfm_useListeningStatus" />
            <SwitchSetting name="Show Stats.fm Logo" description="Show Stats.fm logo next to album art." settingsKey="sfm_showLogo" />
            <SwitchSetting name="Show Profile Link" description="Show link to stats.fm profile." settingsKey="sfm_shareUsername" />
            <SwitchSetting name="Show Song Link" description="Show link to song on stats.fm." settingsKey="sfm_shareSong" />
            <SwitchSetting name="Hide With Spotify" description="Hide stats.fm presence if Spotify is running." settingsKey="sfm_hideWithSpotify" />
            <SwitchSetting name="Hide With External RPC" description="Hide stats.fm presence if an external RPC is running." settingsKey="sfm_hideWithExternalRPC" />
            <SwitchSetting name="Disable Album Art" description="Disable downloading album art." settingsKey="sfm_alwaysHideArt" />
        </>
    );
}

function JellyfinSettings() {
    return (
        <>
            <SettingsSection name="" description="Show what you're playing on Jellyfin. To get your API key: open your Jellyfin web UI, press F12 to open Developer Tools, go to the Network tab, look for requests to your server, and find the X-MediaBrowser-Token header (Ctrl+F to search). Your user ID can be found in your profile page URL." />
            <TextSetting name="Server URL" description="Jellyfin server URL." settingsKey="jf_serverUrl" placeholder="https://jellyfin.example.com" />
            <TextSetting name="API Key" description="Jellyfin API key." settingsKey="jf_apiKey" placeholder="X-MediaBrowser-Token" />
            <TextSetting name="User ID" description="Jellyfin user ID." settingsKey="jf_userId" placeholder="User ID from profile URL" />
            <SelectSetting name="Name Display" description="Name display format." settingsKey="jf_nameDisplay" options={[
                { label: "Series/Movie Name", value: "default" },
                { label: "Series - Episode/Track/Movie Name", value: "full" },
                { label: "Custom", value: "custom" },
            ]} />
            <TextSetting name="Custom Name Template" description="Custom name template." settingsKey="jf_customName" placeholder="{name} on Jellyfin" />
            <SelectSetting name="Cover Type" description="Cover type for TV shows." settingsKey="jf_coverType" options={[
                { label: "Series Cover", value: "series" },
                { label: "Episode Cover", value: "episode" },
            ]} />
            <SelectSetting name="Episode Format" description="Episode number format." settingsKey="jf_episodeFormat" options={[
                { label: "S01E01", value: "long" },
                { label: "1x01", value: "short" },
                { label: "Season 1 Episode 1", value: "fulltext" },
            ]} />
            <SelectSetting name="Override Presence Type" description="Override rich presence type." settingsKey="jf_overrideType" options={[
                { label: "Off", value: "off" },
                { label: "Listening", value: "2" },
                { label: "Playing", value: "0" },
                { label: "Streaming", value: "1" },
                { label: "Watching", value: "3" },
            ]} />
            <SwitchSetting name="Show Episode Name" description="Show episode name after season/episode info." settingsKey="jf_showEpisodeName" />
            <SwitchSetting name="Show When Paused" description="Show presence when media is paused." settingsKey="jf_showPausedState" />
            <SwitchSetting name="Privacy Mode" description="Hide media details." settingsKey="jf_privacyMode" />
        </>
    );
}

function ListenBrainzSettings() {
    return (
        <>
            <SettingsSection name="" description="Show what you're currently listening to via ListenBrainz. The MusicBrainz API requires a meaningful user agent string (an email usually works)." />
            <TextSetting name="Username" description="ListenBrainz username." settingsKey="lb_username" placeholder="ListenBrainz username" />
            <TextSetting name="MusicBrainz Contact" description="MusicBrainz contact for user agent." settingsKey="lb_mbContact" placeholder="your@email.com" />
            <TextSetting name="Custom Status Text" description="Custom status text." settingsKey="lb_statusName" placeholder="some music" />
            <SelectSetting name="Name Format" description="Name format." settingsKey="lb_nameFormat" options={nameFormatOptions} />
            <SelectSetting name="Missing Art Fallback" description="Fallback when art is missing." settingsKey="lb_missingArt" options={[
                { label: "Use large ListenBrainz logo", value: "listenbrainzLogo" },
                { label: "Use generic placeholder", value: "placeholder" },
            ]} />
            <SwitchSetting name="Show Listening Status" description="Show listening status." settingsKey="lb_useListeningStatus" />
            <SwitchSetting name="Show Time Bar" description="Use track duration to display a time bar." settingsKey="lb_useTimeBar" />
            <SwitchSetting name="Show ListenBrainz Logo" description="Show ListenBrainz logo on album art." settingsKey="lb_useLogo" />
            <SwitchSetting name="Show Profile Link" description="Show link to ListenBrainz profile." settingsKey="lb_shareUsername" />
            <SwitchSetting name="Show Song Link" description="Show link to song on ListenBrainz." settingsKey="lb_shareSong" />
            <SwitchSetting name="Hide With Spotify" description="Hide presence if Spotify is running." settingsKey="lb_hideWithSpotify" />
            <SwitchSetting name="Hide With Any Activity" description="Hide presence if any other presence exists." settingsKey="lb_hideWithActivity" />
        </>
    );
}

function GensokyoRadioSettings() {
    const [value, setValue] = useState(settings.store.gr_refreshInterval ?? 15);
    return (
        <>
            <SettingsSection name="" description="Discord rich presence for Gensokyo Radio. Just enable it and listen!" />
            <SettingsSection name="Refresh Interval" description="Refresh interval in seconds.">
            <Slider
                markers={[1, 2, 2.5, 3, 5, 10, 15]}
                initialValue={value}
                onValueChange={v => { setValue(v); settings.store.gr_refreshInterval = v; }}
                onValueRender={v => `${v}s`}
                stickToMarkers
            />
        </SettingsSection>
        </>
    );
}

const TAB_COMPONENTS: Record<ServiceTab, React.ComponentType> = {
    [ServiceTab.AudioBookShelf]: AudioBookShelfSettings,
    [ServiceTab.Tosu]: TosuSettings,
    [ServiceTab.StatsFm]: StatsFmSettings,
    [ServiceTab.Jellyfin]: JellyfinSettings,
    [ServiceTab.ListenBrainz]: ListenBrainzSettings,
    [ServiceTab.GensokyoRadio]: GensokyoRadioSettings,
};

const TAB_LABELS: Record<ServiceTab, string> = {
    [ServiceTab.AudioBookShelf]: "AudioBookShelf",
    [ServiceTab.Tosu]: "osu!",
    [ServiceTab.StatsFm]: "stats.fm",
    [ServiceTab.Jellyfin]: "Jellyfin",
    [ServiceTab.ListenBrainz]: "ListenBrainz",
    [ServiceTab.GensokyoRadio]: "Gensokyo Radio",
};

const ENABLE_KEYS: Record<ServiceTab, SettingsKey> = {
    [ServiceTab.AudioBookShelf]: "abs_enabled",
    [ServiceTab.Tosu]: "tosu_enabled",
    [ServiceTab.StatsFm]: "sfm_enabled",
    [ServiceTab.Jellyfin]: "jf_enabled",
    [ServiceTab.ListenBrainz]: "lb_enabled",
    [ServiceTab.GensokyoRadio]: "gr_enabled",
};

const TABS = Object.values(ServiceTab);

export function SettingsPanel() {
    const [currentTab, setCurrentTab] = useState(ServiceTab.AudioBookShelf);
    const TabComponent = TAB_COMPONENTS[currentTab];

    return (
        <div className={classes("vc-plugins-settings", Margins.top16)}>
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                {TABS.map(tab => (
                    <TabBar.Item key={tab} id={tab}>
                        {TAB_LABELS[tab]}
                    </TabBar.Item>
                ))}
            </TabBar>
            <SwitchSetting key={currentTab} name="Enabled" description={`Enable ${TAB_LABELS[currentTab]} presence.`} settingsKey={ENABLE_KEYS[currentTab]} />
            <TabComponent />
        </div>
    );
}
