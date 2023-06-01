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

import { DataStore } from "@api/index";
import { showNotification } from "@api/Notifications";
import { Settings } from "@api/Settings";
import { getSettingStoreLazy } from "@api/SettingsStore";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput } from "@webpack/common";

// The custom status settings store
const CustomStatus = getSettingStoreLazy("status", "customStatus");

// The maximum length of a Discord status message
const MAX_STATUS_LENGTH = 128;

// Helper function to set the custom status
const setCustomStatus = (message: string) => CustomStatus?.updateSetting({ text: message, expiresAtMs: "0" });

// Generate a status message using the ChatGPT API
const generateStatus = async (): Promise<string | null> => {
    const headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Settings.plugins.dAIlystatus.apiKey}`,
    };
    const body = JSON.stringify({
        model: Settings.plugins.dAIlystatus.model,
        messages: [{ role: "user", content: Settings.plugins.dAIlystatus.prompt }]
    });

    // Attempt to contact the ChatGPT API
    const res = await fetch(Settings.plugins.dAIlystatus.apiEndpoint, { headers, body, method: "POST" },)
        .catch(err => {
            // Something went wrong. Notify the user
            showNotification({
                title: "ChatGPT API Error",
                body: `Could not generate status message using ChatGPT: ${err}`,
                color: "var(--red-360)"
            });
        });

    if (!res) {
        // This response has failed, no need to do anything
        return null;
    }

    if (!res.ok) {
        // This response has failed, but we have a response
        // Notify the user
        showNotification({
            title: "ChatGPT API Error",
            body: `Could not generate status message using ChatGPT (API returned ${res.status}) - ${res.statusText}`,
            color: "var(--red-360)"
        });
        return null;
    }

    // Decode the response as JSON
    const response = await res.json();

    if (!response.choices || response.choices.length < 0) {
        // No responses have been given by the API
        showNotification({
            title: "ChatGPT API Error",
            body: "ChatGPT API did not return any messages while generating status message.",
            color: "var(--red-360)"
        });
        return null;
    }

    // Extract the first message
    const { content } = response.choices[0].message;

    // Remove trailing quotes and limit the message to the maximum status length
    const message = content.replace(/^"|"$/g, "").substring(0, MAX_STATUS_LENGTH);

    return message;
};

// Run status generation from beginning to end
const beginStatusGeneration = async () => {
    const status = await generateStatus();

    if (!status) {
        // Status generation has failed, try again later
        return;
    }

    // Set the previously saved day to today
    await DataStore.set("dAIlystatus_previousDay", calculateDay());

    if (Settings.plugins.dAIlystatus.automatic) {
        // Automatically set new daily status
        setCustomStatus(status);
    } else {
        // Prompt the user if they'd like to set the status
        openModalLazy(async () => {
            return modalProps => {
                return <DailyStatusModal {...modalProps} status={status} />;
            };
        });
    }
};

// Calculate the amount of milliseconds to the next calendar day
const calculateMillisecondsToNextDay = () => {
    const currentDate = new Date();
    const nextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 0, 0, 0);
    const milliseconds = nextDay.getTime() - currentDate.getTime();

    return milliseconds;
};

// Calculate the current day since the beginning of the Unix epoch
const calculateDay = () => {
    const currentDate = new Date();
    const daysSinceEpoch = Math.floor(currentDate.getTime() / 86400000);

    return daysSinceEpoch;
};

const DailyStatusModal = (props: any) => {
    const [status, setStatus] = React.useState<string>(props?.status);
    const [regenerating, setRegenerating] = React.useState<boolean>(false);

    const regenerateStatus = async () => {
        // Regenerate the status and update the UI
        setRegenerating(true);

        const message = await generateStatus();

        if (message) {
            setStatus(message);
        }

        setRegenerating(false);
    };

    const applyStatus = () => {
        // Immediately set the status and close the modal
        setCustomStatus(status);
        props.onClose();
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">A wild status message has appeared!</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormText>
                    ChatGPT has come up with the following status message for you today:
                </Forms.FormText>
                <Forms.FormTitle tag="h5" className={Margins.top8}>
                    Status message
                </Forms.FormTitle>
                <TextInput value={status} onChange={setStatus} maxLength={MAX_STATUS_LENGTH} disabled={regenerating} />
                <Forms.FormText className={Margins.top8}>
                    Would you like to use this status message?
                </Forms.FormText>
            </ModalContent>

            <ModalFooter>
                <Flex cellSpacing={10}>
                    <Button color={Button.Colors.RED} disabled={regenerating} onClick={regenerateStatus}>
                        Regenerate
                    </Button>
                    <Button color={Button.Colors.GREEN} disabled={regenerating} onClick={applyStatus}>
                        Apply
                    </Button>
                </Flex>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    style={{ left: 15, position: "absolute" }}
                    onClick={props.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
};

// The main task responsible for generating statuses daily
let dailyStatusTask: any = null;

export default definePlugin({
    name: "dAIlystatus",
    description: "Generate funny status messages daily with ChatGPT",
    authors: [Devs.Disyer, Devs.Sayuri],
    dependencies: ["SettingsStoreAPI"],
    options: {
        apiEndpoint: {
            description: "ChatGPT API endpoint",
            type: OptionType.STRING,
            default: "https://free.churchless.tech/v1/chat/completions"
        },
        apiKey: {
            description: "ChatGPT API key",
            type: OptionType.STRING,
            default: ""
        },
        model: {
            description: "ChatGPT model",
            type: OptionType.SELECT,
            options: [
                { label: "GPT-4", value: "gpt-4" },
                { label: "GPT-3.5", value: "gpt-3.5-turbo", default: true },
                { label: "DaVinci", value: "text-davinci-003" },
                { label: "Curie", value: "text-curie-001" },
                { label: "Babbage", value: "text-babbage-001" },
                { label: "Ada", value: "text-ada-001" },
            ],
        },
        prompt: {
            description: "ChatGPT prompt to use",
            type: OptionType.STRING,
            default: "Please generate a funny Discord status message for me."
        },
        automatic: {
            description: "Fully automatic daily status message generation without asking",
            type: OptionType.BOOLEAN,
            default: false
        }
    },
    toolboxActions: {
        "Generate new ChatGPT status message"() {
            beginStatusGeneration();
        }
    },

    async start() {
        // Check the current day. If we haven't generated a status today, begin the generation
        const previousDay = await DataStore.get<number>("dAIlystatus_previousDay");
        const currentDay = calculateDay();

        if (!previousDay || previousDay < currentDay) {
            // We haven't generated a status today, begin the generation
            await beginStatusGeneration();
        }

        // Schedule the next generation task for the next day
        dailyStatusTask = setTimeout(beginStatusGeneration, calculateMillisecondsToNextDay());
    },

    stop() {
        // Clear the next status generation task
        if (dailyStatusTask) {
            clearTimeout(dailyStatusTask);
        }
    }
});
