/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import { saveFile } from "@utils/web";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Clipboard, Forms, Text, TextInput, Toasts, UserStore, useState, useStateFromStores } from "@webpack/common";

import { ColorwayCSS, versionData } from "..";
import { generateCss, pureGradientBase } from "../css";
import { Colorway } from "../types";
import { colorToHex, stringToHex } from "../utils";
import SaveColorwayModal from "./SaveColorwayModal";
import ThemePreview from "./ThemePreview";

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

function RenameColorwayModal({ modalProps, ogName, onFinish, colorwayList }: { modalProps: ModalProps, ogName: string, onFinish: (name: string) => void, colorwayList: Colorway[]; }) {
    const [error, setError] = useState<string>("");
    const [newName, setNewName] = useState<string>(ogName);
    return <ModalRoot {...modalProps}>
        <ModalHeader separator={false}>
            <Text variant="heading-lg/semibold" tag="h1" style={{ marginRight: "auto" }}>
                Rename Colorway...
            </Text>
            <ModalCloseButton onClick={() => modalProps.onClose()} />
        </ModalHeader>
        <ModalContent>
            <TextInput
                value={newName}
                error={error}
                onChange={setNewName}
            />
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.FILLED}
                onClick={async () => {
                    if (!newName) {
                        return setError("Error: Please enter a valid name");
                    }
                    if (colorwayList.map(c => c.name).includes(newName)) {
                        return setError("Error: Name already exists");
                    }
                    onFinish(newName);
                    modalProps.onClose();
                }}
            >
                Finish
            </Button>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.FILLED}
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}

export default function ({
    modalProps,
    colorway,
    loadUIProps
}: {
    modalProps: ModalProps;
    colorway: Colorway;
    loadUIProps: () => Promise<void>;
}) {
    const colors: string[] = colorway.colors || [
        "accent",
        "primary",
        "secondary",
        "tertiary",
    ];
    const profile = useStateFromStores([UserStore], () => UserStore.getUser(colorway.authorID));
    return <ModalRoot {...modalProps}>
        <ModalHeader separator={false}>
            <Text variant="heading-lg/semibold" tag="h1" style={{ marginRight: "auto" }}>
                Colorway: {colorway.name}
            </Text>
            <ModalCloseButton onClick={() => modalProps.onClose()} />
        </ModalHeader>
        <ModalContent>
            <Flex style={{ gap: "8px", width: "100%" }} flexDirection="column">
                <Forms.FormTitle style={{ marginBottom: 0, width: "100%" }}>Creator:</Forms.FormTitle>
                <Flex style={{ gap: ".5rem" }}>
                    <UserSummaryItem
                        users={[profile]}
                        guildId={undefined}
                        renderIcon={false}
                        showDefaultAvatarsForNullUsers
                        size={32}
                        showUserPopout
                    />
                    <Text style={{ lineHeight: "32px" }}>{colorway.author}</Text>
                </Flex>
                <Forms.FormTitle style={{ marginBottom: 0, width: "100%" }}>Colors:</Forms.FormTitle>
                <Flex style={{ gap: "8px" }}>
                    {colors.map(color => <div className="colorwayInfo-colorSwatch" style={{ backgroundColor: colorway[color] }} />)}
                </Flex>
                <Forms.FormTitle style={{ marginBottom: 0, width: "100%" }}>Actions:</Forms.FormTitle>
                <Flex style={{ gap: "8px" }} flexDirection="column">
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={() => {
                            const colorwayIDArray = `${colorway.accent},${colorway.primary},${colorway.secondary},${colorway.tertiary}|n:${colorway.name}${colorway.preset ? `|p:${colorway.preset}` : ""}`;
                            const colorwayID = stringToHex(colorwayIDArray);
                            Clipboard.copy(colorwayID);
                            Toasts.show({
                                message: "Copied Colorway ID Successfully",
                                type: 1,
                                id: "copy-colorway-id-notify",
                            });
                        }}
                    >
                        Copy Colorway ID
                    </Button>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={() => {
                            Clipboard.copy(colorway["dc-import"]);
                            Toasts.show({
                                message: "Copied CSS to Clipboard",
                                type: 1,
                                id: "copy-colorway-css-notify",
                            });
                        }}
                    >
                        Copy CSS
                    </Button>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={async () => {
                            const newColorway = {
                                ...colorway,
                                "dc-import": generateCss(colorToHex(colorway.primary) || "313338", colorToHex(colorway.secondary) || "2b2d31", colorToHex(colorway.tertiary) || "1e1f22", colorToHex(colorway.accent) || "5865f2", true, true, undefined, colorway.name)
                            };
                            openModal(props => <SaveColorwayModal modalProps={props} colorways={[newColorway]} onFinish={() => { }} />);
                        }}
                    >
                        Update CSS
                    </Button>
                    {colorway.sourceType === "offline" && <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={async () => {
                            const offlineSources = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).map(o => o.colorways).filter(colorArr => colorArr.map(color => color.name).includes(colorway.name))[0];
                            openModal(props => <RenameColorwayModal ogName={colorway.name} colorwayList={offlineSources} modalProps={props} onFinish={async (newName: string) => {
                                const stores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).map(source => {
                                    if (source.name === colorway.source) {
                                        return {
                                            name: source.name,
                                            colorways: [...source.colorways.filter(colorway => colorway.name !== colorway.name), {
                                                ...colorway,
                                                name: newName
                                            }]
                                        };
                                    } else return source;
                                });
                                DataStore.set("customColorways", stores);
                                if ((await DataStore.get("activeColorwayObject")).id === colorway.name) {
                                    DataStore.set("activeColorwayObject", { id: newName, css: colorway.name, sourceType: "offline", source: colorway.source });
                                }
                                modalProps.onClose();
                                loadUIProps();
                            }} />);
                        }}
                    >
                        Rename
                    </Button>}
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={() => {
                            openModal(props => <ModalRoot {...props} className="colorwayInfo-cssModal">
                                <ModalContent><CodeBlock lang="css" content={colorway["dc-import"]} /></ModalContent>
                            </ModalRoot>);
                        }}
                    >
                        Show CSS
                    </Button>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={() => {
                            if (!colorway["dc-import"].includes("@name")) {
                                if (IS_DISCORD_DESKTOP) {
                                    DiscordNative.fileManager.saveWithDialog(`/**
                                    * @name ${colorway.name || "Colorway"}
                                    * @version ${versionData.creatorVersion}
                                    * @description Automatically generated Colorway.
                                    * @author ${UserStore.getCurrentUser().username}
                                    * @authorId ${UserStore.getCurrentUser().id}
                                    */
                                   ${colorway["dc-import"].replace((colorway["dc-import"].match(/\/\*.+\*\//) || [""])[0], "").replaceAll("url(//", "url(https://").replaceAll("url(\"//", "url(\"https://")}`, `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`);
                                } else {
                                    saveFile(new File([`/**
                                    * @name ${colorway.name || "Colorway"}
                                    * @version ${versionData.creatorVersion}
                                    * @description Automatically generated Colorway.
                                    * @author ${UserStore.getCurrentUser().username}
                                    * @authorId ${UserStore.getCurrentUser().id}
                                    */
                                   ${colorway["dc-import"].replace((colorway["dc-import"].match(/\/\*.+\*\//) || [""])[0], "").replaceAll("url(//", "url(https://").replaceAll("url(\"//", "url(\"https://")}`], `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`, { type: "text/plain" }));
                                }
                            } else {
                                if (IS_DISCORD_DESKTOP) {
                                    DiscordNative.fileManager.saveWithDialog(colorway["dc-import"], `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`);
                                } else {
                                    saveFile(new File([colorway["dc-import"]], `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`, { type: "text/plain" }));
                                }
                            }
                        }}
                    >
                        Download CSS
                    </Button>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.OUTLINED}
                        style={{ width: "100%" }}
                        onClick={() => {
                            openModal((props: ModalProps) => <ModalRoot className="colorwaysPreview-modal" {...props}>
                                <style>
                                    {colorway.isGradient ? pureGradientBase + `.colorwaysPreview-modal,.colorwaysPreview-wrapper {--gradient-theme-bg: linear-gradient(${colorway.linearGradient})}` : ""}
                                </style>
                                <ThemePreview
                                    accent={colorway.accent}
                                    primary={colorway.primary}
                                    secondary={colorway.secondary}
                                    tertiary={colorway.tertiary}
                                    isModal
                                    modalProps={props}
                                />
                            </ModalRoot>);
                        }}
                    >
                        Show preview
                    </Button>
                    {colorway.sourceType === "offline" && <Button
                        color={Button.Colors.RED}
                        size={Button.Sizes.MEDIUM}
                        look={Button.Looks.FILLED}
                        style={{ width: "100%" }}
                        onClick={async () => {
                            const oldStores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name !== colorway.source);
                            const storeToModify = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name === colorway.source)[0];
                            const newStore = { name: storeToModify.name, colorways: storeToModify.colorways.filter(colorway => colorway.name !== colorway.name) };
                            DataStore.set("customColorways", [...oldStores, newStore]);
                            if ((await DataStore.get("activeColorwayObject")).id === colorway.name) {
                                DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                ColorwayCSS.remove();
                            }
                            modalProps.onClose();
                            loadUIProps();
                        }}
                    >
                        Delete
                    </Button>}
                </Flex>
            </Flex>
            <div style={{ width: "100%", height: "20px" }} />
        </ModalContent>
    </ModalRoot>;
}
