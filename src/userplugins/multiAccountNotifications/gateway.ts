/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { Logger } from "@utils/Logger";

const logger = new Logger("DiscordGateway", "#a889d1");

const addGatewayParams = (url: string): string => {
    const urlObj = new URL(url);
    urlObj.searchParams.set("v", "9");
    urlObj.searchParams.set("encoding", "json");
    return urlObj.toString();
};

const GATEWAY_URL = addGatewayParams('wss://gateway.discord.gg/');

const GATEWAY_EVENTS = {
    DISPATCH: 0,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_ACK: 11,
} as const;

export class GateWay extends EventTarget {
    token: string;
    ws!: WebSocket;
    heartbeatInterval!: number;
    lastSequenceNumber!: number;
    heartbeat!: unknown;
    sessionId!: number;
    resumeGatewayUrl!: string;
    reconecting = false;
    stopped = false;
    hello = false;
    ack = false;

    constructor(token: string) {
        super();
        this.token = token;
    }

    sendHeartbeat() {
        if (!this.ack) {
            this.ws.close();
            return;
        }
        this.ack = false;
        const heartbeatPayload = {
            op: 1,
            d: this.lastSequenceNumber
        };
        this.ws.send(JSON.stringify(heartbeatPayload));
        logger.debug('Sent heartbeat:', heartbeatPayload);
    }

    handleMessage(event: MessageEvent<any>) {
        const message = JSON.parse(event.data);

        if (message.s) {
            this.lastSequenceNumber = message.s;
        }

        switch (message.op) {
            case GATEWAY_EVENTS.HELLO:
                logger.debug('Received Hello:', message);
                this.hello = true;
                this.heartbeatInterval = message.d.heartbeat_interval;
                this.heartbeat = setInterval(() => this.sendHeartbeat(), this.heartbeatInterval);
                if (this.reconecting) {
                    this.resume();
                } else {
                    this.identify();
                }
                break;

            case GATEWAY_EVENTS.HEARTBEAT_ACK:
                this.ack = true;
                break;

            case GATEWAY_EVENTS.DISPATCH:
                this.handleDispatch(message);
                break;

            case GATEWAY_EVENTS.INVALID_SESSION:
                if (this.reconecting) {
                    this.renew();
                }
                break;

            default:
                logger.debug('Received unknown opcode:', message);
        }
    }

    identify() {
        const identifyPayload = {
            op: 2,
            d: {
                token: this.token,
                intents: 4609, // Intents for GUILDS, GUILD_MESSAGES, and DIRECT_MESSAGES
                properties: {
                    $os: 'windows',
                    $browser: 'chrome',
                    $device: 'desktop'
                }
            }
        };
        this.ws.send(JSON.stringify(identifyPayload));
        logger.debug('Sent Identify:', identifyPayload);
    }

    resume() {
        const resumePayload = {
            "op": 6,
            "d": {
                "token": this.token,
                "session_id": this.sessionId,
                "seq": this.lastSequenceNumber,
            }
        };
        this.ws.send(JSON.stringify(resumePayload));
        logger.debug('Sent resume:', resumePayload);
    }

    handleDispatch(event: Record<"t" | "d", unknown>) {
        switch (event.t) {
            case 'READY': {
                this.resumeGatewayUrl = (event.d as any).resume_gateway_url;
                this.sessionId = (event.d as any).session_id;
                const dispatch = new CustomEvent("ready", { detail: event.d });
                this.dispatchEvent(dispatch);
                break;
            }

            case 'MESSAGE_CREATE': {
                const dispatch = new CustomEvent("create", { detail: event.d });
                this.dispatchEvent(dispatch);
                break;
            }

            case 'MESSAGE_ACK': {
                const dispatch = new CustomEvent("ack", { detail: event.d });
                this.dispatchEvent(dispatch);
                break;
            }

            case "USER_GUILD_SETTINGS_UPDATE":
            case "GUILD_DELETE":
            case "CHANNEL_DELETE":
            case "GUILD_MEMBER_UPDATE":
                {
                    const dispatch = new CustomEvent("update", { detail: { event: event.t, data: event.d } });
                    this.dispatchEvent(dispatch);
                    break;
                }

            case 'RESUMED': {
                this.reconecting = false;
                break;
            }

            default:
                logger.debug("Uknown event:", event.t);
                break;
        }
    }

    reconect() {
        this.reconecting = true;
        this.ws = this.createWebsocket(addGatewayParams(this.resumeGatewayUrl));
    }

    renew() {
        this.stopped = true;
        this.ws.addEventListener("close", () => {
            this.reconecting = false;
            this.ws = this.createWebsocket(GATEWAY_URL);
        });
        this.ws.close();
    }

    createWebsocket(url: string) {
        this.stopped = false;
        this.hello = false;
        const ws = new WebSocket(url);
        ws.addEventListener('message', (event) => this.handleMessage(event));
        ws.addEventListener('close', () => {
            clearInterval(this.heartbeat as number);
            if (!this.stopped) {
                this.reconect();
            }
        });
        ws.addEventListener('error', (error) => {
            logger.error(error);
        });
        return ws;
    }

    connect() {
        this.ws = this.createWebsocket(GATEWAY_URL);
    }

    stop() {
        this.ws.send(JSON.stringify({ op: 1000 }));
        this.stopped = true;
    }
}
