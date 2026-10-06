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

let sectionLengths: number[] | null = null;

function setSectionLengths(lengths: number[]) {
    sectionLengths = lengths;
    return lengths;
}

function gridTarget(index: number | null, direction: number, total: number) {
    if (index == null) return 0;

    const { columns } = settings.store;
    const lengths = sectionLengths;
    if (!lengths?.length || lengths.reduce((sum, count) => sum + count, 0) < total)
        return Math.max(0, Math.min(total - 1, index + (Math.abs(direction) === 1 ? direction * columns : Math.sign(direction))));

    let start = 0;
    for (let section = 0; section < lengths.length; section++) {
        const end = start + lengths[section];
        if (index >= end) {
            start = end;
            continue;
        }

        if (Math.abs(direction) === 2)
            return Math.max(start, Math.min(end - 1, index + Math.sign(direction)));

        const column = (index - start) % columns;
        const nextRow = start + Math.floor((index - start) / columns) * columns + direction * columns;
        if (nextRow >= start && nextRow < end)
            return Math.min(end - 1, nextRow + column);

        const nextSection = section + Math.sign(direction);
        if (nextSection < 0 || nextSection >= lengths.length) return index;
        if (direction > 0) {
            const nextStart = end;
            return Math.min(nextStart + lengths[nextSection] - 1, nextStart + column);
        }
        const previousEnd = start;
        const previousStart = previousEnd - lengths[nextSection];
        const previousRow = previousStart + Math.floor((lengths[nextSection] - 1) / columns) * columns;
        return Math.min(previousEnd - 1, previousRow + column);
    }

    return index;
}

function handleHorizontal(event: KeyboardEvent, moveSelection: (direction: number) => boolean) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;

    const editor = event.currentTarget as HTMLElement & { value?: string; };
    if ((editor.value ?? editor.textContent)?.trim() !== "/") return false;
    if (!moveSelection(event.key === "ArrowLeft" ? -2 : 2)) return false;

    event.preventDefault();
    event.stopPropagation();
    return true;
}

export default definePlugin({
    name: "commandGrid",
    description: "Shows slash commands in a grid with arrow-key navigation.",
    authors: [
        { name: "Vantin", id: 1214563713428889623n },
        { name: "Descent", id: 1079711314907250719n },
        { name: "Icey23", id: 199280799332171776n },
        { name: "Memory", id: 613447791246704858n },
        { name: "Entagya", id: 450972979518767105n },
        { name: "Grout", id: 1556827063363706890n },
    ],
    settings,
    setSectionLengths,
    gridTarget,
    handleHorizontal,

    patches: [
        {
            find: "rowHeight:56,sectionHeaderHeight:32",
            replacement: {
                match: /className:(\i\.\i),listPadding:(\i),onScroll:(\i),renderRow:(\i),renderSection:(\i),renderSectionHeader:(\i),rowCount:(\i)\.length,rowCountBySection:(\i),rowHeight:56,sectionHeaderHeight:32,sectionMarginBottom:(\i),ref:(\i),stickyHeaders:!0/,
                replace: 'className:$1+" vc-command-grid-list vc-command-grid-cols-"+$self.settings.store.columns+" vc-command-grid-height-"+$self.settings.store.tileHeight+($self.settings.store.showSource?"":" vc-command-grid-hide-source")+($self.settings.store.showDescription?" vc-command-grid-show-description":""),listPadding:$2,onScroll:$3,renderRow:$4,renderSection:$5,renderSectionHeader:$6,rowCount:$7.length,rowCountBySection:$self.setSectionLengths($8),rowHeight:56,sectionHeaderHeight:32,sectionMarginBottom:$9,ref:$10,stickyHeaders:!0,vcCommandGrid:!0'
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
        },
        {
            find: "rowHeight:56,sectionHeaderHeight:32",
            replacement: {
                match: /onMoveSelection:(\i)=>\{if\(0===(\i)\.length\)return!0;let (\i)=7\*!!(\i),(\i)=\2\.length\+\3,(\i)=null==(\i)\?0:\7\+\1;/,
                replace: "onMoveSelection:$1=>{if(0===$2.length)return!0;let $3=7*!!$4,$5=$2.length+$3,$6=$self.gridTarget($7,$1,$5);"
            }
        },
        {
            find: /moveSelection:\i\}=\i;return\{handleKeyDown:\i\.useCallback/,
            replacement: {
                match: /(moveSelection:(\i)\}=(\i);return\{handleKeyDown:(\i)\.useCallback\((\i)=>\{)switch\(\5\.which\)\{/,
                replace: "$1if($self.handleHorizontal($5,$2))return;switch($5.which){"
            }
        }
    ],

    allRows,
});
