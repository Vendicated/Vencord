/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { popNotice, showNotice } from "@api/Notices";
import ErrorBoundary from "@components/ErrorBoundary";
import { getIntlMessageFromHash } from "@utils/discord";
import { canonicalizeMatch, canonicalizeReplace } from "@utils/patches";
import { filters, findAll, search, wreq } from "@webpack";
import { React, Toasts, useState } from "@webpack/common";
import { loadLazyChunks } from "debug/loadLazyChunks";
import { reporterData } from "debug/reporterData";
import { Settings } from "Vencord";

import { CLIENT_VERSION, logger, PORT, settings } from ".";
import { Recieve } from "./types";
import { FullOutgoingMessage, OutgoingMessage } from "./types/send";
import { extractModule, extractOrThrow, findModuleId, getModulePatchedBy, mkRegexFind, parseNode, toggleEnabled, } from "./util";

export function stopWs() {
    socket?.close(1000, "Plugin Stopped");
    socket = void 0;
}

export let socket: WebSocket | undefined;

export function initWs(isManual = false) {
    let wasConnected = isManual;
    let hasErrored = false;
    const ws = socket = new WebSocket(`ws://127.0.0.1:${PORT}`);

    function replyData(data: OutgoingMessage) {
        ws.send(JSON.stringify(data));
    }

    ws.addEventListener("open", () => {
        wasConnected = true;

        logger.info("Connected to WebSocket");

        // send module cache to vscode
        replyData({
            type: "moduleList",
            data: {
                modules: Object.keys(wreq.m)
            },
            ok: true
        });

        if (IS_COMPANION_TEST) {
            const toSend = JSON.stringify(reporterData, (_k, v) => {
                if (v instanceof RegExp)
                    return String(v);
                return v;
            });

            socket?.send(JSON.stringify({
                type: "report",
                data: JSON.parse(toSend),
                ok: true
            }));
        }

        try {
            if (settings.store.notifyOnAutoConnect || isManual) {
                Toasts.show({
                    message: "Connected to WebSocket",
                    id: Toasts.genId(),
                    type: Toasts.Type.SUCCESS,
                    options: {
                        position: Toasts.Position.TOP
                    }
                });
            }
        }
        catch (e) {
            console.error(e);
        }
    });

    ws.addEventListener("error", e => {
        if (!wasConnected) return;

        hasErrored = true;

        logger.error("Dev Companion Error:", e);

        Toasts.show({
            message: "Dev Companion Error",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
            options: {
                position: Toasts.Position.TOP
            }
        });
    });

    ws.addEventListener("close", e => {
        if (!wasConnected || hasErrored) return;

        logger.info("Dev Companion Disconnected:", e.code, e.reason);

        Toasts.show({
            message: "Dev Companion Disconnected",
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
            options: {
                position: Toasts.Position.TOP
            }
        });
    });

    ws.addEventListener("message", e => {
        try {
            var d = JSON.parse(e.data) as Recieve.FullIncomingMessage;
        } catch (err) {
            logger.error("Invalid JSON:", err, "\n" + e.data);
            return;
        }
        /**
         * @param error the error to reply with. if there is no error, the reply is a sucess
         */
        function reply(error?: string) {
            const toSend = { nonce: d.nonce, ok: !error } as Record<string, unknown>;
            if (error) toSend.error = error;
            logger.debug("Replying with:", toSend);
            ws.send(JSON.stringify(toSend));
        }
        function replyData(data: OutgoingMessage) {
            const toSend: FullOutgoingMessage = {
                ...data,
                nonce: d.nonce
            };
            logger.debug(`Replying with data: ${toSend}`);
            ws.send(JSON.stringify(toSend));
        }

        logger.debug(`Received Message: ${d.type}`, "\n", d.data);

        switch (d.type) {
            case "disable": {
                const m = d.data;
                const settings = Settings.plugins[m.pluginName];
                if (m.enabled !== settings.enabled)
                    toggleEnabled(m.pluginName, reply);
                break;
            }
            case "rawId": {
                const m = d.data;
                logger.warn("Deprecated rawId message received, use extract instead");
                replyData({
                    type: "rawId",
                    ok: true,
                    data: extractModule(m.id),
                });
                break;
            }
            case "diff": {
                try {
                    const m = d.data;
                    switch (m.extractType) {
                        case "id": {
                            if (typeof m.idOrSearch !== "number")
                                throw new Error("Id is not a number, got :" + typeof m.idOrSearch);
                            replyData({
                                type: "diff",
                                ok: true,
                                data: {
                                    patched: extractOrThrow(m.idOrSearch),
                                    source: extractModule(m.idOrSearch, false),
                                    moduleNumber: m.idOrSearch,
                                    patchedBy: getModulePatchedBy(m.idOrSearch, true)
                                },
                            });
                            break;
                        }
                        case "search": {
                            let moduleId: number;
                            if (m.findType === "string")
                                moduleId = +findModuleId([canonicalizeMatch(m.idOrSearch.toString())]);
                            else
                                moduleId = +findModuleId(mkRegexFind(m.idOrSearch));
                            const p = extractOrThrow(moduleId);
                            const p2 = extractModule(moduleId, false);

                            replyData({
                                type: "diff",
                                ok: true,
                                data: {
                                    patched: p,
                                    source: p2,
                                    moduleNumber: moduleId,
                                    patchedBy: getModulePatchedBy(moduleId, true)
                                },
                            });
                            break;
                        }
                    }
                } catch (error) {
                    reply(String(error));
                }
                break;
            }
            case "reload": {
                reply();
                window.location.reload();
                break;
            }
            case "extract": {
                try {
                    const m = d.data;
                    switch (m.extractType) {
                        case "id": {
                            if (typeof m.idOrSearch !== "number")
                                throw new Error("Id is not a number, got :" + typeof m.idOrSearch);

                            else
                                replyData({
                                    type: "extract",
                                    ok: true,
                                    data: {
                                        module: extractModule(m.idOrSearch, m.usePatched ?? undefined),
                                        moduleNumber: m.idOrSearch,
                                        patchedBy: getModulePatchedBy(m.idOrSearch, m.usePatched ?? undefined)
                                    },
                                });

                            break;
                        }
                        case "search": {
                            let moduleId;
                            if (m.findType === "string")
                                moduleId = +findModuleId([canonicalizeMatch(m.idOrSearch.toString())]);

                            else
                                moduleId = +findModuleId(mkRegexFind(m.idOrSearch));
                            replyData({
                                type: "extract",
                                ok: true,
                                data: {
                                    module: extractModule(moduleId, m.usePatched ?? undefined),
                                    moduleNumber: moduleId,
                                    patchedBy: getModulePatchedBy(moduleId, m.usePatched ?? undefined)
                                },
                            });
                            break;
                        }
                        case "find": {
                            try {
                                var parsedArgs = m.findArgs.map(parseNode);
                            } catch (err) {
                                return reply("Failed to parse args: " + err);
                            }

                            try {
                                let results: any[];
                                switch (m.findType.replace("find", "").replace("Lazy", "")) {
                                    case "":
                                    case "Component":
                                        results = findAll(parsedArgs[0]);
                                        break;
                                    case "ByProps":
                                        results = findAll(filters.byProps(...parsedArgs));
                                        break;
                                    case "Store":
                                        results = findAll(filters.byStoreName(parsedArgs[0]));
                                        break;
                                    case "ByCode":
                                        results = findAll(filters.byCode(...parsedArgs));
                                        break;
                                    case "ModuleId":
                                        results = Object.keys(search(parsedArgs[0]));
                                        break;
                                    case "ComponentByCode":
                                        results = findAll(filters.componentByCode(...parsedArgs));
                                        break;
                                    default:
                                        return reply("Unknown Find Type " + m.findType);
                                }

                                const uniqueResultsCount = new Set(results).size;
                                if (uniqueResultsCount === 0) throw "No results";
                                if (uniqueResultsCount > 1) throw "Found more than one result! Make this filter more specific";
                                // best name ever
                                const foundFind: string = [...results][0].toString();
                                replyData({
                                    type: "extract",
                                    ok: true,
                                    data: {
                                        module: foundFind,
                                        find: true,
                                        moduleNumber: +findModuleId([foundFind]),
                                        patchedBy: getModulePatchedBy(foundFind)
                                    },
                                });
                            } catch (err) {
                                return reply("Failed to find: " + err);
                            }
                            break;
                        }
                        default:
                            reply(`Unknown Extract type. Got: ${d.data.extractType}`);
                            break;
                    }
                } catch (error) {
                    reply(String(error));
                }
                break;
            }
            case "testPatch": {
                const m = d.data;
                let candidates;
                if (d.data.findType === "string")
                    candidates = search(m.find.toString());

                else
                    candidates = search(...mkRegexFind(m.find));

                // const candidates = search(find);
                const keys = Object.keys(candidates);
                if (keys.length !== 1)
                    return reply("Expected exactly one 'find' matches, found " + keys.length);

                const mod = candidates[keys[0]];
                let src = String(mod).replaceAll("\n", "");

                if (src.startsWith("function(")) {
                    src = "0," + src;
                }

                let i = 0;

                for (const { match, replace } of m.replacement) {
                    i++;

                    try {
                        const matcher = canonicalizeMatch(parseNode(match));
                        const replacement = canonicalizeReplace(parseNode(replace), 'Vencord.Plugins.plugins["PlaceHolderPluginName"]');

                        const newSource = src.replace(matcher, replacement as string);

                        if (src === newSource) throw "Had no effect";
                        Function(newSource);

                        src = newSource;
                    } catch (err) {
                        return reply(`Replacement ${i} failed: ${err}`);
                    }
                }
                reply();
                break;
            }
            case "testFind": {
                const m = d.data;
                try {
                    var parsedArgs = m.args.map(parseNode);
                } catch (err) {
                    return reply("Failed to parse args: " + err);
                }

                try {
                    let results: any[];
                    switch (m.type.replace("find", "").replace("Lazy", "")) {
                        case "":
                        case "Component":
                            results = findAll(parsedArgs[0]);
                            break;
                        case "ByProps":
                            results = findAll(filters.byProps(...parsedArgs));
                            break;
                        case "Store":
                            results = findAll(filters.byStoreName(parsedArgs[0]));
                            break;
                        case "ByCode":
                            results = findAll(filters.byCode(...parsedArgs));
                            break;
                        case "ModuleId":
                            results = Object.keys(search(parsedArgs[0]));
                            break;
                        case "ComponentByCode":
                            results = findAll(filters.componentByCode(...parsedArgs));
                            break;
                        default:
                            return reply("Unknown Find Type " + m.type);
                    }

                    const uniqueResultsCount = new Set(results).size;
                    if (uniqueResultsCount === 0) throw "No results";
                    if (uniqueResultsCount > 1) throw "Found more than one result! Make this filter more specific";
                } catch (err) {
                    return reply("Failed to find: " + err);
                }

                reply();
                break;
            }
            case "allModules": {
                const { promise, resolve, reject } = Promise.withResolvers<void>();
                // wrap in try/catch to prevent crashing if notice api is not loaded
                try {
                    let closed = false;
                    const close = () => {
                        if (closed) return;
                        closed = true;
                        popNotice();
                    };
                    showNotice(<AllModulesNoti done={promise} close={close} />, "OK", () => {
                        closed = true;
                        popNotice();
                    });
                } catch (e) {
                    console.error(e);
                }
                loadLazyChunks()
                    .then(() => {
                        resolve();
                        replyData({
                            type: "moduleList",
                            data: {
                                modules: Object.keys(wreq.m)
                            },
                            ok: true
                        });
                    })
                    .catch(e => {
                        console.error(e);
                        replyData({
                            type: "moduleList",
                            ok: false,
                            error: String(e),
                            data: null
                        });
                        reject(e);
                    });
                break;
            }
            case "i18n": {
                const { hashedKey } = d.data;
                replyData({
                    type: "i18n",
                    ok: true,
                    data: {
                        value: getIntlMessageFromHash(hashedKey)
                    }
                });
                break;
            }
            case "version": {
                replyData({
                    type: "version",
                    ok: true,
                    data: {
                        clientVersion: CLIENT_VERSION
                    }
                });
                break;
            }
            default:
                // @ts-expect-error should be never
                reply("Unknown Type " + d?.type);
                break;
        }
    });
}

interface AllModulesNotiProps {
    done: Promise<unknown>;
    close: () => void;
}

const AllModulesNoti = ErrorBoundary.wrap(function ({ done, close }: AllModulesNotiProps) {
    const [state, setState] = useState<0 | 1 | -1>(0);
    done.then(setState.bind(null, 1)).catch(setState.bind(null, -1));
    if (state === 1) setTimeout(close, 5000);
    return (<>
        {state === 0 && "Loading lazy modules, restarting could lead to errors"}
        {state === 1 && "Loaded all lazy modules"}
        {state === -1 && "Failed to load lazy modules, check console for errors"}
    </>);
}, { noop: true });
