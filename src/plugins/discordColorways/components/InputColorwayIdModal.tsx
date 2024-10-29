/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, FocusLock, useEffect, useRef, useState } from "..";
import { ModalProps } from "../types";
import { hexToString } from "../utils";

export default function ({ modalProps, onColorwayId }: { modalProps: ModalProps, onColorwayId: (colorwayID: string) => void; }) {
    const [colorwayID, setColorwayID] = useState<string>("");
    const [theme, setTheme] = useState("discord");
    const cont = useRef(null);

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
    return <FocusLock containerRef={cont}>
        <div ref={cont} className={`colorwaysModal ${modalProps.transitionState === 2 ? "closing" : ""} ${modalProps.transitionState === 4 ? "hidden" : ""}`} data-theme={theme}>
            <div className="colorwaysModalContent">
                <span className="colorwaysModalSectionHeader">Colorway ID:</span>
                <input
                    type="text"
                    className="colorwayTextBox"
                    placeholder="Enter Colorway ID"
                    onInput={({ currentTarget: { value } }) => setColorwayID(value)}
                />
            </div>
            <div className="colorwaysModalFooter">
                <button
                    className="colorwaysPillButton colorwaysPillButton-onSurface"
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
                </button>
                <button
                    className="colorwaysPillButton"
                    onClick={() => modalProps.onClose()}
                >
                    Cancel
                </button>
            </div>
        </div>
    </FocusLock>;
}
