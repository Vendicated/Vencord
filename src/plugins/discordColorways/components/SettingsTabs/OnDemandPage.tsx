/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { SettingsTab } from "@components/VencordSettings/shared";
import { Switch, useCallback, useEffect, useState } from "@webpack/common";

export default function () {
    const [onDemand, setOnDemand] = useState<boolean>(false);
    const [onDemandTinted, setOnDemandTinted] = useState<boolean>(false);
    const [onDemandDiscordSat, setOnDemandDiscordSat] = useState<boolean>(false);
    const [onDemandOsAccent, setOnDemandOsAccent] = useState<boolean>(false);
    async function loadUI() {
        const [
            onDemandWays,
            onDemandWaysTintedText,
            onDemandWaysDiscordSaturation,
            onDemandWaysOsAccentColor
        ] = await DataStore.getMany([
            "onDemandWays",
            "onDemandWaysTintedText",
            "onDemandWaysDiscordSaturation",
            "onDemandWaysOsAccentColor"
        ]);
        setOnDemand(onDemandWays);
        setOnDemandTinted(onDemandWaysTintedText);
        setOnDemandDiscordSat(onDemandWaysDiscordSaturation);
        if (getComputedStyle(document.body).getPropertyValue("--os-accent-color") !== "") {
            setOnDemandOsAccent(onDemandWaysOsAccentColor);
        }
    }

    const cached_loadUI = useCallback(loadUI, []);

    useEffect(() => {
        cached_loadUI();
    }, []);
    return <SettingsTab title="On-Demand">
        <Switch
            value={onDemand}
            onChange={(v: boolean) => {
                setOnDemand(v);
                DataStore.set("onDemandWays", v);
            }}
            note="Always utilise the latest of what DiscordColorways has to offer. CSS is being directly generated on the device and gets applied in the place of the normal import/CSS given by the colorway."
        >
            Enable Colorways On Demand
        </Switch>
        <Switch
            value={onDemandTinted}
            onChange={(v: boolean) => {
                setOnDemandTinted(v);
                DataStore.set("onDemandWaysTintedText", v);
            }}
            disabled={!onDemand}
        >
            Use tinted text
        </Switch>
        <Switch
            value={onDemandDiscordSat}
            onChange={(v: boolean) => {
                setOnDemandDiscordSat(v);
                DataStore.set("onDemandWaysDiscordSaturation", v);
            }}
            disabled={!onDemand}
        >
            Use Discord's saturation
        </Switch>
        <Switch
            hideBorder
            value={onDemandOsAccent}
            onChange={(v: boolean) => {
                setOnDemandOsAccent(v);
                DataStore.set("onDemandWaysOsAccentColor", v);
            }}
            disabled={!onDemand || !getComputedStyle(document.body).getPropertyValue("--os-accent-color")}
        >
            Use Operating System's Accent Color
        </Switch>
    </SettingsTab>;
}
