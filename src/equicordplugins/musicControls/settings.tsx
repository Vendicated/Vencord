/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { ButtonCompat } from "@components/Button";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { makeRange, OptionType } from "@utils/types";
import { MaskedLink, Select, showToast, TextInput, Toasts } from "@webpack/common";

import hoverOnlyStyle from "./hoverOnly.css?managed";
import { clearLyricsCache, removeTranslations } from "./spotify/lyrics/api";
import languages from "./spotify/lyrics/providers/translator/languages";
import { Provider } from "./spotify/lyrics/providers/types";

const sliderOptions = {
    markers: makeRange(-2500, 2500, 250),
    stickToMarkers: true,
};

export function toggleHoverControls(value: boolean) {
    (value ? enableStyle : disableStyle)(hoverOnlyStyle);
}

function InstallInstructions() {
    return (
        <section>
            <HeadingSecondary>How to install</HeadingSecondary>
            <Paragraph>
                Install <MaskedLink href="https://github.com/Inrixia/TidaLuna#installation">TidaLuna</MaskedLink> from here, then go to TidalLuna settings &rarr; Plugin stores &rarr; Install <code>@vmohammad/api</code>
            </Paragraph>
        </section>
    );
}

function LyricsProviderSettings() {
    const { store } = settings;

    return (
        <>
            <SettingsSection name="Lyrics Provider" description="Where lyrics are fetched from.">
                <Select
                    options={[
                        { value: Provider.Lrclib, label: "LRCLIB", default: true },
                        { value: Provider.Spotify, label: "Spotify (Musixmatch)" },
                    ]}
                    isSelected={v => v === store.lyricsProvider}
                    select={v => { store.lyricsProvider = v as Provider; }}
                    serialize={v => v}
                    placeholder="Select a lyrics provider"
                />
            </SettingsSection>

            {store.lyricsProvider === Provider.Spotify && (
                <SettingsSection
                    name="Spotify Lyrics API Base URL"
                    description="Custom instance base URL (for example: http://localhost:8080)."
                >
                    <TextInput
                        type="text"
                        value={store.spotifyLyricsApiUrl}
                        onChange={v => {
                            store.spotifyLyricsApiUrl = v;
                            void clearLyricsCache();
                            showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                        }}
                        placeholder="https://spotify-lyrics-api-pi.vercel.app"
                        maxLength={null}
                    />
                </SettingsSection>
            )}
        </>
    );
}

export const settings = definePluginSettings({
    hoverControls: {
        description: "Show controls on hover",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: v => toggleHoverControls(v)
    },
    showMusicNoteOnNoLyrics: {
        description: "Show a music note icon when no lyrics are found",
        type: OptionType.BOOLEAN,
        default: true,
    },
    lyricsPosition: {
        description: "Position of the lyrics",
        type: OptionType.SELECT,
        options: [
            { value: "above", label: "Above Player(s)" },
            { value: "below", label: "Below  Player(s)", default: true },
        ],
    },
    lyricsProvider: {
        description: "Where lyrics are fetched from",
        type: OptionType.SELECT,
        options: [
            { value: Provider.Lrclib, label: "LRCLIB", default: true },
            { value: Provider.Spotify, label: "Spotify (Musixmatch)" },
        ],
        hidden: true,
    },
    spotifyLyricsApiUrl: {
        type: OptionType.STRING,
        description: "Spotify lyrics API base URL.",
        hidden: true,
        default: "https://spotify-lyrics-api-pi.vercel.app",
        onChange: async () => {
            await clearLyricsCache();
            showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
        }
    },
    lyricsProviderSettings: {
        type: OptionType.COMPONENT,
        component: LyricsProviderSettings,
    },
    translateTo: {
        description: "Translate lyrics to - Changing this will clear existing translations",
        type: OptionType.SELECT,
        options: languages,
        onChange: async () => {
            await removeTranslations();
            showToast("Translations cleared", Toasts.Type.SUCCESS);
        }
    },
    lyricsConversion: {
        description: "Automatically translate or romanize lyrics",
        type: OptionType.SELECT,
        options: [
            { value: Provider.None, label: "None", default: true },
            { value: Provider.Translated, label: "Translate" },
            { value: Provider.Romanized, label: "Romanize" },
        ]
    },
    fallbackProvider: {
        description: "When a lyrics provider fails, try other providers",
        type: OptionType.BOOLEAN,
        default: true,
    },
    showFailedToasts: {
        description: "Hide toasts when lyrics fail to fetch",
        type: OptionType.BOOLEAN,
        default: true,
    },
    lyricDelay: {
        description: "",
        type: OptionType.SLIDER,
        default: 0,
        ...sliderOptions
    },
    purgeLyricsCache: {
        description: "Purge the lyrics cache",
        type: OptionType.COMPONENT,
        component: () => (
            <ButtonCompat
                color={ButtonCompat.Colors.RED}
                onClick={() => {
                    clearLyricsCache();
                    showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                }}
            >
                Purge Cache
            </ButtonCompat>
        ),
    },
    spotifySectionTitle: {
        type: OptionType.COMPONENT,
        component: () => (
            <section>
                <HeadingSecondary>Spotify</HeadingSecondary>
            </section>
        )
    },
    showSpotifyControls: {
        description: "Show Spotify Controls",
        type: OptionType.BOOLEAN,
        default: false,
    },
    showSpotifyLyrics: {
        description: "Show Spotify Lyrics",
        type: OptionType.BOOLEAN,
        default: false,
    },
    useSpotifyUris: {
        type: OptionType.BOOLEAN,
        description: "Open Spotify URIs instead of Spotify URLs. Will only work if you have Spotify installed and might not work on all platforms",
        default: false
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Restart currently playing track when pressing the previous button if playtime is >3s",
        default: true
    },

    tdalSectionTitle: {
        type: OptionType.COMPONENT,
        component: () => (
            <section>
                <HeadingSecondary>Tidal</HeadingSecondary>
            </section>
        )
    },
    installTidalWithWS: {
        type: OptionType.COMPONENT,
        component: () => <InstallInstructions />
    },
    showTidalControls: {
        description: "Show Tidal Player",
        type: OptionType.BOOLEAN,
        default: false,
    },
    showTidalLyrics: {
        description: "Show Tidal Controls",
        type: OptionType.BOOLEAN,
        default: false,
    },
    websocketURL: {
        type: OptionType.STRING,
        description: "Default is ws://localhost:24123",
        default: "ws://localhost:24123",
        restartNeeded: true,
    }
});
