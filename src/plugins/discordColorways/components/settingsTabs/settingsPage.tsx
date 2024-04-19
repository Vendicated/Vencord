/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { CloseIcon, CopyIcon } from "@components/Icons";
import { SettingsTab } from "@components/VencordSettings/shared";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import {
    Button,
    Clipboard,
    FluxDispatcher,
    Forms,
    Switch,
    Text,
    TextInput,
    useCallback,
    useEffect,
    useState
} from "@webpack/common";
import { FluxEvents } from "@webpack/types";
import { Plugins } from "Vencord";

import { defaultColorwaySource, fallbackColorways, knownColorwaySources } from "../../constants";
import { Colorway } from "../../types";
import Divider from "../Divider";

export function SettingsPage() {
    const [colorways, setColorways] = useState<Colorway[]>([]);
    const [customColorways, setCustomColorways] = useState<Colorway[]>([]);
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<string[]>();
    const [colorsButtonVisibility, setColorsButtonVisibility] = useState<boolean>(false);
    const [isButtonThin, setIsButtonThin] = useState<boolean>(false);

    async function loadUI() {
        const colorwaySourceFiles = await DataStore.get(
            "colorwaySourceFiles"
        );
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
        const [
            customColorways,
            colorwaySourceFiless,
            showColorwaysButton,
            useThinMenuButton
        ] = await DataStore.getMany([
            "customColorways",
            "colorwaySourceFiles",
            "showColorwaysButton",
            "useThinMenuButton"
        ]);
        setColorways(colorways || fallbackColorways);
        setCustomColorways(customColorways);
        setColorwaySourceFiles(colorwaySourceFiless);
        setColorsButtonVisibility(showColorwaysButton);
        setIsButtonThin(useThinMenuButton);
    }

    const cached_loadUI = useCallback(loadUI, []);

    useEffect(() => {
        cached_loadUI();
    }, []);

    return <SettingsTab title="Settings">
        <div className="colorwaysSettingsPage-wrapper">
            <Flex style={{ gap: "0", marginBottom: "8px" }}>
                <Forms.FormTitle tag="h5" style={{ width: "100%", marginBottom: "0", lineHeight: "32px" }}>Sources</Forms.FormTitle>
                <Button
                    className="colorwaysSettings-colorwaySourceAction"
                    innerClassName="colorwaysSettings-iconButtonInner"
                    style={{ flexShrink: "0" }}
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.TRANSPARENT}
                    onClick={() => {
                        openModal(props => {
                            var colorwaySource = "";
                            return <ModalRoot {...props}>
                                <ModalHeader>
                                    <Text variant="heading-lg/semibold" tag="h1">
                                        Add a source:
                                    </Text>
                                </ModalHeader>
                                <ModalContent>
                                    <TextInput
                                        placeholder="Enter a valid URL..."
                                        onChange={e => colorwaySource = e}
                                    />
                                </ModalContent>
                                <ModalFooter>
                                    <Button
                                        style={{ marginLeft: 8 }}
                                        color={Button.Colors.BRAND}
                                        size={Button.Sizes.MEDIUM}
                                        look={Button.Looks.FILLED}
                                        onClick={async () => {
                                            var sourcesArr: string[] = [];
                                            const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                                            colorwaySourceFilesArr.map((source: string) => sourcesArr.push(source));
                                            if (colorwaySource !== defaultColorwaySource) {
                                                sourcesArr.push(colorwaySource);
                                            }
                                            DataStore.set("colorwaySourceFiles", sourcesArr);
                                            setColorwaySourceFiles(sourcesArr);
                                            props.onClose();
                                        }}
                                    >
                                        Finish
                                    </Button>
                                    <Button
                                        style={{ marginLeft: 8 }}
                                        color={Button.Colors.PRIMARY}
                                        size={Button.Sizes.MEDIUM}
                                        look={Button.Looks.FILLED}
                                        onClick={() => props.onClose()}
                                    >
                                        Cancel
                                    </Button>
                                </ModalFooter>
                            </ModalRoot>;
                        });
                    }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        role="img"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z"
                        />
                    </svg>
                    Add a source...
                </Button>
            </Flex>
            <Flex flexDirection="column">
                {colorwaySourceFiles?.map((colorwaySourceFile: string) => <div className="colorwaysSettings-colorwaySource">
                    {knownColorwaySources.find(o => o.url === colorwaySourceFile) ? <div className="hoverRoll">
                        <Text className="colorwaysSettings-colorwaySourceLabel hoverRoll_normal">
                            {knownColorwaySources.find(o => o.url === colorwaySourceFile)!.name} {colorwaySourceFile === defaultColorwaySource && <div className="colorways-badge">DEFAULT</div>}
                        </Text>
                        <Text className="colorwaysSettings-colorwaySourceLabel hoverRoll_hovered">
                            {colorwaySourceFile}
                        </Text>
                    </div>
                        : <Text className="colorwaysSettings-colorwaySourceLabel">
                            {colorwaySourceFile}
                        </Text>}
                    {colorwaySourceFile !== defaultColorwaySource
                        && <Button
                            innerClassName="colorwaysSettings-iconButtonInner"
                            className="colorwaysSettings-iconButton"
                            size={Button.Sizes.ICON}
                            color={Button.Colors.TRANSPARENT}
                            onClick={async () => {
                                var sourcesArr: string[] = [];
                                const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                                colorwaySourceFilesArr.map((source: string) => {
                                    if (source !== colorwaySourceFile) {
                                        sourcesArr.push(source);
                                    }
                                });
                                DataStore.set("colorwaySourceFiles", sourcesArr);
                                setColorwaySourceFiles(sourcesArr);
                            }}
                        >
                            <CloseIcon />
                        </Button>}
                    <Button
                        innerClassName="colorwaysSettings-iconButtonInner"
                        size={Button.Sizes.ICON}
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => { Clipboard.copy(colorwaySourceFile); }}
                    >
                        <CopyIcon width={20} height={20} />
                    </Button>
                </div>
                )}
            </Flex>
            <Divider />
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
            <Flex flexDirection="column" style={{ gap: 0 }}>
                <h1 style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: "24px",
                    color: "var(--header-primary)",
                    lineHeight: "31px",
                    marginBottom: "12px"
                }}>
                    Discord <span style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "24px",
                        backgroundColor: "var(--brand-500)",
                        padding: "0 4px",
                        borderRadius: "4px"
                    }}>Colorways</span>
                </h1>
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
                    {(Plugins.plugins.DiscordColorways as any).creatorVersion}{" "}
                    (Stable)
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
                    {[...colorways, ...customColorways].length}
                </Text>
            </Flex>
        </div>
    </SettingsTab>;
}
