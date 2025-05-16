/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { ILanguageRegistration } from "@vap/shiki";

export const VPC_REPO = "Vap0r1ze/vapcord";
export const VPC_REPO_COMMIT = "4d0e4b420fb1e4358852bbd18c804a6f5e54c0d7";
export const vpcRepoAssets = `https://raw.githubusercontent.com/${VPC_REPO}/${VPC_REPO_COMMIT}/assets/shiki-codeblocks`;
export const vpcRepoGrammar = (fileName: string) => `${vpcRepoAssets}/${fileName}`;
export const vpcRepoLanguages = `${vpcRepoAssets}/languages.json`;

export interface Language {
    name: string;
    id: string;
    devicon?: string;
    grammarUrl: string,
    grammar?: ILanguageRegistration["grammar"];
    scopeName: string;
    aliases?: string[];
    custom?: boolean;
}
export interface LanguageJson {
    name: string;
    id: string;
    fileName: string;
    devicon?: string;
    scopeName: string;
    aliases?: string[];
}

export const languages: Record<string, Language> = {};

export const loadLanguages = async () => {
    const langsJson: LanguageJson[] = await fetch(vpcRepoLanguages).then(res => res.ok ? res.json() : []);
    const loadedLanguages = Object.fromEntries(
        langsJson.map(lang => [lang.id, {
            ...lang,
            grammarUrl: vpcRepoGrammar(lang.fileName),
        }])
    );
    Object.assign(languages, loadedLanguages);
};

export const getGrammar = (lang: Language): Promise<NonNullable<ILanguageRegistration["grammar"]>> => {
    if (lang.grammar) return Promise.resolve(lang.grammar);
    return fetch(lang.grammarUrl).then(res => res.json());
};

const aliasCache = new Map<string, Language>();
export function resolveLang(idOrAlias: string) {
    if (Object.prototype.hasOwnProperty.call(languages, idOrAlias)) return languages[idOrAlias];

    const lang = Object.values(languages).find(lang => lang.aliases?.includes(idOrAlias));

    if (!lang) return null;

    aliasCache.set(idOrAlias, lang);
    return lang;
}
