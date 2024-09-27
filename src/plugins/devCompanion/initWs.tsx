/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canonicalizeMatch, canonicalizeReplace } from "@utils/patches";
import { filters, findAll, search, wreq } from "@webpack";
import { Toasts } from "@webpack/common";
import { reporterData } from "debug/reporterData";
import { Settings } from "Vencord";

import { logger, PORT, settings } from ".";
import { extractModule, extractOrThrow, FindData, findModuleId, FindType, mkRegexFind, parseNode, PatchData, SendData, toggleEnabled, } from "./util";

export function stopWs() {
    socket?.close(1000, "Plugin Stopped");
    socket = void 0;
}

export let socket: WebSocket | undefined;

export function initWs(isManual = false) {
    let wasConnected = isManual;
    let hasErrored = false;
    const ws = socket = new WebSocket(`ws://localhost:${PORT}`);

    function replyData<T extends SendData>(data: T) {
        ws.send(JSON.stringify(data));
    }

    ws.addEventListener("open", () => {
        wasConnected = true;

        logger.info("Connected to WebSocket");

        // send module cache to vscode
        replyData({
            type: "moduleList",
            data: Object.keys(wreq.m),
            ok: true,
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


        (settings.store.notifyOnAutoConnect || isManual) && Toasts.show({
            message: "Connected to WebSocket",
            id: Toasts.genId(),
            type: Toasts.Type.SUCCESS,
            options: {
                position: Toasts.Position.TOP
            }
        });
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
            var { nonce, type, data } = JSON.parse(e.data);
        } catch (err) {
            logger.error("Invalid JSON:", err, "\n" + e.data);
            return;
        }
        function reply(error?: string) {
            const data = { nonce, ok: !error } as Record<string, unknown>;
            if (error) data.error = error;

            ws.send(JSON.stringify(data));
        }
        function replyData<T extends SendData>(data: T) {
            data.nonce = nonce;
            ws.send(JSON.stringify(data));
        }

        logger.info("Received Message:", type, "\n", data);

        switch (type) {
            case "disable": {
                const { enabled, pluginName } = data;
                const settings = Settings.plugins[pluginName];
                if (enabled !== settings.enabled)
                    toggleEnabled(pluginName, reply);
                break;
            }
            case "rawId": {
                const { id } = data;
                replyData({
                    ok: true,
                    data: extractModule(id),
                    type: "ret"
                });
                break;
            }
            case "diff": {
                try {
                    const { extractType, idOrSearch } = data;
                    switch (extractType) {
                        case "id": {
                            if (typeof idOrSearch !== "number")
                                throw new Error("Id is not a number, got :" + typeof idOrSearch);
                            replyData({
                                type: "diff",
                                ok: true,
                                data: {
                                    patched: extractOrThrow(idOrSearch),
                                    source: extractModule(idOrSearch, false)
                                },
                                moduleNumber: idOrSearch
                            });
                            break;
                        }
                        case "search": {
                            let moduleId;
                            if (data.findType === FindType.STRING)
                                moduleId = +findModuleId([idOrSearch.toString()]);

                            else
                                moduleId = +findModuleId(mkRegexFind(idOrSearch));
                            const p = extractOrThrow(moduleId);
                            const p2 = extractModule(moduleId, false);
                            console.log(p, p2, "done");
                            replyData({
                                type: "diff",
                                ok: true,
                                data: {
                                    patched: p,
                                    source: p2
                                },
                                moduleNumber: moduleId
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
                    const { extractType, idOrSearch } = data;
                    switch (extractType) {
                        case "id": {
                            if (typeof idOrSearch !== "number")
                                throw new Error("Id is not a number, got :" + typeof idOrSearch);

                            else
                                replyData({
                                    type: "extract",
                                    ok: true,
                                    data: extractModule(idOrSearch),
                                    moduleNumber: idOrSearch
                                });

                            break;
                        }
                        case "search": {
                            let moduleId;
                            if (data.findType === FindType.STRING)
                                moduleId = +findModuleId([idOrSearch.toString()]);

                            else
                                moduleId = +findModuleId(mkRegexFind(idOrSearch));
                            replyData({
                                type: "extract",
                                ok: true,
                                data: extractModule(moduleId),
                                moduleNumber: moduleId
                            });
                            break;
                        }
                        case "find": {
                            const { findType, findArgs } = data;
                            try {
                                var parsedArgs = findArgs.map(parseNode);
                            } catch (err) {
                                return reply("Failed to parse args: " + err);
                            }

                            try {
                                let results: any[];
                                switch (findType.replace("find", "").replace("Lazy", "")) {
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
                                        return reply("Unknown Find Type " + findType);
                                }

                                const uniqueResultsCount = new Set(results).size;
                                if (uniqueResultsCount === 0) throw "No results";
                                if (uniqueResultsCount > 1) throw "Found more than one result! Make this filter more specific";
                                // best name ever
                                const foundFind: string = [...results][0].toString();
                                replyData({
                                    type: "extract",
                                    ok: true,
                                    find: true,
                                    data: foundFind,
                                    moduleNumber: +findModuleId([foundFind])
                                });
                            } catch (err) {
                                return reply("Failed to find: " + err);
                            }
                            break;
                        }
                        default:
                            reply(`Unknown Extract type. Got: ${extractType}`);
                            break;
                    }
                } catch (error) {
                    reply(String(error));
                }
                break;
            }
            case "testPatch": {
                const { find, replacement } = data as PatchData;

                let candidates;
                if (data.findType === FindType.STRING)
                    candidates = search(find.toString());

                else
                    candidates = search(...mkRegexFind(find));

                // const candidates = search(find);
                const keys = Object.keys(candidates);
                if (keys.length !== 1)
                    return reply("Expected exactly one 'find' matches, found " + keys.length);

                const mod = candidates[keys[0]];
                let src = String(mod.original ?? mod).replaceAll("\n", "");

                if (src.startsWith("function(")) {
                    src = "0," + src;
                }

                let i = 0;

                for (const { match, replace } of replacement) {
                    i++;

                    try {
                        const matcher = canonicalizeMatch(parseNode(match));
                        const replacement = canonicalizeReplace(parseNode(replace), "PlaceHolderPluginName");

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
                const { type, args } = data as FindData;
                let parsedArgs;
                try {
                    parsedArgs = args.map(parseNode);
                } catch (err) {
                    return reply("Failed to parse args: " + err);
                }

                try {
                    let results: any[];
                    switch (type.replace("find", "").replace("Lazy", "")) {
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
                            return reply("Unknown Find Type " + type);
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
            default:
                reply("Unknown Type " + type);
                break;
        }
    });
}
