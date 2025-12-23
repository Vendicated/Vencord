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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    removeUTM: {
        type: OptionType.BOOLEAN,
        description: "Remove all tracking parameters (cleans all URLs by default)",
        default: true
    },
    cleanAmazon: {
        type: OptionType.BOOLEAN,
        description: "Clean Amazon links to minimal product URL",
        default: true
    },
    amazonTag: {
        type: OptionType.STRING,
        description: "Amazon affiliate tag to add (leave empty for none)",
        default: ""
    },
    replaceTwitter: {
        type: OptionType.BOOLEAN,
        description: "Replace twitter.com/x.com with fxtwitter.com for better embeds",
        default: true
    },
    fixInstagram: {
        type: OptionType.BOOLEAN,
        description: "Fix Instagram embeds (bypasses 18+ restriction, always embeds content)",
        default: true
    },
    instagramFixUrl: {
        type: OptionType.STRING,
        description: "Instagram fix service URL (e.g., ddinstagram.com, eeinstagram.com)",
        default: "eeinstagram.com"
    },
    shortenYoutube: {
        type: OptionType.BOOLEAN,
        description: "Shorten YouTube links to youtu.be format",
        default: false
    },
    shortenWalmart: {
        type: OptionType.BOOLEAN,
        description: "Shorten Walmart links to minimal product URL",
        default: false
    }
});

function sanitizeUrl(url: string): string {
    try {
        let oldLink = new URL(url);
        
        // Handle link shortener redirects
        if ((oldLink.host === 'l.facebook.com') && oldLink.searchParams.has('u')) {
            oldLink = new URL(decodeURI(oldLink.searchParams.get('u')!));
        } else if (oldLink.host === 'href.li') {
            const hrefLink = oldLink.href.split('?')[1];
            oldLink = new URL(hrefLink);
        } else if ((oldLink.host === 'www.google.com') && (oldLink.pathname === '/url') && oldLink.searchParams.has('url')) {
            oldLink = new URL(oldLink.searchParams.get('url')!);
        } else if ((oldLink.host === 'cts.businesswire.com') && oldLink.searchParams.has('url')) {
            oldLink = new URL(oldLink.searchParams.get('url')!);
        }
        
        // This plugin is intended to drop all foreign parameters, rather than specific sites.
        // Some services may require params, so we add them back.

        // Start with clean URL (no params)
        const newLink = new URL(oldLink.origin + oldLink.pathname);
        
        // Handle Twitter/X links
        if (settings.store.replaceTwitter && 
            (oldLink.hostname === 'twitter.com' || oldLink.hostname === 'www.twitter.com' || 
             oldLink.hostname === 'x.com' || oldLink.hostname === 'www.x.com')) {
            newLink.hostname = 'fxtwitter.com';
            return newLink.toString();
        }
        
        // Handle Instagram links
        if (oldLink.hostname === 'instagram.com' || oldLink.hostname === 'www.instagram.com') {
            if (settings.store.fixInstagram) {
                const fixUrl = settings.store.instagramFixUrl?.trim();
                if (fixUrl) {
                    newLink.hostname = fixUrl;
                }
            }
            return newLink.toString();
        }
        
        // Handle Amazon links
        if (settings.store.cleanAmazon && oldLink.host.includes('amazon') && 
            (oldLink.pathname.includes('/dp/') || oldLink.pathname.includes('/d/') || oldLink.pathname.includes('/product/'))) {
            newLink.hostname = newLink.hostname.replace('www.', '');
            const regex = /(?:\/dp\/|\/product\/|\/d\/)(\w*|\d*)/g;
            const match = regex.exec(oldLink.pathname);
            if (match && match[1]) {
                newLink.pathname = '/dp/' + match[1];
            }
            
            const amazonTag = settings.store.amazonTag?.trim();
            if (amazonTag) {
                newLink.searchParams.append('tag', amazonTag);
            }
            
            return newLink.toString();
        }
        
        // Handle YouTube links
        if (oldLink.host.endsWith('youtube.com')) {
            if (oldLink.searchParams.has('v')) {
                if (settings.store.shortenYoutube) {
                    const regex = /^.*(youtu\.be\/|embed\/|shorts\/|\?v=|\&v=)(?<videoID>[^#\&\?]*).*/;
                    const match = regex.exec(oldLink.href);
                    if (match?.groups?.videoID) {
                        const shortLink = new URL('https://youtu.be/' + match.groups.videoID);
                        if (oldLink.searchParams.has('t')) {
                            shortLink.searchParams.append('t', oldLink.searchParams.get('t')!);
                        }
                        return shortLink.toString();
                    }
                } else {
                    newLink.searchParams.append('v', oldLink.searchParams.get('v')!);
                }
                if (oldLink.searchParams.has('t')) {
                    newLink.searchParams.append('t', oldLink.searchParams.get('t')!);
                }
            } else if (oldLink.pathname.includes('playlist') && oldLink.searchParams.has('list')) {
                newLink.searchParams.append('list', oldLink.searchParams.get('list')!);
            }
            return newLink.toString();
        } else if (oldLink.host === 'youtu.be' && oldLink.searchParams.has('t')) {
            newLink.searchParams.append('t', oldLink.searchParams.get('t')!);
            return newLink.toString();
        }
        
        // Handle Walmart links
        if (settings.store.shortenWalmart && (oldLink.host === 'www.walmart.com') && oldLink.pathname.includes('/ip/')) {
            const regex = /\/ip\/.*\/(\d+)/;
            const match = oldLink.pathname.match(regex);
            if (match && match[1]) {
                newLink.pathname = '/ip/' + match[1];
            }
            return newLink.toString();
        }
        
        // Preserve essential parameters for specific sites
        if (settings.store.removeUTM) {
            // Google Search - keep 'q' parameter
            if (oldLink.searchParams.has('q')) {
                newLink.searchParams.append('q', oldLink.searchParams.get('q')!);
            }
            
            // Google Play - keep 'id' parameter
            if ((oldLink.host === 'play.google.com') && oldLink.searchParams.has('id')) {
                newLink.searchParams.append('id', oldLink.searchParams.get('id')!);
            }
            
            // Macy's - keep 'ID' parameter
            if ((oldLink.host === 'www.macys.com') && oldLink.searchParams.has('ID')) {
                newLink.searchParams.append('ID', oldLink.searchParams.get('ID')!);
            }
            
            // Facebook stories - keep required params
            if ((oldLink.host === 'www.facebook.com') && oldLink.pathname.includes('story.php')) {
                if (oldLink.searchParams.has('story_fbid')) {
                    newLink.searchParams.append('story_fbid', oldLink.searchParams.get('story_fbid')!);
                }
                if (oldLink.searchParams.has('id')) {
                    newLink.searchParams.append('id', oldLink.searchParams.get('id')!);
                }
            }
            
            // Lenovo - keep 'bundleId' parameter
            if ((oldLink.host === 'www.lenovo.com') && oldLink.searchParams.has('bundleId')) {
                newLink.searchParams.append('bundleId', oldLink.searchParams.get('bundleId')!);
            }
            
            // Best Buy - shorten product links
            if ((oldLink.host === 'www.bestbuy.com') && oldLink.pathname.includes('.p')) {
                const regex = /\/(\d+)\.p/;
                const match = oldLink.pathname.match(regex);
                if (match && match[1]) {
                    newLink.pathname = '/site/' + match[1] + '.p';
                }
            }
            
            // Xiaohongshu - keep 'xsec_token' parameter
            if ((oldLink.host === 'www.xiaohongshu.com') && oldLink.searchParams.has('xsec_token')) {
                newLink.searchParams.append('xsec_token', oldLink.searchParams.get('xsec_token')!);
            }
            
            // Apple Weather - keep required params
            if (oldLink.host === 'weatherkit.apple.com') {
                if (oldLink.searchParams.has('lang')) {
                    newLink.searchParams.append('lang', oldLink.searchParams.get('lang')!);
                }
                if (oldLink.searchParams.has('party')) {
                    newLink.searchParams.append('party', oldLink.searchParams.get('party')!);
                }
                if (oldLink.searchParams.has('ids')) {
                    newLink.searchParams.append('ids', oldLink.searchParams.get('ids')!);
                }
            }
            
            // Webtoon - keep required params
            if ((oldLink.host === 'www.webtoons.com') && oldLink.searchParams.has('title_no') && oldLink.searchParams.has('episode_no')) {
                newLink.searchParams.append('title_no', oldLink.searchParams.get('title_no')!);
                newLink.searchParams.append('episode_no', oldLink.searchParams.get('episode_no')!);
            }
        } else {
            // If removeUTM is disabled, preserve all parameters
            oldLink.searchParams.forEach((value, key) => {
                newLink.searchParams.append(key, value);
            });
        }
        
        return newLink.toString();
    } catch (e) {
        // If URL parsing fails, return original
        return url;
    }
}

function sanitizeLinks(content: string): string {
    if (!content) return content;
    
    // Match URLs in the content
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    
    return content.replace(urlRegex, (match) => {
        return sanitizeUrl(match);
    });
}

export default definePlugin({
    name: "LinkScrub",
    description: "Removes tracking parameters and cleans links in your messages",
    authors: [Devs.abb3v],
    
    settings,

    onBeforeMessageSend(channelId, msg) {
        msg.content = sanitizeLinks(msg.content);
    }
});
