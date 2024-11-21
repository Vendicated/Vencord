/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, React, useState } from "@webpack/common";

import WebUntisAPI from "./api/untisApi";




interface ActivityAssets {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
}

interface Activity {
    state?: string;
    details?: string;
    timestamps?: {
        start?: number;
        end?: number;
    };
    assets?: ActivityAssets;
    buttons?: Array<string>;
    name: string;
    application_id: string;
    metadata?: {
        button_urls?: Array<string>;
    };
    type: ActivityType;
    url?: string;
    flags: number;
}

const enum ActivityType {
    PLAYING = 0,
    STREAMING = 1,
    LISTENING = 2,
    WATCHING = 3,
    COMPETING = 5
}

const enum TimestampMode {
    NONE,
    NOW,
    TIME,
    CUSTOM,
}



const settings = definePluginSettings({
    Key: {
        type: OptionType.STRING,
        name: "Key",
        description: "Your user key (required)",
        defaultValue: "XXXXXXXXXXXXXXXX"
    },
    School: {
        type: OptionType.STRING,
        name: "School",
        description: "Your school name (required)",
        defaultValue: "your-school"
    },
    UntisUsername: {

        type: OptionType.STRING,
        name: "Username for untis",
        description: "Its your untis username",
    },
    Untisver: {
        type: OptionType.STRING,
        name: "Untis Version",
        description: "Your untis version",
        defaultValue: ""
    },
    UntisType: {
        type: OptionType.SELECT,
        description: "What time table do you want to use",
        options: [
            {
                label: "Student",
                value: "STUDENT",
                default: true
            },
            {
                label: "Class",
                value: "CLASS"
            },
            {
                label: "Room",
                value: "ROOM"
            }
        ]
    },
    AppID: {
        type: OptionType.STRING,
        name: "App ID",
        description: "Your Discord Bot application ID (required for Discord RPC)",
        defaultValue: ""
    },
    EnableDiscordRPC: {
        type: OptionType.BOOLEAN,
        name: "Enable Discord RPC",
        description: "Show your current lesson for others on Discord in the Rich Presence",
        defaultValue: true,
        onChange: onChange
    },
    type: {
        type: OptionType.SELECT,
        description: "Activity type",
        onChange: onChange,
        options: [
            {
                label: "Playing",
                value: ActivityType.PLAYING,
                default: true
            },
            {
                label: "Streaming",
                value: ActivityType.STREAMING
            },
            {
                label: "Listening",
                value: ActivityType.LISTENING
            },
            {
                label: "Watching",
                value: ActivityType.WATCHING
            },
            {
                label: "Competing",
                value: ActivityType.COMPETING
            }
        ]
    },
    Name: {
        type: OptionType.STRING,
        name: "Name",
        defaultValue: "{lesson} with {teacher}",
        description: "The name of the activity"
    },
    Description: {
        type: OptionType.STRING,
        name: "Description",
        defaultValue: "In room {room}",
        description: "The description of the activity"
    }
});



function onChange() {
}

const UntisAPIPlugin: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleButtonClick = async () => {

        const webUntis = new WebUntisAPI(
            settings.store.School || "defaultSchool",
            settings.store.UntisUsername || "defaultUsername",
            settings.store.Key || "defaultKey",
            settings.store.Untisver || "defaultVersion",
            settings.store.UntisType || "defaultType"
        );
        setIsOpen(!isOpen);



        try {
            // Authenticate the WebUntisAPI instance

            console.log("Fetching timetable...");
            const currentlessen = await webUntis.getCurrentLesson(1);
            if (!currentlessen) {
                console.log("No lesson found");

            } else {
                FluxDispatcher.dispatch({
                    type: "LOCAL_ACTIVITY_UPDATE",
                    activity: {
                        application_id: "",
                        flags: 1,
                        name: "Untericht",
                        details: "Grad in einer stunde",
                        type: 0,

                    },
                    socketId: "CustomRPC",
                });


                // set rpc


            }
        } catch (error) {
            console.error("Error fetching timetable:", error);
        }
    };


    return (
        <div>
            <style>
                {`
        #search-button {
            width: 40px; /* Adjust for desired size */
            height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: none; /* Ensures no background */
            border: none; /* Removes border if any */
        }
        #search-buttonsvg {
            background: none; /* Removes any default white background */
            width: 40px; /* Adjust size as needed */
            height: 40px;
            align-items: center;
        }
        `}
            </style>
            <button id="search-button" onClick={handleButtonClick}>
                <svg className="search-buttonsvg" viewBox="0 0 24 24" fill="#b5bac1">
                    <path className="st0" d="M12,0C5.37,0,0,5.37,0,12s5.37,12,12,12,12-5.37,12-12S18.63,0,12,0ZM1.53,12.33v-.67h3.89v.67H1.53ZM4.83,19.64l-.47-.47,2.75-2.75.47.47-2.75,2.75ZM7.11,7.58l-2.75-2.75.47-.47,2.75,2.75-.47.47ZM12.33,22.47h-.67v-3.89h.67v3.89ZM19.17,19.64l-2.75-2.75.47-.47,2.75,2.75-.47.47ZM11,12V2.53c.39-.39.61-.61,1-1,.39.39.61.61,1,1v6.05l4.8-4.8h1.42v1.42l-4.8,4.8h7.05c.39.39.61.61,1,1-.39.39-.61.61-1,1h-10.47Z" />
                </svg>
            </button>
        </div>
    );
};

export default definePlugin({
    name: "UntisAPI",
    description: "Show your current lesson in Discord",
    authors: [Devs.Leonlp9, Devs.minikomo],
    settings,
    component: UntisAPIPlugin, // Use the UntisAPIPlugin component
    async start() {
        addChatBarButton("UntisAPI", () => <UntisAPIPlugin />); // Add a chat bar button to open the UntisAPIPlugin component

    },
    stop() {
        removeChatBarButton("UntisAPI"); // Remove the chat bar button when the plugin is stopped
    }
});
