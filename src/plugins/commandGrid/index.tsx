/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import type { ReactNode } from "react";

const settings = definePluginSettings({
    columns: {
        type: OptionType.SLIDER,
        default: 3,
        markers: [2, 3, 4, 5],
        stickToMarkers: true,
        restartNeeded: true,
        description: "How many commands fit per row"
    },
    tileHeight: {
        type: OptionType.SLIDER,
        default: 52,
        markers: [32, 42, 52, 64],
        stickToMarkers: true,
        restartNeeded: true,
        description: "Minimum tile height in pixels"
    },
    showSource: {
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
        description: "Show which plugin or app a command comes from"
    },
    showDescription: {
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
        description: "Show command descriptions under the name"
    },
});

interface CommandListProps {
    renderRow(index: number, loc: { sectionIndex: number; sectionRowIndex: number; }): ReactNode;
    renderSection?(sectionIndex: number, rows: ReactNode[]): ReactNode;
    renderSectionHeader?(sectionIndex: number): ReactNode;
    renderSectionFooter?(sectionIndex: number): ReactNode;
    renderListHeader?(): ReactNode;
    rowCount: number;
    rowCountBySection?: number[];
    listPadding?: number[];
}

function allRows(props: CommandListProps) {
    const {
        renderRow,
        renderSection,
        renderSectionHeader,
        renderSectionFooter,
        renderListHeader,
        rowCount,
        rowCountBySection,
        listPadding,
    } = props;

    const items: ReactNode[] = [];
    if (renderListHeader) items.push(renderListHeader());

    const sectionCount = rowCountBySection?.length ?? 1;
    let rowIndex = 0;

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
        const count = rowCountBySection ? rowCountBySection[sectionIndex] : rowCount;
        const rows: ReactNode[] = [];

        if (renderSectionHeader) rows.push(renderSectionHeader(sectionIndex));
        for (let sectionRowIndex = 0; sectionRowIndex < count; sectionRowIndex++) {
            rows.push(renderRow(rowIndex, { sectionIndex, sectionRowIndex }));
            rowIndex++;
        }
        if (renderSectionFooter) rows.push(renderSectionFooter(sectionIndex));

        if (renderSection) items.push(renderSection(sectionIndex, rows));
        else items.push(...rows);
    }

    return { visibleItems: items, listOffset: listPadding?.[0] ?? 0 };
}

export default definePlugin({
    name: "commandGrid",
    description: "Renders the slash command menu as a compact multi-column grid of tiles.",
    authors: [
        { name: "Vantin", id: 1214563713428889623n },
        { name: "Descent", id: 1079711314907250719n },
        { name: "Icey23", id: 199280799332171776n },
        { name: "Memory", id: 613447791246704858n },
        { name: "Entagya", id: 450972979518767105n },
        { name: "Grout", id: 1556827063363706890n },
    ],
    settings,

    patches: [
        {
            find: "rowHeight:56,sectionHeaderHeight:32",
            replacement: {
                match: /className:(\i\.\i),listPadding:(\i),onScroll:(\i),renderRow:(\i),renderSection:(\i),renderSectionHeader:(\i),rowCount:(\i)\.length,rowCountBySection:(\i),rowHeight:56,sectionHeaderHeight:32,sectionMarginBottom:(\i),ref:(\i),stickyHeaders:!0/,
                replace: 'className:$1+" vc-command-grid-list"+($self.settings.store.showSource?"":" vc-command-grid-hide-source")+($self.settings.store.showDescription?" vc-command-grid-show-description":""),style:{"--vc-command-grid-columns":$self.settings.store.columns,"--vc-command-grid-height":$self.settings.store.tileHeight+"px"},listPadding:$2,onScroll:$3,renderRow:$4,renderSection:$5,renderSectionHeader:$6,rowCount:$7.length,rowCountBySection:$8,rowHeight:56,sectionHeaderHeight:32,sectionMarginBottom:$9,ref:$10,stickyHeaders:!0,vcCommandGrid:!0'
            }
        },
        {
            find: "scrollRowIntoView:function(e){let t=arguments.length>1",
            group: true,
            replacement: [
                {
                    match: /\.forwardRef\(\((\i),(\i)\)=>\{/,
                    replace: ".forwardRef(($1,$2)=>{const vcProps=$1;"
                },
                {
                    match: /\.useMemo\(\(\)=>\{if\(-1===/,
                    replace: ".useMemo(()=>{if(vcProps.vcCommandGrid)return $self.allRows(vcProps);if(-1==="
                }
            ]
        }
    ],

    allRows,
});
