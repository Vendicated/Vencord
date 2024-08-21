/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, ReactNode, useCallback, useEffect, useState } from "../../";
import Setting from "../Setting";
import Switch from "../Switch";

export default function ({
    hasTheme = false
}: {
    hasTheme: boolean;
}) {
    const [onDemand, setOnDemand] = useState<boolean>(false);
    const [onDemandTinted, setOnDemandTinted] = useState<boolean>(false);
    const [onDemandDiscordSat, setOnDemandDiscordSat] = useState<boolean>(false);
    const [onDemandOsAccent, setOnDemandOsAccent] = useState<boolean>(false);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
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

    function Container({ children }: { children: ReactNode; }) {
        if (hasTheme) return <div className="colorwaysModalTab" data-theme={theme}>{children}</div>;
        else return <div className="colorwaysModalTab">{children}</div>;
    }

    return <Container>
        <Setting divider>
            <Switch
                label="Enable Colorways On Demand"
                id="onDemandWays"
                value={onDemand}
                onChange={(v: boolean) => {
                    setOnDemand(v);
                    DataStore.set("onDemandWays", v);
                }} />
            <span className="colorwaysNote">Always utilise the latest of what DiscordColorways has to offer. CSS is being directly generated on the device and gets applied in the place of the normal import/CSS given by the colorway.</span>
        </Setting>
        <Setting divider disabled={!onDemand}>
            <Switch
                label="Use tinted text"
                id="onDemandWaysTintedText"
                value={onDemandTinted}
                onChange={(v: boolean) => {
                    setOnDemandTinted(v);
                    DataStore.set("onDemandWaysTintedText", v);
                }} />
        </Setting>
        <Setting divider disabled={!onDemand}>
            <Switch
                label="Use Discord's saturation"
                id="onDemandWaysDiscordSaturation"
                value={onDemandDiscordSat}
                onChange={(v: boolean) => {
                    setOnDemandDiscordSat(v);
                    DataStore.set("onDemandWaysDiscordSaturation", v);
                }} />
        </Setting>
        <Setting disabled={!onDemand || !getComputedStyle(document.body).getPropertyValue("--os-accent-color")}>
            <Switch
                label="Use Operating System's Accent Color"
                id="onDemandWaysOsAccentColor"
                value={onDemandOsAccent}
                onChange={(v: boolean) => {
                    setOnDemandOsAccent(v);
                    DataStore.set("onDemandWaysOsAccentColor", v);
                }} />
        </Setting>
    </Container>;
}
