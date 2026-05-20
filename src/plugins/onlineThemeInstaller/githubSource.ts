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

const COMMIT_SHA_RE = /^[0-9a-f]{7,40}$/i;

export function githubBlobToStylesheetUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith("github.com")) return null;
        if (!parsed.pathname.includes("/blob/")) return null;

        parsed.searchParams.set("raw", "true");
        return parsed.toString();
    } catch {
        return null;
    }
}

export function githubSourceToStylesheetUrl(sourceUrl: string): string | null {
    const trimmed = sourceUrl.trim();
    if (!trimmed) return null;

    if (trimmed.includes("raw.githubusercontent.com")) {
        return normalizeRawGithubUrl(trimmed.split("?")[0]);
    }

    const blobStylesheet = githubBlobToStylesheetUrl(trimmed);
    if (blobStylesheet) return blobStylesheet;

    const fromBlob = githubBlobToRawUrl(trimmed.split("?")[0]);
    if (fromBlob) return fromBlob;

    const repoOnly = parseGithubRepoOnly(trimmed.split("?")[0]);
    if (repoOnly) {
        return rawGithubUrl(repoOnly.owner, repoOnly.repo, repoOnly.branch, `${repoOnly.repo}.theme.css`);
    }

    return null;
}

export function normalizeRawGithubUrl(url: string): string {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return url;

    const [owner, repo, maybeRef, ...rest] = parts;
    if (maybeRef === "refs" && parts[3] === "heads" && parts.length >= 6) {
        return url;
    }

    const ref = maybeRef;
    const path = rest.join("/");
    if (!path) return url;

    if (COMMIT_SHA_RE.test(ref)) {
        return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
    }

    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${ref}/${path}`;
}

export function githubBlobToRawUrl(url: string): string | null {
    const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i.exec(url);
    if (!match) return null;

    const [, owner, repo, ref, filePath] = match;
    return rawGithubUrl(owner, repo, ref, filePath);
}

export function rawGithubUrl(owner: string, repo: string, ref: string, filePath: string): string {
    const path = filePath.replace(/^\//, "");
    if (COMMIT_SHA_RE.test(ref)) {
        return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
    }
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${ref}/${path}`;
}

interface GithubRepoOnly {
    owner: string;
    repo: string;
    branch: string;
}

function parseGithubRepoOnly(url: string): GithubRepoOnly | null {
    const treeMatch = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/?$/i.exec(url);
    if (treeMatch) {
        return { owner: treeMatch[1], repo: treeMatch[2], branch: treeMatch[3] };
    }

    const repoMatch = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/i.exec(url.replace(/\.git$/, ""));
    if (repoMatch) {
        return { owner: repoMatch[1], repo: repoMatch[2], branch: "master" };
    }

    return null;
}
