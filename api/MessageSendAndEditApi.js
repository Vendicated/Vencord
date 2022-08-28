const sendListeners = new Set();
const editListeners = new Set();

function _handleSend(channelId, messageObj, extraThing) {
    for (const listener of sendListeners) {
        try {
            listener(channelId, messageObj, extraThing);
        } catch (e) { console.error(`MessageSendHandler: Listener encoutered an unknown error. (${e.message})`) }
    }
}

function _handleEdit(channeld, messageId, messageObj) {
    for (const listener of editListeners) {
        try {
            listener(channeld, messageId, messageObj);
        } catch (e) { console.error(`MessageEditHandler: Listener encoutered an unknown error. (${e.message})`) }
    }
}

const addSendListener = (listener) => sendListeners.add(listener);
const addEditListener = (listener) => editListeners.add(listener);

const removeSendListener = (listener) => sendListeners.delete(listener);
const removeEditListener = (listener) => editListeners.delete(listener);

module.exports = {
    _handleSend,
    _handleEdit,
    addSendListener,
    addEditListener,
    removeSendListener,
    removeEditListener,
};
