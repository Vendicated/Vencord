/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Clickable, ContextMenuApi, FluxDispatcher, Menu, React } from "@webpack/common";
import { Channel } from "discord-types/general";

import { contextMenus } from "./components/contextMenu";
import { openCategoryModal, requireSettingsMenu } from "./components/CreateCategoryModal";
import { DEFAULT_CHUNK_SIZE } from "./constants";
import { canMoveCategory, canMoveCategoryInDirection, Category, categoryLen, collapseCategory, getAllUncollapsedChannels, getCategoryByIndex, getSections, init, isPinned, moveCategory, removeCategory, usePinnedDms } from "./data";

interface ChannelComponentProps {
    children: React.ReactNode,
    channel: Channel,
    selected: boolean;
}

const headerClasses = findByPropsLazy("privateChannelsHeaderContainer");

export const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore") as { getPrivateChannelIds: () => string[]; };

export let instance: any;

export const enum PinOrder {
    LastMessage,
    Custom
}

export const settings = definePluginSettings({
    pinOrder: {
        type: OptionType.SELECT,
        description: "Which order should pinned DMs be displayed in?",
        options: [
            { label: "Most recent message", value: PinOrder.LastMessage, default: true },
            { label: "Custom (right click channels to reorder)", value: PinOrder.Custom }
        ]
    },
    canCollapseDmSection: {
        type: OptionType.BOOLEAN,
        description: "Allow uncategorised DMs section to be collapsable",
        default: false
    },
    dmSectionCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Collapse DM section",
        default: false,
        hidden: true
    },
    userBasedCategoryList: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Category[]>
    }
});

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list. To pin/unpin or re-order pins, right click DMs",
    authors: [Devs.Ven, Devs.Aria],
    settings,
    contextMenus,

    patches: [
        {
            find: ".privateChannelsHeaderContainer,",
            replacement: [
                {
                    // Filter out pinned channels from the private channel list
                    match: /(?<=channels:\i,)privateChannelIds:(\i)(?=,listRef:)/,
                    replace: "privateChannelIds:$1.filter(c=>!$self.isPinned(c))"
                },
                {
                    // Insert the pinned channels to sections
                    match: /(?<=renderRow:this\.renderRow,)sections:\[.+?1\)]/,
                    replace: "...$self.makeProps(this,{$&})"
                },

                // Rendering
                {
                    match: /"renderRow",(\i)=>{(?<="renderDM",.+?(\i\.\i),\{channel:.+?)/,
                    replace: "$&if($self.isChannelIndex($1.section, $1.row))return $self.renderChannel($1.section,$1.row,$2)();"
                },
                {
                    match: /"renderSection",(\i)=>{/,
                    replace: "$&if($self.isCategoryIndex($1.section))return $self.renderCategory($1);"
                },
                {
                    match: /(?<=span",{)className:\i\.headerText,/,
                    replace: "...$self.makeSpanProps(),$&"
                },

                // Fix Row Height
                {
                    match: /(\.startsWith\("section-divider"\).+?return 1===)(\i)/,
                    replace: "$1($2-$self.categoryLen())"
                },
                {
                    match: /"getRowHeight",\((\i),(\i)\)=>{/,
                    replace: "$&if($self.isChannelHidden($1,$2))return 0;"
                },

                // Fix ScrollTo
                {
                    // Override scrollToChannel to properly account for pinned channels
                    match: /(?<=scrollTo\(\{to:\i\}\):\(\i\+=)(\d+)\*\(.+?(?=,)/,
                    replace: "$self.getScrollOffset(arguments[0],$1,this.props.padding,this.state.preRenderedChildren,$&)"
                },
                {
                    match: /(scrollToChannel\(\i\){.{1,300})(this\.props\.privateChannelIds)/,
                    replace: "$1[...$2,...$self.getAllUncollapsedChannels()]"
                },

            ]
        },


        // forceUpdate moment
        // https://regex101.com/r/kDN9fO/1
        {
            find: ".FRIENDS},\"friends\"",
            replacement: {
                match: /let{showLibrary:\i,/,
                replace: "$self.usePinnedDms();$&"
            }
        },

        // Fix Alt Up/Down navigation
        {
            find: ".APPLICATION_STORE&&",
            replacement: {
                // channelIds = __OVERLAY__ ? stuff : [...getStaticPaths(),...channelIds)]
                match: /(?<=\i=__OVERLAY__\?\i:\[\.\.\.\i\(\),\.\.\.)\i/,
                // ....concat(pins).concat(toArray(channelIds).filter(c => !isPinned(c)))
                replace: "$self.getAllUncollapsedChannels().concat($&.filter(c=>!$self.isPinned(c)))"
            }
        },

        // fix alt+shift+up/down
        {
            find: ".getFlattenedGuildIds()],",
            replacement: {
                match: /(?<=\i===\i\.ME\?)\i\.\i\.getPrivateChannelIds\(\)/,
                replace: "$self.getAllUncollapsedChannels().concat($&.filter(c=>!$self.isPinned(c)))"
            }
        },
    ],

    sections: null as number[] | null,

    set _instance(i: any) {
        this.instance = i;
        instance = i;
    },

    startAt: StartAt.WebpackReady,
    start: init,
    flux: {
        CONNECTION_OPEN: init,
    },

    usePinnedDms,
    isPinned,
    categoryLen,
    getSections,
    getAllUncollapsedChannels,
    requireSettingsMenu,

    makeProps(instance, { sections }: { sections: number[]; }) {
        this._instance = instance;
        this.sections = sections;

        this.sections.splice(1, 0, ...this.getSections());

        if (this.instance?.props?.privateChannelIds?.length === 0) {
            // dont render direct messages header
            this.sections[this.sections.length - 1] = 0;
        }

        return {
            sections: this.sections,
            chunkSize: this.getChunkSize(),
        };
    },

    makeSpanProps() {
        return settings.store.canCollapseDmSection ? {
            onClick: () => this.collapseDMList(),
            role: "button",
            style: { cursor: "pointer" }
        } : undefined;
    },

    getChunkSize() {
        // the chunk size is the amount of rows (measured in pixels) that are rendered at once (probably)
        // the higher the chunk size, the more rows are rendered at once
        // also if the chunk size is 0 it will render everything at once

        const sections = this.getSections();
        const sectionHeaderSizePx = sections.length * 40;
        // (header heights + DM heights + DEFAULT_CHUNK_SIZE) * 1.5
        // we multiply everything by 1.5 so it only gets unmounted after the entire list is off screen
        return (sectionHeaderSizePx + sections.reduce((acc, v) => acc += v + 44, 0) + DEFAULT_CHUNK_SIZE) * 1.5;
    },

    isCategoryIndex(sectionIndex: number) {
        return this.sections && sectionIndex > 0 && sectionIndex < this.sections.length - 1;
    },

    isChannelIndex(sectionIndex: number, channelIndex: number) {
        if (settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed && sectionIndex !== 0) {
            return true;
        }

        const category = getCategoryByIndex(sectionIndex - 1);
        return this.isCategoryIndex(sectionIndex) && (category?.channels?.length === 0 || category?.channels[channelIndex]);
    },

    collapseDMList() {
        settings.store.dmSectionCollapsed = !settings.store.dmSectionCollapsed;
    },

    isChannelHidden(categoryIndex: number, channelIndex: number) {
        if (categoryIndex === 0) return false;

        if (settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed && this.getSections().length + 1 === categoryIndex)
            return true;

        if (!this.instance || !this.isChannelIndex(categoryIndex, channelIndex)) return false;

        const category = getCategoryByIndex(categoryIndex - 1);
        if (!category) return false;

        return category.collapsed && this.instance.props.selectedChannelId !== this.getCategoryChannels(category)[channelIndex];
    },

    getScrollOffset(channelId: string, rowHeight: number, padding: number, preRenderedChildren: number, originalOffset: number) {
        if (!isPinned(channelId))
            return (
                (rowHeight + padding) * 2 // header
                + rowHeight * this.getAllUncollapsedChannels().length // pins
                + originalOffset // original pin offset minus pins
            );

        return rowHeight * (this.getAllUncollapsedChannels().indexOf(channelId) + preRenderedChildren) + padding;
    },

    renderCategory: ErrorBoundary.wrap(({ section }: { section: number; }) => {
        const category = getCategoryByIndex(section - 1);
        if (!category) return null;

        return (
            <Clickable
                onClick={() => collapseCategory(category.id, !category.collapsed)}
                onContextMenu={e => {
                    ContextMenuApi.openContextMenu(e, () => (
                        <Menu.Menu
                            navId="vc-pindms-header-menu"
                            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                            color="danger"
                            aria-label="Pin DMs Category Menu"
                        >
                            <Menu.MenuItem
                                id="vc-pindms-edit-category"
                                label="Edit Category"
                                action={() => openCategoryModal(category.id, null)}
                            />

                            {
                                canMoveCategory(category.id) && (
                                    <>
                                        {
                                            canMoveCategoryInDirection(category.id, -1) && <Menu.MenuItem
                                                id="vc-pindms-move-category-up"
                                                label="Move Up"
                                                action={() => moveCategory(category.id, -1)}
                                            />
                                        }
                                        {
                                            canMoveCategoryInDirection(category.id, 1) && <Menu.MenuItem
                                                id="vc-pindms-move-category-down"
                                                label="Move Down"
                                                action={() => moveCategory(category.id, 1)}
                                            />
                                        }
                                    </>

                                )
                            }

                            <Menu.MenuSeparator />
                            <Menu.MenuItem
                                id="vc-pindms-delete-category"
                                color="danger"
                                label="Delete Category"
                                action={() => removeCategory(category.id)}
                            />


                        </Menu.Menu>
                    ));
                }}
            >
                <h2
                    className={classes(headerClasses.privateChannelsHeaderContainer, "vc-pindms-section-container", category.collapsed ? "vc-pindms-collapsed" : "")}
                    style={{ color: `#${category.color.toString(16).padStart(6, "0")}` }}
                >
                    <span className={headerClasses.headerText}>
                        {category?.name ?? "uh oh"}
                    </span>
                    <svg className="vc-pindms-collapse-icon" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M9.3 5.3a1 1 0 0 0 0 1.4l5.29 5.3-5.3 5.3a1 1 0 1 0 1.42 1.4l6-6a1 1 0 0 0 0-1.4l-6-6a1 1 0 0 0-1.42 0Z"></path>
                    </svg>
                </h2>
            </Clickable>
        );
    }, { noop: true }),

    renderChannel(sectionIndex: number, index: number, ChannelComponent: React.ComponentType<ChannelComponentProps>) {
        return ErrorBoundary.wrap(() => {
            const { channel, category } = this.getChannel(sectionIndex, index, this.instance.props.channels);

            if (!channel || !category) return null;
            if (this.isChannelHidden(sectionIndex, index)) return null;

            return (
                <ChannelComponent
                    channel={channel}
                    selected={this.instance.props.selectedChannelId === channel.id}
                >
                    {channel.id}
                </ChannelComponent>
            );
        }, { noop: true });
    },

    getChannel(sectionIndex: number, index: number, channels: Record<string, Channel>) {
        const category = getCategoryByIndex(sectionIndex - 1);
        if (!category) return { channel: null, category: null };

        const channelId = this.getCategoryChannels(category)[index];

        return { channel: channels[channelId], category };
    },

    getCategoryChannels(category: Category) {
        if (category.channels.length === 0) return [];

        if (settings.store.pinOrder === PinOrder.LastMessage) {
            return PrivateChannelSortStore.getPrivateChannelIds().filter(c => category.channels.includes(c));
        }

        return category?.channels ?? [];
    }
});
