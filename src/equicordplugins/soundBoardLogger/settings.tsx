/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import { Button, TextInput, useState } from "@webpack/common";

import { openSoundBoardLog } from "./components/SoundBoardLog";

const settings = definePluginSettings({
    SavedIds: {
        description: "The amount of soundboard ids you want to save at a time (0 lets you save infinite)",
        type: OptionType.COMPONENT,
        component: ({ setValue }) => {
            const value = settings.store.SavedIds ?? 50;
            const [state, setState] = useState(`${value}`);
            const [shouldShowWarning, setShouldShowWarning] = useState(false);
            const [errorMessage, setErrorMessage] = useState<string | null>(null);

            function handleChange(newValue) {
                const changed = Number(newValue);

                if (Number.isNaN(changed) || changed % 1 !== 0 || changed < 0) {
                    let errorMsg = "";
                    errorMsg += Number.isNaN(changed) ? "The value is not a number.\n" : "";
                    errorMsg += (changed % 1 !== 0) ? "The value can't be a decimal number.\n" : "";
                    errorMsg += (changed < 0) ? "The value can't be a negative number.\n" : "";
                    setErrorMessage(errorMsg);
                    return;
                } else {
                    setErrorMessage(null);
                }

                if (changed < value) {
                    setShouldShowWarning(true);
                } else {
                    setShouldShowWarning(false);
                }
                setState(newValue);
                setValue(changed);
            }

            return (
                <section>
                    <Heading>The amount of soundboard ids you want to save at a time (0 lets you save infinite)</Heading>
                    <TextInput
                        type="number"
                        pattern="-?[0-9]+"
                        value={state}
                        onChange={handleChange}
                        placeholder={"Enter a number"}
                    />
                    {shouldShowWarning && <Paragraph style={{ color: "var(--text-feedback-critical)" }}>Warning! Setting the number to a lower value will reset the log!</Paragraph>}
                    {errorMessage && <Paragraph style={{ color: "var(--text-feedback-critical)" }}>{errorMessage}</Paragraph>}
                </section>
            );
        }

    },
    FileType: {
        description: "the format that you want to save your file",
        type: OptionType.SELECT,
        options: [
            { label: ".ogg", value: ".ogg", default: true },
            { label: ".mp3", value: ".mp3" },
            { label: ".wav", value: ".wav" },
        ],
    },
    OpenLogs: {
        type: OptionType.COMPONENT,
        description: "show the logs",
        component: () =>
            <Button color={Button.Colors.LINK} size={Button.Sizes.SMALL} onClick={openSoundBoardLog}>Open Logs</Button>
    },
    soundVolume: {
        description: "How loud the toggle sound is (0 to disable)",
        type: OptionType.SLIDER,
        default: 0.5,
        markers: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
    },
});

export default settings;
