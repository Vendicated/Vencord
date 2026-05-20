/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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

import type { BDTheme } from "./types";
import { BD_THEMES_PAGE, themeDownloadUrl } from "./types";

function parseStatValue(title: string | null): string {
    if (!title) return "0";
    const match = /:\s*(.+)$/.exec(title);
    return match?.[1]?.trim() ?? "0";
}

export function parseThemesHtml(html: string): BDTheme[] {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const themes: BDTheme[] = [];

    for (const card of doc.querySelectorAll("a.card-wrap")) {
        const path = card.getAttribute("href") ?? "";
        const slugMatch = /^\/themes\/(.+)$/.exec(path);
        if (!slugMatch) continue;

        const slug = decodeURIComponent(slugMatch[1]);
        const name = card.querySelector(".card-title")?.textContent?.trim();
        if (!name) continue;

        const downloadAnchor = card.querySelector('a[href*="download?id="]');
        const downloadHref = downloadAnchor?.getAttribute("href") ?? "";
        const idMatch = /[?&]id=(\d+)/.exec(downloadHref);
        if (!idMatch) continue;

        const id = Number(idMatch[1]);
        const description = card.querySelector(".card-description")?.textContent?.trim() ?? "";
        const author = card.querySelector(".author-link")?.textContent?.trim() ?? "Unknown";
        const tags = [...card.querySelectorAll(".addon-tag")]
            .map(el => el.textContent?.trim() ?? "")
            .filter(Boolean);

        const stats = card.querySelectorAll(".card-stat");
        const downloads = parseStatValue(stats[0]?.getAttribute("title") ?? null);
        const likes = parseStatValue(stats[1]?.getAttribute("title") ?? null);

        const imgSrc = card.querySelector(".card-image")?.getAttribute("src") ?? "";
        const thumbMatch = /\/image\/(\d+)/.exec(imgSrc);
        const thumbnailUrl = thumbMatch
            ? `https://betterdiscord.app/image/${thumbMatch[1]}`
            : null;

        themes.push({
            id,
            name,
            slug,
            description,
            author,
            tags,
            downloads,
            likes,
            thumbnailUrl,
            pageUrl: `https://betterdiscord.app/themes/${encodeURIComponent(slug)}`,
            downloadUrl: themeDownloadUrl(id),
        });
    }

    return themes;
}

export function parseThemePageSource(html: string): string | null {
    const doc = new DOMParser().parseFromString(html, "text/html");

    for (const anchor of doc.querySelectorAll('a[href*="github.com"]')) {
        const href = anchor.getAttribute("href");
        if (!href) continue;

        if (/\/blob\//i.test(href)) {
            const block = anchor.closest("div, section, article, li, p, td, dd");
            const blockText = block?.textContent?.toLowerCase() ?? "";
            if (blockText.includes("source") || anchor.textContent?.toLowerCase().includes("github")) {
                return href;
            }
        }
    }

    const blobLink = doc.querySelector('a[href*="github.com"][href*="/blob/"]');
    if (blobLink?.getAttribute("href")?.includes(".css")) {
        return blobLink.getAttribute("href");
    }

    for (const anchor of doc.querySelectorAll('a[href*="github.com"]')) {
        const href = anchor.getAttribute("href");
        if (!href || /\/blob\//.test(href)) continue;
        const context = anchor.parentElement?.textContent?.toLowerCase() ?? "";
        if (context.includes("source")) {
            return href;
        }
    }

    return null;
}

export async function fetchThemesCatalog(fetchHtml: (url: string) => Promise<string>): Promise<BDTheme[]> {
    const html = await fetchHtml(BD_THEMES_PAGE);
    return parseThemesHtml(html);
}
