
import { addGlobalContextMenuPatch, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import {
    ChannelStore,
    FluxDispatcher,
    GuildMemberStore,
    GuildStore,
    IconUtils,
    Menu,
    PermissionsBits,
    PermissionStore,
    React,
    RestAPI,
    UserStore,
    showToast
} from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

interface VoiceState {
    userId: string;
    guildId?: string | null;
    channelId?: string | null;
}

interface BlockedUsersSettingsProps {
    setValue: (value: string) => void;
}

const parseList = (s: string) =>
    new Set((s ?? "").split(/[\s,]+/).filter(Boolean));

const saveList = (set: Set<string>) => {
    settings.store.blockedUsers = [...set].join(", ");
};

// Custom blocked-user settings component
function BlockedUsersSettings({ setValue }: BlockedUsersSettingsProps) {
    const { blockedUsers } = settings.use(["blockedUsers"]);

    const [users, setUsers] = React.useState<Record<string, any>>({});

    const ids = [...parseList(blockedUsers)];

    // Fetch user information for IDs not currently cached by Discord
    React.useEffect(() => {
        let cancelled = false;

        async function fetchUsers() {
            const result: Record<string, any> = {};

            await Promise.all(ids.map(async id => {
                let user = UserStore.getUser(id);

                if (!user) {
                    try {
                        const response = await RestAPI.get({
                            url: `/users/${id}`
                        });

                        user = response.body ?? response;
                    } catch (err) {
                        console.error("[AutoVcKick] Failed to fetch user", id, err);
                    }
                }

                if (user) result[id] = user;
            }));

            if (!cancelled) setUsers(result);
        }

        fetchUsers();

        return () => {
            cancelled = true;
        };
    }, [blockedUsers]);

    function removeUser(id: string) {
        const updated = parseList(blockedUsers);
        updated.delete(id);

        setValue([...updated].join(", "));
    }

    if (!ids.length) {
        return (
            <div style={{
                padding: "12px 0",
                color: "var(--text-muted)"
            }}>
                No users in the auto-kick list.
                <br />
                Right-click a user to add them.
            </div>
        );
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 8
        }}>
            {ids.map(id => {
                const user = users[id];

                // Get every cached server nickname for this user
                const nicknames = GuildMemberStore.memberOf(id)
                    .flatMap(guildId => {
                        const nick = GuildMemberStore.getNick(guildId, id);
                        const guild = GuildStore.getGuild(guildId);

                        return nick && guild
                            ? [{ nick, guild: guild.name }]
                            : [];
                    });

                const displayName =
                    nicknames[0]?.nick ||
                    user?.globalName ||
                    user?.username ||
                    id;

                const avatar = user
                    ? IconUtils.getUserAvatarURL(user, true, 64)
                    : IconUtils.getDefaultAvatarURL(id);

                return (
                    <div
                        key={id}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: 10,
                            borderRadius: 8,
                            background: "var(--background-secondary)"
                        }}
                    >
                        <img
                            src={avatar}
                            alt=""
                            width={40}
                            height={40}
                            style={{
                                borderRadius: "50%",
                                flexShrink: 0
                            }}
                        />

                        <div style={{
                            flex: 1,
                            minWidth: 0
                        }}>
                            <div style={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                            }}>
                                {displayName}
                            </div>

                            <div style={{
                                color: "var(--text-muted)",
                                fontSize: 12
                            }}>
                                @{user?.username ?? "Unknown user"}
                            </div>

                            {nicknames.map((entry, index) => (
                                <div
                                    key={`${entry.guild}-${index}`}
                                    style={{
                                        color: "var(--text-muted)",
                                        fontSize: 11
                                    }}
                                >
                                    {entry.nick} · {entry.guild}
                                </div>
                            ))}

                            <div style={{
                                color: "var(--text-muted)",
                                fontSize: 10,
                                marginTop: 3
                            }}>
                                ID: {id}
                            </div>
                        </div>

                        <Button
                            variant="dangerSecondary"
                            size="small"
                            onClick={() => removeUser(id)}
                        >
                            Remove
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Auto-disconnect listed users (turn off to pause without disabling the plugin)",
        default: true
    },

    blockedUsers: {
        type: OptionType.COMPONENT,
        default: "",
        component: BlockedUsersSettings
    },

    guildIds: {
        type: OptionType.STRING,
        description: "Only act in these server IDs (leave empty for all servers)",
        default: ""
    }
});

async function disconnectUser(
    guildId: string,
    userId: string,
    channelId: string
) {
    const channel = ChannelStore.getChannel(channelId);

    if (!channel || !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel))
        return false;

    try {
        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: null }
        });

        return true;
    } catch (err) {
        console.error("[AutoVcKick] Failed to disconnect", userId, err);
        return false;
    }
}

async function onVoiceStateUpdates({
    voiceStates
}: {
    voiceStates: VoiceState[];
}) {
    if (!settings.store.enabled) return;

    const blocked = parseList(settings.store.blockedUsers);
    if (!blocked.size) return;

    const guilds = parseList(settings.store.guildIds);
    const myId = UserStore.getCurrentUser().id;

    for (const { userId, guildId, channelId } of voiceStates) {
        if (!channelId || !guildId) continue;
        if (!blocked.has(userId) || userId === myId) continue;
        if (guilds.size && !guilds.has(guildId)) continue;

        await disconnectUser(guildId, userId, channelId);
    }
}

// Runs for EVERY context menu, whatever its navId
const contextMenuPatch = (
    navId: string,
    children: any[],
    ...args: any[]
) => {
    const props = args[0];

    const user = props?.user;

    if (!user?.id || user.id === UserStore.getCurrentUser().id)
        return;

    if (!Array.isArray(children)) return;

    // Avoid adding the item twice
    if (children.some((c: any) =>
        c?.props?.id === "vc-autokick-group"
    )) return;

    const isBlocked = parseList(settings.store.blockedUsers)
        .has(user.id);

    children.push(
        <Menu.MenuSeparator />,

        <Menu.MenuGroup id="vc-autokick-group">
            <Menu.MenuCheckboxItem
                id="vc-autokick-enabled"
                label="Auto-kick active"
                checked={settings.store.enabled}
                action={() => {
                    settings.store.enabled = !settings.store.enabled;

                    showToast(
                        settings.store.enabled
                            ? "Auto-kick enabled"
                            : "Auto-kick paused",
                        "success" as any
                    );
                }}
            />

            <Menu.MenuItem
                id="vc-autokick-toggle"
                label={
                    isBlocked
                        ? "Remove from auto-kick list"
                        : "Auto-kick from VC"
                }
                color={isBlocked ? undefined : "danger"}
                action={async () => {
                    const list = parseList(settings.store.blockedUsers);

                    if (isBlocked) {
                        list.delete(user.id);
                        saveList(list);

                        showToast(
                            `${user.username} removed from auto-kick list`,
                            "success" as any
                        );

                        return;
                    }

                    list.add(user.id);
                    saveList(list);

                    showToast(
                        `${user.username} added to auto-kick list`,
                        "success" as any
                    );

                    // If they're already in a VC, disconnect immediately
                    if (!settings.store.enabled) return;

                    const vs = VoiceStateStore.getVoiceStateForUser(user.id);

                    if (vs?.channelId) {
                        const channel = ChannelStore.getChannel(vs.channelId);

                        if (channel?.guild_id) {
                            await disconnectUser(
                                channel.guild_id,
                                user.id,
                                vs.channelId
                            );
                        }
                    }
                }}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "AutoVcKick",
    description: "Automatically disconnects specified users from voice channels",
    authors: [{
        name: "thcProphet",
        id: 828010614349365288n
    }],
    settings,

    start() {
        addGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.subscribe(
            "VOICE_STATE_UPDATES",
            onVoiceStateUpdates
        );
    },

    stop() {
        removeGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.unsubscribe(
            "VOICE_STATE_UPDATES",
            onVoiceStateUpdates
        );
    }
});
