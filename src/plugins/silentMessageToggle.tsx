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

import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, React, Tooltip } from "@webpack/common";

function SilentMessageToggle(chatBoxProps: {
    type: {
        analyticsName: string;
    };
}) {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        const listener: SendListener = (_, message) => {
            if (enabled) {
                setEnabled(false);
                if (!message.content.startsWith("@silent ")) message.content = "@silent " + message.content;
            }
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (chatBoxProps.type.analyticsName !== "normal") return null;

    return (
        <Tooltip text={enabled ? "Disable Silent Message" : "Enable Silent Message"}>
            {tooltipProps => (
                <div style={{ display: "flex" }}>
                    <Button
                        {...tooltipProps}
                        onClick={() => setEnabled(prev => !prev)}
                        size=""
                        look={ButtonLooks.BLANK}
                        innerClassName={ButtonWrapperClasses.button}
                        style={{ margin: "0px 8px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                            >
                                <g fill="currentColor">
                                    <path d="M18 10.7101C15.1085 9.84957 13 7.17102 13 4C13 3.69264 13.0198 3.3899 13.0582 3.093C12.7147 3.03189 12.3611 3 12 3C8.686 3 6 5.686 6 9V14C6 15.657 4.656 17 3 17V18H21V17C19.344 17 18 15.657 18 14V10.7101ZM8.55493 19C9.24793 20.19 10.5239 21 11.9999 21C13.4759 21 14.7519 20.19 15.4449 19H8.55493Z" />
                                    <path d="M18.2624 5.50209L21 2.5V1H16.0349V2.49791H18.476L16 5.61088V7H21V5.50209H18.2624Z" />
                                    {!enabled && <line x1="22" y1="2" x2="2" y2="22" stroke="var(--red-500)" stroke-width="2.5" />}
                                </g>
                            </svg>
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "SilentMessageToggle",
    authors: [Devs.Nuckyz],
    description: "Adds a button to the chat bar to toggle sending a silent message.",
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /"gift"\)\);(?<=(\i)\.push.+?disabled:(\i),.+?)/,
                replace: (m, array, disabled) => `${m};try{${disabled}||${array}.push($self.SilentMessageToggle(arguments[0]));}catch{}`
            }
        }
    ],

    SilentMessageToggle: ErrorBoundary.wrap(SilentMessageToggle, { noop: true }),
});
