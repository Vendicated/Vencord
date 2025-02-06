/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SearchModal.css";

import { classNameFactory } from "@api/Styles";
import { ErrorBoundary } from "@components/index";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalListContent,
    ModalProps,
    ModalRoot,
    ModalSize
} from "@utils/modal";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import {
    Avatar,
    Button,
    ChannelStore,
    Checkbox,
    Clickable,
    Flex,
    GuildStore,
    Heading,
    PresenceStore,
    React,
    RelationshipStore,
    SearchBar,
    Text,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    UsernameUtils,
    UserStore,
    useState,
    useStateFromStores,
} from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";
import { JSX } from "react";

const cl = classNameFactory("vc-search-modal-");

const ColorModule = findByPropsLazy("colors", "modules", "themes");
const SearchBarWrapper = findByPropsLazy("SearchBar");
const TextTypes = findByPropsLazy("APPLICATION", "GROUP_DM", "GUILD");
const SearchHandler = findByCodeLazy("createSearchContext", "setLimit");

const convertItem = findByCodeLazy("GROUP_DM:return{", "GUILD_VOICE:case");
const loadFrecency = findByCodeLazy(".frecencyWithoutFetchingLatest)");
const getChannelLabel = findByCodeLazy("recipients.map(", "getNickname(");

const ChannelIcon = findComponentByCodeLazy("channelGuildIcon,");
const GroupDMAvatars = findComponentByCodeLazy("facepileSizeOverride", "recipients.length");

const FrecencyStore = findStoreLazy("FrecencyStore");
const QuickSwitcherStore = findStoreLazy("QuickSwitcherStore");


interface DestinationItem {
    type: "channel" | "user" | "guild";
    id: string;
}

interface UnspecificRowProps {
    key: string,
    destination: DestinationItem,
    rowMode: string,
    disabled: boolean,
    isSelected: boolean,
    onPressDestination: (destination: DestinationItem) => void,
    "aria-posinset": number,
    "aria-setsize": number,
}

interface SpecificRowProps extends UnspecificRowProps {
    icon: JSX.Element,
    label: string,
    subLabel: string | JSX.Element,
}

interface UserIconProps {
    user: User;
    animate?: boolean;
    "aria-hidden"?: boolean;
    [key: string]: any;
}

interface UserResult {
    type: "USER";
    record: User;
    score: number;
    comparator: string;
    sortable?: string;
}

interface ChannelResult {
    type: "TEXT_CHANNEL" | "VOICE_CHANNEL" | "GROUP_DM";
    record: Channel;
    score: number;
    comparator: string;
    sortable?: string;
}

interface GuildResult {
    type: "GUILD";
    record: Guild;
    score: number;
    comparator: string;
    sortable?: string;
}

type Result = UserResult | ChannelResult | GuildResult;
type SearchType = ("USERS" | "CHANNELS" | "GUILDS")[] | "USERS" | "CHANNELS" | "GUILDS" | "ALL";

export interface SearchModalProps {
    modalProps: ModalProps;
    onSubmit(selected: DestinationItem[]): void;
    input?: string;
    searchType?: SearchType;
    subText?: string;
    excludeIds?: string[],
}

const searchTypesToResultTypes = (type: SearchType) => {
    if (type === "ALL") return ["USER", "TEXT_CHANNEL", "VOICE_CHANNEL", "GROUP_DM", "GUILD"];
    if (typeof type === "string") {
        if (type === "USERS") return ["USER"];
        else if (type === "CHANNELS") return ["TEXT_CHANNEL", "VOICE_CHANNEL", "GROUP_DM"];
        else if (type === "GUILDS") return ["GUILD"];
    } else {
        return type.flatMap(searchTypesToResultTypes);
    }
};

function searchTypeToText(type: SearchType) {
    if (type === undefined || type === "ALL") return "Users, Channels, and Servers";
    if (typeof type === "string") {
        if (type === "GUILDS") return "Servers";
        else return type.charAt(0) + type.slice(1).toLowerCase();
    } else {
        if (type.length === 1) {
            return searchTypeToText(type[0]);
        } else if (type.length === 2) {
            return `${searchTypeToText(type[0])} and ${searchTypeToText(type[1])}`;
        } else {
            return "Users, Channels, and Servers";
        }
    }
}

/**
 * SearchModal component for displaying a modal with search functionality, built after Discord's forwarding Modal.
 *
 * @param {SearchModalProps} props - The props for the SearchModal component.
 * @param {ModalProps} props.modalProps - The modal props. You get these from the `openModal` function.
 * @param {function} props.onSubmit - Callback function invoked when the user submits their selection.
 * @param {string} [props.input] - The initial input value for the search bar.
 * @param {SearchType} [props.searchType="ALL"] - The type of items to search for.
 * @param {string} [props.subText] - Additional text to display below the heading.
 * @param {string[]} [props.excludeIds] - An array of IDs to exclude from the search results.
 * @returns The rendered SearchModal component.
 */
export default ErrorBoundary.wrap(function SearchModal({ modalProps, onSubmit, input, searchType = "ALL", subText, excludeIds }: SearchModalProps) {

    const UserIcon = React.memo(function ({
        user,
        animate = false,
        "aria-hidden": ariaHidden = false,
        ...rest
    }: UserIconProps) {

        // FIXME
        const avatarSrc = user.getAvatarURL(void 0, 32, animate);

        return (
            <Avatar
                src={avatarSrc}
                size={"SIZE_32"}
                aria-label={ariaHidden ? undefined : user.username}
                aria-hidden={ariaHidden}
                {...rest}
            />
        );
    });

    const resultTypes = searchTypesToResultTypes(searchType);

    const [selected, setSelected] = useState<DestinationItem[]>([]);

    const Row = (props: SpecificRowProps) => {
        const {
            destination,
            rowMode,
            icon,
            label,
            subLabel,
            isSelected,
            disabled,
            onPressDestination,
            ...rest
        } = props;

        const interactionProps = {
            role: "listitem",
            "data-list-item-id": `NO_LIST___${destination.id}`,
            tabIndex: -1,
        };
        return (
            <Clickable
                className={cl("destination-row")}
                onClick={e => { onPressDestination?.(destination); }}
                aria-selected={isSelected}
                {...interactionProps}
                {...rest}
            >
                <div className={cl("identity")}>
                    <div className={cl("icon-wrapper")}>{icon}</div>
                    <div className={cl("labels")}>
                        <Text
                            tag="strong"
                            className={cl("label")}
                            variant="text-md/semibold"
                            lineClamp={1}
                        >{label}</Text>
                        <Text
                            className={cl("sub-label")}
                            variant="text-xs/normal"
                            color="text-muted"
                        >{subLabel}</Text>
                    </div>
                </div>
                <Checkbox
                    type={Checkbox.Types.INVERTED}
                    displayOnly={true} // todo try using false
                    size={24}
                    value={isSelected}
                    className={cl("checkbox")}
                />
            </Clickable>
        );
    };

    function generateUserItem(user: User, otherProps: UnspecificRowProps) {
        const username = UsernameUtils.getName(user);
        const userTag = UsernameUtils.getUserTag(user, { decoration: "never" });
        const nickname = RelationshipStore.getNickname(user.id);
        const userStatus = PresenceStore.getStatus(user.id);

        return (
            <Row {...otherProps}
                icon={<UserIcon
                    aria-hidden={true}
                    size={"SIZE_32"}
                    user={user}
                    status={userStatus}
                />}
                label={nickname ?? username}
                subLabel={userTag}
            />
        );
    }

    function generateChannelItem(channel: Channel, otherProps: UnspecificRowProps) {
        const guild = GuildStore.getGuild(channel?.guild_id);

        const svgProps = {
            "aria-hidden": true,
            className: cl("sub-label-icon"),
            role: "img",
            xmlns: "http://www.w3.org/2000/svg",
            width: 24,
            height: 24,
            fill: "none",
            viewBox: "0 0 24 24"
        };
        const ForumChannelSvg = () => <svg {...svgProps}>
            <path
                fill={ColorModule.colors.TEXT_SECONDARY.css}
                d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z"
            />
            <path
                fill={ColorModule.colors.TEXT_SECONDARY.css}
                d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z"
            />
        </svg>;

        const TextIcon = () => <svg {...svgProps}>
                <path
                    fill={ColorModule.colors.TEXT_SECONDARY.css}
                    fillRule="evenodd"
                    d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"
                    clipRule="evenodd"
                />
            </svg>;

        const channelLabel = getChannelLabel(channel, UserStore, RelationshipStore, false);

        const parentChannelLabel = (): string | null => {
            const parentChannel = ChannelStore.getChannel(channel.parent_id);
            return parentChannel ? getChannelLabel(parentChannel, UserStore, RelationshipStore, false) : null;
        };

        let subLabel: string | JSX.Element = guild?.name;

        // @ts-ignore isForumPost is not in the types but exists
        if (channel.isThread() || channel.isForumPost()) {
            subLabel = (
                <div className={cl("thread-sub-label")}>
                    {
                        // @ts-ignore isForumPost is not in the types but exists
                        channel.isForumPost() ? <ForumChannelSvg/> : <TextIcon/>
                    }
                    <Text
                        variant="text-xs/medium"
                        color="text-secondary"
                        lineClamp={1}
                    >
                        {parentChannelLabel()}
                    </Text>
                </div>
            );
        }

        return (
            <Row
                {...otherProps}
                icon={
                    <ChannelIcon
                        size="SMALL_32"
                        guild={guild}
                        channel={channel}
                    />
                }
                label={channelLabel}
                subLabel={subLabel}
            />
        );
    }

    function generateGuildItem(guild: Guild, otherProps: UnspecificRowProps) {
        const guildName = guild.name;
        const guildIcon = guild.getIconURL("SIZE_32", false);

        return (
            <Row {...otherProps}
                icon={<Avatar
                    src={guildIcon}
                    size={"SIZE_32"}
                    aria-hidden={true}
                />}
                label={guildName}
                subLabel={""}
            />
        );
    }

    function generateGdmItem(channel: Channel, otherProps: UnspecificRowProps) {
        function getParticipants(channel: Channel) {
            const userNames = channel.recipients
                .map(recipient => UserStore.getUser(recipient))
                .filter(user => user != null)
                .map(user => UsernameUtils.getName(user));

            if (!userNames || userNames.length === 0 || channel.name === "")
                return "";
            if (userNames.length <= 3)
                return userNames.join(", ");
            const amount = userNames.length - 3;
            return userNames?.slice(0, 3).join(", ") + " and " + (amount === 1 ? "1 other" : amount + " others");
        }

        const label = getChannelLabel(channel, UserStore, RelationshipStore, false);
        const subLabelValue = getParticipants(channel);

        return (
            <Row {...otherProps}
                icon={<GroupDMAvatars aria-hidden={true} size={"SIZE_32"}
                    channel={channel} />}
                label={label}
                subLabel={subLabelValue}
            />
        );
    }

    const [searchText, setSearchText] = useState<string>(input || "");
    const ref = {};

    function getItem(e: DestinationItem): Result {
        if (e.type === "guild") {
            const guild = GuildStore.getGuild(e.id);
            return {
                type: TextTypes.GUILD,
                record: guild,
                score: 0,
                comparator: guild.name,
            };
        }
        if (e.type !== "user")
            return convertItem(e.id);
        const user = UserStore.getUser(e.id);
        return {
            type: TextTypes.USER,
            record: user,
            score: 0,
            // @ts-ignore globalName is not in the types but exists
            comparator: user.globalName,
        };
    }

    const filterItems = (items: any[]) => {
        return items.filter(
            item => item != null && resultTypes.includes(item.type) && !excludeIds?.includes(item.record.id)
        );
    };

    function filterResults(props: {
        results: Result[];
        hasQuery: boolean;
        frequentChannels: Channel[];
        channelHistory: string[];
    }): Result[] {
        const removeDuplicates = (arr: Result[]): Result[] => {
            const clean: any[] = [];
            const seenIds = new Set();
            arr.forEach(item => {
                if (item == null || item.record == null) return;
                if (!seenIds.has(item.record.id)) {
                    seenIds.add(item.record.id);
                    clean.push(item);
                }
            });
            return clean;
        };

        const guilds: GuildResult[] = useStateFromStores([GuildStore], () => Object.values(GuildStore.getGuilds()).map(
            guild => {
                return {
                    type: TextTypes.GUILD,
                    record: guild,
                    score: 0,
                    comparator: guild.name
                };
            }
        ));

        const { results, hasQuery, frequentChannels, channelHistory } = props;
        if (hasQuery) return filterItems(results);

        const recentDestinations = filterItems([
            ...(channelHistory.length > 0 ? channelHistory.map(e => convertItem(e)) : []),
            ...(frequentChannels.length > 0 ? frequentChannels.map(e => convertItem(e.id)) : []),
            ...guilds
        ]);


        return removeDuplicates(
            [...selected.map(e => getItem(e)),
            ...recentDestinations
            ]);
    }

    function getRef<T>(e: () => T): T {
        const ref_ = useRef<T>(ref as T);
        if (ref_.current === ref)
            ref_.current = e();
        return ref_.current;
    }

    function getSearchHandler(searchOptions: Record<string, any>): { search: (e: { query: string, resultTypes: string[]; }) => void, results: Result[], query: string; } {
        const [results, setResults] = useState<{ results: Result[], query: string; }>({
            results: [],
            query: ""
        });

        const searchHandler: InstanceType<typeof SearchHandler> = getRef(() => {
            const searchHandler = new SearchHandler((r: Result[], q: string) => {
                setResults({
                    results: r,
                    query: q
                });
            }
            );
            searchHandler.setOptions(searchOptions);
            searchHandler.setLimit(20);
            searchHandler.search("");
            return searchHandler;
        }
        );
        useEffect(() => () => searchHandler.destroy(), [searchHandler]);
        return {
            search: useCallback(e => {
                const { query, resultTypes } = e;
                if (searchHandler.resultTypes == null || !(resultTypes.length === searchHandler.resultTypes.size && resultTypes.every(e => searchHandler.resultTypes.has(e)))) {
                    searchHandler.setResultTypes(resultTypes);
                    searchHandler.setLimit(resultTypes.length === 1 ? 50 : 20);
                }
                searchHandler.search(query.trim() === "" ? "" : query);
            }
                , [searchHandler]),
            ...results
        };
    }

    function generateResults() {
        const { search, query, results } = getSearchHandler({
            blacklist: null,
            frecencyBoosters: !0,
            userFilters: null
        });

        const [queryData, setQueryData] = useState("");

        const updateSearch = useCallback((e: string) => setQueryData(e), [setQueryData]);

        if (queryData === "" && searchText !== "") {
            updateSearch(searchText);
        }

        useLayoutEffect(() => {
            search({
                query: queryData,
                resultTypes: resultTypes,
            });
        }, [search, queryData]);

        loadFrecency();

        const frequentChannels: Channel[] = useStateFromStores([FrecencyStore], () => FrecencyStore.getFrequentlyWithoutFetchingLatest());
        const channelHistory: string[] = useStateFromStores([QuickSwitcherStore], () => QuickSwitcherStore.getChannelHistory());

        const hasQuery = query !== "";

        return {
            results: useMemo(() => filterResults({
                results: results,
                hasQuery: hasQuery,
                frequentChannels: frequentChannels,
                channelHistory: channelHistory,
            }), [results, hasQuery, frequentChannels, channelHistory]),
            updateSearchText: updateSearch
        };
    }

    const { results, updateSearchText } = generateResults();

    function ModalScroller({ rowData, handleToggleDestination, paddingBottom, paddingTop }: { rowData: Result[], handleToggleDestination: (destination: DestinationItem) => void, paddingBottom?: number, paddingTop?: number; }) {

        const sectionCount: number[] = useMemo(() => [rowData.length], [rowData.length]);

        const callback = useCallback((e: { section: number, row: number; }) => {
            const { section, row } = e;
            if (section > 0)
                return;
            const { type, record } = results[row];
            if (type === TextTypes.HEADER)
                return;

            const destination: DestinationItem = {
                type: type === TextTypes.USER ? "user" : type === TextTypes.GUILD ? "guild" : "channel",
                id: record.id
            };

            const key = `${destination.type}-${destination.id}`;

            const rowProps: UnspecificRowProps = {
                key,
                destination,
                rowMode: "toggle",
                disabled: false,
                isSelected: selected.some(e => e.type === destination.type && e.id === destination.id),
                onPressDestination: handleToggleDestination,
                "aria-posinset": row + 1,
                "aria-setsize": results.length
            };

            if (type === "USER")
                return generateUserItem(record, rowProps);
            if (type === "GROUP_DM")
                return generateGdmItem(record, rowProps);
            if (type === "TEXT_CHANNEL" || type === "VOICE_CHANNEL")
                return generateChannelItem(record, rowProps);
            if (type === "GUILD")
                return generateGuildItem(record, rowProps);
            else throw new Error("Unknown type " + type);
        }, []);

        return <ModalListContent
            tabIndex={-1}
            data-list-id="NO_LIST"
            role="list"
            paddingBottom={paddingBottom}
            paddingTop={paddingTop}
            sections={sectionCount}
            sectionHeight={0}
            renderRow={callback}
            rowHeight={48} />;
    }


    const setSelectedCallback = useCallback((e: DestinationItem) => {
        setSelected((currentSelected: DestinationItem[]) => {
            const index = currentSelected.findIndex(item => {
                const { type, id } = item;
                return type === e.type && id === e.id;
            });

            if (index === -1) {
                return [e, ...currentSelected];
            }

            currentSelected.splice(index, 1);
            return [...currentSelected];
        });
    }, []);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader
                className={cl("header")}
                direction={Flex.Direction.VERTICAL}
                align={Flex.Align.START}
                justify={Flex.Justify.BETWEEN}
            >
                <div className={cl("header-text")}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Heading variant="heading-lg/semibold"
                            style={{ flexGrow: 1 }}>{"Search for " + searchTypeToText(searchType)}</Heading>
                        {subText !== undefined && <Heading variant="heading-sm/normal"
                            style={{ color: "var(--header-muted)" }}>{subText}</Heading>}
                    </div>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </div>
                <SearchBarWrapper.SearchBar
                    size={SearchBar.Sizes.MEDIUM}
                    placeholder="Search"
                    query={searchText}
                    onChange={(v: string) => {
                        setSearchText(v);
                        updateSearchText(v);
                    }}
                    onClear={() => {
                        setSearchText("");
                        updateSearchText("");
                    }}
                />
            </ModalHeader>
            {
                results.length > 0 ? <ModalScroller
                    paddingBottom={16}
                    paddingTop={16}
                    rowData={results}
                    handleToggleDestination={setSelectedCallback}
                /> : <ModalContent className={cl("no-results")}>
                    <div className={cl("no-results-container")}>
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M18 6L6 18M6 6L18 18"
                                stroke="var(--text-muted)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <Text
                            variant="text-md/normal"
                            style={{ color: "var(--text-muted)", marginLeft: "8px" }}
                        >No results found</Text>
                    </div>
                </ModalContent>
            }
            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        onSubmit(selected);
                        modalProps.onClose();
                    }}
                    disabled={selected.length === 0}
                >
                    {"Add" + (selected.length > 1 ? " (" + selected.length + ")" : "")}
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={modalProps.onClose}
                >
                    Cancel
                </Button>
            </ModalFooter>

        </ModalRoot>
    );
}, {
    noop: true,
    onError: ({ props }) => props.modalProps.onClose()
});
