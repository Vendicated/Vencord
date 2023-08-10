/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ILanguageRegistration } from "@vap/shiki";

export const VPC_REPO = "Vap0r1ze/vapcord";
export const VPC_REPO_COMMIT = "88a7032a59cca40da170926651b08201ea3b965a";
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
    const langsJson: LanguageJson[] = await fetch(vpcRepoLanguages).then(res => res.json());
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
