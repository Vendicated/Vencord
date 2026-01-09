/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./UIElements.css";

import { ChatBarButtonMap } from "@api/ChatButtons";
import { MessagePopoverButtonMap } from "@api/MessagePopover";
import { SettingsPluginUiElements, useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Card } from "@components/Card";
import { PlaceholderIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Clickable, useCallback, useEffect, useRef, useState } from "@webpack/common";
import { ReactNode } from "react";

interface RowProps {
    id: string;
    index: number;
    moveRow: (from: number, to: number) => void;
    children: ReactNode;
}

interface DragItem {
    id: string;
    index: number;
}

const cl = classNameFactory("vc-plugin-ui-elements-");

const useDrag = findByCodeLazy("useDrag", ".collect");
const useDrop = findByCodeLazy("options)", ".collect");

const UI_ELEMENT_TYPE = "ui-element";

export function DraggableRow({
    id,
    index,
    moveRow,
    children,
}: RowProps) {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: UI_ELEMENT_TYPE,
        hover(item: DragItem, monitor: any) {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const rect = ref.current.getBoundingClientRect();
            const middleY = (rect.bottom - rect.top) / 2;
            const offsetY = monitor.getClientOffset()!.y - rect.top;

            if (
                (dragIndex < hoverIndex && offsetY < middleY) ||
                (dragIndex > hoverIndex && offsetY > middleY)
            ) {
                return;
            }

            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: UI_ELEMENT_TYPE,
        item: { id, index },
        collect: (monitor: any) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Only the handle is draggable
    drag(handleRef);
    drop(ref);

    return (
        <div
            ref={ref}
            className={cl("switches-row-wrapper")}
            data-dragging={isDragging}
        >
            <div
                ref={handleRef}
                className={cl("drag-handle")}
                aria-hidden
            >
                ⠿
            </div>

            {children}
        </div>
    );
}


export function getOrderedNames(buttonMap: Map<string, any>, settings: SettingsPluginUiElements) {
    const known = new Set(buttonMap.keys());
    const ordered = Object.keys(settings).filter(k => known.has(k));
    for (const name of known) {
        if (!ordered.includes(name)) {
            ordered.push(name);
        }
    }

    return ordered;
}

export function UIElementsButton() {
    return (
        <Clickable onClick={() => openModal(modalProps => <UIElementsModal {...modalProps} />)}>
            <Card className={cl("button")} defaultPadding>
                <div className={cl("button-description")}>
                    <Paragraph size="md" weight="semibold">
                        Manage plugin UI elements
                    </Paragraph>
                    <Paragraph size="xs">
                        Allows you to hide buttons you don't like
                    </Paragraph>
                </div>
                <svg
                    className={cl("button-arrow")}
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                >
                    <path fill="currentColor" d="M9.3 5.3a1 1 0 0 0 0 1.4l5.29 5.3-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6a1 1 0 0 0-1.42 0Z" />
                </svg>
            </Card>
        </Clickable >
    );
}

function Section(props: {
    title: string;
    description: string;
    settings: SettingsPluginUiElements;
    buttonMap: Map<string, { icon: IconComponent }>;
}) {
    const { buttonMap, description, title, settings } = props;

    const [order, setOrder] = useState(() =>
        getOrderedNames(buttonMap, settings)
    );

    useEffect(() => {
        setOrder(getOrderedNames(buttonMap, settings));
    }, [buttonMap, settings]);

    const moveRow = useCallback((from: number, to: number) => {
        setOrder(prev => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);

            // Persist order into settings (same as before)
            const reordered: SettingsPluginUiElements = {};
            for (const name of next) {
                reordered[name] = settings[name] ?? {};
            }

            Object.keys(settings).forEach(k => delete settings[k]);
            Object.assign(settings, reordered);

            return next;
        });
    }, [settings]);

    return (
        <section>
            <BaseText tag="h3" size="xl" weight="bold">
                {title}
            </BaseText>

            <Paragraph
                size="sm"
                className={classes(Margins.top8, Margins.bottom20)}
            >
                {description}
            </Paragraph>

            <div className={cl("switches")}>
                {order.map((name, index) => {
                    const Icon = buttonMap.get(name)?.icon ?? PlaceholderIcon;

                    return (
                        <DraggableRow key={name} id={name} index={index} moveRow={moveRow}>
                            <Paragraph size="md" weight="semibold" className={cl("switches-row")}>
                                <Icon height={20} width={20} />
                                {name}
                                <Switch
                                    checked={settings[name]?.enabled ?? true}
                                    onChange={v => {
                                        settings[name] ??= {} as any;
                                        settings[name].enabled = v;
                                    }}
                                />
                            </Paragraph>
                        </DraggableRow>
                    );
                })}
            </div>
        </section>
    );
}

function UIElementsModal(props: ModalProps) {
    const { uiElements } = useSettings(["uiElements.*"]);

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalContent className={cl("modal-content")}>
                <Section
                    title="Chatbar Buttons"
                    description="These are the buttons on the right side of the chat input bar"
                    buttonMap={ChatBarButtonMap}
                    settings={uiElements.chatBarButtons}
                />
                <Section
                    title="Message Popover Buttons"
                    description="These are the floating buttons on the right when you hover over a message"
                    buttonMap={MessagePopoverButtonMap}
                    settings={uiElements.messagePopoverButtons}
                />
            </ModalContent>
        </ModalRoot>
    );
}
