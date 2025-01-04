/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";
import { JSX } from "react";

import { cl } from "../";
import Grid, { GridProps } from "./Grid";

const ScrollerClasses = findByPropsLazy("managedReactiveScroller");

type Section<SectionT, ItemT> = SectionT & {
    items: Array<ItemT>;
};

interface SectionedGridListProps<ItemT, SectionT, SectionU = Section<SectionT, ItemT>> extends Omit<GridProps<ItemT>, "items"> {
    renderSectionHeader: (section: SectionU) => JSX.Element;
    getSectionKey: (section: SectionU) => string;
    sections: SectionU[];
}

export default function SectionedGridList<ItemT, SectionU,>(props: SectionedGridListProps<ItemT, SectionU>) {
    return <div className={classes(cl("sectioned-grid-list-container"), ScrollerClasses.thin)}>
        {props.sections.map(section => <div key={props.getSectionKey(section)} className={cl("sectioned-grid-list-section")}>
            {props.renderSectionHeader(section)}
            <Grid
                renderItem={props.renderItem}
                getItemKey={props.getItemKey}
                itemKeyPrefix={props.getSectionKey(section)}
                items={section.items}
            />
        </div>)}
    </div>;
}
