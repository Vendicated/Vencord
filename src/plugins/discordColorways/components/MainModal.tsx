/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MouseEvent, MouseEventHandler } from "react";

import { DataStore, FluxDispatcher, FluxEvents, useEffect, useRef, useState } from "../";
import { ModalProps } from "../types";
import { restartWS, updateRemoteSources, wsOpen } from "../wsClient";
import { boundKey as bk } from "../wsClient";
import Selector from "./Selector";
import SettingsPage from "./SettingsTabs/SettingsPage";
import SourceManager from "./SettingsTabs/SourceManager";
import Store from "./SettingsTabs/Store";

export default function ({
    modalProps
}: {
    modalProps: ModalProps;
}): JSX.Element | any {
    const [activeTab, setActiveTab] = useState<"selector" | "settings" | "sources" | "discover" | "ws_connection">("selector");
    const [theme, setTheme] = useState("discord");
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);
    const [wsConnected, setWsConnected] = useState(wsOpen);
    const [boundKey, setBoundKey] = useState<{ [managerKey: string]: string; }>(bk as { [managerKey: string]: string; });
    const menuProps = useRef(null);

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        FluxDispatcher.subscribe("COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents, ({ isConnected }) => setWsConnected(isConnected));
        FluxDispatcher.subscribe("COLORWAYS_UPDATE_BOUND_KEY" as FluxEvents, ({ boundKey }) => setBoundKey(boundKey));
        FluxDispatcher.subscribe("COLORWAYS_UPDATE_THEME" as FluxEvents, ({ theme }) => setTheme(theme));

        load();

        return () => {
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_BOUND_KEY" as FluxEvents, ({ boundKey }) => setBoundKey(boundKey));
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents, ({ isConnected }) => setWsConnected(isConnected));
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_THEME" as FluxEvents, ({ theme }) => setTheme(theme));
        };
    }, []);

    function SidebarTab({ id, title, icon, bottom }: { id: "selector" | "settings" | "sources" | "discover" | "ws_connection", title: string, icon: JSX.Element, bottom?: boolean; }) {
        return <div className={"colorwaySelectorSidebar-tab" + (id == activeTab ? " active" : "")} style={bottom ? { marginTop: "auto" } : {}} onClick={!bottom ? ((() => setActiveTab(id)) as unknown as MouseEventHandler<HTMLDivElement>) : rightClickContextMenu}>{icon}</div>;
    }

    const rightClickContextMenu: MouseEventHandler<HTMLDivElement> = (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        window.dispatchEvent(new Event("click"));
        setShowMenu(!showMenu);
        setPos({
            x: e.currentTarget.getBoundingClientRect().x + e.currentTarget.offsetWidth + 8,
            y: e.currentTarget.getBoundingClientRect().y + e.currentTarget.offsetHeight - (menuProps.current as unknown as HTMLElement).offsetHeight
        });
    };
    function onPageClick(this: Window, e: globalThis.MouseEvent) {
        setShowMenu(false);
    }

    useEffect(() => {
        window.addEventListener("click", onPageClick);
        return () => {
            window.removeEventListener("click", onPageClick);
        };
    }, []);

    return (
        <>
            <div className={`colorwaySelectorModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme} {...modalProps}>
                <div className="colorwaySelectorSidebar">
                    <SidebarTab icon={<>&#xF4B0;</>} id="selector" title="Change Colorway" />
                    <SidebarTab icon={<></>} id="settings" title="Settings" />
                    <SidebarTab icon={<>&#xF61C;</>} id="sources" title="Sources" />
                    <SidebarTab icon={<>&#xF2D0;</>} id="discover" title="Discover" />
                    <SidebarTab bottom icon={<>&#xF61C;</>} id="ws_connection" title="Manager Connection" />
                </div>
                <div className="colorwayModalContent">
                    {activeTab === "selector" && <div className="colorwayInnerTab" style={{ height: "100%" }}><Selector /></div>}
                    {activeTab == "sources" && <SourceManager />}
                    {activeTab == "discover" && <Store />}
                    {activeTab == "settings" && <SettingsPage />}
                </div>
                <div ref={menuProps} className={`colorwaysManagerConnectionMenu ${showMenu ? "visible" : ""}`} style={{
                    position: "fixed",
                    top: `${pos.y}px`,
                    left: `${pos.x}px`
                }}>
                    <span>Manager Connection Status: {wsConnected ? "Connected" : "Disconnected"}</span>
                    {wsConnected ? <>
                        <span className="colorwaysManagerConnectionValue">Bound Key: <b>{JSON.stringify(boundKey)}</b></span>
                        <button className="colorwaysPillButton" style={{
                            marginTop: "4px"
                        }} onClick={() => navigator.clipboard.writeText(JSON.stringify(boundKey))}>Copy Bound Key</button>
                        <button className="colorwaysPillButton" style={{
                            marginTop: "4px"
                        }} onClick={restartWS}>Reset Connection</button>
                        <button className="colorwaysPillButton" style={{
                            marginTop: "4px"
                        }} onClick={updateRemoteSources}>Update Remote Sources</button>
                    </> : <></>}
                </div>
            </div>
        </>
    );
}
