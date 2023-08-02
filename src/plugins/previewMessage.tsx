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
import { findStoreLazy } from "@webpack";
import { Button, ButtonLooks, ButtonWrapperClasses, SelectedChannelStore, Tooltip } from "@webpack/common";

const DraftStore = findStoreLazy("DraftStore");
const DRAFT_TYPE = 0;


interface Props {
    type: {
        analyticsName: string;
    };
}

export function PreviewButton(chatBoxProps: Props) {
    if (chatBoxProps.type.analyticsName !== "normal") return null;

    return (
        <Tooltip text="Preview Message">
            {(tooltipProps: any) => (
                <Button
                    {...tooltipProps}
                    onClick={() => {
                        const channelId = SelectedChannelStore.getChannelId();
                        const draft = DraftStore.getDraft(channelId, DRAFT_TYPE);
                        if (!draft) return;
                        sendBotMessage(channelId, {
                            content: draft,
                        });
                    }}
                    disabled={DraftStore.getDraft(SelectedChannelStore.getChannelId(), DRAFT_TYPE).length === 0}
                    size=""
                    look={ButtonLooks.BLANK}
                    innerClassName={ButtonWrapperClasses.button}
                    style={{ padding: "0 2px", height: "100%" }}
                >
                    <div className={ButtonWrapperClasses.buttonWrapper}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width={24} height={24}>
                            <ellipse fill="#F5F8FA" cx="8.828" cy="18" rx="7.953" ry="13.281" />
                            <path fill="#E1E8ED" d="M8.828 32.031C3.948 32.031.125 25.868.125 18S3.948 3.969 8.828 3.969 17.531 10.132 17.531 18s-3.823 14.031-8.703 14.031zm0-26.562C4.856 5.469 1.625 11.09 1.625 18s3.231 12.531 7.203 12.531S16.031 24.91 16.031 18 12.8 5.469 8.828 5.469z" />
                            <circle fill="#8899A6" cx="6.594" cy="18" r="4.96" />
                            <circle fill="#292F33" cx="6.594" cy="18" r="3.565" />
                            <circle fill="#F5F8FA" cx="7.911" cy="15.443" r="1.426" />
                            <ellipse fill="#F5F8FA" cx="27.234" cy="18" rx="7.953" ry="13.281" />
                            <path fill="#E1E8ED" d="M27.234 32.031c-4.88 0-8.703-6.163-8.703-14.031s3.823-14.031 8.703-14.031S35.938 10.132 35.938 18s-3.824 14.031-8.704 14.031zm0-26.562c-3.972 0-7.203 5.622-7.203 12.531 0 6.91 3.231 12.531 7.203 12.531S34.438 24.91 34.438 18 31.206 5.469 27.234 5.469z" />
                            <circle fill="#8899A6" cx="25" cy="18" r="4.96" />
                            <circle fill="#292F33" cx="25" cy="18" r="3.565" />
                            <circle fill="#F5F8FA" cx="26.317" cy="15.443" r="1.426" />
                        </svg>
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
