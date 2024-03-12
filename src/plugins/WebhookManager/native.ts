import { webhookDefaultName, webhookMessageGLOBAL, webhookUrlGLOBAL } from ".";
const https = require('https');


export function doSomething() {
    const request = new XMLHttpRequest();
    request.open("POST", "" + webhookUrlGLOBAL);
    request.setRequestHeader('Content-type', 'application/json');

    const params = {
        content: webhookMessageGLOBAL,
        username: webhookDefaultName ?? "User",
        avatar_url: ""
    };
    request.send(JSON.stringify(params));
}

