/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { CategoryImageProps, StickerCategoryProps } from "../types";
import { cl } from "../utils";

export function CategoryImage({ src, alt, isActive }: CategoryImageProps) {
    return (
        <div>
            <svg width={32} height={32} style={{
                display: "block",
                contain: "paint",
                overflow: "hidden",
                overflowClipMargin: "content-box",
            }}>
                <foreignObject
                    className={
                        cl("foreign-object") + (
                            isActive ?
                                ` ${cl("foreign-object-active")}`
                                : ""
                        )
                    }

                    x={0} y={0}
                    width={32}
                    height={32}
                    overflow="visible"
                >
                    <img
                        src={src}
                        alt={alt}
                        width={32}
                        height={32}
                    />
                </foreignObject>
            </svg>
        </div>
    );
}

export function CategoryScroller(props: { children: React.ReactNode, categoryLength: number; }) {
    const children = Array.isArray(props.children) ? props.children : [props.children];

    return (
        <div className={cl("category-scroller")}>
            <div>{
                children.map(child => (
                    <div role="listitem">
                        {child}
                    </div>
                ))
            }</div>
            <div style={{ height: `${Math.round(41.75 * (props.categoryLength + 1))}px` }}></div>
            <div aria-hidden="true"></div>
        </div>
    );
}

export function CategoryWrapper(props: { children: JSX.Element | JSX.Element[]; }) {
    return (
        <div className={cl("category-wrapper")}>
            {props.children}
        </div>
    );
}

export function StickerCategory(props: StickerCategoryProps) {
    return (
        <div
            style={props.style}
            className={
                cl("sticker-category") +
                (props.isActive ? ` ${cl("sticker-category-active")}` : "")
            }
            tabIndex={0}
            role="button"
            onClick={props.onClick}
        >
            {props.children}
        </div>
    );
}
