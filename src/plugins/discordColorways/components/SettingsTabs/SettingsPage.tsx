/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { SettingsTab } from "@components/VencordSettings/shared";
import {
    FluxDispatcher,
    Forms,
    Switch,
    Text,
    useEffect,
    useState
} from "@webpack/common";
import { FluxEvents } from "@webpack/types";
import { Plugins } from "Vencord";

import { fallbackColorways } from "../../constants";
import { Colorway } from "../../types";

export default function () {
    const [colorways, setColorways] = useState<Colorway[]>([]);
    const [customColorways, setCustomColorways] = useState<Colorway[]>([]);
    const [colorsButtonVisibility, setColorsButtonVisibility] = useState<boolean>(false);
    const [isButtonThin, setIsButtonThin] = useState<boolean>(false);
    const [showLabelsInSelectorGridView, setShowLabelsInSelectorGridView] = useState<boolean>(false);

    useEffect(() => {
        (async function () {
            const [
                customColorways,
                colorwaySourceFiles,
                showColorwaysButton,
                useThinMenuButton,
                showLabelsInSelectorGridView
            ] = await DataStore.getMany([
                "customColorways",
                "colorwaySourceFiles",
                "showColorwaysButton",
                "useThinMenuButton",
                "showLabelsInSelectorGridView"
            ]);
            const responses: Response[] = await Promise.all(
                colorwaySourceFiles.map((url: string) =>
                    fetch(url)
                )
            );
            const data = await Promise.all(
                responses.map((res: Response) =>
                    res.json().catch(() => { return { colorways: [] }; })
                ));
            const colorways = data.flatMap(json => json.colorways);
            setColorways(colorways || fallbackColorways);
            setCustomColorways(customColorways.map(source => source.colorways).flat(2));
            setColorsButtonVisibility(showColorwaysButton);
            setIsButtonThin(useThinMenuButton);
            setShowLabelsInSelectorGridView(showLabelsInSelectorGridView);
        })();
    }, []);

    return <SettingsTab title="Settings">
        <div className="colorwaysSettingsPage-wrapper">
            <Forms.FormTitle tag="h5">Quick Switch</Forms.FormTitle>
            <Switch
                value={colorsButtonVisibility}
                onChange={(v: boolean) => {
                    setColorsButtonVisibility(v);
                    DataStore.set("showColorwaysButton", v);
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents,
                        isVisible: v
                    });
                }}
                note="Shows a button on the top of the servers list that opens a colorway selector modal."
            >
                Enable Quick Switch
            </Switch>
            <Switch
                value={isButtonThin}
                onChange={(v: boolean) => {
                    setIsButtonThin(v);
                    DataStore.set("useThinMenuButton", v);
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents,
                        isTall: v
                    });
                }}
                note="Replaces the icon on the colorways launcher button with text, making it more compact."
            >
                Use thin Quick Switch button
            </Switch>
            <Forms.FormTitle tag="h5">Selector</Forms.FormTitle>
            <Switch
                value={showLabelsInSelectorGridView}
                onChange={(v: boolean) => {
                    setShowLabelsInSelectorGridView(v);
                    DataStore.set("showLabelsInSelectorGridView", v);
                }}
            >
                Show labels in Grid View
            </Switch>
            <Flex flexDirection="column" style={{ gap: 0 }}>
                <h1 style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: "24px",
                    color: "var(--header-primary)",
                    lineHeight: "31px",
                    marginBottom: "0"
                }}>
                    Discord <span style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "24px",
                        backgroundColor: "var(--brand-500)",
                        padding: "0 4px",
                        borderRadius: "4px"
                    }}>Colorways</span>
                </h1>
                <Text
                    variant="text-xs/normal"
                    style={{
                        color: "var(--text-normal)",
                        fontWeight: 500,
                        fontSize: "14px",
                        marginBottom: "12px"
                    }}
                >by Project Colorway</Text>
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Plugin Version:
                </Forms.FormTitle>
                <Text
                    variant="text-xs/normal"
                    style={{
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: "14px",
                        marginBottom: "8px"
                    }}
                >
                    {(Plugins.plugins.DiscordColorways as any).pluginVersion}
                </Text>
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Creator Version:
                </Forms.FormTitle>
                <Text
                    variant="text-xs/normal"
                    style={{
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: "14px",
                        marginBottom: "8px"
                    }}
                >
                    {(Plugins.plugins.DiscordColorways as any).creatorVersion}
                </Text>
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Loaded Colorways:
                </Forms.FormTitle>
                <Text
                    variant="text-xs/normal"
                    style={{
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: "14px",
                        marginBottom: "8px"
                    }}
                >
                    {[...colorways, ...customColorways].length + 1}
                </Text>
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Project Repositories:
                </Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "8px" }}>
                    <Link href="https://github.com/DaBluLite/DiscordColorways">DiscordColorways</Link>
                    <br />
                    <Link href="https://github.com/DaBluLite/ProjectColorway">Project Colorway</Link>
                </Forms.FormText>
            </Flex>
        </div>
    </SettingsTab>;
}
