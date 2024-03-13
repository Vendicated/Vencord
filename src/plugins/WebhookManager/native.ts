/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
todo: also add web support (should be as easy as if navigator is on web or smthn like that, might even have a variable for that somewhere)
(thank you official vendicated vending machine 2024 real)
const iframe = document.createElement("iframe")
iframe.sandbox = "allow-scripts"
iframe.srcdoc = `<script nonce="NDEsMjksMTM0LDU4LDIzNyw4OSw0NiwyMTY="> fetch("http://localhost:8080") </script>`
document.body.append(iframe);
setTimeout(() => iframe.remove(), 1000);
*/
import https from "https";


export function executeWebhook(_, url: string, body: object) {
    const req = https.request(url,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        });
    req.write(JSON.stringify(body));
    req.end();
}
