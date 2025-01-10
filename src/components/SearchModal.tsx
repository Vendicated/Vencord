/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SearchModal.css";

import { classNameFactory } from "@api/Styles";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize
} from "@utils/modal";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import {
    Button, ChannelStore,
    Flex, GuildStore,
    Heading,
    PresenceStore,
    React,
    RelationshipStore,
    Text,
    useCallback,
    useMemo,
    useRef,
    UsernameUtils, UserStore,
    useState
} from "@webpack/common";
import { Channel, User } from "discord-types/general";

const cl = classNameFactory("vc-search-modal-");

// TODO make guilds work
// FIXME fix the no results display

// TODO add all channel types

// TODO filter for input type
// TODO setting for max amount of selected items

// FIXME remove scrolling up onclick
// FIXME move selected items to the top of the list.

const SearchBarModule = findByPropsLazy("SearchBar", "Checkbox", "AvatarSizes");
const SearchBarWrapper = findByPropsLazy("SearchBar", "Item");
const TextTypes = findByPropsLazy("APPLICATION", "GROUP_DM", "GUILD");
const FrequencyModule = findByPropsLazy("getFrequentlyWithoutFetchingLatest");
const ConnectionModule = findByPropsLazy("isConnected", "getSocket");
const FrequentsModule = findByPropsLazy("getChannelHistory", "getFrequentGuilds");

const wrapperFn = findByCodeLazy("prevDeps:void 0,");
const convertItem = findByCodeLazy("GROUP_DM:return{", "GUILD_VOICE:case");
const loadFunction = findByCodeLazy(".frecencyWithoutFetchingLatest)");
const SearchHandler = findByCodeLazy("createSearchContext", "setLimit");
const navigatorWrapper = findByCodeLazy("useMemo(()=>({onKeyDown:");
const createNavigator = findByCodeLazy(".keyboardModeEnabled)", "useCallback(()=>new Promise(", "Number.MAX_SAFE_INTEGER");
const getChannelLabel = findByCodeLazy("recipients.map(", "getNickname(");
const ChannelIcon = findByCodeLazy("channelGuildIcon,");

const GroupDMAvatars = findComponentByCodeLazy("facepileSizeOverride", "recipients.length");

interface DestinationItemProps {
    type: string;
    id: string;
}

interface UnspecificRowProps {
    key: string
    destination: DestinationItemProps,
    rowMode: string
    disabled: boolean,
    isSelected: boolean,
    onPressDestination: (destination: DestinationItemProps) => void,
    "aria-posinset": number,
    "aria-setsize": number
}
interface SpecificRowProps extends UnspecificRowProps {
    icon: React.JSX.Element,
    label: string,
    subLabel: string | React.JSX.Element
}

interface UserIconProps {
    user: User;
    size?: number;
    animate?: boolean;
    "aria-hidden"?: boolean;
    [key: string]: any; // To allow any additional props
}

const searchTypesToResultTypes = (type: string | string[]) => {
    if (type === "ALL") return ["USER", "TEXT_CHANNEL", "VOICE_CHANNEL", "GROUP_DM", "GUILD"];
    if (typeof type === "string") {
        if (type === "USERS") return ["USER"];
        else if (type === "CHANNELS") return ["TEXT_CHANNEL", "VOICE_CHANNEL", "GROUP_DM"];
        else if (type === "GUILDS") return ["GUILD"];
    } else {
        return type.flatMap(searchTypesToResultTypes);
    }
};

function searchTypeToText(type: string | string[]) {
    if (type === undefined || type === "ALL") return "Users, Channels, and Servers";
    if (typeof type === "string") {
        if (type === "GUILD") return "Servers";
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

export default function SearchModal({ modalProps, onSubmit, input, searchType = "ALL", subText }: {
    modalProps: ModalProps;
    onSubmit(selected: DestinationItemProps[]): void;
    input?: string;
    searchType?: ("USERS" | "CHANNELS" | "GUILDS")[] | "USERS" | "CHANNELS" | "GUILDS" | "ALL";
    subText?: string
}) {

    const callbacks = new Map();

    function registerCallback(key, callback) {
        let currentCallbacks = callbacks.get(key);
        if (!currentCallbacks) {
            currentCallbacks = new Set();
            callbacks.set(key, currentCallbacks);
        }

        currentCallbacks.add(callback);

        return () => {
            currentCallbacks.delete(callback);
            if (currentCallbacks.size === 0) {
                callbacks.delete(key);
            }
        };

    }

    const UserIcon = React.memo(function ({
        user,
        size = SearchBarModule.AvatarSizes.SIZE_32,
        animate = false,
        "aria-hidden": ariaHidden = false,
        ...rest
    }: UserIconProps) {

        const avatarSrc = user.getAvatarURL(void 0, SearchBarModule.getAvatarSize(size), animate);

        return (
            <SearchBarModule.Avatar
                src={avatarSrc}
                size={size}
                aria-label={ariaHidden ? undefined : user.username}
                aria-hidden={ariaHidden}
                {...rest}
            />
        );
    });

    const resultTypes = searchTypesToResultTypes(searchType);

    const [selected, setSelected] = useState<DestinationItemProps[]>([]);

    const refCounter = useRef(0);

    const rowContext = React.createContext({
        id: "NO_LIST",
        setFocus(id: string) {
        }
    });

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

        const interactionProps = generateRowData(destination.id);

        const handlePress = useCallback(() => {
            onPressDestination?.(destination);
        }, [onPressDestination, destination]);

        return (
            <SearchBarModule.Clickable
                className={cl("destination-row")}
                onClick={handlePress}
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
                <SearchBarModule.Checkbox
                    type={SearchBarModule.Checkbox.Types.INVERTED}
                    displayOnly={true}
                    size={24}
                    value={isSelected}
                    className={cl("checkbox")}
                />
            </SearchBarModule.Clickable>
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
                     size={SearchBarModule.AvatarSizes.SIZE_32}
                     user={user}
                     status={userStatus}
                 />}
                 label={nickname ?? username}
                 subLabel={userTag}
            />
        );
    }

    function generateChannelLabel(channel: Channel) {
        return getChannelLabel(channel, UserStore, RelationshipStore, false);
    }

    function generateChannelItem(channel: Channel, otherProps: UnspecificRowProps) {
        const guild = GuildStore.getGuild(channel?.guild_id);

        const channelLabel = generateChannelLabel(channel);

        const parentChannelLabel = () => {
            const parentChannel = ChannelStore.getChannel(channel.parent_id);
            return parentChannel ? getChannelLabel(parentChannel, UserStore, RelationshipStore, false) : null;
        };

        let subLabel: string | React.JSX.Element = guild?.name;

        // @ts-ignore isForumPost is not in the types but exists
        if (channel.isThread() || channel.isForumPost()) {
            // @ts-ignore
            const IconComponent = channel.isForumPost() ? SearchBarModule.ForumIcon : SearchBarModule.TextIcon;

            subLabel = (
                <div className={cl("thread-sub-label")}>
                    <IconComponent
                        color={SearchBarModule.tokens.colors.TEXT_SECONDARY}
                        className={cl("sub-label-icon")}
                    />
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

    function generateGdmItem(channel: Channel, otherProps: UnspecificRowProps) {
        function getParticipants(channel: Channel) {
            const userNames = channel.recipients
                .map(recipient => UserStore.getUser(recipient))
                .filter(user => user != null)
                .map(user => UsernameUtils.getName(user));

            if (!userNames || userNames.length === 0 || channel.name === "")
                return null;
            if (userNames.length <= 3)
                return userNames.join(", ");
            const amount = userNames.length - 3;
            return userNames?.slice(0, 3).join(", ") + " and " + (amount === 1 ? "1 other" : amount + " others");
        }

        const label = getChannelLabel(channel, UserStore, RelationshipStore, false);
        const subLabelValue = getParticipants(channel);

        return (
            <Row {...otherProps}
               icon={<GroupDMAvatars aria-hidden={true} size={SearchBarModule.AvatarSizes.SIZE_32} channel={channel}/>}
               label={label}
               subLabel={subLabelValue ?? ""}
            />
        );
    }

    const navigatorContext = React.createContext({
        id: "NO_LIST",
        onKeyDown() {
        },
        orientation: "vertical",
        ref: React.createRef(),
        tabIndex: -1
    });

    function generateNavigatorData() {
        const { id: id, onKeyDown, ref, tabIndex } = React.useContext(navigatorContext);
        return {
            role: "list",
            tabIndex,
            "data-list-id": id,
            onKeyDown: onKeyDown,
            ref: ref,
        };
    }

    function navigatorData(e) {
        const { children } = e;
        return children(generateNavigatorData());
    }


    function generateRowData(rowId: string) {
        const [tabIndex, setTabIndex] = useState(-1);

        const { id, setFocus } = React.useContext(rowContext);

        const handleFocus = useCallback(() => setFocus(rowId), [rowId, setFocus]);

        React.useLayoutEffect(() => {
            return registerCallback(id, (tabIndex, id) => {
                setTabIndex(id && tabIndex === rowId ? 0 : -1);
            });
        }, [rowId, id]);

        return {
            role: "listitem",
            "data-list-item-id": `${id}___${rowId}`,
            tabIndex,
            onFocus: handleFocus,
        };
    }

    const [searchText, setSearchText] = useState<string>(input || "");
    const ref = {};

    function getSearchHandler(e) {
        const { searchOptions } = e;
        const [results, setResults] = useState({
            results: [],
            query: ""
        });

        function getRef(e) { // FIXME probably should use a proper type for this
            const ref_ = useRef(ref);
            if (ref_.current === ref)
                ref_.current = e();
            return ref_.current;
        }

        const searchHandler: typeof SearchHandler = getRef(() => {
                const searchHandler = new SearchHandler((r, q) => {
                        setResults({
                            results: r,
                            query: q
                        });
                    }
                );
                searchHandler.setLimit(20);
                searchHandler.search("");
                return searchHandler;
            }
        );
        React.useEffect(() => () => searchHandler.destroy(), [searchHandler]);
        React.useEffect(() => {
                searchOptions != null && searchOptions !== searchHandler.options && searchHandler.setOptions(searchOptions);
            }, [searchHandler, searchOptions]
        );
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

    function generateResults({ selectedDestinations }) {
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

        const [pinned, setPinned] = useState(selectedDestinations != null ? selectedDestinations : []);
        React.useLayoutEffect(() => {
                search({
                    query: queryData,
                    resultTypes: resultTypes,
                });
                setPinned(selectedDestinations != null ? selectedDestinations : []);
            }
            , [search, queryData]);

        loadFunction();

        const frequentChannels = wrapperFn([FrequencyModule], () => FrequencyModule.getFrequentlyWithoutFetchingLatest());
        const isConnected = wrapperFn([ConnectionModule], () => ConnectionModule.isConnected());
        const hasQuery = query !== "";

        function getItem(e) {
            if (e.type !== "user")
                return convertItem(e.id);
            {
                const user = UserStore.getUser(e.id);
                return {
                    type: TextTypes.USER,
                    record: user,
                    score: 0,
                    // @ts-ignore globalName is not in the types but exists
                    comparator: user.globalName,
                };
            }
        }

        function processItems(items, existingItems?) {
            let temp: null;
            const set = new Set(existingItems || []);

            const array: any[] = [];

            items.forEach(item => {
                if (item != null) {
                    if (item.type === TextTypes.HEADER) temp = item;
                    else {
                        const { id } = item.record;
                        if (!set.has(id)) {
                            set.add(item);
                            if (temp != null) {
                                array.push(temp);
                                temp = null;
                            }
                            array.push(item);
                        }
                    }
                }
            });
            return array;
        }

        const filterItems = (items: any[]) => {
            return items.filter(
                item => item != null && (item.type === TextTypes.HEADER || resultTypes.includes(item.type))
            );
        };

        function filterResults(e) {
            const removeDuplicates = (arr: any[]) => {
                const clean: any[] = [];
                const seenIds = new Set();
                arr.forEach(item => {
                    if (item == null || item.record == null) return;
                    const id = item.type === "user" ? item.id : item.record.id;
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        clean.push(item);
                    }
                });
                return clean;
            };

            const { results, hasQuery, frequentChannels, pinnedDestinations } = e;
            if (hasQuery) return processItems(filterItems(results));

            const channelHistory = FrequentsModule.getChannelHistory();

            const recentDestinations = filterItems([
                ...(channelHistory.length > 0 ? channelHistory.map(e => convertItem(e)) : []),
                ...(frequentChannels.length > 0 ? frequentChannels.map(e => convertItem(e.id)) : [])
            ]);

            const destinations = removeDuplicates(
                [...(pinnedDestinations.length > 0 ? pinnedDestinations.map(e => getItem(e)) : []),
                ...recentDestinations
                ]);

            return processItems(destinations).slice(0, 15);
        }

        return {
            results: useMemo(() => filterResults({
                results: results,
                hasQuery: hasQuery,
                frequentChannels: frequentChannels,
                pinnedDestinations: pinned,
                isConnected: isConnected
            }), [results, hasQuery, frequentChannels, pinned, isConnected]),
            updateSearchText: updateSearch
        };
    }

    const { results, updateSearchText } = generateResults({
        selectedDestinations: selected,
    });

    const selectedDestinationKeys = useMemo(() => {
        return selected?.map(destination => `${destination.type}-${destination.id}`) || [];
    }, [selected]);

    const rowHeight = useCallback(() => 48, []);

    function ModalScroller(e) {

        const { rowData: t, handleToggleDestination, ...extraProps } = e;
        const sectionCount = useMemo(() => [t.length], [t.length]);

        const callback = useCallback(e => {
            const { section, row } = e;
            if (section > 0)
                return;
            const { type, record } = results[row];
            if (type === TextTypes.HEADER)
                return;

            const destination = {
                type: type === TextTypes.USER ? "user" : "channel",
                id: record.id
            };

            const key = `${destination.type}-${destination.id}`;


            const rowProps: UnspecificRowProps = {
                key,
                destination,
                rowMode: "toggle",
                disabled: false,
                isSelected: selectedDestinationKeys.includes(key),
                onPressDestination: handleToggleDestination,
                "aria-posinset": row + 1,
                "aria-setsize": results.length
            };

            if (type === TextTypes.USER)
                return generateUserItem(record, rowProps);
            if (type === TextTypes.GROUP_DM)
                return generateGdmItem(record, rowProps);
            if (type === TextTypes.TEXT_CHANNEL || type === TextTypes.VOICE_CHANNEL) {
                return generateChannelItem(record, rowProps);
            } else throw new Error("Unknown type " + type);
        }, [results, selectedDestinationKeys, handleToggleDestination]);
        const navRef = useRef(null);
        const nav = createNavigator(cl("search-modal"), navRef);

        return navigatorWrapper({
            navigator: nav,
            children: navigatorData({
                children: e => {
                    const { ref, ...data } = e;
                    return <SearchBarModule.ModalListContent
                        scrollerRef={
                            elem => {
                                navRef.current = elem;
                                ref.current = elem?.getScrollerNode() ?? null;
                            }
                        }
                        {...data}
                        {...extraProps}
                        sections={sectionCount}
                        sectionHeight={0}
                        renderRow={callback}
                        rowHeight={rowHeight}/>;
                }
            })
        });
    }


    const setSelectedCallback = useCallback(e => {
        setSelected(currentSelected => {
            const index = currentSelected.findIndex(item => {
                const { type, id } = item;
                return type === e.type && id === e.id;
            });

            if (index === -1) {
                /* if (currentSelected.length >= 5) {  TODO add this later
                    $(""); // Handle the case when max selection is reached
                    return currentSelected;
                } */

                refCounter.current += 1;
                return [e, ...currentSelected];
            }

            refCounter.current += 1;
            currentSelected.splice(index, 1);
            return [...currentSelected];
        });
    }, [selected]);


    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL} className={cl("search-modal")}>
            <ModalHeader
                className={cl("search-modal-header")}
                direction={Flex.Direction.VERTICAL}
                align={Flex.Align.START}
                justify={Flex.Justify.BETWEEN}
            >
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "8px"
                }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <Heading variant="heading-lg/semibold"
                                 style={{ flexGrow: 1 }}>{"Search for " + searchTypeToText(searchType)}</Heading>
                        {subText !== undefined && <Heading variant="heading-sm/normal"
                                                           style={{ color: "var(--header-muted)" }}>{subText}</Heading>}
                    </div>
                    <ModalCloseButton onClick={modalProps.onClose}/>
                </div>
                <SearchBarWrapper.SearchBar
                    size={SearchBarModule.SearchBar.Sizes.MEDIUM}
                    placeholder="Search"
                    query={searchText}
                    onChange={v => {
                        setSearchText(v);
                        updateSearchText(v);
                    }}
                    onClear={() => {
                        setSearchText("");
                        updateSearchText("");
                    }}
                    setFocus={true}
                />
            </ModalHeader>
            {
                results.length > 0 ? <ModalScroller
                    paddingBottom={16}
                    paddingTop={16}
                    rowData={results}
                    handleToggleDestination={setSelectedCallback}
                /> : <ModalContent className={cl("no-results")}>
                    <Text
                        variant="text-md/normal"
                        style={{ color: "var(--text-normal)" }}
                    >No results found</Text>
                </ModalContent>
            }

            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        onSubmit(selected);
                        modalProps.onClose();
                    }}
                >
                    Confirm
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
}
