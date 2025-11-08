/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./index.css";

import { classNameFactory } from "@api/Styles";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";

interface KeywordsModalProps {
    keywords: Record<string, string>;
    title: string;
    modalProps: any;
}

export function IndicatorsModal({ keywords, title, modalProps }: KeywordsModalProps) {
    const cl = classNameFactory("vc-keyword-highlighter-");

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <div id={cl("modal")}>
                <h1>{title}</h1>
                <div className={cl("indicator-container")}>
                    <ul className={cl("indicator-links")}>
                        {Object.entries(keywords).map(([item, tooltip]) => (
                            <li className={cl("tones-list-items")} key={item}>
                                <span className={cl("item")} style={{ fontWeight: 600 }}>{item}</span>
                                <div className={cl("item-separator")}>-</div>
                                <span>{tooltip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </ModalRoot>
    );
}

export const openIndicatorsModal = (keywords: Record<string, string>, title: string) => openModal(modalProps => <IndicatorsModal keywords={keywords} title={title} modalProps={modalProps} />);
