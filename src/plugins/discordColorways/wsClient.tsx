import { DataStore, FluxDispatcher, FluxEvents, openModal } from ".";
import { ColorwayCSS } from "./colorwaysAPI";
import MainModal from "./components/MainModal";
import { nullColorwayObj } from "./constants";
import { generateCss, getPreset, gradientBase, gradientPresetIds } from "./css";
import { ColorwayObject } from "./types";
import { colorToHex, getWsClientIdentity } from "./utils";

export let wsOpen = false;
export let boundKey: { [managerKey: string]: string; } | null = null;
export let hasManagerRole: boolean = false;

let socket: WebSocket | undefined;

export function sendColorway(obj: ColorwayObject) {
    socket?.send(JSON.stringify({
        type: "complication:manager-role:send-colorway",
        active: obj,
        boundKey
    }));
};
export function requestManagerRole() {
    socket?.send(JSON.stringify({
        type: "complication:manager-role:request",
        boundKey
    }));
};
export function updateRemoteSources() {
    DataStore.getMany([
        "colorwaySourceFiles",
        "customColorways"
    ]).then(([
        colorwaySourceFiles,
        customColorways
    ]) => {
        socket?.send(JSON.stringify({
            type: "complication:remote-sources:init",
            boundKey,
            online: colorwaySourceFiles,
            offline: customColorways
        }));
    });
}

export function closeWS() {
    socket?.close(1);
}

export function restartWS() {
    socket?.close(1);
    connect();
}

export function isWSOpen() {
    return Boolean(socket && (socket.readyState == socket.OPEN));
}

export function connect(doAutoconnect = true, autoconnectTimeout = 3000) {
    if (socket && socket.readyState == socket.OPEN) return;
    const ws: WebSocket = socket = new WebSocket('ws://localhost:6124');

    let hasErrored = false;

    ws.onopen = function () {
        wsOpen = true;
        hasManagerRole = false;
        FluxDispatcher.dispatch({
            type: "COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents,
            isConnected: true
        });
    };

    ws.onmessage = function ({ data: datta }) {
        const data: {
            type: "change-colorway" | "remove-colorway" | "manager-connection-established" | "complication:remote-sources:received" | "complication:remote-sources:update-request" | "complication:manager-role:granted" | "complication:manager-role:revoked",
            [key: string]: any;
        } = JSON.parse(datta);

        function typeSwitch(type) {
            switch (type) {
                case "change-colorway":
                    if (data.active.id == null) {
                        DataStore.set("activeColorwayObject", nullColorwayObj);
                        ColorwayCSS.remove();
                        FluxDispatcher.dispatch({
                            type: "COLORWAYS_UPDATE_ACTIVE_COLORWAY" as FluxEvents,
                            active: nullColorwayObj
                        });
                    } else {
                        DataStore.set("activeColorwayObject", data.active);
                        FluxDispatcher.dispatch({
                            type: "COLORWAYS_UPDATE_ACTIVE_COLORWAY" as FluxEvents,
                            active: data.active
                        });

                        DataStore.get("colorwaysPreset").then((colorwaysPreset: string) => {
                            if (colorwaysPreset == "default") {
                                ColorwayCSS.set(generateCss(
                                    data.active.colors,
                                    true,
                                    true,
                                    undefined,
                                    data.active.id
                                ));
                            } else {
                                if (gradientPresetIds.includes(colorwaysPreset)) {
                                    const css = Object.keys(data.active).includes("linearGradient")
                                        ? gradientBase(colorToHex(data.active.colors.accent), true) + `:root:root {--custom-theme-background: linear-gradient(${data.active.linearGradient})}`
                                        : (getPreset(data.active.colors)[colorwaysPreset].preset as { full: string; }).full;
                                    ColorwayCSS.set(css);
                                } else {
                                    ColorwayCSS.set(getPreset(data.active.colors)[colorwaysPreset].preset as string);
                                }
                            }
                        });
                    }
                    return;
                case "remove-colorway":
                    DataStore.set("activeColorwayObject", nullColorwayObj);
                    ColorwayCSS.remove();
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_ACTIVE_COLORWAY" as FluxEvents,
                        active: nullColorwayObj
                    });
                    return;
                case "manager-connection-established":
                    DataStore.get("colorwaysBoundManagers").then((boundManagers: { [managerKey: string]: string; }[]) => {
                        if (data.MID) {
                            const boundSearch = boundManagers.filter(boundManager => {
                                if (Object.keys(boundManager)[0] == data.MID) return boundManager;
                            });
                            if (boundSearch.length) {
                                boundKey = boundSearch[0];
                            } else {
                                const id = { [data.MID]: `${getWsClientIdentity()}.${Math.random().toString(16).slice(2)}.${new Date().getUTCMilliseconds()}` };
                                DataStore.set("colorwaysBoundManagers", [...boundManagers, id]);
                                boundKey = id;
                            }
                            FluxDispatcher.dispatch({
                                type: "COLORWAYS_UPDATE_BOUND_KEY" as FluxEvents,
                                boundKey: boundKey
                            });
                            ws?.send(JSON.stringify({
                                type: "client-sync-established",
                                boundKey: boundKey,
                                complications: [
                                    "remote-sources",
                                    "manager-role",
                                    "ui-summon"
                                ]
                            }));
                            DataStore.getMany([
                                "colorwaySourceFiles",
                                "customColorways"
                            ]).then(([
                                colorwaySourceFiles,
                                customColorways
                            ]) => {
                                ws?.send(JSON.stringify({
                                    type: "complication:remote-sources:init",
                                    boundKey,
                                    online: colorwaySourceFiles,
                                    offline: customColorways
                                }));
                            });
                        }
                    });
                    return;
                case "complication:manager-role:granted":
                    hasManagerRole = true;
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_WS_MANAGER_ROLE" as FluxEvents,
                        isManager: true
                    });
                    return;
                case "complication:manager-role:revoked":
                    hasManagerRole = false;
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_WS_MANAGER_ROLE" as FluxEvents,
                        isManager: false
                    });
                    return;
                case "complication:ui-summon:summon":
                    openModal((props: any) => <MainModal modalProps={props} />);
                    return;
                case "complication:remote-sources:update-request":
                    DataStore.getMany([
                        "colorwaySourceFiles",
                        "customColorways"
                    ]).then(([
                        colorwaySourceFiles,
                        customColorways
                    ]) => {
                        ws?.send(JSON.stringify({
                            type: "complication:remote-sources:init",
                            boundKey: boundKey,
                            online: colorwaySourceFiles,
                            offline: customColorways
                        }));
                    });
                    return;
            }
        }

        typeSwitch(data.type);
    };

    ws.onclose = function (e) {
        boundKey = null;
        hasManagerRole = false;

        wsOpen = false;
        FluxDispatcher.dispatch({
            type: "COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents,
            isConnected: false
        });

        if (doAutoconnect && (e.code !== 1 || hasErrored)) {
            setTimeout(() => connect(doAutoconnect, autoconnectTimeout), autoconnectTimeout);
        }
    };

    ws.onerror = () => hasErrored = true;
}
