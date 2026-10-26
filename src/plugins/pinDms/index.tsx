/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { PinIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findComponentByCodeLazy, findCssClassesLazy, findStoreLazy } from "@webpack";
import { ChannelStore, Clickable, ContextMenuApi, FluxDispatcher, Menu, PrivateChannelSortStore, React, RelationshipStore, SelectedChannelStore, useStateFromStores } from "@webpack/common";

import { contextMenus } from "./components/contextMenu";
import { openCategoryModal, requireSettingsModal } from "./components/CreateCategoryModal";
import { DEFAULT_CHUNK_SIZE } from "./constants";
import { canMoveCategory, canMoveCategoryInDirection, Category, categoryLen, collapseCategory, currentUserCategories, getAllUncollapsedChannels, getCategoryByIndex, getCategoryChannels, getSections, init, isPinned, moveCategory, removeCategory, usePinnedDms } from "./data";

interface ChannelComponentProps {
    children: React.ReactNode,
    channel: Channel,
    selected: boolean;
}

interface FriendSection {
    key: string;
    pinDms?: boolean;
    collapsed?: boolean;
    rows: { userId?: string; pinDmsChannelId?: string; }[];
}

const headerClasses = findCssClassesLazy("privateChannelsHeaderContainer", "headerText");
const PrivateChannelRow = findComponentByCodeLazy<{ channel: Channel; selected: boolean; }>(".getAnyStreamForUser(", "recipients.some(");
const FriendRowStore: { getRow(userId: string): FriendSection["rows"][number] | undefined; } = findStoreLazy("FriendRowStore");

let lastFriendSections: { sections: FriendSection[]; order: string[] | false; result: FriendSection[]; } | null = null;

const FriendSidebarChannel = ErrorBoundary.wrap(({ channelId }: { channelId: string; }) => {
    const channel = useStateFromStores([ChannelStore], () => ChannelStore.getChannel(channelId));
    const selected = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId() === channelId);

    return channel ? <div className="vc-pindms-sidebar-channel"><PrivateChannelRow channel={channel} selected={selected} /></div> : null;
}, { noop: true });

function openCategoryMenu(e: React.MouseEvent, category: Category) {
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
}

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
        ],
        onChange: () => FluxDispatcher.dispatch({ type: "FRIENDS_LIST_TEAR_DOWN" })
    },
    canCollapseDmSection: {
        type: OptionType.BOOLEAN,
        displayName: "Can Collapse DM Section",
        description: "Allow uncategorised DMs section to be collapsable",
        default: false
    },
    dmSectionCollapsed: {
        type: OptionType.BOOLEAN,
        displayName: "DM Section Collapsed",
        description: "Collapse DM section",
        default: false,
        hidden: true
    },
    friendsSidebarGroupDms: {
        type: OptionType.BOOLEAN,
        description: "Show pinned group DMs in the friends sidebar.",
        default: true,
        onChange: () => FluxDispatcher.dispatch({ type: "FRIENDS_LIST_TEAR_DOWN" })
    },
    userBasedCategoryList: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, Category[]>,
        description: "",
        onChange: () => FluxDispatcher.dispatch({ type: "FRIENDS_LIST_TEAR_DOWN" })
    },
});

export default definePlugin({
    name: "PinDMs",
    description: "Allows you to pin private channels to the top of your DM list. To pin/unpin or re-order pins, right click DMs",
    tags: ["Friends", "Organisation"],
    authors: [Devs.Ven, Devs.Aria],
    settings,
    contextMenus,

    patches: [
        {
            find: '"dm-quick-launcher"===',
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
                    match: /renderRow(?:",|=)(\i)=>{(?<=renderDM(?:",|=).+?(\i\.\i),\{channel:.+?)/,
                    replace: "$&if($self.isChannelIndex($1.section, $1.row))return $self.renderChannel($1.section,$1.row,$2)();"
                },
                {
                    match: /renderSection(?:",|=)(\i)=>{/,
                    replace: "$&if($self.isCategoryIndex($1.section))return $self.renderCategory($1);"
                },
                {
                    match: /renderSection(?:",|=).{0,300}?"span",{/,
                    replace: "$&...$self.makeSpanProps(),"
                },

                // Fix Row Height
                {
                    match: /(\.startsWith\("section-divider"\).+?return 1===)(\i)/,
                    replace: "$1($2-$self.categoryLen())"
                },
                {
                    match: /getRowHeight(?:",|=)\((\i),(\i)\)=>{/,
                    replace: "$&if($self.isChannelHidden($1,$2))return 0;"
                },

                // Fix ScrollTo
                {
                    // Override scrollToChannel to properly account for pinned channels
                    match: /(?<=scrollTo\(\{to:\i\}\):\(\i\+=)(\d+)\*\(.+?(?=,)/,
                    replace: "$self.getScrollOffset(arguments[0],$1,this?.props?.padding,this?.state?.preRenderedChildren,$&)"
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
            find: "=()=>!1,ensureChatIsVisible:",
            replacement: {
                match: /(?<=\i===\i\.ME\?)\i\.\i\.getPrivateChannelIds\(\)/,
                replace: "$self.getAllUncollapsedChannels().concat($&.filter(c=>!$self.isPinned(c)))"
            }
        },

        // Friends sidebar
        {
            find: 'displayName="FriendRowStore"',
            replacement: [
                {
                    match: /(?<=getSections\(\)\{.{0,80}?,)\i(?=\})/,
                    replace: "$self.getFriendSections($&)"
                },
                {
                    // Track pinned DM recipients even if they aren't friends
                    match: /\i\.\i\.isFriend(?=\()/g,
                    replace: "$self.isFriendRow"
                },
                {
                    match: /\i\.\i\.getFriendIDs\(\)/g,
                    replace: "$self.getFriendRowIds($&)"
                }
            ]
        },
        {
            find: 'location:"FriendsSidebar"',
            replacement: [
                {
                    match: /(?<=\[)\i\.\i(?=\],\(\)=>\i\.\i\.getSections\(\))/g,
                    replace: "$&,$self.PrivateChannelSortStore"
                },
                {
                    match: /let (\i)=(\i\[\i\])\?\.key;return null!=\1&&(\i)\.has\(\1\)/,
                    replace: "return $self.isFriendSectionCollapsed($2,$3)"
                },
                {
                    match: /(?<=useCallback\((\i)=>\{)(?=\i\(\i=>\{let \i=new Set\(\i\);return \i\.delete\(\1\))/,
                    replace: "if($self.toggleFriendSection($1))return;"
                },
                {
                    match: /(?<=null==(\i)\|\|null==\i\?null:)(?=\i\.type===\i\.\i\.VOICE_GROUP\?)/,
                    replace: "null!=$1.pinDmsChannelId?$self.renderFriendSidebarChannel($1):"
                },
                {
                    match: /(?<=\i=(\i)\.key,\i=\i\.useCallback\(\(\)=>\i\(\i\).{0,800}?"aria-label":\i,onClick:\i,)/,
                    replace: "onContextMenu:e=>$self.openFriendSectionMenu(e,$1),"
                },
                {
                    match: /(?<=\{let\{section:(\i)\}=\i;)(?=switch\(\i\.type\))/,
                    replace: "if($1.pinDms)return $self.renderFriendSectionIcon($1);"
                },
                {
                    match: /(?<=\{let\{section:(\i)\}=\i;)(?=return \i\.type===\i\.\i\.GAME\?)/,
                    replace: "if($1.pinDms)return $self.renderFriendSectionLabel($1);"
                }
            ]
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
    requireSettingsMenu: requireSettingsModal,

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
        return (sectionHeaderSizePx + sections.reduce((acc, v) => acc += v * 44, 0) + DEFAULT_CHUNK_SIZE) * 1.5;
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

        return category.collapsed && this.instance.props.selectedChannelId !== getCategoryChannels(category)[channelIndex];
    },

    getScrollOffset(channelId: string, rowHeight: number, padding: number, preRenderedChildren: number, originalOffset: number) {
        const channels = this.getAllUncollapsedChannels();

        if (!isPinned(channelId))
            return (
                (rowHeight + padding) * 2 // header
                + rowHeight * channels.length // pins
                + originalOffset // original pin offset minus pins
            );

        return rowHeight * (channels.indexOf(channelId) + preRenderedChildren) + padding;
    },

    get PrivateChannelSortStore() {
        return PrivateChannelSortStore;
    },

    isFriendRow(userId: string) {
        const channelId = ChannelStore.getDMFromUserId(userId);
        return RelationshipStore.isFriend(userId) || channelId != null && isPinned(channelId);
    },

    getFriendRowIds(friendIds: string[]) {
        return [...friendIds, ...currentUserCategories.flatMap(c => c.channels).flatMap(id => {
            const channel = ChannelStore.getChannel(id);
            return channel?.isDM() ? channel.getRecipientId() ?? [] : [];
        })];
    },

    getFriendSections(sections: FriendSection[]) {
        const order = settings.store.pinOrder === PinOrder.LastMessage && PrivateChannelSortStore.getPrivateChannelIds();
        if (lastFriendSections?.sections === sections && lastFriendSections.order === order) return lastFriendSections.result;

        const pinned = currentUserCategories.map(category => ({
            key: `vc-pindms-${category.id}`,
            label: category.name,
            color: category.color,
            collapsed: category.collapsed,
            pinDms: true,
            rows: getCategoryChannels(category).flatMap(id => {
                const channel = ChannelStore.getChannel(id);
                if (channel?.isGroupDM()) return settings.store.friendsSidebarGroupDms ? [{ pinDmsChannelId: id }] : [];

                const recipientId = channel?.isDM() && channel.getRecipientId();
                const row = recipientId && FriendRowStore.getRow(recipientId);
                return row ? [row] : [];
            })
        })).filter(s => s.rows.length);

        const pinnedIds = new Set(pinned.flatMap(s => s.rows.map(r => r.userId)));
        const result = [
            ...pinned,
            ...sections
                .map(s => ({ ...s, rows: s.rows.filter(r => !pinnedIds.has(r.userId)) }))
                .filter(s => s.rows.length)
        ];

        lastFriendSections = { sections, order, result };
        return result;
    },

    isFriendSectionCollapsed(section: FriendSection | undefined, collapsed: Set<string>) {
        if (section?.pinDms) return !!section.collapsed;
        return section != null && collapsed.has(section.key);
    },

    toggleFriendSection(key: string) {
        const category = currentUserCategories.find(c => `vc-pindms-${c.id}` === key);
        if (!category) return false;

        collapseCategory(category.id, !category.collapsed);
        return true;
    },

    openFriendSectionMenu(e: React.MouseEvent, section: FriendSection) {
        const category = currentUserCategories.find(c => `vc-pindms-${c.id}` === section.key);
        if (category) openCategoryMenu(e, category);
    },

    renderFriendSidebarChannel({ pinDmsChannelId }: { pinDmsChannelId: string; }) {
        return <FriendSidebarChannel key={pinDmsChannelId} channelId={pinDmsChannelId} />;
    },

    renderFriendSectionIcon({ color }: { color: number; }) {
        return <PinIcon width={16} height={16} fill={`#${color.toString(16).padStart(6, "0")}`} />;
    },

    renderFriendSectionLabel({ label, color }: { label: string; color: number; }) {
        return <span style={{ color: `#${color.toString(16).padStart(6, "0")}` }}>{label}</span>;
    },

    renderCategory: ErrorBoundary.wrap(({ section }: { section: number; }) => {
        const category = getCategoryByIndex(section - 1);
        if (!category) return null;

        return (
            <Clickable
                onClick={() => collapseCategory(category.id, !category.collapsed)}
                onContextMenu={e => openCategoryMenu(e, category)}
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

        const channelId = getCategoryChannels(category)[index];

        return { channel: channels[channelId], category };
    },

    getCategoryChannels(category: Category) {
        return getCategoryChannels(category);
    }
});
