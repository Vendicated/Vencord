import { Logger } from "@utils/Logger";
import { RestAPI } from "@webpack/common";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * You can return a modified query in this listener, which will be sent to the server instead of the original query
 * (If you return null or undefined, the original query will be sent)
 * @param url The url that is about to be requested
 * @param query The query that is about to be sent
 * @returns The modified query
 */
export type NetworkPreSendListener = (url: string, query: string | Array<any>, method: HttpMethod) => any;

/**
 * Whatever you will return in this listener will be sent back to the client instead of the server response
 * (If you return null or undefined, the original response will be sent)
 * @param url The url that was requested
 * @param response The response from the server
 * @param ok Whether the request was successful
 * @param status The status code of the response
 * @returns The modified response
 */
export type NetworkPostSendListener = (url: string, response: any, ok: boolean, status: number, method: HttpMethod) => any;

const NetworkHookingLogger = new Logger("NetworkHooking", "#e5c890");

const preSendListeners = new Set<NetworkPreSendListener>();
const postSendListeners = new Set<NetworkPostSendListener>();

export function addNetworkPreSendListener(listener: NetworkPreSendListener) {
    preSendListeners.add(listener);
    return listener;
}

export function removeNetworkPreSendListener(listener: NetworkPreSendListener) {
    preSendListeners.delete(listener);
    return listener;
}

export function addNetworkPostSendListener(listener: NetworkPostSendListener) {
    postSendListeners.add(listener);
    return listener;
}

export function removeNetworkPostSendListener(listener: NetworkPostSendListener) {
    postSendListeners.delete(listener);
    return listener;
}

function _handlePreSend(requestData: any, method: HttpMethod) {
    preSendListeners.forEach(listener => {
        let modifiedData = null;
        try {
            modifiedData = listener(requestData.url, requestData.query, method);
        } catch (err) {
            NetworkHookingLogger.error(`Error while trying to call listener for pre send hooking: ${err}`);
        }

        if (modifiedData != requestData && modifiedData != null && modifiedData != undefined) {
            requestData = modifiedData;
        }
    });

    return requestData;
}

function _handlePostSend(requestData: any, responseData: any, method: HttpMethod) {
    postSendListeners.forEach(listener => {
        let modifiedData = null;
        try {
            modifiedData = listener(requestData.url, responseData.body, responseData.ok, responseData.status, method);
        } catch (err) {
            NetworkHookingLogger.error(`Error while trying to call listener for post send hooking: ${err}`);
        }

        if (modifiedData != responseData && modifiedData != null && modifiedData != undefined) {
            responseData.body = modifiedData;
        }
    });

    return responseData;
}

export function initialize() {
    const originalGet = RestAPI.get;

    RestAPI.get = async (...args) => {
        let requestData = args[0] as any;
        if (requestData.url == undefined) return;

        args[0] = _handlePreSend(requestData, "GET");

        let getResponse = await originalGet.apply(RestAPI, args);

        getResponse = _handlePostSend(requestData, getResponse, "GET");

        return getResponse;
    };

    const originalPost = RestAPI.post;

    RestAPI.post = async (...args) => {
        let requestData = args[0] as any;
        if (requestData.url == undefined) return;

        args[0] = _handlePreSend(requestData, "POST");

        let postResponse = await originalPost.apply(RestAPI, args);

        postResponse = _handlePostSend(requestData, postResponse, "POST");

        return postResponse;
    };

    const originalPut = RestAPI.put;

    RestAPI.put = async (...args) => {
        let requestData = args[0] as any;
        if (requestData.url == undefined) return;

        args[0] = _handlePreSend(requestData, "PUT");

        let putResponse = await originalPut.apply(RestAPI, args);

        putResponse = _handlePostSend(requestData, putResponse, "PUT");

        return putResponse;
    };

    const originalPatch = RestAPI.patch;

    RestAPI.patch = async (...args) => {
        let requestData = args[0] as any;
        if (requestData.url == undefined) return;

        args[0] = _handlePreSend(requestData, "PATCH");

        let patchResponse = await originalPatch.apply(RestAPI, args);

        patchResponse = _handlePostSend(requestData, patchResponse, "PATCH");

        return patchResponse;
    };

    const originalDelete = RestAPI.delete;

    RestAPI.delete = async (...args) => {
        let requestData = args[0] as any;
        if (requestData.url == undefined) return;

        args[0] = _handlePreSend(requestData, "DELETE");

        let deleteResponse = await originalDelete.apply(RestAPI, args);

        deleteResponse = _handlePostSend(requestData, deleteResponse, "DELETE");

        return deleteResponse;
    };
}