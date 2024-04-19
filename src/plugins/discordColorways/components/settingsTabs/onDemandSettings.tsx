/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { SettingsTab } from "@components/VencordSettings/shared";
import { Switch, useCallback, useEffect, useState } from "@webpack/common";

export function OnDemandWaysPage() {
    const [onDemand, setOnDemand] = useState<boolean>(false);
    const [onDemandTinted, setOnDemandTinted] = useState<boolean>(false);
    const [onDemandDiscordSat, setOnDemandDiscordSat] = useState<boolean>(false);
    async function loadUI() {
        const [
            onDemandWays,
            onDemandWaysTintedText,
            onDemandWaysDiscordSaturation
        ] = await DataStore.getMany([
            "onDemandWays",
            "onDemandWaysTintedText",
            "onDemandWaysDiscordSaturation"
        ]);
        setOnDemand(onDemandWays);
        setOnDemandTinted(onDemandWaysTintedText);
        setOnDemandDiscordSat(onDemandWaysDiscordSaturation);
    }

    const cached_loadUI = useCallback(loadUI, []);

    useEffect(() => {
        cached_loadUI();
    }, []);
    return <SettingsTab title="On Demand">
        <Switch
            value={onDemand}
            onChange={(v: boolean) => {
                setOnDemand(v);
                DataStore.set("onDemandWays", v);
            }}
            note="Always utilise the latest of what Colorways has to offer. CSS is being directly generated on the device and gets applied in the place of the normal import/CSS given by the colorway."
        >
            Enable OnDemandWays
        </Switch>
        <Switch
            value={onDemandTinted}
            onChange={(v: boolean) => {
                setOnDemandTinted(v);
                DataStore.set("onDemandWaysTintedText", v);
            }}
        >
            Use tinted text
        </Switch>
        <Switch
            hideBorder
            value={onDemandDiscordSat}
            onChange={(v: boolean) => {
                setOnDemandDiscordSat(v);
                DataStore.set("onDemandWaysDiscordSaturation", v);
            }}
        >
            Use Discord's saturation
        </Switch>
    </SettingsTab>;
}
