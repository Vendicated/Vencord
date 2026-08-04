/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import type { Channel, RenderModalProps } from "@vencord/discord-types";
import {
    Avatar,
    ChannelRouter,
    ChannelStore,
    ConfirmModal,
    FluxDispatcher,
    Forms,
    GuildStore,
    ListScrollerThin,
    MessageActions,
    Modal,
    openModal,
    PermissionsBits,
    PermissionStore,
    Select,
    SelectedChannelStore,
    showToast,
    Timestamp,
    Toasts,
    useEffect,
    useMemo,
    UserStore,
    useState
} from "@webpack/common";

import { createTimelineMessageNavigator } from "./navigation";
import {
    MAX_TIMELINE_EVENTS,
    type PresenceStatus,
    type TimelineEvent,
    type TimelineEventType,
    timelineStore } from "./store";

const cl = classNameFactory("vc-activity-timeline-");

const timelineMessageNavigator = createTimelineMessageNavigator({
    getChannel: channelId => ChannelStore.getChannel(channelId),
    canViewChannel: channel => Boolean(channel.guild_id && PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)),
    getSelectedChannelId: () => SelectedChannelStore.getChannelId(),
    subscribe: callback => FluxDispatcher.subscribe("CHANNEL_SELECT", callback),
    unsubscribe: callback => FluxDispatcher.unsubscribe("CHANNEL_SELECT", callback),
    wait: callback => FluxDispatcher.wait(callback),
    transitionToChannel: channelId => ChannelRouter.transitionToChannel(channelId),
    transitionToThread: channel => ChannelRouter.transitionToThread(channel as Channel),
    jumpToMessage: jump => MessageActions.jumpToMessage(jump),
    notify: message => showToast(message, Toasts.Type.FAILURE),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: timeout => clearTimeout(timeout as number)
});

export function cancelPendingTimelineMessageNavigation() {
    timelineMessageNavigator.cancel();
}

type FilterType = "all" | TimelineEventType;
type FilterValue = "all" | string;

const typeOptions: { label: string; value: FilterType; }[] = [
    { label: "All events", value: "all" },
    { label: "Messages", value: "message" },
    { label: "Presence", value: "presence" },
    { label: "Voice", value: "voice" }
];

const statusLabels: Record<PresenceStatus, string> = {
    online: "Online",
    idle: "Idle",
    dnd: "Do Not Disturb",
    invisible: "Invisible",
    offline: "Offline"
};

function displayUserName(userId: string) {
    const user = UserStore.getUser(userId);
    return user?.globalName || user?.username || userId;
}

function canViewGuildChannel(channel: Channel | undefined) {
    return Boolean(channel?.guild_id && PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel));
}

function channelName(channelId: string | undefined) {
    if (!channelId) return "unknown channel";
    const channel = ChannelStore.getChannel(channelId);
    if (!canViewGuildChannel(channel)) return "inaccessible channel";
    return channel?.name ? `#${channel.name}` : channelId;
}

function guildName(guildId: string) {
    return GuildStore.getGuild(guildId)?.name || "inaccessible server";
}

function eventUsesGuild(event: TimelineEvent, guildId: string) {
    return event.type !== "presence" && event.guildId === guildId;
}

function eventUsesChannel(event: TimelineEvent, channelId: string) {
    return event.type === "message"
        ? event.channelId === channelId
        : event.type === "voice"
            ? event.fromChannelId === channelId || event.toChannelId === channelId
            : false;
}

function eventTypeLabel(type: TimelineEventType) {
    return type === "message" ? "Message" : type === "presence" ? "Presence" : "Voice";
}

function EventRow({ event, modalProps }: { event: TimelineEvent; modalProps: RenderModalProps; }) {
    let title: string;
    let details: string;
    let disabledReason: string | undefined;

    if (event.type === "message") {
        const channel = ChannelStore.getChannel(event.channelId);
        title = "Message received";
        details = `${guildName(event.guildId)} · ${channelName(event.channelId)}`;
        if (event.deletedAt) {
            disabledReason = "Message deleted";
        } else if (!canViewGuildChannel(channel)) {
            disabledReason = "Channel inaccessible";
        }
    } else if (event.type === "presence") {
        title = `${statusLabels[event.previousStatus]} → ${statusLabels[event.currentStatus]}`;
        details = "Presence change observed";
    } else {
        title = event.action === "join" ? "Joined voice" : event.action === "leave" ? "Left voice" : "Moved in voice";
        const from = channelName(event.fromChannelId);
        const to = channelName(event.toChannelId);
        details = event.action === "join"
            ? `${guildName(event.guildId)} · ${to}`
            : event.action === "leave"
                ? `${guildName(event.guildId)} · ${from}`
                : `${guildName(event.guildId)} · ${from} → ${to}`;
    }

    const jump = () => {
        if (event.type !== "message" || disabledReason) return;
        timelineMessageNavigator.navigate({
            guildId: event.guildId,
            channelId: event.channelId,
            messageId: event.messageId,
            deletedAt: event.deletedAt,
            onClose: modalProps.onClose
        });
    };

    return (
        <div className={cl("event")}>
            <div className={cl("eventHeader")}>
                <span className={cl("eventType")}>{eventTypeLabel(event.type)}</span>
                <Timestamp timestamp={new Date(event.timestamp)} isInline={false} />
            </div>
            <div className={cl("eventTitle")}>{title}</div>
            <div className={cl("eventDetails")}>{details}</div>
            {event.type === "message" && (
                <button className={cl("jump")} type="button" disabled={Boolean(disabledReason)} onClick={jump}>
                    {disabledReason || "Jump to message"}
                </button>
            )}
        </div>
    );
}

function FilterSelect<T extends FilterValue>({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: T;
    options: { label: string; value: T; }[];
    onChange(value: T): void;
}) {
    return (
        <div className={cl("filter")}>
            <Forms.FormText>{label}</Forms.FormText>
            <Select
                options={options}
                isSelected={option => option === value}
                select={option => onChange(option as T)}
                serialize={option => String(option)}
                closeOnSelect={true}
                maxVisibleItems={6}
            />
        </div>
    );
}

export function ActivityTimelineModal({
    modalProps,
    initialTargetUserId,
    onStart,
    onClear,
    onStop,
    onRetry
}: {
    modalProps: RenderModalProps;
    initialTargetUserId?: string;
    onStart(userId: string): void;
    onClear(userId: string): void;
    onStop(): void;
    onRetry(): void;
}) {
    const [, setVersion] = useState(0);
    const [filterUser, setFilterUser] = useState<string | undefined>(initialTargetUserId);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterGuild, setFilterGuild] = useState<FilterValue>("all");
    const [filterChannel, setFilterChannel] = useState<FilterValue>("all");

    useEffect(() => timelineStore.subscribe(() => setVersion(version => version + 1)), []);

    const snapshot = timelineStore.getSnapshot();
    const sessionById = useMemo(() => new Map(snapshot.sessions.map(session => [session.id, session])), [snapshot.sessions]);
    const userIds = useMemo(() => {
        const ids = new Set<string>();
        const lastActivity = new Map<string, number>();
        for (const session of snapshot.sessions) ids.add(session.targetUserId);
        if (initialTargetUserId) ids.add(initialTargetUserId);
        if (snapshot.target) ids.add(snapshot.target.userId);
        const ownId = UserStore.getCurrentUser()?.id;
        if (ownId) ids.add(ownId);
        for (const session of snapshot.sessions)
            lastActivity.set(session.targetUserId, Math.max(lastActivity.get(session.targetUserId) || 0, session.startedAt));
        for (const event of snapshot.events) {
            const userId = sessionById.get(event.sessionId)?.targetUserId;
            if (userId) lastActivity.set(userId, Math.max(lastActivity.get(userId) || 0, event.timestamp));
        }
        return Array.from(ids).sort((left, right) => (lastActivity.get(right) || 0) - (lastActivity.get(left) || 0));
    }, [initialTargetUserId, sessionById, snapshot.events, snapshot.sessions, snapshot.target]);

    useEffect(() => {
        if (!filterUser || !userIds.includes(filterUser))
            setFilterUser(initialTargetUserId && userIds.includes(initialTargetUserId) ? initialTargetUserId : snapshot.target?.userId || userIds[0]);
    }, [filterUser, initialTargetUserId, snapshot.target, userIds]);

    const selectedEvents = useMemo(() => snapshot.events.filter(event => sessionById.get(event.sessionId)?.targetUserId === filterUser), [filterUser, sessionById, snapshot.events]);
    const userOptions = userIds.map(userId => ({ label: displayUserName(userId), value: userId }));
    const guildOptions = useMemo(() => {
        const guildIds = new Set(selectedEvents.filter(event => event.type !== "presence").map(event => event.guildId));
        return [{ label: "All servers", value: "all" }, ...Array.from(guildIds, guildId => ({ label: guildName(guildId), value: guildId }))];
    }, [selectedEvents]);
    const channelOptions = useMemo(() => {
        const channelIds = new Set(selectedEvents
            .filter(event => event.type !== "presence")
            .filter(event => filterGuild === "all" || eventUsesGuild(event, filterGuild))
            .flatMap(event => event.type === "message" ? [event.channelId] : [event.fromChannelId, event.toChannelId].filter((id): id is string => Boolean(id))));
        return [{ label: "All channels", value: "all" }, ...Array.from(channelIds, channelId => ({ label: channelName(channelId), value: channelId }))];
    }, [filterGuild, selectedEvents]);

    useEffect(() => {
        if (filterGuild !== "all" && !guildOptions.some(option => option.value === filterGuild)) setFilterGuild("all");
    }, [filterGuild, guildOptions]);
    useEffect(() => {
        if (filterChannel !== "all" && !channelOptions.some(option => option.value === filterChannel)) setFilterChannel("all");
    }, [channelOptions, filterChannel]);

    const visibleEvents = useMemo(() => [...selectedEvents]
        .reverse()
        .filter(event => filterType === "all" || event.type === filterType)
        .filter(event => filterGuild === "all" || eventUsesGuild(event, filterGuild))
        .filter(event => filterChannel === "all" || eventUsesChannel(event, filterChannel)),
    [filterChannel, filterGuild, filterType, selectedEvents]);

    const selectedUserId = filterUser;
    const selectedName = selectedUserId ? displayUserName(selectedUserId) : "No user selected";
    const selectedActive = snapshot.target?.userId === selectedUserId;
    const activeOther = Boolean(snapshot.target && !selectedActive);
    const selectedSession = snapshot.sessions.find(session => session.id === snapshot.activeSessionId && session.targetUserId === selectedUserId)
        || [...snapshot.sessions].reverse().find(session => session.targetUserId === selectedUserId);
    const startText = selectedActive
        ? "Tracking active"
        : activeOther
            ? `Switch tracking to ${selectedName}`
            : "Start Activity Timeline";
    const canStart = snapshot.hydrationState === "ready" && !snapshot.storageError && Boolean(selectedUserId) && !selectedActive;

    const confirmClear = () => {
        if (!selectedUserId) return;
        openModal(props => (
            <ConfirmModal
                {...props}
                title="Clear Activity Timeline history?"
                subtitle={`This removes the saved history for ${selectedName}. Other users' history will remain.`}
                confirmText="Clear history"
                cancelText="Keep history"
                onConfirm={() => onClear(selectedUserId)}
            />
        ));
    };

    const selectedHistoryCount = selectedEvents.length;

    return (
        <Modal
            {...modalProps}
            title="Activity Timeline"
            actions={[
                {
                    text: startText,
                    variant: "primary",
                    disabled: !canStart,
                    onClick: () => selectedUserId && onStart(selectedUserId)
                },
                {
                    text: "Clear History",
                    variant: "primary",
                    disabled: selectedHistoryCount === 0,
                    onClick: confirmClear
                },
                {
                    text: "Stop Activity Timeline",
                    variant: "critical-primary",
                    disabled: !snapshot.target,
                    onClick: onStop
                },
                ...(snapshot.storageError ? [{
                    text: "Retry loading history",
                    variant: "primary" as const,
                    onClick: onRetry
                }] : [])
            ]}
        >
            <div className={cl("modal")}>
                <div className={cl("summary")}>
                    <div className={cl("targetHeader")}>
                        {selectedUserId && UserStore.getUser(selectedUserId) && (
                            <Avatar
                                src={UserStore.getUser(selectedUserId)!.getAvatarURL(undefined, 40, false)}
                                size="SIZE_40"
                                className={cl("avatar")}
                            />
                        )}
                        <div className={cl("target")}>{selectedName}</div>
                        {selectedActive && <span className={cl("activeBadge")}>Tracking</span>}
                    </div>
                    {snapshot.hydrationState === "loading" && <Forms.FormText>Loading saved history...</Forms.FormText>}
                    {snapshot.storageError && <div className={cl("notice", "error")}>{snapshot.storageError}</div>}
                    {snapshot.capacityReached && <div className={cl("notice")}>The 20,000-event limit was reached. Tracking is stopped; clear or wait for expiry to start again.</div>}
                    {snapshot.hydrationState === "ready" && !snapshot.storageError && <Forms.FormText>
                        {selectedSession ? `Started ${new Date(selectedSession.startedAt).toLocaleString()}` : "No tracking session for this user"} · {selectedHistoryCount}/{MAX_TIMELINE_EVENTS} events · History retained for 72 hours
                    </Forms.FormText>}
                </div>

                <div className={cl("filters")}>
                    <FilterSelect label="User" value={filterUser || "all"} options={userOptions.length ? userOptions : [{ label: "No users", value: "all" }]} onChange={value => setFilterUser(value === "all" ? undefined : value)} />
                    <FilterSelect label="Type" value={filterType} options={typeOptions} onChange={value => setFilterType(value as FilterType)} />
                    <FilterSelect label="Server" value={filterGuild} options={guildOptions} onChange={setFilterGuild} />
                    <FilterSelect label="Channel" value={filterChannel} options={channelOptions} onChange={setFilterChannel} />
                </div>

                {visibleEvents.length > 0 ? (
                    <ListScrollerThin className={cl("scroller")} sections={[visibleEvents.length]} sectionHeight={0} rowHeight={112} renderSection={() => null} renderRow={item => (
                        <EventRow key={visibleEvents[item.row].id} event={visibleEvents[item.row]} modalProps={modalProps} />
                    )} />
                ) : (
                    <div className={cl("empty")}>
                        {snapshot.hydrationState === "loading"
                            ? "Loading Activity Timeline history..."
                            : selectedHistoryCount > 0 ? "No events match these filters." : "No events have been observed for this user."
                        }
                    </div>
                )}
            </div>
        </Modal>
    );
}

export const WrappedActivityTimelineModal = ErrorBoundary.wrap(ActivityTimelineModal, { noop: true });
