/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy, findExportedComponentLazy, findStoreLazy } from "@webpack";
import { NavigationRouter, useEffect, useState } from "@webpack/common";


const LinkButton = findExportedComponentLazy("LinkButton"); // let {route: e, selected: t, icon: n, iconClassName: a, interactiveClassName: s, text: r, children: o, locationState: d, onClick: f, className: p, role: m, "aria-posinset": C, "aria-setsize": g, ...E} = this.props;
const NumberBadge = findExportedComponentLazy("NumberBadge"); // let { count: l } = this.props
const QuestsComponent = findComponentByCodeLazy(".questsContainer"); // No nessessary props to include

const questsStore = findStoreLazy("QuestsStore");

const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}Promise\.all\((\[\i\.\i\(".+?"\).+?\])\).then\(\i\.bind\(\i,"(.+?)"\)\).{0,50}"UserSettings"/);


// Routes used in this plugin (in case someone wants to add new ones)
const routes = new Map<string, RouteData>();

routes.set("/questsMenu", {
    path: "/questsMenu",
    render: (...props) => <QuestPage {...props} />,
    disableTrack: 1,
    redirectTo: "/channels/@me"
});


// Credits to https://www.svgrepo.com/svg/507254/crown
const CrownIcon = () => {
    return (
        <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 19C5 18.4477 5.44772 18 6 18L18 18C18.5523 18 19 18.4477 19 19C19 19.5523 18.5523 20 18 20L6 20C5.44772 20 5 19.5523 5 19Z" fill="currentColor" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.87867 4.70711C11.0502 3.53554 12.9497 3.53554 14.1213 4.70711L16.6878 7.27359C16.9922 7.57795 17.4571 7.6534 17.8421 7.46091L18.5528 7.10558C20.0877 6.33813 21.7842 7.80954 21.2416 9.43755L19.4045 14.9487C18.9962 16.1737 17.8498 17 16.5585 17H7.44151C6.15022 17 5.0038 16.1737 4.59546 14.9487L2.75842 9.43755C2.21575 7.80955 3.91231 6.33813 5.44721 7.10558L6.15787 7.46091C6.54286 7.6534 7.00783 7.57795 7.31219 7.27359L9.87867 4.70711Z" fill="currentColor" />
        </svg>
    );
};


const QuestPage = (props?: any) => {
    const [loadedQuests, setLoaded] = useState<boolean>(false);

    useEffect(() => {
        const loadQuests = async () => {
            await requireSettingsMenu();
            setLoaded(true);
        };

        loadQuests();
    }, []);

    return (
        <main className="quests-container">
            {loadedQuests && <QuestsComponent />}
        </main>
    );
};


const QuestButtonComponent = () => {
    const activeQuests = Array.from(questsStore.quests.values()).filter((q: any) => new Date(q.config.expiresAt).getTime() > Date.now() && q.claimedAt);
    return (
        <ErrorBoundary noop>
            <LinkButton
                text="Quests"
                icon={CrownIcon}
                route={"/questsMenu"}
            >
                {activeQuests.length > 0 && <NumberBadge count={activeQuests.length} />}
            </LinkButton>
        </ErrorBoundary>
    );
};

const redirectRoute = (ev: BeforeUnloadEvent) => {
    const paths = Array.from(routes.keys());

    ev.preventDefault();
    NavigationRouter.transitionTo("/quests/@me");
    setTimeout(() => window.location.reload(), 0);
};

export default definePlugin({
    name: "BetterQuests",
    description: "Puts the quest button in more accessibile place.",
    authors: [EquicordDevs.kvba],

    start: () => window.addEventListener("beforeunload", redirectRoute),
    stop: () => window.removeEventListener("beforeunload", redirectRoute),

    get paths() {
        return Array.from(routes.keys());
    },

    get routes() {
        return Array.from(routes.values());
    },

    patches: [
        { // Add new quest button
            find: "\"discord-shop\"),",
            replacement: {
                match: /"discord-shop"\),/,
                replace: "$&,$self.QuestButtonComponent(),"
            }
        },
        { // Add new route
            find: ".MESSAGE_REQUESTS,render:",
            replacement: {
                match: /\((0,.{0,10}\.jsx\)\(.{0,10}\.\i,){path:.{0,10}\.\i\.MESSAGE_REQUESTS,.{0,100}?\),/,
                replace: "$&...$self.routes.map(r => (($1r))),"
            }
        },
        {
            find: 'on("LAUNCH_APPLICATION"',
            replacement: {
                match: /path:\[.{0,500}\i\.MESSAGE_REQUESTS,/,
                replace: "$&...$self.paths,"
            }
        }
    ],

    QuestButtonComponent
});
