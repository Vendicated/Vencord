/*
* Vencord, a Discord client mod
* Copyright (c) 2025 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { findByCodeLazy } from "@webpack";
import { React } from "@webpack/common";
import definePlugin from "@utils/types";

import { Logger } from "@utils/Logger";
import { settings } from "./utils/settings";
import { GitHubReposComponent } from "./components/GitHubReposComponent";
import { Devs } from "@utils/constants";

const getProfileThemeProps = findByCodeLazy(".getPreviewThemeColors", "primaryColor:");

const logger = new Logger("GitHubRepos");
logger.info("Plugin loaded");

const profilePopoutComponent = ErrorBoundary.wrap(
    (props: { user: any; displayProfile?: any; }) => {
        return (
            <GitHubReposComponent
                {...props}
                id={props.user.id}
                theme={getProfileThemeProps(props).theme}
            />
        );
    },
    {
        noop: true,
        onError: (err) => {
            logger.error("Error in profile popout component", err);
            return null;
        }
    }
);

export default definePlugin({
    name: "GitHubRepos",
    description: "Displays a user's public GitHub repositories in their profile",
    authors: [Devs.talhakf],
    settings,

    patches: [
        {
            find: ".hasAvatarForGuild(null==",
            replacement: {
                match: /currentUser:\i,guild:\i}\)(?<=user:(\i),bio:null==(\i)\?.+?)/,
                replace: (m, user, profile) => {
                    return `${m},$self.profilePopoutComponent({ user: ${user}, displayProfile: ${profile} })`;
                }
            }
        },
        {
            find: "renderBio",
            replacement: {
                match: /renderBio\(\){.+?return (.*?)}/s,
                replace: (m, returnStatement) => {
                    return `renderBio(){
                        const originalReturn = ${returnStatement};
                        const user = this.props.user;
                        if (!user) return originalReturn;
                        
                        try {
                            const component = $self.profilePopoutComponent({ 
                                user: user, 
                                displayProfile: this.props.displayProfile 
                            });
                            
                            if (!originalReturn) return component;
                            
                            return React.createElement(
                                React.Fragment, 
                                null, 
                                originalReturn, 
                                component
                            );
                        } catch (err) {
                            console.error("[GitHubRepos] Error in bio patch:", err);
                            return originalReturn;
                        }
                    }`;
                }
            }
        }
    ],

    start() {
        logger.info("Plugin started");
    },

    stop() {
        logger.info("Plugin stopped");
    },

    profilePopoutComponent
}); 