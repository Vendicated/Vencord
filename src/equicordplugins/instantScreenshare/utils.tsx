/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Forms, SearchableSelect, useEffect, useState } from "@webpack/common";

interface PickerProps {
    streamMediaSelection: any[];
    streamMedia: any[];
}

const mediaEngine = findByPropsLazy("getMediaEngine");
const getDesktopSources = findByCodeLazy("desktop sources");

export const settings = definePluginSettings({
    streamMedia: {
        type: OptionType.COMPONENT,
        component: SettingSection,
    },
});

export async function getCurrentMedia() {
    const media = mediaEngine.getMediaEngine();
    const sources = [
        ...(await getDesktopSources(media, ["screen"], null) ?? []),
        ...(await getDesktopSources(media, ["window", "application"], null) ?? [])
    ];
    const streamMedia = sources.find(screen => screen.id === settings.store.streamMedia);
    console.log(sources);

    if (streamMedia) return streamMedia;

    new Logger("InstantScreenShare").error(`Stream Media "${settings.store.streamMedia}" not found. Resetting to default.`);

    settings.store.streamMedia = sources[0];
    return sources[0];
}

function StreamSimplePicker({ streamMediaSelection, streamMedia }: PickerProps) {
    const options = streamMediaSelection.map(screen => ({
        label: screen.name,
        value: screen.id,
        default: streamMediaSelection[0],
    }));

    return (
        <SearchableSelect
            placeholder="Select a media source to stream "
            maxVisibleItems={5}
            options={options}
            value={options.find(o => o.value === streamMedia)}
            onChange={v => settings.store.streamMedia = v}
            closeOnSelect
        />
    );
}

function ScreenSetting() {
    const { streamMedia } = settings.use(["streamMedia"]);
    const media = mediaEngine.getMediaEngine();
    const [streamMediaSelection, setStreamMediaSelection] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        async function fetchMedia() {
            setLoading(true);
            const sources = [
                ...(await getDesktopSources(media, ["screen"], null) ?? []),
                ...(await getDesktopSources(media, ["window", "application"], null) ?? [])
            ];

            if (active) {
                setStreamMediaSelection(sources);
                setLoading(false);
            }
        }
        fetchMedia();
        return () => { active = false; };
    }, []);

    if (loading) return <Forms.FormText>Loading media sources...</Forms.FormText>;
    if (!streamMediaSelection.length) return <Forms.FormText>No Media found.</Forms.FormText>;

    return <StreamSimplePicker streamMediaSelection={streamMediaSelection} streamMedia={streamMedia} />;
}

function SettingSection() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle>Media source to stream</Forms.FormTitle>
            <Forms.FormText>Resets to main screen if not found</Forms.FormText>
            <ScreenSetting />
        </Forms.FormSection>
    );
}
