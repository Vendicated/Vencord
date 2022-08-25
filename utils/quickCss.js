const { watch, promises: { readFile, access, mkdir, writeFile } } = require("fs");
const { join } = require("path");
const { SETTINGS_DIR } = require("../constants");

const file = join(SETTINGS_DIR, "quickCss.css");

let element = document.createElement("style");
document.head.appendChild(element);

function update() {
    readFile(file, "utf-8").then(css => {
        element.textContent = css;
    }).catch(err => {
        console.error(err);
    });
}

async function init() {
    try {
        await access(file);
    } catch {
        try {
            await mkdir(SETTINGS_DIR, { recursive: true });
            await writeFile(file, "");
        } catch (err) {
            console.error("Failed to create quickCss files.", err);
            return;
        }
    }

    update();
    watch(file, () => {
        console.log("Detected changes in quickCss. Reloading...");
        update();
    });
}

init();
