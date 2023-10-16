/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { CloseIcon } from "@components/Icons";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal
} from "@utils/modal";
import {
    Button,
    Forms,
    Text,
    TextInput,
    useEffect,
    useState
} from "@webpack/common";

export function SettingsModal({
    modalProps
}: {
    modalProps: ModalProps;
}) {
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<string[]>();
    useEffect(() => {
        async function loadUI() {
            const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
            setColorwaySourceFiles(
                colorwaySourceFilesArr
            );
        }
        loadUI();
    });
    return <ModalRoot {...modalProps} className="colorwaysSettings-modalRoot">
        <ModalHeader>
            <Text variant="heading-lg/semibold" tag="h1">
                Settings
            </Text>
        </ModalHeader>
        <ModalContent className="colorwaysSettings-modalContent">
            <Forms.FormTitle>
                Colorways Source Files:
            </Forms.FormTitle>
            <div className="colorwaysSettings-colorwaySources">
                <div className="colorwaysSettings-colorwaySourceActions">
                    <Button className="colorwaysSettings-colorwaySourceAction" innerClassName="colorwaysSettings-iconButtonInner" size={Button.Sizes.SMALL} color={Button.Colors.TRANSPARENT} onClick={() => {
                        openModal(props => {
                            var colorwaySource = "";
                            return <ModalRoot {...props}>
                                <ModalHeader>
                                    <Text variant="heading-lg/semibold" tag="h1">
                                        Add a source:
                                    </Text>
                                </ModalHeader>
                                <ModalContent><TextInput placeholder="Enter a valid URL..." onChange={e => colorwaySource = e} /></ModalContent>
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
                                            if (colorwaySource !== "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json") {
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
                        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" />
                        </svg>
                        Add a source...
                    </Button>
                </div>
                {colorwaySourceFiles?.map((colorwaySourceFile: string) => {
                    return <div className="colorwaysSettings-colorwaySource">
                        <Text className="colorwaysSettings-colorwaySourceLabel">
                            {colorwaySourceFile}
                        </Text>
                        {colorwaySourceFile !== "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json" ? <Button innerClassName="colorwaysSettings-iconButtonInner" className="colorwaysSettings-iconButton" size={Button.Sizes.ICON} color={Button.Colors.TRANSPARENT} onClick={async () => {
                            var sourcesArr: string[] = [];
                            const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                            colorwaySourceFilesArr.map((source: string) => {
                                if (source !== colorwaySourceFile) {
                                    sourcesArr.push(source);
                                }
                            });
                            DataStore.set("colorwaySourceFiles", sourcesArr);
                            setColorwaySourceFiles(sourcesArr);
                        }}><CloseIcon /></Button> : <></>}
                    </div>;
                })}
            </div>
        </ModalContent>
    </ModalRoot>;
}
