/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import { Button, Text, TooltipContainer, useCallback, useEffect, useState } from "@webpack/common";
import * as t from "@webpack/types";

import { openSaveModal } from "./saveModal";
import { cssColors, iconSizes, IconTooltip } from "./utils";



function ModalComponent(props) {
    const [color, SetColor] = useState(187);
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
    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [onKeyDown]);
    const { iconName, Icon }: { iconName: string; Icon: t.Icon; } = props;
    return (<ModalRoot {...props} size={ModalSize.MEDIUM} className="vc-ic-modals-root vc-ic-icon-modal-root">
        <ModalHeader>
            <Text variant="heading-lg/semibold" style={{ flexGrow: 1, display: "flex" }}><IconTooltip copy={iconName} className={classes(Margins.right8, "vc-icon-modal-color-tooltip")}>{iconName}</IconTooltip> - <IconTooltip copy={cssColors[color]?.css} className={classes(Margins.left8, "vc-icon-modal-color-tooltip")}>{cssColors[color]?.name}</IconTooltip></Text>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent>
            <div className="vc-icon-modal-main-container">
                <div className="vc-icon-display-box" aria-label={cssColors[color].name} aria-key={cssColors[color]?.key}>
                    <Icon className="vc-icon-modal-icon" color={cssColors[color].css} />
                </div>
                <div className="vc-icon-other-icon-sizes">
                    {iconSizes.map((size, idx) =>
                        <TooltipContainer text={`${size} size`}>
                            <Icon className="vc-icon-modal-size-ex-icon" size={size as any} color={cssColors[color]?.css} style={{
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
        </ModalFooter>
    </ModalRoot>);
}

export function openIconModal(iconName: string, Icon: t.Icon) {
    openModal(props => <ModalComponent iconName={iconName} Icon={Icon} {...props} />);
}

