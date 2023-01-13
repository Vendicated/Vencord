/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Settings, useSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, FluxDispatcher, React, Tooltip } from "@webpack/common";

interface SilentTypingSettings {
    enabled: boolean;
    showIcon: boolean;
    isEnabled: boolean;
}
const getSettings = () => Settings.plugins.SilentTyping as SilentTypingSettings;

function SilentTypingToggle() {
    const { isEnabled } = useSettings(["plugins.SilentTyping.isEnabled"]).plugins.SilentTyping as SilentTypingSettings;
    const toggle = () => getSettings().isEnabled = !getSettings().isEnabled;

    return (
        <Tooltip text={isEnabled ? "Disable silent typing" : "Enable silent typing"}>
            {(tooltipProps: any) => (
                <div style={{ display: "flex" }}>
                    <Button
                        {...tooltipProps}
                        onClick={toggle}
                        size=""
                        look={ButtonLooks.BLANK}
                        innerClassName={ButtonWrapperClasses.button}
                        style={{ margin: "0 8px 0" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
                                <path fill="currentColor" d="M528 448H48c-26.51 0-48-21.49-48-48V112c0-26.51 21.49-48 48-48h480c26.51 0 48 21.49 48 48v288c0 26.51-21.49 48-48 48zM128 180v-40c0-6.627-5.373-12-12-12H76c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm-336 96v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm-336 96v-40c0-6.627-5.373-12-12-12H76c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12zm288 0v-40c0-6.627-5.373-12-12-12H172c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h232c6.627 0 12-5.373 12-12zm96 0v-40c0-6.627-5.373-12-12-12h-40c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h40c6.627 0 12-5.373 12-12z" />
                                {isEnabled && <path d="M13 432L590 48" stroke="var(--status-red-500)" stroke-width="72" stroke-linecap="round" />}
                            </svg>
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "SilentTyping",
    authors: [Devs.Ven, Devs.dzshn],
    description: "Hide that you are typing",
    patches: [
        {
            find: "startTyping:",
            replacement: {
                match: /startTyping:.+?,stop/,
                replace: "startTyping:$self.startTyping,stop"
            }
        },
        {
            find: ".activeCommandOption",
            predicate: () => getSettings().showIcon,
            replacement: {
                match: /\i=\i\.activeCommand,\i=\i\.activeCommandOption,.{1,133}(.)=\[\];/,
                replace: "$&;$1.push($self.chatBarIcon());",
            }
        },
    ],
    dependencies: ["CommandsAPI"],
    options: {
        showIcon: {
            type: OptionType.BOOLEAN,
            default: false,
            description: "Show an icon for toggling the plugin",
            restartNeeded: true,
        },
    },
    commands: [{
        name: "silenttype",
        description: "Toggle whether you're hiding that you're typing or not.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "value",
                description: "whether to hide or not that you're typing (default is toggle)",
                required: false,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
        ],
        execute: async (args, ctx) => {
            getSettings().isEnabled = !!findOption(args, "value", !getSettings().isEnabled);
            sendBotMessage(ctx.channel.id, {
                content: getSettings().isEnabled ? "Silent typing enabled!" : "Silent typing disabled!",
            });
        },
    }],

    start() {
        getSettings().isEnabled ??= true;
    },

    async startTyping(channelId: string) {
        if (getSettings().isEnabled) return;
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    },

    chatBarIcon: ErrorBoundary.wrap(SilentTypingToggle, { noop: true }),
});
