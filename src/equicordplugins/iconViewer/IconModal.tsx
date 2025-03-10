/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import { Button, FluxDispatcher, TooltipContainer, useCallback, useEffect, useState } from "@webpack/common";
import * as t from "@webpack/types";

import { IconsFinds } from "./names";
import { openRawModal } from "./rawModal";
import { openSaveModal } from "./saveModal";
import { ModalHeaderTitle } from "./subComponents";
import { _cssColors, cssColors, iconSizes } from "./utils";

const defaultColor = 209;


function ModalComponent(props: { iconName: string; Icon: t.Icon; } & ModalProps) {
    const [color, SetColor] = useState(defaultColor);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            if (e.key === "ArrowLeft") {
                SetColor(color + -1);
            } else if (e.key === "ArrowRight") {
                SetColor(color + 1);
            }
        }
    }, [color]);

    const onColorChange = useCallback((e: { type: string; color: string; }) => {
        SetColor(_cssColors.indexOf(e.color));
    }, [color]);

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        // @ts-ignore
        FluxDispatcher.subscribe("ICONVIEWER_COLOR_CHANGE", onColorChange);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            // @ts-ignore
            FluxDispatcher.unsubscribe("ICONVIEWER_COLOR_CHANGE", onColorChange);
        };
    }, [onKeyDown]);
    if (color < 0 || color >= cssColors.length) {
        SetColor(0);
    }
    const { iconName, Icon } = props;
    return (<ModalRoot {...props} size={ModalSize.DYNAMIC} className="vc-ic-modals-root vc-ic-icon-modal-root">
        <ModalHeader>
            <ModalHeaderTitle iconName={iconName} color={color} name="icon" />
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent>
            {IconsFinds[iconName] ?
                <div className="vc-icon-modal-codeblock">
                    <CodeBlock lang="ts" content={`const ${iconName + "Icon"} = findComponentByCode(${JSON.stringify(IconsFinds[iconName])})`} />
                </div>
                : null
            }
            <div className="vc-icon-modal-main-container">
                <div className="vc-icon-display-box" aria-label={cssColors[color]?.name}>
                    <Icon className="vc-icon-modal-icon" color={cssColors[color]?.css} />
                </div>
                <div className="vc-icon-other-icon-sizes">
                    {iconSizes.map((size, idx) =>
                        <TooltipContainer text={`${size} size`} key={`vc-iv-size-${size}-${idx}`}>
                            <Icon className="vc-icon-modal-size-ex-icon" size={size} color={cssColors[color]?.css} style={{
                                marginLeft: "25px"
                            }} />
                        </TooltipContainer>
                    )}
                </div>
            </div>
        </ModalContent>
        <ModalFooter className="vc-ic-modals-footer">
            <Button
                color={Button.Colors.BRAND}
                onClick={() => openSaveModal(iconName, Icon, color)}
            >
                Save as
            </Button>
            <Button
                color={Button.Colors.YELLOW}
                className={classes(Margins.right8, "vc-iv-raw-modal-button")}
                onClick={() => openRawModal(iconName, Icon, color)}
            >
                Raw
            </Button>
        </ModalFooter>
    </ModalRoot>);
}

export function openIconModal(iconName: string, Icon: t.Icon) {
    openModal(props => <ModalComponent iconName={iconName} Icon={Icon} {...props} />);
}

