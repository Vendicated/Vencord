/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";
import { Button, ButtonLooks, ButtonWrapperClasses, Tooltip } from "@webpack/common";

import { settings } from "./settings";
import { TranslateModal } from "./TranslateModal";
import { cl } from "./utils";

export function TranslateIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
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
}

export const TranslateChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    const { autoTranslate } = settings.use(["autoTranslate"]);
    const { autoFluent } = settings.use(["autoFluent"]);

    if (!isMainChat) return null;

    const toggle = () => settings.store.autoTranslate = !autoTranslate;
    const toggle2 = () => settings.store.autoFluent = !autoFluent;

    return (
        <Tooltip text="Open Translate Modal">
            {({ onMouseEnter, onMouseLeave }) => (
                <div style={{ display: "flex" }}>
                    <Button
                        aria-haspopup="dialog"
                        aria-label="Open Translate Modal"
                        size=""
                        look={ButtonLooks.BLANK}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        innerClassName={ButtonWrapperClasses.button}
                        onClick={e => {
                            if (e.shiftKey) return toggle();

                            if (e.ctrlKey) return toggle2();

                            openModal(props => (
                                <TranslateModal rootProps={props} />
                            ));
                        }}
                        onContextMenu={() => toggle()}
                        onAuxClick={e => { if (e.button === 1) toggle2(); }}
                        style={{ padding: "0 4px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <TranslateIcon className={cl({ "auto-translate": autoTranslate, "auto-fluent": autoFluent })} />
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
};
