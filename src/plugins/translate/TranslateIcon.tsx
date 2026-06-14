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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { TooltipContainer } from "@components/TooltipContainer";
import { classes } from "@utils/misc";
import { IconComponent } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
import { ConfirmModal,openModal, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { openTranslateModal } from "./TranslateModal";
import { cl } from "./utils";

export const TranslateIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return (
        <svg
            viewBox="0 96 960 960"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill="currentColor" d="m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z" />
        </svg>
    );
};

export let setShouldShowTranslateEnabledTooltip: undefined | ((show: boolean) => void);

function AutoTranslateConfirmModal(props: RenderModalProps) {
    const s = settings.use(["dismissedAutoTranslateAlert"]);

    return (
        <ConfirmModal
            {...props}
            title="Vencord Auto-Translate Enabled"
            subtitle="You just enabled Auto Translate! Any message will automatically be translated before being sent."
            confirmText="Disable Auto-Translate"
            onConfirm={() => settings.store.autoTranslate = false}
            cancelText="Got it"
            variant="primary"
            checkboxProps={{
                checked: s.dismissedAutoTranslateAlert === true,
                onChange: checked => s.dismissedAutoTranslateAlert = checked,
            }}
        />
    );
}

export const TranslateChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    const { autoTranslate } = settings.use(["autoTranslate"]);

    const [shouldShowTranslateEnabledTooltip, setter] = useState(false);
    useEffect(() => {
        setShouldShowTranslateEnabledTooltip = setter;
        return () => setShouldShowTranslateEnabledTooltip = undefined;
    }, []);

    if (!isMainChat) return null;

    const toggle = () => {
        const newState = !autoTranslate;
        settings.store.autoTranslate = newState;
        if (newState && !settings.store.dismissedAutoTranslateAlert)
            openModal(props => <AutoTranslateConfirmModal {...props} />);
    };

    const button = (
        <ChatBarButton
            tooltip="Open Translate Modal"
            onClick={e => {
                if (e.shiftKey) return toggle();
                else openTranslateModal();
            }}
            onContextMenu={toggle}
            buttonProps={{
                "aria-haspopup": "dialog"
            }}
        >
            <TranslateIcon className={cl({ "auto-translate": autoTranslate, "chat-button": true })} />
        </ChatBarButton>
    );

    if (shouldShowTranslateEnabledTooltip && settings.store.showAutoTranslateTooltip)
        return (
            <TooltipContainer text="Auto Translate Enabled" forceOpen>
                {button}
            </TooltipContainer>
        );

    return button;
};
