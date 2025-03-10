/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange, SettingSliderComponent } from "@components/PluginSettings/components";
import { useAwaiter } from "@utils/react";
import { OptionType } from "@utils/types";
import { Button, showToast, Text, Toasts } from "@webpack/common";

import { clearLyricsCache, getLyricsCount, removeTranslations } from "./api";
import { Lyrics } from "./components/lyrics";
import { useLyrics } from "./components/util";
import languages from "./providers/translator/languages";
import { Provider } from "./providers/types";

const sliderOptions = {
    markers: makeRange(-2500, 2500, 250),
    stickToMarkers: true,
};

function Details() {
    const { lyricsInfo } = useLyrics();

    const [count, error, loading] = useAwaiter(getLyricsCount, {
        onError: () => console.error("Failed to get lyrics count"),
        fallbackValue: null,
    });

    return (
        <>
            <Text>Current lyrics provider: {lyricsInfo?.useLyric || "None"}</Text>
            {loading ? <Text>Loading lyrics count...</Text> : error ? <Text>Failed to get lyrics count</Text> : <Text>Lyrics count: {count}</Text>}
        </>
    );
}

const settings = definePluginSettings({
    ShowMusicNoteOnNoLyrics: {
        description: "Show a music note icon when no lyrics are found",
        type: OptionType.BOOLEAN,
        default: true,
    },
    LyricsPosition: {
        description: "Position of the lyrics",
        type: OptionType.SELECT,
        options: [
            { value: "above", label: "Above SpotifyControls" },
            { value: "below", label: "Below SpotifyControls", default: true },
        ],
    },
    LyricsProvider: {
        description: "Where lyrics are fetched from",
        type: OptionType.SELECT,
        options: [
            { value: Provider.Spotify, label: "Spotify (Musixmatch)", default: true },
            { value: Provider.Lrclib, label: "LRCLIB" },
        ],
    },
    FallbackProvider: {
        description: "When a lyrics provider fails, try other providers",
        type: OptionType.BOOLEAN,
        default: true,
    },
    TranslateTo: {
        description: "Translate lyrics to - Changing this will clear existing translations",
        type: OptionType.SELECT,
        options: languages,
        onChange: async () => {
            await removeTranslations();
            showToast("Translations cleared", Toasts.Type.SUCCESS);
        }
    },
    LyricsConversion: {
        description: "Automatically translate or romanize lyrics",
        type: OptionType.SELECT,
        options: [
            { value: Provider.None, label: "None", default: true },
            { value: Provider.Translated, label: "Translate" },
            { value: Provider.Romanized, label: "Romanize" },
        ]
    },
    ShowFailedToasts: {
        description: "Hide toasts when lyrics fail to fetch",
        type: OptionType.BOOLEAN,
        default: true,
    },
    LyricDelay: {
        description: "",
        type: OptionType.SLIDER,
        default: 0,
        hidden: true,
        ...sliderOptions
    },
    Display: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => (
            <>
                <SettingSliderComponent
                    option={{ ...sliderOptions } as any}
                    onChange={v => {
                        settings.store.LyricDelay = v;
                    }}
                    pluginSettings={Vencord.Settings.plugins.SpotifyLyrics}
                    id={"LyricDelay"}
                    onError={() => { }}
                />
                <Lyrics />
            </>
        )
    },
    Details: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => <Details />,
    },
    PurgeLyricsCache: {
        description: "Purge the lyrics cache",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                color={Button.Colors.RED}
                onClick={() => {
                    clearLyricsCache();
                    showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                }}
            >
                Purge Cache
            </Button>
        ),
    },
    TestingCache: {
        description: "Save songs to a testing cache instead",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    }
});

export default settings;
