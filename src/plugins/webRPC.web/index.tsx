/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { FluxDispatcher, React } from "@webpack/common";

interface DetectedGame {
    id: string;
    name: string;
    pid: number;
    path: string;
}

interface RpcGame {
    id: string;
    name: string;
    pid: number;
    exeName: string;
    exePath: string;
    processName: string;
    cmdLine: string;
    pidPath: number[];
    isLauncher: boolean;
    lastFocused: number;
    windowHandle: string;
}

interface RpcClient {
    id: string;
    clientId: string | null;
    version: number;
    origin: string | null;
    transport: "ipc" | "ws";
}

interface RpcSocket {
    id: string;
    version: number;
    encoding: "json";
    transport: "ipc" | "ws";
    source: { type: "ipc" | "ws"; };
    application: { id: string | null; name: string | null; icon: string | null; };
    authorization: { authing: boolean; scopes: Set<string>; accessToken: string | null; expires: Date; };
    abortController: AbortController;
    send (payload: unknown): void;
    close (code: number, message?: string): void;
}

interface NativeStatus {
    state: "connecting" | "connected" | "inactive" | "missing" | "error" | "disconnected";
    error?: string;
    version?: string;
}

interface RpcCommand {
    message: string;
    data?: any;
}

const logger = new Logger("WebRPC");
const RPCServer = findByPropsLazy("registerTransport", "dispatchToSubscriptions");
const validateClient: (socket: RpcSocket, origin: string | null, clientId: string | null) => Promise<void> =
    findByCodeLazy('"No Client ID Specified"');

const vesktopVersion = IS_VESKTOP ? VesktopNative.app.getVersion() : "0";

function isVesktopVersionAtLeast (version: string) {
    return vesktopVersion.localeCompare(version, undefined, { numeric: true }) >= 0;
}

function predicate () {
    return !IS_VESKTOP || isVesktopVersionAtLeast("1.7.1");
}

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
const games = new Map<string, RpcGame>();

let ctrl = new AbortController();
let lastCompanionStatus: NativeStatus = { state: "disconnected" };
let observedGamesCallback = (_games: RpcGame[]) => { };

function postWeb (payload: unknown) {
    if (!ctrl.signal.aborted) postMessage({ type: "vencord:rpc", direction: "out", payload });
}

function WebStatus () {
    const status = React.useSyncExternalStore(onChange => {
        window.addEventListener("message", onChange);
        return () => window.removeEventListener("message", onChange);
    }, () => lastCompanionStatus);

    const variant: "success" | "warning" | "info" =
        status.state === "connected" ? "success" : status.state === "missing" || status.state === "error" ? "warning" : "info";

    return (
        <Card variant={variant}>
            <Flex flexDirection="column" gap=".5em" alignItems="flex-start">
                <Heading tag="h4" weight="bold">{STATUS_TEXT[status.state]}</Heading>
                {status.error && <Paragraph>{status.error}</Paragraph>}
                {status.state === "connected" && (
                    <Paragraph>Companion version {status.version}</Paragraph>
                )}
                {status.state === "missing" && (
                    <Paragraph>
                        Download the companion from <Link href="https://github.com/ThaUnknown/webrpc-companion/releases/latest">the releases page</Link> and run it once.
                    </Paragraph>
                )}
                {(status.state === "missing" || status.state === "error" || status.state === "disconnected") && (
                    <Button variant="overlayPrimary" onClick={() => postWeb({ message: "ready" })}>
                        Retry
                    </Button>
                )}
            </Flex>
        </Card>
    );
}


export default definePlugin({
    name: "WebRPC",
    description: "Discord RPC support for the browser and Vesktop",
    tags: ["Activity", "Utility"],
    authors: [Devs.ThaUnknown, Devs.Ven],
    hidden: !IS_EXTENSION && !IS_VESKTOP,
    required: IS_VESKTOP,

    patches: IS_EXTENSION || IS_VESKTOP ? [
        // RunningGameStore has everything needed for RPC even on Web, it just has no native server for it. Re-enable support
        {
            find: 'displayName="RunningGameStore"',
            // The lock check throws on web and crashes the UI, so only enable detection if it can be patched too
            group: true,
            predicate,
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
            predicate,
            replacement: [
                {
                    match: /setObservedGamesCallback\(\i,(\i),\i\)\{/,
                    replace: "$&return $self.observeGames($1);",
                    predicate: () => !IS_VESKTOP || isVesktopVersionAtLeast("1.7.0")
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
        // - This has high crash potential. It is a UI element that always renders and Discord may introduce DiscordNative usage, as it is
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
            predicate,
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
    ] : [],

    connectClient ({ id, clientId, version, origin, transport: rpcTransport }: RpcClient) {
        const socket: RpcSocket = {
            id,
            version,
            encoding: "json",
            transport: rpcTransport,
            source: { type: rpcTransport },
            application: { id: null, name: null, icon: null },
            authorization: { authing: false, scopes: new Set(), accessToken: null, expires: new Date(0) },
            abortController: new AbortController(),
            send: payload => {
                const json = JSON.stringify(payload);

                if (IS_VESKTOP) {
                    VesktopNative.rpc.send(id, json);
                } else {
                    postWeb({ message: "rpc:send", data: { id, json } });
                }
            },
            close: (code, message) => {
                if (IS_VESKTOP) {
                    VesktopNative.rpc.close(id, code, message);
                } else {
                    postWeb({ message: "rpc:close", data: { id, code, message } });
                }
            }
        };

        const ready = (async () => {
            try {
                await validateClient(socket, origin, clientId);
                if (socket.abortController.signal.aborted) return false;

                RPCServer.handleConnect(socket);
                return true;
            } catch (error: any) {
                if (!socket.abortController.signal.aborted) socket.close(error.code, error.message);
                return false;
            }
        })();

        connections.set(id, { socket, ready });
    },

    async request (id: string, payload: string) {
        const connection = connections.get(id);
        if (!connection || !(await connection.ready)) return;

        try {
            const request = JSON.parse(payload) as { cmd?: string; args?: Record<string, unknown>; };
            const opensUi = UI_COMMANDS.has(request.cmd ?? "") || (request.cmd === "AUTHENTICATE" && request.args?.access_token == null);
            if (opensUi) {
                if (IS_VESKTOP) {
                    VesktopNative.win.focus();
                } else {
                    postWeb({ message: "focus" });
                }
            }
            RPCServer.handleRequest(connection.socket, request);
        } catch (error) {
            logger.error("Failed to handle an RPC request", error);
        }
    },

    async disconnect (id: string) {
        const connection = connections.get(id);
        if (!connection) return;

        connections.delete(id);
        connection.socket.abortController.abort("DISCONNECTED");
        if (await connection.ready) RPCServer.handleDisconnect(connection.socket);
    },

    reportGames () {
        observedGamesCallback([...games.values()]);
    },

    resetGames () {
        games.clear();
        this.reportGames();
    },

    setGame (game: DetectedGame, running: boolean) {
        if (typeof game?.id !== "string") return;

        if (game.id === STREAMER_MODE_ID) {
            FluxDispatcher.dispatch({ type: "RUNNING_STREAMER_TOOLS_CHANGE", count: running ? 1 : 0 });
            return;
        }

        if (running) {
            const path = typeof game.path === "string" ? game.path : "";
            const exeName = path.split("/").pop() ?? "";
            games.set(game.id, {
                id: game.id,
                name: game.name,
                pid: game.pid,
                exeName,
                exePath: path,
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

        this.reportGames();
    },

    onMessage ({ message, data }: RpcCommand) {
        switch (message) {
            case "rpc:connect":
                this.connectClient(data);
                break;
            case "rpc:request":
                void this.request(data.id, data.payload);
                break;
            case "rpc:disconnect":
                void this.disconnect(data);
                break;
            case "rpc:game":
                this.setGame(data.game, data.running);
                break;
            case "rpc:reset":
                for (const id of [...connections.keys()]) void this.disconnect(id);
                this.resetGames();
                break;
        }
    },

    observeGames (callback: typeof observedGamesCallback) {
        observedGamesCallback = callback;
        this.reportGames();
    },

    start () {
        if (!IS_EXTENSION && !IS_VESKTOP) return;

        connections.clear();
        this.resetGames();

        if (IS_VESKTOP) {
            VesktopNative.commands.onCommand(async ({ nonce, message, data }) => {
                try {
                    await this.onMessage({ message, data });
                    VesktopNative.commands.respond({ nonce, ok: true });
                } catch (error) {
                    VesktopNative.commands.respond({ nonce, ok: false, data: String(error) });
                }
            });

            VesktopNative.rpc.ready();
        } else {
            ctrl.abort();
            ctrl = new AbortController();
            lastCompanionStatus = { state: "connecting" };

            ctrl.signal.addEventListener("abort", () => {
                postMessage({ type: "vencord:rpc", direction: "out", payload: { message: "stop" } });
            }, { once: true });

            window.addEventListener("message", ({ source, data }: MessageEvent) => {
                if (source !== window || data?.type !== "vencord:rpc") return;

                if (data.direction === "status") {
                    if (data.status) lastCompanionStatus = data.status;
                    return;
                }

                if (data.direction !== "in" || !data.payload) return;

                try {
                    this.onMessage(data.payload);
                } catch (error) {
                    logger.error("Failed to handle an RPC message", error);
                }
            }, ctrl);

            postWeb({ message: "ready" });
        }
    },

    stop () {
        for (const id of [...connections.keys()]) void this.disconnect(id);
        connections.clear();
        this.resetGames();

        ctrl.abort();
    },

    settingsAboutComponent: () => (
        IS_VESKTOP ? null : (
            <Flex flexDirection="column" gap=".75em">
                <WebStatus />
                <Divider />
                <Heading tag="h4" weight="bold">How it works</Heading>
                <Paragraph>
                    The companion app runs Discord's RPC server. The extension connects to it through native messaging.
                </Paragraph>
                <Paragraph>Run the companion once, then retry.</Paragraph>
            </Flex>
        )
    )
});
