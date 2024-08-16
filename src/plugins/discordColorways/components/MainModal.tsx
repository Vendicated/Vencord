/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable arrow-parens */

import SourceManager from "./SettingsTabs/SourceManager";
import Store from "./SettingsTabs/Store";
import Selector from "./Selector";
import { useState, useEffect, DataStore } from "../";
import SettingsPage from "./SettingsTabs/SettingsPage";
import { ModalProps } from "../types";

export let changeTheme = (theme: string) => { };

export default function ({
    modalProps
}: {
    modalProps: ModalProps;
}): JSX.Element | any {
    const [activeTab, setActiveTab] = useState<"selector" | "settings" | "sources" | "store">("selector");
    const [theme, setTheme] = useState("discord");

    changeTheme = (theme: string) => {
        setTheme(theme);
    };

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    function SidebarTab({ id, title, icon }) {
        return <div className={"colorwaySelectorSidebar-tab" + (id == activeTab ? " active" : "")} onClick={() => setActiveTab(id)}>{icon}</div>;
    }

    return (
        <>
            <div className={`colorwaySelectorModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme} {...modalProps}>
                <div className="colorwaySelectorSidebar">
                    <SidebarTab icon={<>&#xF30D;</>} id="selector" title="Change Colorway" />
                    <SidebarTab icon={<>&#xF3E3;</>} id="settings" title="Settings" />
                    <SidebarTab icon={<>&#xF2C6;</>} id="sources" title="Sources" />
                    <SidebarTab icon={<>&#xF543;</>} id="store" title="Store" />
                </div>
                <div className="colorwayModalContent">
                    {activeTab === "selector" && <Selector />}
                    {activeTab == "sources" && <SourceManager />}
                    {activeTab == "store" && <Store />}
                    {activeTab == "settings" && <div style={{ padding: "16px" }}><SettingsPage /></div>}
                </div>
            </div>
        </>
    );
}
