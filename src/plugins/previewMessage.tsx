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

import { sendBotMessage } from "@api/Commands";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, DraftStore, SelectedChannelStore, Tooltip } from "@webpack/common";
const DRAFT_TYPE = 0;

interface Props {
    type: {
        analyticsName: string;
    };
}

export function PreviewButton(chatBoxProps: Props) {
    if (chatBoxProps.type.analyticsName !== "normal") return null;
    const channelId = SelectedChannelStore.getChannelId();
    const draft = DraftStore.getDraft(channelId, DRAFT_TYPE);
    if (!draft) return null;

    return (
        <Tooltip text="Preview Message">
            {tooltipProps => (
                <Button
                    {...tooltipProps}
                    onClick={
                        () =>
                            sendBotMessage(channelId, { content: draft, })
                    }
                    size=""
                    look={ButtonLooks.BLANK}
                    innerClassName={ButtonWrapperClasses.button}
                    style={{ padding: "0 2px", height: "100%" }}
                >
                    <div className={ButtonWrapperClasses.buttonWrapper}>
                        <img width={24} height={24} src="https://discord.com/assets/4c5a77a89716352686f590a6f014770c.svg" />
                    </div>
                </Button>
            )}
        </Tooltip>
    );

}

export default definePlugin({
    name: "PreviewMessage",
    description: "Lets you preview your message before sending it.",
    authors: [Devs.Aria],
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&;try{$2||$1.unshift($self.previewIcon(arguments[0]))}catch{}",
            }
        },
    ],

    previewIcon: ErrorBoundary.wrap(PreviewButton, { noop: true }),
});
