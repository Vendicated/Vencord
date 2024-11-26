/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ChatButton.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { waitFor } from "@webpack";
import { Button, ButtonLooks, ButtonWrapperClasses, Tooltip } from "@webpack/common";
import { Channel } from "discord-types/general";
import { HTMLProps, MouseEventHandler, ReactNode } from "react";

let ChannelTextAreaClasses: Record<"button" | "buttonContainer", string>;
waitFor(["buttonContainer", "channelTextArea"], m => ChannelTextAreaClasses = m);

export interface ChatBarProps {
    channel: Channel;
    disabled: boolean;
    isEmpty: boolean;
    type: {
        analyticsName: string;
        attachments: boolean;
        autocomplete: {
            addReactionShortcut: boolean,
            forceChatLayer: boolean,
            reactions: boolean;
        },
        commands: {
            enabled: boolean;
        },
        drafts: {
            type: number,
            commandType: number,
            autoSave: boolean;
        },
        emojis: {
            button: boolean;
        },
        gifs: {
            button: boolean,
            allowSending: boolean;
        },
        gifts: {
            button: boolean;
        },
        permissions: {
            requireSendMessages: boolean;
        },
        showThreadPromptOnReply: boolean,
        stickers: {
            button: boolean,
            allowSending: boolean,
            autoSuggest: boolean;
        },
        users: {
            allowMentioning: boolean;
        },
        submit: {
            button: boolean,
            ignorePreference: boolean,
            disableEnterToSubmit: boolean,
            clearOnSubmit: boolean,
            useDisabledStylesOnSubmit: boolean;
        },
        uploadLongMessages: boolean,
        upsellLongMessages: {
            iconOnly: boolean;
        },
        showCharacterCount: boolean,
        sedReplace: boolean;
    };
}

export type ChatBarButton = (props: ChatBarProps & { isMainChat: boolean; }) => JSX.Element | null;

const buttonFactories = new Map<string, ChatBarButton>();
const logger = new Logger("ChatButtons");

export function _injectButtons(buttons: ReactNode[], props: ChatBarProps) {
    if (props.disabled) return;

    for (const [key, Button] of buttonFactories) {
        buttons.push(
            <ErrorBoundary noop key={key} onError={e => logger.error(`Failed to render ${key}`, e.error)}>
                <Button {...props} isMainChat={props.type.analyticsName === "normal"} />
            </ErrorBoundary>
        );
    }
}

export const addChatBarButton = (id: string, button: ChatBarButton) => buttonFactories.set(id, button);
export const removeChatBarButton = (id: string) => buttonFactories.delete(id);

export interface ChatBarButtonProps {
    children: ReactNode;
    tooltip: string;
    onClick: MouseEventHandler<HTMLButtonElement>;
    onContextMenu?: MouseEventHandler<HTMLButtonElement>;
    onAuxClick?: MouseEventHandler<HTMLButtonElement>;
    buttonProps?: Omit<HTMLProps<HTMLButtonElement>, "size" | "onClick" | "onContextMenu" | "onAuxClick">;
}
export const ChatBarButton = ErrorBoundary.wrap((props: ChatBarButtonProps) => {
    return (
        <Tooltip text={props.tooltip}>
            {({ onMouseEnter, onMouseLeave }) => (
                <div className={`expression-picker-chat-input-button ${ChannelTextAreaClasses?.buttonContainer ?? ""} vc-chatbar-button`}>
                    <Button
                        aria-label={props.tooltip}
                        size=""
                        look={ButtonLooks.BLANK}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        innerClassName={`${ButtonWrapperClasses.button} ${ChannelTextAreaClasses?.button}`}
                        onClick={props.onClick}
                        onContextMenu={props.onContextMenu}
                        onAuxClick={props.onAuxClick}
                        {...props.buttonProps}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            {props.children}
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
}, { noop: true });
