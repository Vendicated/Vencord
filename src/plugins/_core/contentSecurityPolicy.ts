/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { StartAt } from "@utils/types";

export default definePlugin({
    name: "ContentSecurityPolicy",
    required: true,
    startAt: StartAt.DOMContentLoaded,
    description: "Allow loading resources from Vencord.dev",
    authors: [Devs.Cootshk],
    start() {
        const logger = new Logger("ContentSecurityPolicy", "#8caaee");
        if (document.getElementById("vencord-csp")) {
            logger.warn("Vencord CSP meta tag already exists, skipping.");
            return;
        }
        const meta = document.createElement("meta");
        meta.id = "vencord-csp";
        meta.httpEquiv = "Content-Security-Policy";
        fetch("https://discord.com/app").then(res =>
            res.headers
        ).then(headers => {
            let csp;
            if (headers.get("Content-Security-Policy")) {
                csp = headers.get("Content-Security-Policy")!;
            } else {
                logger.warn("Failed to fetch CSP from Discord!");
                csp = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-ODQsMCw4MSw2NCwzLDM0LDY2LDEyNQ==' blob: https://cdn.discordapp.com/animations/ https://www.gstatic.com/recaptcha/ https://www.google.com/recaptcha/ https://*.hcaptcha.com https://hcaptcha.com https://js.stripe.com https://js.braintreegateway.com https://assets.braintreegateway.com https://www.paypalobjects.com https://*.paypal.com https://kit.cash.app https://static.discord.com https://static-edge.discord.com; style-src 'self' 'unsafe-inline' https://cdn.discordapp.com https://*.vencord.dev https://*.hcaptcha.com https://hcaptcha.com https://kit.cash.app https://static.discord.com https://static-edge.discord.com; img-src 'self' blob: data: https://*.discordapp.net https://*.discordapp.com https://*.discord.com https://i.scdn.co https://i.ytimg.com https://i.imgur.com https://media.tenor.co https://media.tenor.com https://c.tenor.com https://*.youtube.com https://*.giphy.com https://static-cdn.jtvnw.net https://pbs.twimg.com https://assets.braintreegateway.com https://checkout.paypal.com https://api.cash.app; font-src 'self' https://fonts.gstatic.com https://cash-f.squarecdn.com https://static.discord.com https://static-edge.discord.com; connect-src 'self' https://status.discordapp.com https://status.discord.com https://support.discordapp.com https://support.discord.com https://discordapp.com https://discord.com https://discord-attachments-uploads-prd.storage.googleapis.com https://cdn.discordapp.com https://media.discordapp.net https://images-ext-1.discordapp.net https://images-ext-2.discordapp.net https://router.discordapp.net wss://*.discord.gg https://best.discord.media https://latency.discord.media wss://*.discord.media:* wss://dealer.spotify.com https://api.spotify.com https://music.amazon.com/embed/oembed https://*.sentry.io https://api.twitch.tv https://api.stripe.com https://api.braintreegateway.com https://client-analytics.braintreegateway.com https://*.braintree-api.com https://www.googleapis.com https://*.algolianet.com https://*.hcaptcha.com https://hcaptcha.com https://www.google.com/recaptcha/ https://*.algolia.net ws://127.0.0.1:* http://127.0.0.1:*; media-src 'self' blob: disclip: https://*.discordapp.net https://*.discord.com https://*.discordapp.com https://*.youtube.com https://streamable.com https://vid.me https://twitter.com https://oddshot.akamaized.net https://*.giphy.com https://i.imgur.com https://media.tenor.co https://media.tenor.com https://c.tenor.com; frame-src https://discordapp.com/domain-migration discord: https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://*.hcaptcha.com https://hcaptcha.com https://js.stripe.com https://hooks.stripe.com https://assets.braintreegateway.com https://*.paypal.com https://checkoutshopper-live.adyen.com https://kit.cash.app https://player.twitch.tv https://clips.twitch.tv/embed https://player.vimeo.com https://www.youtube.com/embed/ https://www.tiktok.com/player/ https://music.amazon.com/embed/ https://music.amazon.co.uk/embed/ https://music.amazon.de/embed/ https://music.amazon.co.jp/embed/ https://music.amazon.es/embed/ https://music.amazon.fr/embed/ https://music.amazon.it/embed/ https://music.amazon.com.au/embed/ https://music.amazon.in/embed/ https://music.amazon.ca/embed/ https://music.amazon.com.mx/embed/ https://music.amazon.com.br/embed/ https://www.youtube.com/s/player/ https://twitter.com/i/videos/ https://www.funimation.com/player/ https://www.redditmedia.com/mediaembed/ https://open.spotify.com/embed/ https://w.soundcloud.com/player/ https://audius.co/embed/ https://*.watchanimeattheoffice.com https://sessionshare.sp-int.playstation.com/ https://session-share.playstation.com/ https://localhost:* https://*.discordsays.com https://discordappcom.cloudflareaccess.com/ https://family.k-id.com/ https://d3ogqhtsivkon3.cloudfront.net/ https://*.dcams.app https://embed.music.apple.com/; child-src 'self' blob: https://assets.braintreegateway.com https://*.paypal.com; report-uri https://o64374.ingest.sentry.io/api/5441894/security/?sentry_key=8fbbce30bf5244ec9429546beef21870&sentry_environment=stable; report-to csp-sentry;";
            }
            if (IS_DEV) logger.debug("Recieved CSP: " + csp);
            meta.content = csp.replaceAll(
                "https://cdn.discordapp.com ", "https://cdn.discordapp.com https://vencord.dev https://*.vencord.dev "
            ).replaceAll(
                "https://*.discordapp.com ", "https://*.discordapp.com https://vencord.dev https://*.vencord.dev ");
            document.head.appendChild(meta);
        });
    }
});
