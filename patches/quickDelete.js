const { MessageClicks } = require("../api");
const { findByProps } = require("../utils/webpack");

module.exports = {
    name: "QuickDelete",
    start() {
        const { deleteMessage } = findByProps("deleteMessage");

        let isDeletePressed = false;
        document.addEventListener("keydown", e => {
            if (e.key === "Backspace") isDeletePressed = true;
        });
        document.addEventListener("keyup", e => {
            if (e.key === "Backspace") isDeletePressed = false;
        });

        MessageClicks.addListener((msg, chan, event) => {
            if (isDeletePressed) {
                deleteMessage(chan.id, msg.id);
                event.preventDefault();
            }
        });
    }
};
