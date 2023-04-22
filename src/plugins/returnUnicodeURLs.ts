import definePlugin from "@utils/types";
export default definePlugin({
    name: "ReturnUnicodeURLs",
    description: "This plugin brings back the old rendering of URLs which allows proper displaying of unicode URLs",
    authors: [
        {
            id: 1011864559168012301n,
            name: "EinTim",
        },
    ],
    start() { 
        globalThis.originalCreateElement = document.createElement;
        document.createElement = function (tag, options = undefined) {
            if(tag == "a"){
                let element = globalThis.originalCreateElement.call(document, tag, options);
                setTimeout(() => {
                    if(element.className.includes("anchor-")){
                        element.innerHTML = decodeURI(element.innerHTML);
                    }
                }, 0);
                return element;
            }
            return globalThis.originalCreateElement.call(document, tag, options);
        };

    },
    stop() {
        document.createElement = globalThis.originalCreateElement;
    },
});