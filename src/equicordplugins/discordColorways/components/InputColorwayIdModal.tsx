/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalFooter, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, TextInput, useState } from "@webpack/common";

import { hexToString } from "../utils";

export default function ({ modalProps, onColorwayId }: { modalProps: ModalProps, onColorwayId: (colorwayID: string) => void; }) {
    const [colorwayID, setColorwayID] = useState<string>("");
    return <ModalRoot {...modalProps} className="colorwaysCreator-noMinHeight">
        <ModalContent className="colorwaysCreator-noHeader colorwaysCreator-noMinHeight">
            <Forms.FormTitle>Colorway ID:</Forms.FormTitle>
            <TextInput placeholder="Enter Colorway ID" onInput={e => setColorwayID(e.currentTarget.value)} />
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.FILLED}
                onClick={() => {
                    if (!colorwayID) {
                        throw new Error("Please enter a Colorway ID");
                    } else if (!hexToString(colorwayID).includes(",")) {
                        throw new Error("Invalid Colorway ID");
                    } else {
                        onColorwayId(colorwayID);
                        modalProps.onClose();
                    }
                }}
            >
                Finish
            </Button>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.OUTLINED}
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}
