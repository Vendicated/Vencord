/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 RedflagAutoMute contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { findByProps } from "@webpack";
import { React } from "@webpack/common";
import { Settings } from "@api/Settings";
import { Menu } from "@webpack/common";
import "./styles.css";
import { addContextMenuPatch } from "@api/ContextMenu";

const STORAGE_KEY = 'muteDatabaseURL';
let muteDatabase = {};

// Получаем необходимые модули Discord через webpack
const getModule = async (filter) => {
    try {
        return await findByProps(filter);
    } catch (e) {
        console.error(`Failed to find module with filter ${filter}:`, e);
        return null;
    }
};

async function loadDatabase() {
    try {
        // Получаем URL из настроек
        const dbUrl = Settings.plugins.RedflagAutoMute?.databaseUrl;
        if (!dbUrl) {
            console.warn('Database URL not set in settings');
            return;
        }

        // Загружаем данные из Firebase
        const response = await fetch(`${dbUrl}/muteDatabase.json`);
        const data = await response.json();
        
        if (data) {
            muteDatabase = data;
            console.log('Loaded database from Firebase:', muteDatabase);
            
            // Сохраняем локальную копию
            if (!Settings.plugins.RedflagAutoMute) {
                Settings.plugins.RedflagAutoMute = { enabled: true };
            }
            Settings.plugins.RedflagAutoMute.localDatabase = JSON.stringify(muteDatabase);
            
            applyMuteList();
        } else {
            console.log('No data in Firebase, using local database');
            const localData = Settings.plugins.RedflagAutoMute?.localDatabase;
            if (localData) {
                try {
                    muteDatabase = JSON.parse(localData);
                    console.log('Loaded local database:', muteDatabase);
                    // Синхронизируем с Firebase
                    saveDatabase();
                } catch (e) {
                    console.warn('Failed to parse local database:', e);
                    muteDatabase = {};
                }
            }
        }
    } catch (error) {
        console.error('Failed to load database from Firebase:', error);
        // Пробуем загрузить локальную копию
        const localData = Settings.plugins.RedflagAutoMute?.localDatabase;
        if (localData) {
            try {
                muteDatabase = JSON.parse(localData);
                console.log('Loaded local database as fallback:', muteDatabase);
            } catch (e) {
                console.warn('Failed to parse local database:', e);
                muteDatabase = {};
            }
        }
    }
}

function applyMuteList() {
    Object.entries(muteDatabase).forEach(([id, type]) => {
        if (type === 'red' || (type === 'yellow' && Settings.plugins.RedflagAutoMute?.includeYellow)) {
            muteUser(id);
        }
    });
}

async function muteUser(userId) {
    try {
        const mediaEngine = await getModule("setLocalVolume");
        const voiceModule = await getModule("toggleLocalMute");
        
        if (mediaEngine && voiceModule) {
            console.log('Muting user:', userId);
            
            // Устанавливаем громкость на 0
            mediaEngine.setLocalVolume(userId, 0);
            
            // Включаем мьют
            if (typeof voiceModule.toggleLocalMute === 'function') {
                voiceModule.toggleLocalMute(userId);
                console.log('Mute applied successfully');
            } else {
                console.error('toggleLocalMute is not a function');
                console.log('Available methods:', Object.keys(voiceModule));
            }
        } else {
            console.error('Failed to get required modules for muting');
            console.log('mediaEngine:', mediaEngine);
            console.log('voiceModule:', voiceModule);
        }
    } catch (error) {
        console.error(`Failed to mute user ${userId}:`, error);
    }
}

async function unmuteUser(userId) {
    try {
        const mediaEngine = await getModule("setLocalVolume");
        const voiceModule = await getModule("toggleLocalMute");
        
        if (mediaEngine && voiceModule) {
            console.log('Unmuting user:', userId);
            
            // Возвращаем громкость на 100
            mediaEngine.setLocalVolume(userId, 100);
            
            // Выключаем мьют
            if (typeof voiceModule.toggleLocalMute === 'function') {
                voiceModule.toggleLocalMute(userId);
                console.log('Unmute applied successfully');
            } else {
                console.error('toggleLocalMute is not a function');
                console.log('Available methods:', Object.keys(voiceModule));
            }
        } else {
            console.error('Failed to get required modules for unmuting');
            console.log('mediaEngine:', mediaEngine);
            console.log('voiceModule:', voiceModule);
        }
    } catch (error) {
        console.error(`Failed to unmute user ${userId}:`, error);
    }
}

function addUserToDatabase(userId, type) {
    muteDatabase[userId] = type;
    saveDatabase();
    muteUser(userId);
    console.log('Current database:', JSON.stringify(muteDatabase, null, 2));
}

async function saveDatabase() {
    try {
        // Получаем URL из настроек
        const dbUrl = Settings.plugins.RedflagAutoMute?.databaseUrl;
        if (!dbUrl) {
            console.warn('Database URL not set in settings');
            return;
        }

        // Сохраняем в Firebase
        const response = await fetch(`${dbUrl}/muteDatabase.json`, {
            method: 'PUT',
            body: JSON.stringify(muteDatabase),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Database saved to Firebase');
        
        // Сохраняем локальную копию
        if (!Settings.plugins.RedflagAutoMute) {
            Settings.plugins.RedflagAutoMute = { enabled: true };
        }
        Settings.plugins.RedflagAutoMute.localDatabase = JSON.stringify(muteDatabase);
        console.log('Database saved locally');
        console.log('Current database state:', JSON.stringify(muteDatabase, null, 2));
    } catch (error) {
        console.error('Failed to save database to Firebase:', error);
        // Сохраняем только локально
        if (!Settings.plugins.RedflagAutoMute) {
            Settings.plugins.RedflagAutoMute = { enabled: true };
        }
        Settings.plugins.RedflagAutoMute.localDatabase = JSON.stringify(muteDatabase);
        console.log('Database saved locally only');
    }
}

function getDatabaseStats() {
    const redCount = Object.values(muteDatabase).filter(type => type === 'red').length;
    const yellowCount = Object.values(muteDatabase).filter(type => type === 'yellow').length;
    return { total: Object.keys(muteDatabase).length, redCount, yellowCount };
}

// Добавляем стили для визуального оформления
const styles = {
    redCard: {
        border: '2px solid red',
        borderRadius: '4px'
    },
    yellowCard: {
        border: '2px solid yellow',
        borderRadius: '4px'
    }
};

// Компонент настроек
function SettingsPanel() {
    const stats = getDatabaseStats();
    
    return (
        <div className="redflag-settings">
            <div className="setting-item">
                <label>Mute Database URL</label>
                <input
                    type="text"
                    value={Settings.plugins.RedflagAutoMute?.databaseUrl ?? ''}
                    onChange={e => {
                        if (!Settings.plugins.RedflagAutoMute) {
                            Settings.plugins.RedflagAutoMute = { enabled: true };
                        }
                        Settings.plugins.RedflagAutoMute.databaseUrl = e.target.value;
                    }}
                />
            </div>
            <div className="setting-item">
                <label>
                    <input
                        type="checkbox"
                        checked={Settings.plugins.RedflagAutoMute?.includeYellow ?? false}
                        onChange={e => {
                            if (!Settings.plugins.RedflagAutoMute) {
                                Settings.plugins.RedflagAutoMute = { enabled: true };
                            }
                            Settings.plugins.RedflagAutoMute.includeYellow = e.target.checked;
                        }}
                    />
                    Include Yellow Card Users
                </label>
            </div>
            <div className="stats">
                <p>Total Users: {stats.total}</p>
                <p>Red Card: {stats.redCount}</p>
                <p>Yellow Card: {stats.yellowCount}</p>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "RedflagAutoMute",
    description: "Автоматический мьют пользователей на основе общей базы данных",
    authors: [Devs.Ven],
    
    patches: [
        {
            find: ".VoiceUser",
            replacement: {
                match: /function \w+\((\w+)\){/,
                replace: "function $1($2){const rf=arguments[0];if(rf?.user?.id&&muteDatabase[rf.user.id]){const style=muteDatabase[rf.user.id]==='red'?$styles.redCard:$styles.yellowCard;rf.style={...rf.style,...style};}"
            }
        }
    ],

    start() {
        loadDatabase();
        this.contextMenuPatch = addContextMenuPatch("user-context", (children, { user }) => {
            if (!user?.id) return;

            const menuItems = [
                React.createElement(Menu.MenuItem, {
                    id: "redflag-red-card",
                    label: "Red Card",
                    action: () => {
                        addUserToDatabase(user.id, "red");
                        return false;
                    }
                }),
                React.createElement(Menu.MenuItem, {
                    id: "redflag-yellow-card",
                    label: "Yellow Card",
                    action: () => {
                        addUserToDatabase(user.id, "yellow");
                        return false;
                    }
                })
            ];

            if (muteDatabase[user.id]) {
                menuItems.push(
                    React.createElement(Menu.MenuItem, {
                        id: "redflag-remove",
                        label: "Remove Card",
                        action: () => {
                            const userId = user.id;
                            unmuteUser(userId);
                            delete muteDatabase[userId];
                            saveDatabase();
                            return false;
                        }
                    })
                );
            }

            children.push(
                React.createElement(Menu.MenuGroup, null, [
                    React.createElement(Menu.MenuSeparator),
                    ...menuItems
                ])
            );
        });
    },

    stop() {
        if (this.contextMenuPatch) this.contextMenuPatch();
        muteDatabase = {};
    },

    options: {
        databaseUrl: {
            type: OptionType.STRING,
            description: "Firebase Realtime Database URL",
            default: "https://testdb-5fa84-default-rtdb.firebaseio.com"
        },
        includeYellow: {
            type: OptionType.BOOLEAN,
            description: "Automatically mute users with yellow cards",
            default: false
        },
        localDatabase: {
            type: OptionType.STRING,
            description: "Local database storage",
            default: "{}"
        }
    },

    settingsPanel: SettingsPanel
}); 