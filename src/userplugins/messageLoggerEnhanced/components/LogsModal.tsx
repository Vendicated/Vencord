/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { classNameFactory } from "@api/Styles";
import { openUserProfile } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { closeAllModals, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { LazyComponent, useAwaiter } from "@utils/react";
import { find, findByCode, findByPropsLazy } from "@webpack";
import { Alerts, Button, ChannelStore, ContextMenuApi, FluxDispatcher, Menu, NavigationRouter, React, TabBar, Text, TextInput, useCallback, useMemo, useRef, useState } from "@webpack/common";
import { User } from "discord-types/general";

import { settings } from "../index";
import { clearLogs, defaultLoggedMessages, removeLog, removeLogs, savedLoggedMessages } from "../LoggedMessageManager";
import { LoggedMessage, LoggedMessageJSON, LoggedMessages } from "../types";
import { isGhostPinged, messageJsonToMessageClass, sortMessagesByDate } from "../utils";
import { doesMatch, parseQuery } from "../utils/parseQuery";



export interface MessagePreviewProps {
    className: string;
    author: User;
    message: LoggedMessage;
    compact: boolean;
    isGroupStart: boolean;
    hideSimpleEmbedContent: boolean;

    childrenAccessories: any;
}

export interface ChildrenAccProops {
    channelMessageProps: {
        compact: boolean;
        channel: any;
        message: LoggedMessage;
        groupId: string;
        id: string;
        isLastItem: boolean;
        isHighlight: boolean;
        renderContentOnly: boolean;
    };
    hasSpoilerEmbeds: boolean;
    isInteracting: boolean;
    isAutomodBlockedMessage: boolean;
    showClydeAiEmbeds: boolean;
}

const ChannelRecords = findByPropsLazy("PrivateChannelRecord");
const MessagePreview = LazyComponent<MessagePreviewProps>(() => find(m => m?.type?.toString().includes("previewLinkTarget:") && !m?.type?.toString().includes("HAS_THREAD")));
const ChildrenAccessories = LazyComponent<ChildrenAccProops>(() => findByCode("channelMessageProps:{message:"));

const cl = classNameFactory("msg-logger-modal-");

enum LogTabs {
    DELETED = "Deleted",
    EDITED = "Edited",
    GHOST_PING = "Ghost Pinged"
}

interface Props {
    modalProps: ModalProps;
    initalQuery?: string;
}

export function LogsModal({ modalProps, initalQuery }: Props) {
    const [x, setX] = useState(0);
    const forceUpdate = () => setX(e => e + 1);

    const [logs, _, pending] = useAwaiter(async () => savedLoggedMessages, {
        fallbackValue: defaultLoggedMessages as LoggedMessages,
        deps: [x]
    });
    const [currentTab, setCurrentTab] = useState(LogTabs.DELETED);
    const [queryEh, setQuery] = useState(initalQuery ?? "");
    const [sortNewest, setSortNewest] = useState(settings.store.sortNewest);
    const [numDisplayedMessages, setNumDisplayedMessages] = useState(50);
    const contentRef = useRef<HTMLDivElement | null>(null);

    const handleLoadMore = useCallback(() => {
        setNumDisplayedMessages(prevNum => prevNum + 50);
    }, []);


    // Flogger.log(logs, _, pending, contentRef);

    // Flogger.time("hi");
    const messages: string[][] = currentTab === LogTabs.DELETED || currentTab === LogTabs.GHOST_PING
        ? Object.values(logs?.deletedMessages ?? {})
        : Object.values(logs?.editedMessages ?? {});

    const flattendAndfilteredAndSortedMessages = useMemo(() => {
        const { success, type, id, negate, query } = parseQuery(queryEh);

        if (query === "" && !success) {
            const result = messages
                .flat()
                .filter(m => currentTab === LogTabs.GHOST_PING ? isGhostPinged(logs[m].message!) : true)
                .sort(sortMessagesByDate);
            return sortNewest ? result : result.reverse();
        }

        const result = messages
            .flat()
            .filter(m =>
                currentTab === LogTabs.GHOST_PING
                    ? isGhostPinged(logs[m].message)
                    : true
            )
            .filter(m =>
                logs[m]?.message != null &&
                (
                    success === false
                        ? true
                        : negate
                            ? !doesMatch(type!, id!, logs[m].message!)
                            : doesMatch(type!, id!, logs[m].message!)
                )
            )
            .filter(m =>
                logs[m]?.message?.content?.toLowerCase()?.includes(query.toLowerCase()) ??
                logs[m].message?.editHistory?.map(m => m.content?.toLowerCase()).includes(query.toLowerCase())
            )
            .sort(sortMessagesByDate);

        return sortNewest ? result : result.reverse();
    }, [currentTab, logs, queryEh, sortNewest]);

    const visibleMessages = flattendAndfilteredAndSortedMessages.slice(0, numDisplayedMessages);

    const canLoadMore = numDisplayedMessages < flattendAndfilteredAndSortedMessages.length;

    // Flogger.timeEnd("hi");
    return (
        <ModalRoot className={cl("root")} {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader className={cl("header")}>
                <TextInput value={queryEh} onChange={e => setQuery(e)} style={{ width: "100%" }} placeholder="Filter Messages" />
                <TabBar
                    type="top"
                    look="brand"
                    className={cl("tab-bar")}
                    selectedItem={currentTab}
                    onItemSelect={e => {
                        setCurrentTab(e);
                        setNumDisplayedMessages(50);
                        contentRef.current?.firstElementChild?.scrollTo(0, 0);
                        // forceUpdate();
                    }}
                >
                    <TabBar.Item
                        className={cl("tab-bar-item")}
                        id={LogTabs.DELETED}
                    >
                        Deleted
                    </TabBar.Item>
                    <TabBar.Item
                        className={cl("tab-bar-item")}
                        id={LogTabs.EDITED}
                    >
                        Edited
                    </TabBar.Item>
                    <TabBar.Item
                        className={cl("tab-bar-item")}
                        id={LogTabs.GHOST_PING}
                    >
                        Ghost Pinged
                    </TabBar.Item>
                </TabBar>
            </ModalHeader>
            <div style={{ opacity: modalProps.transitionState === 1 ? "1" : "0" }} className={cl("content-container")} ref={contentRef}>
                {
                    modalProps.transitionState === 1 &&
                    <ModalContent
                        className={cl("content")}
                    >
                        {
                            pending || logs == null || messages.length === 0
                                ? <EmptyLogs />
                                : (
                                    <LogsContentMemo
                                        visibleMessages={visibleMessages}
                                        canLoadMore={canLoadMore}
                                        tab={currentTab}
                                        logs={logs}
                                        sortNewest={sortNewest}
                                        forceUpdate={forceUpdate}
                                        handleLoadMore={handleLoadMore}
                                    />
                                )
                        }
                    </ModalContent>
                }
            </div>
            <ModalFooter>
                <Button
                    color={Button.Colors.RED}
                    onClick={() => Alerts.show({
                        title: "Clear Logs",
                        body: "Are you sure you want to clear all the logs",
                        confirmText: "Clear",
                        confirmColor: Button.Colors.RED,
                        cancelText: "Cancel",
                        onConfirm: async () => {
                            await clearLogs();
                            forceUpdate();
                        }

                    })}
                >
                    Clear All Logs
                </Button>
                <Button
                    style={{ marginRight: "16px" }}
                    color={Button.Colors.YELLOW}
                    disabled={visibleMessages.length === 0}
                    onClick={() => Alerts.show({
                        title: "Clear Logs",
                        body: `Are you sure you want to clear ${visibleMessages.length} logs`,
                        confirmText: "Clear",
                        confirmColor: Button.Colors.RED,
                        cancelText: "Cancel",
                        onConfirm: async () => {
                            await removeLogs(visibleMessages);
                            forceUpdate();
                        }
                    })}
                >
                    Clear Visible Logs
                </Button>
                <Button
                    look={Button.Looks.LINK}
                    color={Button.Colors.PRIMARY}
                    onClick={() => {
                        setSortNewest(e => {
                            const val = !e;
                            settings.store.sortNewest = val;
                            return val;
                        });
                        contentRef.current?.firstElementChild?.scrollTo(0, 0);
                    }}
                >
                    Sort {sortNewest ? "Oldest First" : "Newest First"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

interface LogContentProps {
    logs: LoggedMessages,
    sortNewest: boolean;
    tab: LogTabs;
    visibleMessages: string[];
    canLoadMore: boolean;
    forceUpdate: () => void;
    handleLoadMore: () => void;
}

function LogsContent({ logs, visibleMessages, canLoadMore, sortNewest, tab, forceUpdate, handleLoadMore }: LogContentProps) {
    if (visibleMessages.length === 0)
        return <NoResults tab={tab} />;

    return (
        <div className={cl("content-inner")}>
            {visibleMessages
                .map((id, i) => (
                    <LMessage
                        key={id}
                        log={logs[id] as { message: LoggedMessageJSON; }}
                        forceUpdate={forceUpdate}
                        isGroupStart={isGroupStart(logs[id]?.message, logs[visibleMessages[i - 1]]?.message, sortNewest)}
                    />
                ))}
            {
                canLoadMore &&
                <Button
                    style={{ marginTop: "1rem", width: "100%" }}
                    size={Button.Sizes.SMALL} onClick={() => handleLoadMore()}
                >
                    Load More
                </Button>
            }
        </div>
    );
}

const LogsContentMemo = LazyComponent(() => React.memo(LogsContent));


function NoResults({ tab }: { tab: LogTabs; }) {
    const generateSuggestedTabs = (tab: LogTabs) => {
        switch (tab) {
            case LogTabs.DELETED:
                return { nextTab: LogTabs.EDITED, lastTab: LogTabs.GHOST_PING };
            case LogTabs.EDITED:
                return { nextTab: LogTabs.GHOST_PING, lastTab: LogTabs.DELETED };
            case LogTabs.GHOST_PING:
                return { nextTab: LogTabs.DELETED, lastTab: LogTabs.EDITED };
            default:
                return { nextTab: "", lastTab: "" };
        }
    };

    const { nextTab, lastTab } = generateSuggestedTabs(tab);

    return (
        <div className={cl("empty-logs", "content-inner")} style={{ textAlign: "center" }}>
            <Text variant="text-lg/normal">
                No results in <b>{tab}</b>.
            </Text>
            <Text variant="text-lg/normal" style={{ marginTop: "0.2rem" }}>
                Maybe try <b>{nextTab}</b> or <b>{lastTab}</b>
            </Text>
        </div>
    );
}

function EmptyLogs() {
    return (
        <div className={cl("empty-logs", "content-inner")} style={{ textAlign: "center" }}>
            <Text variant="text-lg/normal">
                Empty eh
            </Text>
        </div>
    );

}

interface LMessageProps {
    log: { message: LoggedMessageJSON; };
    isGroupStart: boolean,
    forceUpdate: () => void;
}
function LMessage({ log, isGroupStart, forceUpdate, }: LMessageProps) {
    const message = useMemo(() => messageJsonToMessageClass(log), [log]);

    if (!message) return null;

    return (
        <div
            onContextMenu={e => {
                ContextMenuApi.openContextMenu(e, () =>
                    <Menu.Menu
                        navId="message-logger"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                        aria-label="Message Logger"
                    >

                        <Menu.MenuItem
                            key="jump-to-message"
                            id="jump-to-message"
                            label="Jump To Message"
                            action={() => {
                                NavigationRouter.transitionTo(`/channels/${ChannelStore.getChannel(message.channel_id)?.guild_id ?? "@me"}/${message.channel_id}${message.id ? "/" + message.id : ""}`);
                                closeAllModals();
                            }}
                        />
                        <Menu.MenuItem
                            key="open-user-profile"
                            id="open-user-profile"
                            label="Open user profile"
                            action={() => {
                                closeAllModals();
                                openUserProfile(message.author.id);
                            }}
                        />

                        <Menu.MenuItem
                            key="copy-content"
                            id="copy-content"
                            label="Copy Content"
                            action={() => copyWithToast(message.content)}
                        />

                        <Menu.MenuItem
                            key="copy-user-id"
                            id="copy-user-id"
                            label="Copy User ID"
                            action={() => copyWithToast(message.author.id)}
                        />

                        <Menu.MenuItem
                            key="copy-message-id"
                            id="copy-message-id"
                            label="Copy Message ID"
                            action={() => copyWithToast(message.id)}
                        />

                        <Menu.MenuItem
                            key="copy-channel-id"
                            id="copy-channel-id"
                            label="Copy Channel ID"
                            action={() => copyWithToast(message.channel_id)}
                        />

                        {
                            log.message.guildId != null
                            && (
                                <Menu.MenuItem
                                    key="copy-server-id"
                                    id="copy-server-id"
                                    label="Copy Server ID"
                                    action={() => copyWithToast(log.message.guildId!)}
                                />
                            )
                        }

                        <Menu.MenuItem
                            key="delete-log"
                            id="delete-log"
                            label="Delete Log"
                            color="danger"
                            action={() =>
                                removeLog(log.message.id)
                                    .then(() => {
                                        forceUpdate();
                                    })
                            }
                        />

                    </Menu.Menu>
                );
            }}>
            <MessagePreview
                className={`${cl("msg-preview")} ${message.deleted ? "messagelogger-deleted" : ""}`}
                author={message.author}
                message={message}
                compact={false}
                isGroupStart={isGroupStart}
                hideSimpleEmbedContent={false}

                childrenAccessories={
                    <ChildrenAccessories
                        channelMessageProps={{
                            channel: ChannelStore.getChannel(message.channel_id) || new ChannelRecords.PrivateChannelRecord({ id: "" }),
                            message,
                            compact: false,
                            groupId: "1",
                            id: message.id,
                            isLastItem: false,
                            isHighlight: false,
                            renderContentOnly: false,
                        }}
                        hasSpoilerEmbeds={false}
                        isInteracting={false}
                        showClydeAiEmbeds={true}
                        isAutomodBlockedMessage={false}
                    />
                }

            />
        </div>
    );
}

export const openLogModal = (initalQuery?: string) => openModal(modalProps => <LogsModal modalProps={modalProps} initalQuery={initalQuery} />);

function isGroupStart(
    currentMessage: LoggedMessageJSON | undefined,
    previousMessage: LoggedMessageJSON | undefined,
    sortNewest: boolean
) {
    if (!currentMessage || !previousMessage) return true;

    const [newestMessage, oldestMessage] = sortNewest
        ? [previousMessage, currentMessage]
        : [currentMessage, previousMessage];

    if (newestMessage.author.id !== oldestMessage.author.id) return true;

    const timeDifferenceInMinutes = Math.abs(
        (new Date(newestMessage.timestamp).getTime() - new Date(oldestMessage.timestamp).getTime()) / (1000 * 60)
    );

    return timeDifferenceInMinutes >= 5;
}
