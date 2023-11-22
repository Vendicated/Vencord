/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Forms, TextInput, Button, useState } from "@webpack/common";
import { openSoundBoardLog } from "./components/SoundBoardLog";

const settings = definePluginSettings({
    SavedIds: {
        description: "The amount of soundboard ids you want to save at a time (0 lets you save infinite)",
        type: OptionType.COMPONENT,
        component: ({ setValue, setError }) => {
            const value = settings.store.SavedIds ?? 50;
            const [state, setState] = useState(`${value}`);
            const [shouldShowWarning, setShouldShowWarning] = useState(false);
            const [errorMessage, setErrorMessage] = useState<string | null>(null);

            function handleChange(newValue) {
                const changed = Number(newValue);

                if (Number.isNaN(changed) || changed % 1 != 0 || changed < 0) {
                    setError(true);
                    let errorMsg = "";
                    errorMsg += Number.isNaN(changed) ? "The value is not a number.\n" : '';
                    errorMsg += (changed % 1 != 0) ? "The value can't be a decimal number.\n" : '';
                    errorMsg += (changed < 0) ? "The value can't be a negative number.\n" : '';
                    setErrorMessage(errorMsg);
                    return;
                } else {
                    setError(false);
                    setErrorMessage(null);
                }


                if (changed < value) {
                    setShouldShowWarning(true);
                } else {
                    setShouldShowWarning(false);
                }
                setState(newValue);
                setValue(changed);
            };


            return (
                <Forms.FormSection>
                    <Forms.FormTitle>The amount of soundboard ids you want to save at a time (0 lets you save infinite)</Forms.FormTitle>
                    <TextInput
                        type="number"
                        pattern="-?[0-9]+"
                        value={state}
                        onChange={handleChange}
                        placeholder={"Enter a number"}
                    />
                    {shouldShowWarning && <Forms.FormText style={{ color: "var(--text-danger)" }}>Warning! Setting the number to a lower value will reset the log!</Forms.FormText>}
                    {errorMessage && <Forms.FormText style={{ color: "var(--text-danger)" }}>{errorMessage}</Forms.FormText>}
                </Forms.FormSection>
            );
        }

    },
    IconLocation: {
        description: "choose where to show the SoundBoard Log icon (requires restart)",
        type: OptionType.SELECT,
        options: [
            { label: "Toolbar", value: "toolbar", default: true },
            { label: "Chat input", value: "chat" }
        ],
        restartNeeded: true
    },
    OpenLogs: {
        type: OptionType.COMPONENT,
        description: "show the logs",
        component: () =>
            <Button color={Button.Colors.LINK} size={Button.Sizes.SMALL} onClick={openSoundBoardLog}>Open Logs</Button>
    }
});

export default settings;