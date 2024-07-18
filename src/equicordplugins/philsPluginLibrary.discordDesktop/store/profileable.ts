/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { PluginInitializer, PluginSettings, PluginStore } from "./store";

export interface ProfileableProfile {
    name: string;
}

export interface ProfileableSettings<T extends PluginSettings = {}, B extends ProfileableProfile & T = T & ProfileableProfile> {
    currentProfile: B;
    profiles: B[];
    setCurrentProfile: (f: ((currentProfile: B) => B | undefined) | B | undefined) => void;
    getCurrentProfile: () => B;
    duplicateProfile: (profile: string | B, name: string) => void;
    deleteProfile: (profile: string | B) => void;
    saveProfile: (profile: B) => void;
    getProfile: (profile: string) => B | undefined;
    getProfiles: (defaultProfiles: boolean) => B[],
    isCurrentProfileADefaultProfile: () => boolean;
    getDefaultProfiles: () => B[];
}

export type ProfilableStore<
    T extends PluginSettings = {},
    S extends PluginSettings = {}
> = PluginStore<T & ProfileableSettings<S>>;

export type ProfilableMiddleware<
    T extends PluginSettings = {},
    S extends PluginSettings = {},
    B = T & ProfileableSettings<S>
> = PluginInitializer<T & ProfileableSettings<S>, B>;

export type ProfilableInitializer<
    T extends PluginSettings = {},
    S extends PluginSettings = {}
> = ProfilableMiddleware<T, S, T & Partial<ProfileableSettings<S>>>;

export function profileable<
    T extends PluginSettings = {},
    S extends PluginSettings = {}
>(f: ProfilableInitializer<T, S>, defaultProfile: ProfileableProfile & S, defaultProfiles: (ProfileableProfile & S)[] = []): ProfilableMiddleware<T, S> {
    return (set, get) => ({
        currentProfile: defaultProfile,
        profiles: [],
        getCurrentProfile: () => get().currentProfile,
        getProfile: profile => [...get().profiles, ...(defaultProfiles ?? [])].find(p => p.name === profile),
        deleteProfile: profile => get().profiles = get().profiles.filter(p => typeof profile === "string" ? p.name !== profile : p.name !== profile.name),
        duplicateProfile: (profile, name) => {
            const foundProfile = get().profiles.find(p => typeof profile === "string" ? p.name === profile : p.name === profile.name);
            if (foundProfile) {
                foundProfile.name = name;
                get().profiles.push(foundProfile);
            }
        },
        setCurrentProfile: f => {
            const currProfile = get().currentProfile;
            get().currentProfile = (typeof f === "function" ? f(currProfile) ?? currProfile : f ?? currProfile);
        },
        saveProfile: profile => {
            get().deleteProfile(profile.name);
            get().profiles.push(profile);
        },
        isCurrentProfileADefaultProfile: () => defaultProfiles.some(profile => get().currentProfile.name === profile.name),
        getDefaultProfiles: () => defaultProfiles,
        getProfiles: defaultProfiles => [...get().profiles, ...(defaultProfiles ? get().getDefaultProfiles() : [])],
        ...f(set as any, get as any)
    });
}
