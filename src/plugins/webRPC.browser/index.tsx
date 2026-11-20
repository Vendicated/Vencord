/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getUserSettingLazy } from "@api/UserSettings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { ReporterTestable } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { FluxDispatcher, React } from "@webpack/common";

interface NativeStatus {
    state: "connecting" | "connected" | "inactive" | "missing" | "error" | "disconnected";
    error?: string;
    version?: string;
    gameDetection?: boolean;
}

interface RpcSocket {
    id: string;
    version: number;
    encoding: "json";
    transport: "ipc";
    source: { type: "ipc"; };
    application: { id: string | null; name: string | null; icon: string | null; };
    authorization: { authing: boolean; scopes: Set<string>; accessToken: string | null; expires: Date; };
    abortController: AbortController;
    send (payload: unknown): void;
    close (code: number, message?: string): void;
}

const logger = new Logger("WebRPC");
const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;
const RPCServer = findByPropsLazy("registerTransport", "dispatchToSubscriptions");
const validateClient: (socket: RpcSocket, origin: string | null, clientId: string | null) => Promise<void> =
    findByCodeLazy('"No Client ID Specified"');

const STREAMER_MODE_ID = "STREAMERMODE";
const UI_COMMANDS = new Set(["AUTHORIZE", "INVITE_BROWSER", "GUILD_TEMPLATE_BROWSER", "GIFT_CODE_BROWSER", "DEEP_LINK"]);
const STATUS_TEXT = {
    connecting: "Connecting to the companion app...",
    connected: "Connected to the companion app",
    inactive: "RPC is active in another Discord tab",
    missing: "The companion app is not installed",
    error: "Failed to connect to the companion app",
    disconnected: "Disconnected from the companion app"
};

const connections = new Map<string, { socket: RpcSocket; ready: Promise<boolean>; }>();
const games = new Map<string, object>();

let controller = new AbortController();
let lastStatus: NativeStatus = { state: "disconnected" };
let observedGamesCallback = (_games: object[]) => { };

function post (payload: unknown) {
    if (!controller.signal.aborted) postMessage({ type: "vencord:rpc", direction: "out", payload });
}

async function disconnect (id: string) {
    const connection = connections.get(id);
    if (!connection) return;

    connections.delete(id);
    connection.socket.abortController.abort("DISCONNECTED");
    if (await connection.ready) RPCServer.handleDisconnect(connection.socket);
}

function CompanionStatus () {
    const status = React.useSyncExternalStore(onChange => {
        window.addEventListener("message", onChange);
        return () => window.removeEventListener("message", onChange);
    }, () => lastStatus);

    const variant: "success" | "warning" | "info" =
        status.state === "connected" ? "success" : status.state === "missing" || status.state === "error" ? "warning" : "info";

    return (
        <Card variant={variant}>
            <Flex flexDirection="column" gap=".5em" alignItems="flex-start">
                <Heading tag="h4" weight="bold">{STATUS_TEXT[status.state]}</Heading>
                {status.error && <Paragraph>{status.error}</Paragraph>}
                {status.state === "connected" && (
                    <Paragraph>
                        Companion version {status.version}
                        {status.gameDetection === false ? " Game detection is not available" : ""}
                    </Paragraph>
                )}
                {status.state === "missing" && (
                    <Paragraph>
                        Download the companion app from <Link href={"https://github.com/OWNER/REPO/releases/latest"}>the releases page</Link> and run it once.
                    </Paragraph>
                )}
                {(status.state === "missing" || status.state === "error" || status.state === "disconnected") && (
                    <Button variant="overlayPrimary" onClick={() => post({ type: "ready", gameDetection: ShowCurrentGame.getSetting() })}>
                        Retry
                    </Button>
                )}
            </Flex>
        </Card>
    );
}

export default definePlugin({
    name: "WebRPC",
    description: "Discord RPC support for the browser, using the Vencord WebRPC companion",
    tags: ["Activity", "Utility"],
    authors: [Devs.ThaUnknown],
    hidden: !IS_EXTENSION || IS_USERSCRIPT,
    reporterTestable: ReporterTestable.None,
    dependencies: ["UserSettingsAPI"],

    // https://github.com/Vencord/Vesktop/blob/main/src/renderer/rpc.ts
    patches: [
        // RunningGameStore has everything needed for RPC even on Web, it just has no native server for it. Re-enable support
        {
            find: 'displayName="RunningGameStore"',
            // The lock check throws on web and crashes the UI, so only enable detection if it can be patched too
            group: true,
            replacement: [
                {
                    match: /if\((\i)\)(?=.+?canCollectExecutableFingerprintsForRunningGames\(\)\{return \1\})/,
                    replace: "if(true)"
                },
                // Function used by the Overlay and called for running games. The overlay causes a crash due to missing native utils
                // Return false to make the lock fail, which skips Overlay
                {
                    match: /acquireLock=\i=>\{/,
                    replace: "$&return false;"
                }
            ]
        },
        {
            find: ",setSystemTrayApplications",
            replacement: [
                {
                    // The callback is the second to last argument. Discord builds with and without a v2 flag argument exist
                    match: /setObservedGamesCallback\((?:\i,)+(\i),\i\)\{/,
                    replace: "$&return $self.observeGames($1);"
                },
                {
                    match: /setGameDetection(Error)?Callback\(\i\)\{/g,
                    replace: "$&return;"
                },
                // Called by overlay for running games. Will print an ugly error to the console due to missing native utils
                {
                    match: /((?:GetWindowFullscreenTypeByPid|GetWindowFullscreenTypeExtraByPid|GameDisplayModeIsGameSupported)\((?:\i,)*\i\)\{let\{\i:\i\}=)this\.getDiscordUtils\(\)/g,
                    replace: "$1{}"
                }
            ]
        },
        // The card above the user panel. Commented out because:
        // - Patch doesn't seem very stable
        // - This has high crash potential. It's a UI element that always renders and Discord may introduce DiscordNative usage, as it is
        //   supposed to be Desktop-only

        // {
        //     find: 'location:"ActivityPanelGameCard",applicationId',
        //     replacement: {
        //         match: /(=null!=\i&&)\(\i\|\|\i\|\|\i\)(?=&&\(!\i\|\|\i\?\.pid!=null\))/,
        //         replace: "$1true"
        //     }
        // },

        // Registered Games settings page
        {
            find: ".REGISTERED_GAMES_SIDEBAR_ITEM,{",
            replacement: [
                {
                    match: /(\.REGISTERED_GAMES_SIDEBAR_ITEM,\{.{0,100}?usePredicate:)\i\.\i/,
                    replace: "$1()=>true"
                },
                {
                    match: /(\.getGamesSeen\(!1\)\.some\(.{0,30}?\)\)&&)\(0,\i\.\i\)\(\)/g,
                    replace: "$1true"
                }
            ]
        }
    ],

    flux: {
        USER_SETTINGS_PROTO_UPDATE () {
            post({ type: "configure", gameDetection: ShowCurrentGame.getSetting() });
        }
    },

    observeGames (callback: typeof observedGamesCallback) {
        observedGamesCallback = callback;
        callback([...games.values()]);
    },

    start () {
        controller = new AbortController();

        window.addEventListener("message", async ({ source, data }) => {
            if (source !== window || data?.type !== "vencord:rpc") return;

            if (data.direction === "status") {
                if (data.status) lastStatus = data.status;
                return;
            }

            const message = data.payload;
            if (data.direction !== "in" || !message) return;

            switch (message.type) {
                case "rpc-connect": {
                    const { id } = message;
                    const socket: RpcSocket = {
                        id,
                        version: message.client.version,
                        encoding: "json",
                        transport: "ipc",
                        source: { type: "ipc" },
                        application: { id: null, name: null, icon: null },
                        authorization: { authing: false, scopes: new Set(), accessToken: null, expires: new Date(0) },
                        abortController: new AbortController(),
                        send: payload => post({ type: "rpc-send", id, json: JSON.stringify(payload) }),
                        close: (code, message) => post({ type: "rpc-close", id, code, message })
                    };

                    const ready = (async () => {
                        try {
                            await validateClient(socket, null, message.client.clientId);
                            if (socket.abortController.signal.aborted) return false;

                            RPCServer.handleConnect(socket);
                            return true;
                        } catch (error: any) {
                            if (!socket.abortController.signal.aborted) socket.close(error.code, error.message);
                            return false;
                        }
                    })();

                    connections.set(id, { socket, ready });
                    break;
                }

                case "rpc-request": {
                    const connection = connections.get(message.id);
                    if (!connection || !(await connection.ready)) return;

                    try {
                        const request = JSON.parse(message.payload);
                        const opensUi = UI_COMMANDS.has(request.cmd) || (request.cmd === "AUTHENTICATE" && request.args?.access_token == null);
                        if (opensUi) post({ type: "focus" });
                        RPCServer.handleRequest(connection.socket, request);
                    } catch (error) {
                        logger.error("Failed to handle an RPC request", error);
                    }
                    break;
                }

                case "rpc-disconnect":
                    disconnect(message.id);
                    break;

                case "game": {
                    const { game, running } = message;
                    if (typeof game?.id !== "string") break;

                    if (game.id === STREAMER_MODE_ID) {
                        FluxDispatcher.dispatch({ type: "RUNNING_STREAMER_TOOLS_CHANGE", count: running ? 1 : 0 });
                        break;
                    }

                    if (running) {
                        const exeName = game.path.slice(game.path.lastIndexOf("/") + 1);
                        games.set(game.id, {
                            id: game.id,
                            name: game.name,
                            pid: game.pid,
                            exeName,
                            exePath: game.path,
                            processName: exeName,
                            cmdLine: "",
                            pidPath: [game.pid],
                            isLauncher: false,
                            lastFocused: Math.floor(Date.now() / 1000),
                            windowHandle: "0"
                        });
                    } else {
                        games.delete(game.id);
                    }

                    observedGamesCallback([...games.values()]);
                    break;
                }

                case "games-reset":
                    games.clear();
                    observedGamesCallback([]);
                    break;
            }
        }, controller);

        post({ type: "ready", gameDetection: ShowCurrentGame.getSetting() });
    },

    stop () {
        for (const id of connections.keys()) disconnect(id);
        games.clear();
        observedGamesCallback([]);

        post({ type: "stop" });
        controller.abort();
    },

    settingsAboutComponent: () => (
        <Flex flexDirection="column" gap=".75em">
            <CompanionStatus />
            <Divider />
            <Heading tag="h4" weight="bold">How it works</Heading>
            <Paragraph>
                This is useful text that explains the user stuff and stuff.
            </Paragraph>
        </Flex>
    )
});
