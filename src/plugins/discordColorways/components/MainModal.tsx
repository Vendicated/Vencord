/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable arrow-parens */

import SourceManager from "./SettingsTabs/SourceManager";
import Store from "./SettingsTabs/Store";
import Selector from "./Selector";
import { useState, useEffect, DataStore, useRef } from "../";
import SettingsPage from "./SettingsTabs/SettingsPage";
import { ModalProps } from "../types";
import { MouseEvent, MouseEventHandler } from "react";
import { restartWS, updateRemoteSources, wsOpen } from "../wsClient";
import { boundKey as bk } from "../wsClient";

export let changeTheme = (theme: string) => { };
export let updateWSMain: (status: boolean) => void = () => { };
export let updateBoundKeyMain: (boundKey: { [managerKey: string]: string; }) => void = () => { };

export default function ({
    modalProps
}: {
    modalProps: ModalProps;
}): JSX.Element | any {
    const [activeTab, setActiveTab] = useState<"selector" | "settings" | "sources" | "store" | "ws_connection">("selector");
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
        updateWSMain = (status) => setWsConnected(status);
        changeTheme = (theme: string) => setTheme(theme);
        updateBoundKeyMain = (bound) => setBoundKey(bound);
        load();

        return () => {
            updateWSMain = () => { };
            changeTheme = () => { };
            updateBoundKeyMain = () => { };
        };
    }, []);

    function SidebarTab({ id, title, icon, bottom }: { id: "selector" | "settings" | "sources" | "store" | "ws_connection", title: string, icon: JSX.Element, bottom?: boolean; }) {
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
                    <SidebarTab icon={<>&#xF30D;</>} id="selector" title="Change Colorway" />
                    <SidebarTab icon={<>&#xF3E3;</>} id="settings" title="Settings" />
                    <SidebarTab icon={<>&#xF2C6;</>} id="sources" title="Sources" />
                    <SidebarTab icon={<>&#xF543;</>} id="store" title="Store" />
                    <SidebarTab bottom icon={<>&#xF3EE;</>} id="ws_connection" title="Manager Connection" />
                </div>
                <div className="colorwayModalContent">
                    {activeTab === "selector" && <Selector />}
                    {activeTab == "sources" && <SourceManager />}
                    {activeTab == "store" && <Store />}
                    {activeTab == "settings" && <div style={{ padding: "16px" }}><SettingsPage /></div>}
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
