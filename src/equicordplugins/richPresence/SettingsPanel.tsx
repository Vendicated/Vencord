/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Switch } from "@components/Switch";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { promptToRestart } from "@utils/promptToRestart";
import { Select, showToast, Slider, TabBar, TextInput, useState } from "@webpack/common";

import { settings, SettingsStore } from "./settings";
import { NameFormat, ServiceTab } from "./types";

type SettingsKey = keyof SettingsStore;

function SwitchSetting({ name, description, settingsKey }: { name: string; description: string; settingsKey: SettingsKey; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? false);
    return (
        <SettingsSection tag="label" inlineSetting id={name} name={name} description={description}>
            <Switch
                checked={Boolean(value)}
                onChange={v => { setValue(v); (settings.store[settingsKey] as boolean) = v; }}
            />
        </SettingsSection>
    );
}

function TextSetting({ name, description, settingsKey, placeholder }: { name: string; description: string; settingsKey: SettingsKey; placeholder?: string; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? "");
    return (
        <SettingsSection id={name} name={name} description={description}>
            <TextInput
                type="text"
                value={String(value)}
                onChange={v => { setValue(v); (settings.store[settingsKey] as string) = v; }}
                placeholder={placeholder ?? "Enter a value"}
            />
        </SettingsSection>
    );
}

function AllowServerSetting({ settingsKey }: { settingsKey: SettingsKey; }) {
    if (IS_WEB) return null;

    const allow = async () => {
        const url = String(settings.store[settingsKey] ?? "");
        const res = await VencordNative.csp.requestAddOverride(/^https?:\/\//.test(url) ? url : `https://${url}`, ["connect-src"], "RichPresence");
        if (res === "ok") promptToRestart("relaunch");
        else if (res !== "cancelled") showToast({ text: res === "conflict" ? "This server is already allowed." : "Could not allow this server.", variant: "critical" });
    };

    return (
        <SettingsSection id={`${settingsKey}-allow`} name="Allow Server" description="Equicord can only connect to servers you allow. A restart is needed afterwards.">
            <Button size="small" variant="secondary" onClick={allow}>Allow Server</Button>
        </SettingsSection>
    );
}

function SelectSetting({ name, description, settingsKey, options }: { name: string; description: string; settingsKey: SettingsKey; options: { label: string; value: string | number; }[]; }) {
    const [value, setValue] = useState(settings.store[settingsKey] ?? options[0]?.value);
    return (
        <SettingsSection id={name} name={name} description={description}>
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
            <SettingsSection id="audiobookshelf-settings" name="" description="Display your currently playing audiobooks as Discord Rich Presence. Requires your AudioBookShelf server URL, username, and password." />
            <TextSetting name="Server URL" description="AudioBookShelf server URL." settingsKey="abs_serverUrl" placeholder="https://abs.example.com" />
            <AllowServerSetting settingsKey="abs_serverUrl" />
            <TextSetting name="Username" description="AudioBookShelf username." settingsKey="abs_username" />
            <TextSetting name="Password" description="AudioBookShelf password." settingsKey="abs_password" />
        </>
    );
}

function TosuSettings() {
    return (
        <SettingsSection id="tosu-settings" name="" description="Connects to tosu via WebSocket on port 24050. No configuration needed, just make sure tosu is running alongside osu!." />
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
            <SettingsSection id="statsfm-settings" name="" description="Show what you're currently listening to via stats.fm. Requires your listening history to be public." />
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
            <SettingsSection id="jellyfin-settings" name="" description="Show what you're playing on Jellyfin. To get your API key: open your Jellyfin web UI, press F12 to open Developer Tools, go to the Network tab, look for requests to your server, find the Authorization header (Ctrl+F to search), and You need the part from Token='this'. Your user ID can be found in your profile page URL." />
            <TextSetting name="Server URL" description="Jellyfin server URL." settingsKey="jf_serverUrl" placeholder="https://jellyfin.example.com" />
            <AllowServerSetting settingsKey="jf_serverUrl" />
            <TextSetting name="API Key" description="Jellyfin API key." settingsKey="jf_apiKey" placeholder="Authorization" />
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

function GensokyoRadioSettings() {
    const [value, setValue] = useState(settings.store.gr_refreshInterval ?? 15);
    return (
        <>
            <SettingsSection id="gensokyoradio-settings" name="" description="Discord rich presence for Gensokyo Radio. Just enable it and listen!" />
            <SettingsSection id="refresh-interval" name="Refresh Interval" description="Refresh interval in seconds.">
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

const ND_DYNAMIC_KEYS: SettingsKey[] = ["nd_activityType", "nd_albumArtMode"];

function NavidromeSettings() {
    const [refreshInterval, setRefreshInterval] = useState(settings.store.nd_refreshInterval ?? 10);
    const { nd_activityType, nd_albumArtMode } = settings.use(ND_DYNAMIC_KEYS);
    return (
        <>
            <SettingsSection id="navidrome-settings" name="" description="Show what you're currently listening to via Navidrome." />
            <TextSetting name="Server URL" description="Navidrome Server URL (must be a public domain, e.g. https://navidrome.example.com)." settingsKey="nd_serverUrl" placeholder="https://navidrome.example.com" />
            <AllowServerSetting settingsKey="nd_serverUrl" />
            <TextSetting name="Username" description="Navidrome username." settingsKey="nd_username" />
            <TextSetting name="Password" description="Navidrome password." settingsKey="nd_password" />
            <TextSetting name="Client ID" description="Optional Discord Application Client ID." settingsKey="nd_clientId" placeholder="1470554657506984069" />
            <SelectSetting name="Album Art Mode" description="How to fetch album art." settingsKey="nd_albumArtMode" options={[
                { label: "None", value: "none" },
                { label: "Navidrome Instance (Exposes Server URL. One-time auth sent.)", value: "instance" },
                { label: "Last.fm API (Sends Metadata to last.fm)", value: "lastfm" },
            ]} />
            {nd_albumArtMode === "lastfm" && (
                <TextSetting name="Last.fm API Key" description="Optional: Provide your own Last.fm API Key (leaves default if empty)." settingsKey="nd_lastfmApiKey" placeholder="feff915bf5987580c9dc354d523dc6b9" />
            )}
            <SwitchSetting name="Show Small Image" description="Show Navidrome logo in bottom right of album art." settingsKey="nd_showSmallImage" />
            <SwitchSetting name="Show Album" description="Show album name in presence." settingsKey="nd_showAlbum" />
            <SelectSetting name="Activity Type" description="Which type of activity to display." settingsKey="nd_activityType" options={[
                { label: "Listening", value: 2 },
                { label: "Playing", value: 0 },
                { label: "Watching", value: 3 }
            ]} />
            <SelectSetting name="Status Display Type" description="Show the state / details line contents in the member list" settingsKey="nd_statusDisplayType" options={[
                { label: "Don't show (shows generic listening message)", value: "off" },
                { label: "Show state line content", value: "artist" },
                { label: "Show details line content", value: "track" }
            ]} />
            <SwitchSetting name="Hide On Pause" description="Hide Rich Presence when music is paused (instead of showing a stopwatch)" settingsKey="nd_hideOnPause" />
            {Number(nd_activityType ?? 2) !== 0 && (
                <TextSetting name="Activity Name Format" description="The 'Listening to' text (e.g. {artist})" settingsKey="nd_nameString" placeholder="Navidrome" />
            )}
            <TextSetting name="Details Format" description="The main line showing what song is playing (e.g. {song})" settingsKey="nd_detailsString" placeholder="{song}" />
            <TextSetting name="State Format" description="The line below the song name (e.g. {artist})" settingsKey="nd_stateString" placeholder="{artist}" />
            <TextSetting name="Large Text Format" description="The album line (e.g. {album})" settingsKey="nd_largeTextString" placeholder="{album}" />
            <SettingsSection id="nd-refresh-interval" name="Refresh Interval" description="Refresh interval in seconds.">
                <Slider
                    markers={[1, 2, 5, 10, 15]}
                    initialValue={refreshInterval}
                    onValueChange={v => { setRefreshInterval(v); settings.store.nd_refreshInterval = v; }}
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
    [ServiceTab.GensokyoRadio]: GensokyoRadioSettings,
    [ServiceTab.Navidrome]: NavidromeSettings,
};

const TAB_LABELS: Record<ServiceTab, string> = {
    [ServiceTab.AudioBookShelf]: "AudioBookShelf",
    [ServiceTab.Tosu]: "osu!",
    [ServiceTab.StatsFm]: "stats.fm",
    [ServiceTab.Jellyfin]: "Jellyfin",
    [ServiceTab.GensokyoRadio]: "Gensokyo Radio",
    [ServiceTab.Navidrome]: "Navidrome",
};

const ENABLE_KEYS: Record<ServiceTab, SettingsKey> = {
    [ServiceTab.AudioBookShelf]: "abs_enabled",
    [ServiceTab.Tosu]: "tosu_enabled",
    [ServiceTab.StatsFm]: "sfm_enabled",
    [ServiceTab.Jellyfin]: "jf_enabled",
    [ServiceTab.GensokyoRadio]: "gr_enabled",
    [ServiceTab.Navidrome]: "nd_enabled",
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
