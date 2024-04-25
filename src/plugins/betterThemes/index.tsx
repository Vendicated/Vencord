/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import definePlugin from "@utils/types";

let isHoveringDelete = false;
let isHoveringCreate = false;

let db;
const request = indexedDB.open("BetterThemesDBStore", 1);
request.onupgradeneeded = function(event: Event) {
    const target = event.target as IDBOpenDBRequest;
    if (target) {
        db = target.result;
        db.createObjectStore("BetterThemesDB", { keyPath: "id" });
    }
};
request.onsuccess = function(event: Event) {
    const target = event.target as IDBOpenDBRequest;
    if (target) {
        db = target.result;
        spawnBoxes();
    }
};

export default definePlugin({
    name: "BetterThemes",
    description: "Easily add buttons to switch themes, themes diashow and load themes directly from BD.",
    authors: [
        {
            id: 727416368827334778n,
            name: "soul_fire_",
        },
        {
        id: 676111787061411880n,
            name: "MarryHotter",
        },
    ],
    patches: [],
    start() {

        let diashowTimeout1;
        let progressInterval1;
        let checkFunctionInterval;
        let isRunning = false;

        function startDiashow1(isFirstCall = false) {

            if (isRunning && !isFirstCall) {
                return;
            }
            isRunning = true;

            if (diashowTimeout1) {
                clearTimeout(diashowTimeout1);
                diashowTimeout1 = null;
            }
            if (progressInterval1) {
                clearInterval(progressInterval1);
                progressInterval1 = null;
            }
            if (checkFunctionInterval) {
                clearInterval(checkFunctionInterval);
                checkFunctionInterval = null;
            }

            const transaction1 = db.transaction(["BetterThemesDB"], "readwrite");
            const store1 = transaction1.objectStore("BetterThemesDB");
            const request1 = store1.get("diashow");
            request1.onsuccess = function() {
                const diashow = request1.result;
                if (diashow) {
                    diashow.function = 1;
                    store1.put(diashow);
                    checkFunctionInterval = setInterval(function() {
                        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                        const store = transaction.objectStore("BetterThemesDB");
                        const request = store.get("diashow");
                        request.onsuccess = function() {
                            const diashow = request.result;
                            if (diashow && diashow.function !== 1) {
                                if (diashowTimeout1) {
                                    clearTimeout(diashowTimeout1);
                                    diashowTimeout1 = null;
                                }
                                if (progressInterval1) {
                                    clearInterval(progressInterval1);
                                    progressInterval1 = null;
                                }
                                if (checkFunctionInterval) {
                                    clearInterval(checkFunctionInterval);
                                    checkFunctionInterval = null;
                                }
                                isRunning = false;
                            }
                        }
                    }, 1000);
                }
            };
            const transaction = db.transaction(["BetterThemesDB"], "readwrite");
            const store = transaction.objectStore("BetterThemesDB");
            const request = store.get("diashow");
            request.onsuccess = function() {
                const diashow = request.result;
                if (diashow) {
                    if (diashow.lastTime !== diashow.time) {
                        diashow.progress = 0;
                        diashow.lastTime = diashow.time;
                        store.put(diashow);
                    } else if (diashow.progress !== 0) {
                    } else {
                        console.log('Last time was not the same as current time or progress is 0');
                    }
                }
                if (diashow && diashow.status === "active" && diashow.time) {
                    console.log('diashow is active and has time');

                    const timeValue = Number(diashow.time.slice(0, -1));
                    let intervalTime;
                    switch (diashow.time.slice(-1)) {
                        case 's':
                            intervalTime = timeValue * 1000;
                            break;
                        case 'm':
                            intervalTime = timeValue * 60 * 1000;
                            break;
                        case 'h':
                            intervalTime = timeValue * 60 * 60 * 1000;
                            break;
                        default:
                            console.log('Invalid time format');
                            return;
                    }
                    let remainingTime = intervalTime - (diashow.progress * 1000);
                    if (remainingTime < 0) {
                        remainingTime = intervalTime;
                        diashow.progress = 0;
                        store.put(diashow);
                    }
                    const getAllRequest = store.getAll();
                    getAllRequest.onsuccess = function() {
                        const allItems = getAllRequest.result;
                        const numberedItems = allItems.filter(item => !isNaN(item.id));
                        let selectedItem;
                        switch (diashow.order) {
                            case 'randomized':
                                selectedItem = numberedItems[Math.floor(Math.random() * numberedItems.length)];
                                break;
                            case 'in order':
                                selectedItem = numberedItems[diashow.last % numberedItems.length];
                                diashow.last = (diashow.last + 1) % numberedItems.length;
                                break;
                            case 'custom':
                                if (typeof diashow.setorder === 'string' && diashow.setorder.length > 0) {
                                    const setOrder = Array.from(diashow.setorder).map(Number);
                                    const currentId = setOrder[diashow.last % setOrder.length];
                                    selectedItem = numberedItems[currentId - 1];
                                    diashow.last = (diashow.last + 1) % setOrder.length;
                                } else {
                                    console.log('Invalid setOrder');
                                    return;
                                }
                                break;
                            default:
                                console.log('Invalid order');
                                return;
                        }
                        if (remainingTime === intervalTime) {
                            const link = selectedItem.text;
                            console.log('selectedItem link', link);
                            if (selectedItem.text.startsWith("https://raw")) {
                            const transaction = db.transaction(["BetterThemesDB"], "readonly");
                            const store = transaction.objectStore("BetterThemesDB");
                            const getRequest = store.get(selectedItem.id);
                            getRequest.onsuccess = function() {
                            const data = getRequest.result;
                             let css = `@import url("${selectedItem.text}");\n`;
                                if (data && data.CSS) {
                                    css += data.CSS;
                                }
                                 VencordNative.quickCss.set(css);
                                  };
                             getRequest.onerror = function(e) {
                               console.log('Error', e.target.error.name);
                               };
                            }
                            const themeBoxes = document.querySelectorAll(".theme-box");
                            themeBoxes.forEach((themeBox) => {
                                const id = themeBox.id;
                                const request = indexedDB.open("BetterThemesDBStore", 1);
                                request.onsuccess = function(event: Event) {
                                    console.log('IndexedDB request successful');
                                    const target = event.target as IDBRequest;
                                    if (target) {
                                        const db = target.result;
                                        const transaction = db.transaction(["BetterThemesDB"], 'readwrite');
                                        const objectStore = transaction.objectStore("BetterThemesDB");
                                        const getRequest = objectStore.get(id);
                                        getRequest.onsuccess = function(event: Event) {
                                            const target = event.target as IDBRequest;
                                            if (target && target.result) {
                                                const data = getRequest.result;
                                                const htmlThemeBox = themeBox as HTMLElement;
                                                if (htmlThemeBox.id === selectedItem.id) {
                                                    htmlThemeBox.style.border = '3px solid #00aaff';
                                                    data.border = '3px solid #00aaff';
                                                } else {
                                                    htmlThemeBox.style.border = '';
                                                    data.border = '';
                                                }
                                                const putRequest = objectStore.put(data);
                                                putRequest.onerror = function(e) {
                                                    console.log('Error', e.target.error.name);
                                                }
                                            }
                                        };
                                    }
                                };
                            });
                        }
                        store.put(diashow);
                        if (diashow.lastTime !== diashow.time) {
                            diashow.progress = 0;
                            store.put(diashow);
                        }
                        diashowTimeout1 = setTimeout(() => {
                            startDiashow1();
                            isRunning = false;
                        }, remainingTime);
                        progressInterval1 = setInterval(function() {
                            const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                            const store = transaction.objectStore("BetterThemesDB");
                            const request = store.get("diashow");
                            request.onsuccess = function() {
                                const diashow = request.result;
                                if (diashow && diashow.status === "active") {
                                    if (diashow.progress * 1000 >= intervalTime) {
                                        diashow.progress = 0;
                                        clearInterval(progressInterval1);
                                        startDiashow1();
                                    } else {
                                        diashow.progress += 1;
                                    }
                                    store.put(diashow);
                                }
                            }
                        }, 1000);
                    };
                } else {
                    if (diashowTimeout1) {
                        clearTimeout(diashowTimeout1);
                        diashowTimeout1 = null;
                    }
                    if (progressInterval1) {
                        clearInterval(progressInterval1);
                        progressInterval1 = null;
                    }
                    isRunning = false;
                }
            };
        }

        startDiashow1(true);

function changeThemeByDay() {
    const currentDate = new Date().toDateString();
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "active" && diashow.time) {
            if (diashow.time === '1d') {
                if (!diashow.lastChange || new Date(diashow.lastChange).toDateString() !== currentDate) {
                    updateTheme();
                    diashow.lastChange = new Date();
                    const putRequest = store.put(diashow);
                    putRequest.onsuccess = function() {
                        console.log('diashow.lastChange has been updated in IndexedDB');
                    };
                    putRequest.onerror = function() {
                        console.error('Failed to update diashow.lastChange in IndexedDB', putRequest.error);
                    };
                }
            }
        }
    };
}

setInterval(() => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "" && diashow.progress > 0) {
            if (diashowTimeout1) {
                clearTimeout(diashowTimeout1);
                diashowTimeout1 = null;
            }
            if (progressInterval1) {
                clearInterval(progressInterval1);
                progressInterval1 = null;
            }
            store.put(diashow);
        }
    }
}, 5000);

setInterval(changeThemeByDay, 60 * 1000);

function updateTheme() {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const updatedRequest = store.get("diashow");
    updatedRequest.onsuccess = function() {
        const updatedDiashow = updatedRequest.result;
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = function() {
            const allItems = getAllRequest.result;
            const numberedItems = allItems.filter(item => !isNaN(item.id));
            let selectedItem;
            switch (updatedDiashow.order) {
                case 'randomized':
                    selectedItem = numberedItems[Math.floor(Math.random() * numberedItems.length)];
                    break;
                case 'in order':
                    selectedItem = numberedItems[updatedDiashow.last % numberedItems.length];
                    if (updatedDiashow.firstChange) {
                        updatedDiashow.last = (updatedDiashow.last + 1) % numberedItems.length;
                        updatedDiashow.firstChange = false;
                    } else {
                        updatedDiashow.firstChange = true;
                    }
                    break;
                    case 'custom':
                        if (typeof updatedDiashow.setorder === 'string' && updatedDiashow.setorder.length > 0) {
                            const setOrder = Array.from(updatedDiashow.setorder).map(Number);
                            const currentId = setOrder[updatedDiashow.last % setOrder.length];
                            selectedItem = numberedItems[currentId - 1];
                            if (updatedDiashow.firstChange) {
                                updatedDiashow.last = (updatedDiashow.last + 1) % setOrder.length;
                                updatedDiashow.firstChange = false;
                            } else {
                                updatedDiashow.firstChange = true;
                            }
                        } else {
                            console.log('Invalid setOrder');
                            return;
                        }
                        break;
                default:
                    console.log('Invalid order');
                    return;
            }
            console.log('selectedItem:', selectedItem);
            const link = selectedItem.text;
            console.log('link:', link);
            if (link.startsWith("https://raw")) {
                const css = `@import url("${link}");`;
                VencordNative.quickCss.set(css);
            }
            store.put(updatedDiashow);
            const themeBoxes = document.querySelectorAll(".theme-box");
            themeBoxes.forEach((themeBox) => {
                const id = themeBox.id;
                const request = indexedDB.open("BetterThemesDBStore", 1);
                request.onsuccess = function(event) {
                    console.log('IndexedDB request successful');
                    const db = (event.target as IDBOpenDBRequest).result;
                    const transaction = db.transaction(["BetterThemesDB"], 'readwrite');
                    const objectStore = transaction.objectStore("BetterThemesDB");
                    const getRequest = objectStore.get(id);
                    getRequest.onsuccess = function(event) {
                        if (event.target) {
                            const data = getRequest.result;
                            const htmlThemeBox = themeBox as HTMLElement;
                            if (htmlThemeBox.id === selectedItem.id) {
                                htmlThemeBox.style.border = '3px solid #00aaff';
                                data.border = '3px solid #00aaff';
                            } else {
                                htmlThemeBox.style.border = '';
                                data.border = '';
                            }
                            const putRequest = objectStore.put(data);
                            putRequest.onerror = function(e) {
                                if (e.target && (e.target as IDBRequest).error) {
                                    const error = (e.target as IDBRequest).error;
                                    if (error) {
                                        console.log('Error', error.name);
                                    }
                                }
                            };
                        }
                    };
                };
            });
        };
    };
}

changeThemeByDay();

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

function changeThemeByWeek() {
    const currentWeek = getWeekNumber(new Date());
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "active" && diashow.time) {
            if (diashow.time === '1w') {
                if (!diashow.lastChange || getWeekNumber(new Date(diashow.lastChange)) !== currentWeek) {
                    updateTheme();
                    diashow.lastChange = new Date();
                    const putRequest = store.put(diashow);
                    putRequest.onsuccess = function() {
                        console.log('diashow.lastChange has been updated in IndexedDB');
                    };
                    putRequest.onerror = function() {
                        console.error('Failed to update diashow.lastChange in IndexedDB', putRequest.error);
                    };
                }
            }
        }
    };
}

changeThemeByWeek();

const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const targetElement2 = document.querySelector(".vc-settings-card.vc-text-selectable.cardPrimary__1ee6a.card__4dc22");
            const targetElement = document.querySelector(".vc-settings-quick-actions-card.cardPrimary__1ee6a.card__4dc22");
            const buttonElement = document.querySelector(".input__3e05b");
            if (targetElement && !targetElement.classList.contains('boxes-spawned')) {
                if (!buttonElement && !targetElement.querySelector(".online-themes2")) {
                    addBox(targetElement);
                }
                if (!buttonElement) {
                    spawnBoxes();
                    targetElement.classList.add('boxes-spawned');
                }
            }
        }
    }
});

//MARK:DIASHOW START FUNCTION END




//MARK:ONLINE THEMES
    const transaction5 = db.transaction(["BetterThemesDB"], "readwrite");
    const store5 = transaction5.objectStore("BetterThemesDB");
    const tryOutTime = {
        id: "tryOutTime",
        time: "5s",
        trueTime: 0
    };
    const addRequest = store5.add(tryOutTime);
    addRequest.onsuccess = function() {
        console.log("tryOutTime added successfully");
    };
    addRequest.onerror = function() {
    };

observer.observe(document.body, { childList: true, subtree: true });
    const observer2 = new MutationObserver((mutationsList, observer2) => {
        for(let mutation of mutationsList) {
            if (mutation.type === 'childList') {
const targetElement2 = document.querySelector(".vc-settings-card.vc-text-selectable.cardPrimary__1ee6a.card__4dc22");
if (targetElement2 && !targetElement2.querySelector(".online-themes")) {
    addBox4(targetElement2, null);
}
            }
        }
    });

    observer2.observe(document.body, { childList: true, subtree: true });

               startDiashow1();
    }
});



const observer4 = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
        if(mutation.addedNodes.length) {
            const targetElement3 = document.querySelector(".vc-settings-card.vc-text-selectable.cardPrimary__1ee6a.card__4dc22");
            if(targetElement3 && !targetElement3.querySelector('.divider_vc4')) {
const descriptionElement4 = document.createElement("div");
descriptionElement4.classList.add("description_vc4");
descriptionElement4.innerHTML = "This is a preselection of the most popular Themes from \u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0. You can quickly find Themes that matches your <br>style. Try them out and add them instantly to your local Themes with only one klick, instead of picking them from the website.<br>Hover over the info-icon to see the most relevant information about a Theme.";
descriptionElement4.style.color = "white";
descriptionElement4.style.fontSize = "11px";
descriptionElement4.style.position = "absolute";
descriptionElement4.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
descriptionElement4.style.fontWeight = "400";
descriptionElement4.style.lineHeight = "15px";
descriptionElement4.style.textAlign = "center";
descriptionElement4.style.top = "5px";

targetElement3.appendChild(descriptionElement4);

    let link1 = document.createElement('a');
    link1.classList.add('link_3');
    link1.setAttribute('role', 'link');
    link1.setAttribute('target', '_blank');
    link1.setAttribute('href', 'https://betterdiscord.app/themes');
    link1.style.marginRight = '0.5em';
    link1.textContent = 'BetterDiscord Themes';
    link1.style.position = 'absolute';
    link1.style.top = '6px';
    link1.style.left = '287px';
    link1.style.fontSize = "12px";

    targetElement3.appendChild(link1);
                const dividerElement4 = document.createElement("div");
                dividerElement4.classList.add("divider_vc4");
                dividerElement4.style.width = "120%";
                dividerElement4.style.height = "1px";
                dividerElement4.style.borderTop = "thin solid white";
                dividerElement4.style.scale = "1.05"
                dividerElement4.style.marginTop = "40px";

                targetElement3.appendChild(dividerElement4);
            }
        }
    }
});

observer4.observe(document, { childList: true, subtree: true });

let createdBoxIds = new Set();

async function addBox4(targetElement2, startingId) {
    let id = startingId ?? "1";
    let author;
    let name;
    if (!document.querySelector(".online-themes")) {
        createdBoxIds.clear();
    }
    const response = await fetch('https://raw.githubusercontent.com/MarryisHotter/VCPlugin/main/ThemeAmount');
    const maxId = await response.text();
    for (let currentId = Number(id); currentId <= Number(maxId); currentId++) {
        if (createdBoxIds.has(currentId)) {
            continue;
        }
        createdBoxIds.add(currentId);
        const boxElement2 = document.createElement("div");
        boxElement2.classList.add("online-themes");
        boxElement2.style.backgroundColor = "invisible";
        boxElement2.style.width = "173px";
        boxElement2.style.height = "116px";
        boxElement2.style.position = "absolute";
        boxElement2.style.marginTop = "-88px";
        boxElement2.style.marginLeft = "-1px";
        boxElement2.style.scale= "1.023";
        boxElement2.style.zIndex = "1";
        await fetch(`https://raw.githubusercontent.com/MarryisHotter/VCPlugin/main/OnlineTheme${currentId}`)
        .then(response => response.json())
        .then((data) => {
            boxElement2.style.backgroundImage = `url(${data.image})`;
            boxElement2.dataset.id = `${currentId}`;
            boxElement2.style.backgroundPosition = "center";
            boxElement2.style.backgroundSize = "contain";
            boxElement2.style.backgroundRepeat = "no-repeat";
            author = data.author;
            name = data.name;
        })
        .catch(error => {
            console.error("Error setting background image:", error);
        });
        const onlineThemePreviewbox = document.createElement("div");
        onlineThemePreviewbox.classList.add("online-theme-previewbox");
        onlineThemePreviewbox.style.position = "relative";
        onlineThemePreviewbox.style.display = "flex";
        onlineThemePreviewbox.style.justifyContent = "center";
        onlineThemePreviewbox.style.alignItems = "center";
        onlineThemePreviewbox.style.height = "190px";
        onlineThemePreviewbox.style.width = "180px";
        onlineThemePreviewbox.style.backgroundColor = "#2b2b30";
        onlineThemePreviewbox.style.marginTop = "-10px";
        onlineThemePreviewbox.style.marginLeft = "-7px";
        onlineThemePreviewbox.style.borderRadius = "5px";
        onlineThemePreviewbox.style.border = "2px solid black";

        onlineThemePreviewbox.appendChild(boxElement2);
        targetElement2.appendChild(onlineThemePreviewbox);
    }
    const onlineThemePreviewbox = document.querySelectorAll(".online-theme-previewbox");
    onlineThemePreviewbox.forEach((onlineThemePreviewbox) => {
        if (!onlineThemePreviewbox.querySelector("input[type='text']")) {
            const textInput = document.createElement("input");
            textInput.type = "text";
            textInput.readOnly = true;
            textInput.value = "by " + author;
            textInput.style.width = "200px";
            textInput.classList.add("inputtext");
            textInput.style.position = "absolute";
            textInput.style.height = "15px";
            textInput.style.color = "white";
            textInput.style.fontSize = "12px";
            textInput.style.textAlign = "start";
            textInput.style.background = "none";
            textInput.style.border = "none";
            textInput.style.left = "5px";
            textInput.style.top = "115px";
            textInput.style.fontSize = "11px";
            textInput.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
            textInput.style.fontWeight = "100";

        onlineThemePreviewbox.appendChild(textInput);

        const textInput2 = document.createElement("input");
        textInput2.classList.add("inputtext2");
        textInput2.type = "text";
        textInput2.value = name;
        textInput2.style.width = "130px";
        textInput2.style.position = "relative";
        textInput2.style.height = "15px";
        textInput2.style.color = "white";
        textInput2.style.fontSize = "12px";
        textInput2.style.textAlign = "start";
        textInput2.style.background = "none";
        textInput2.style.border = "none";
        textInput2.style.left = "-18px";
        textInput2.style.top = "16px";
        textInput2.style.fontSize = "13px";
        textInput2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        textInput2.style.fontWeight = "900";
        textInput2.style.whiteSpace = "nowrap";
        textInput2.style.overflow = "hidden";
        textInput2.style.textOverflow = "ellipsis";
        
        onlineThemePreviewbox.appendChild(textInput2);



            const addButton = document.createElement("div");
            addButton.classList.add("add-button");
            addButton.textContent = "Add";
            addButton.style.width = "50px";
            addButton.style.height = "20px";
            addButton.style.backgroundColor = "#28a836";
            addButton.style.color = "white";
            addButton.style.textAlign = "center";
            addButton.style.lineHeight = "30px";
            addButton.style.borderRadius = "3px";
            addButton.style.position = "absolute";
            addButton.style.fontSize = "11px";
            addButton.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
            addButton.style.display = "flex";
            addButton.style.alignItems = "center";
            addButton.style.justifyContent = "center";
            addButton.style.marginTop = "0px";
            addButton.style.left = "116px";
            addButton.style.top = "165px";

function darkenColor3(color, percentage) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const newR = Math.round(r * (100 - percentage) / 100);
    const newG = Math.round(g * (100 - percentage) / 100);
    const newB = Math.round(b * (100 - percentage) / 100);
    const newHex = "#" + newR.toString(16) + newG.toString(16) + newB.toString(16);
    return newHex;
}

            addButton.addEventListener("mouseover", () => {
                addButton.style.backgroundColor = darkenColor3("#28a836", 20);
                addButton.style.cursor = "pointer";
});

addButton.addEventListener("mouseout", () => {
    addButton.style.backgroundColor = "#28a836";
    addButton.style.cursor = "default";
});

            addButton.addEventListener("click", (event) => {
                const boxElement2 = (event.currentTarget as HTMLElement).parentElement;
                const currentId2 = boxElement2?.dataset.id;
                fetch(`https://raw.githubusercontent.com/MarryisHotter/VCPlugin/main/OnlineTheme${currentId2}`)
                .then(response => response.json())
                .then((image) => {
                    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                    const store = transaction.objectStore("BetterThemesDB");
                    store.add(image);
                    console.log("JSON data imported successfully!");
                })
                .then(() => {
                    const textTransaction = db.transaction(["BetterThemesDB"]);
                    const textStore = textTransaction.objectStore("BetterThemesDB");
                    const textRequest = textStore.get(currentId2);
                    textRequest.onsuccess = function() {
                        const text = textRequest.result?.text;
                        if (text) {
                            VencordNative.quickCss.set(`@import url("${text}");`);
                        }
                    };
                })
                .catch(error => {
                    console.error("Error importing JSON data:", error);
                });
            });

            const boxElements4 = document.querySelectorAll(".online-themes");
            boxElements4.forEach((boxElement2) => {
                       boxElement2.appendChild(addButton);
                    });

           const tryButton = document.createElement("button");
           tryButton.classList.add("try-button");
           tryButton.textContent = "Try out";
           tryButton.style.width = "60px";
           tryButton.style.height = "20px";
           tryButton.style.backgroundColor = "#4e4e4e";
           tryButton.style.color = "white";
           tryButton.style.textAlign = "center";
           tryButton.style.position = "absolute";
           tryButton.style.marginTop = "120px";
           tryButton.style.marginLeft = "55px";
           tryButton.style.borderRadius = "3px";
           tryButton.style.fontSize = "11px";
           tryButton.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
           tryButton.style.display = "flex";
           tryButton.style.alignItems = "center";
           tryButton.style.justifyContent = "center";
           tryButton.style.top = "45px";
           tryButton.style.left = "-47px";

            tryButton.addEventListener("mouseover", () => {
                tryButton.style.backgroundColor = darkenColor3("4e4e4e", 30);
                tryButton.style.cursor = "pointer";
            });

            tryButton.addEventListener("mouseout", () => {
                tryButton.style.backgroundColor = "4e4e4e";
                tryButton.style.cursor = "default";
           });

           let activeInterval: number | null = null;
           let currentUrl: string | null = null;
           let initialUrl: string | null = null;

           tryButton.addEventListener("click", async (event) => {
               event.stopPropagation();
            const parentElement = tryButton.parentElement;
            const currentId = parentElement?.dataset.id;
            const currentImport = await VencordNative.quickCss.get();
               if (typeof currentImport === 'string') {
                const match = currentImport.match(/url\("(.*)"\)/);
                currentUrl = match ? match[1] : '';
                   fetch(`https://raw.githubusercontent.com/MarryisHotter/VCPlugin/main/OnlineTheme${currentId}`)
                   .then(response => response.json())
                   .then(async (image) => {
                       let css = '';
                       if (image?.text) {
                           css += `@import url("${image.text}");\n`;
                       }
                       if (image && image.CSS) {
                           css += image.CSS;
                       }
                       await VencordNative.quickCss.set(css);
                       console.log('New CSS set:', css);
                       const timeTransaction = db.transaction(["BetterThemesDB"], "readwrite");
                       const timeStore = timeTransaction.objectStore("BetterThemesDB");
                       const timeRequest = timeStore.get("tryOutTime");
                       timeRequest.onsuccess = function() {
                           const tryOutTime = timeRequest.result;
                           if (tryOutTime && tryOutTime.time) {
                               if (tryOutTime.trueTime === 0) {
                                   initialUrl = currentUrl;
                                   let timeInMilliseconds = parseFloat(tryOutTime.time) * 1000;
                                   tryOutTime.trueTime = timeInMilliseconds;
                                   timeStore.put(tryOutTime);
                                   console.log('Try out time:', timeInMilliseconds);
                               } else {
                                   tryOutTime.trueTime = parseFloat(tryOutTime.time) * 1000;
                                   timeStore.put(tryOutTime);
                                   console.log('Try out time increased:', tryOutTime.trueTime);
                                   return;
                               }
                               if (!activeInterval) {
                                activeInterval = window.setInterval(async function() {
                                    const timeTransaction = db.transaction(["BetterThemesDB"], "readwrite");
                                    const timeStore = timeTransaction.objectStore("BetterThemesDB");
                                    const timeRequest = timeStore.get("tryOutTime");
                                    timeRequest.onsuccess = async function() {
                                        const tryOutTime = timeRequest.result;
                                        if (tryOutTime && tryOutTime.trueTime > 0) {
                                            tryOutTime.trueTime -= 1000;
                                            timeStore.put(tryOutTime);
                                        } else if (tryOutTime.trueTime === 0) {
                                            if (currentImport) {
                                                await VencordNative.quickCss.set(currentImport);
                                                console.log('Old CSS set:', currentImport);
                                            } else {
                                                await VencordNative.quickCss.set('');
                                                console.log('CSS link removed');
                                            }
                                            if (activeInterval !== null) {
                                                clearInterval(activeInterval);
                                                activeInterval = null;
                                            }
                                        }
                                    };
                                }, 1000);
                                   console.log('New interval set');
                               }
                           }
                       };
                   });
               } else {
                   console.error('currentImport is not a string:', currentImport);
               }
           });


const boxElements3 = document.querySelectorAll(".online-themes");
boxElements3.forEach((boxElement2) => {
           boxElement2.appendChild(tryButton);
        });

const transaction1 = db.transaction(["BetterThemesDB"], "readwrite");
const store1 = transaction1.objectStore("BetterThemesDB");
const request1 = store1.get("tryOutTime");
request1.onsuccess = function() {
    const tryOutTime = request1.result;
    const timeButton1 = document.createElement("button");
    timeButton1.classList.add("time-button1");
    timeButton1.textContent = "5s";
    timeButton1.style.width = "25px";
    timeButton1.style.height = "20px";
    timeButton1.style.backgroundColor = "#4e4e4e";
    timeButton1.style.color = "white";
    timeButton1.style.textAlign = "center";
    timeButton1.style.position = "absolute";
    timeButton1.style.top = "135px";
    timeButton1.style.left = "5px";
    timeButton1.style.borderRadius = "50px 0px 0px 50px";
    timeButton1.style.border = "1px solid black";
    timeButton1.style.fontSize = "11px";
    timeButton1.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    timeButton1.style.display = "flex";
    timeButton1.style.scale= "0.9";
    timeButton1.style.alignItems = "center";
    timeButton1.style.justifyContent = "center";
    if (tryOutTime && tryOutTime.time === "5s") {
        const timeButtons1 = document.querySelectorAll(".time-button1");
        timeButtons1.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });
    }

    timeButton1.addEventListener("click", () => {
        timeButton1.classList.add("clicked");
        const timeButtons1 = document.querySelectorAll(".time-button1");
        timeButtons1.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });
        const timeButtons = document.querySelectorAll(".time-button2, .time-button3");
        timeButtons.forEach(otherButton => {
            if (otherButton !== timeButton1) {
                const htmlButton = otherButton as HTMLElement;
                htmlButton.style.backgroundColor = "#4e4e4e";
                otherButton.classList.remove("clicked");
            }
        });
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB")
        const tryOutTime = { id: "tryOutTime", time: "5s", trueTime: 0};
        store.put(tryOutTime);
    });

    timeButton1.addEventListener("mouseover", () => {
        if (!timeButton1.classList.contains("clicked")) {
            const timeButtons1 = document.querySelectorAll(".time-button1");
            timeButtons1.forEach(button => {
                const htmlButton = button as HTMLElement;
                htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
            });
        }
        timeButton1.style.cursor = "pointer";
    });

    timeButton1.addEventListener("mouseout", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("tryOutTime");
        request.onsuccess = function() {
            const tryOutTime = request.result;
            if (!timeButton1.classList.contains("clicked") && (!tryOutTime || tryOutTime.time !== "5s")) {
                const timeButtons1 = document.querySelectorAll(".time-button1");
                timeButtons1.forEach(button => {
                    const htmlButton = button as HTMLElement;
                    htmlButton.style.backgroundColor = "#4e4e4e";
                });
            }
        }
        timeButton1.style.cursor = "default";
    });

    onlineThemePreviewbox.appendChild(timeButton1);
};

const transaction2 = db.transaction(["BetterThemesDB"], "readwrite");
const store2 = transaction2.objectStore("BetterThemesDB");
const request2 = store2.get("tryOutTime");
request2.onsuccess = function() {
    const tryOutTime = request2.result;
    const timeButton2 = document.createElement("button");
    timeButton2.classList.add("time-button2");
    timeButton2.textContent = "30s";
    timeButton2.style.width = "25px";
    timeButton2.style.height = "20px";
    timeButton2.style.backgroundColor = "#4e4e4e";
    timeButton2.style.color = "white";
    timeButton2.style.textAlign = "center";
    timeButton2.style.position = "absolute";
    timeButton2.style.top = "135px";
    timeButton2.style.left = "26px";
    timeButton2.style.borderRadius = "0px 0px 0px 0px";
    timeButton2.style.border = "1px solid black";
    timeButton2.style.fontSize = "11px";
    timeButton2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    timeButton2.style.display = "flex";
    timeButton2.style.scale= "0.9";
    timeButton2.style.alignItems = "center";
    timeButton2.style.justifyContent = "center";
    if (tryOutTime && tryOutTime.time === "30s") {
        const timeButtons2 = document.querySelectorAll(".time-button2");
        timeButtons2.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });
    }

    timeButton2.addEventListener("click", () => {
        timeButton2.classList.add("clicked");
        const timeButtons2 = document.querySelectorAll(".time-button2");
        timeButtons2.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });

        const timeButtons = document.querySelectorAll(".time-button1, .time-button3");
        timeButtons.forEach(otherButton => {
            if (otherButton !== timeButton2) {
                const htmlButton = otherButton as HTMLElement;
                htmlButton.style.backgroundColor = "#4e4e4e";
                htmlButton.classList.remove("clicked");
            }
        });

        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const tryOutTime = { id: "tryOutTime", time: "30s", trueTime: 0 };
        store.put(tryOutTime);
    });

    timeButton2.addEventListener("mouseover", () => {
        if (!timeButton2.classList.contains("clicked")) {
            const timeButtons2 = document.querySelectorAll(".time-button2");
            timeButtons2.forEach(button => {
                const htmlButton = button as HTMLElement;
                htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
            });
        }
        timeButton2.style.cursor = "pointer";
    });

    timeButton2.addEventListener("mouseout", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("tryOutTime");
        request.onsuccess = function() {
            const tryOutTime = request.result;
if (!timeButton2.classList.contains("clicked") && (!tryOutTime || tryOutTime.time !== "30s")) {
    const timeButtons2 = document.querySelectorAll(".time-button2");
    timeButtons2.forEach(button => {
        const htmlButton = button as HTMLElement;
        htmlButton.style.backgroundColor = "#4e4e4e";
    });
}
        }
        timeButton2.style.cursor = "default";
    });

    onlineThemePreviewbox.appendChild(timeButton2);
};

const transaction3 = db.transaction(["BetterThemesDB"], "readwrite");
const store3 = transaction3.objectStore("BetterThemesDB");
const request3 = store3.get("tryOutTime");
request3.onsuccess = function() {
    const tryOutTime = request3.result;
    const timeButton3 = document.createElement("button");
    timeButton3.classList.add("time-button3");
    timeButton3.textContent = "5m";
    timeButton3.style.width = "25px";
    timeButton3.style.height = "20px";
    timeButton3.style.backgroundColor = "#4e4e4e";
    timeButton3.style.color = "white";
    timeButton3.style.textAlign = "center";
    timeButton3.style.position = "absolute";
    timeButton3.style.top = "135px";
    timeButton3.style.left = "48px";
    timeButton3.style.borderRadius = "0px 50px 50px 0px";
    timeButton3.style.border = "1px solid black";
    timeButton3.style.fontSize = "11px";
    timeButton3.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    timeButton3.style.display = "flex";
    timeButton3.style.scale= "0.9";
    timeButton3.style.alignItems = "center";
    timeButton3.style.justifyContent = "center";
    if (tryOutTime && tryOutTime.time === "300s") {
        const timeButtons3 = document.querySelectorAll(".time-button3");
        timeButtons3.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });
    }

    timeButton3.addEventListener("click", () => {
        timeButton3.classList.add("clicked");
        const timeButtons3 = document.querySelectorAll(".time-button3");
        timeButtons3.forEach(button => {
            const htmlButton = button as HTMLElement;
            htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
        });
        const timeButtons = document.querySelectorAll(".time-button1, .time-button2");
        timeButtons.forEach(otherButton => {
            if (otherButton !== timeButton3) {
                const htmlButton = otherButton as HTMLElement;
                htmlButton.style.backgroundColor = "#4e4e4e";
                htmlButton.classList.remove("clicked");
            }
        });

const transaction = db.transaction(["BetterThemesDB"], "readwrite");
const store = transaction.objectStore("BetterThemesDB");
const getRequest = store.get("tryOutTime");
getRequest.onsuccess = function() {
    const currentTryOutTime = getRequest.result;
    const updatedTryOutTime = {
        ...currentTryOutTime,
        id: "tryOutTime",
        time: "300s",
        trueTime: currentTryOutTime && currentTryOutTime.trueTime !== undefined ? currentTryOutTime.trueTime : 0
    };
    store.put(updatedTryOutTime);
};
    });

    timeButton3.addEventListener("mouseover", () => {
        if (!timeButton3.classList.contains("clicked")) {
            const timeButtons3 = document.querySelectorAll(".time-button3");
            timeButtons3.forEach(button => {
                const htmlButton = button as HTMLElement;
                htmlButton.style.backgroundColor = darkenColor3("#4e4e4e", 30);
            });
        }
        timeButton3.style.cursor = "pointer";
    });

    timeButton3.addEventListener("mouseout", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("tryOutTime");
        request.onsuccess = function() {
            const tryOutTime = request.result;
if (!timeButton3.classList.contains("clicked") && (!tryOutTime || tryOutTime.time !== "5m")) {
    const timeButtons3 = document.querySelectorAll(".time-button3");
    timeButtons3.forEach(button => {
        const htmlButton = button as HTMLElement;
        htmlButton.style.backgroundColor = "#4e4e4e";
    });
}
        }
        timeButton3.style.cursor = "default";
    });
    onlineThemePreviewbox.appendChild(timeButton3);
};


const infoBox = document.createElement("div");
infoBox.classList.add("info-box");
infoBox.style.width = "16px";
infoBox.style.height = "16px";
infoBox.style.background = "#2c2c2c";
infoBox.style.position = "absolute";
infoBox.style.top = "105px";
infoBox.style.left = "108px";
infoBox.style.marginTop = "7px";
infoBox.style.marginLeft = "35px";
infoBox.style.zIndex = "1000";
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css';

document.head.appendChild(link);

const icon = document.createElement('i');
icon.classList.add("info-icon");
icon.style.color = '#0025c9';
icon.style.border = '1px solid black';

infoBox.appendChild(icon);

infoBox.innerHTML = '<i class="fas fa-info-circle"></i>';
infoBox.style.display = "flex";
infoBox.style.justifyContent = "center";
infoBox.style.alignItems = "center";
infoBox.style.color = "white";
infoBox.style.fontSize = "22px";
infoBox.style.fontWeight = "400";
infoBox.style.scale = "0.7";
infoBox.style.borderRadius = "1px solid black";
infoBox.style.zIndex = "2";
infoBox.style.border = "absolute";

const boxElements2 = document.querySelectorAll(".online-themes");
boxElements2.forEach((boxElement2) => {
    const clonedInfoBox = infoBox.cloneNode(true);
    clonedInfoBox.addEventListener("mouseenter", InfoSpawn);
    clonedInfoBox.addEventListener("mouseleave", function() {
        setTimeout(() => {
            const infoBoxInfo = document.querySelector(".info-box-info");
            if (infoBoxInfo && !infoBoxInfo.matches(":hover")) {
                infoBoxInfo.remove();
            }
        }, 100);
    });
    boxElement2.appendChild(clonedInfoBox);
});

function InfoSpawn(event) {
    const target = (event.target as HTMLElement).closest('.online-themes');
    let currentId;
    if (!target) {
        console.log('No .online-themes element found for target');
        return;
    }
    const infoBoxInfo = document.createElement("div");
    infoBoxInfo.classList.add("info-box-info");

    infoBoxInfo.addEventListener("mouseleave", function() {
        infoBoxInfo.remove();
    });

    if (target.parentElement) {
        target.parentElement.appendChild(infoBoxInfo);
    }
if (target) {
    const htmlTarget = target as HTMLElement;
    if (htmlTarget.dataset.id) {
        currentId = htmlTarget.dataset.id;

    } else {
        console.log('No data-id found on target');
    }
}

    infoBoxInfo.classList.add("info-box-info");
    infoBoxInfo.style.width = "300px";
    infoBoxInfo.style.height = "100px";
    infoBoxInfo.style.backgroundColor = "#151515";
    infoBoxInfo.style.position = "absolute";
    infoBoxInfo.style.zIndex = "1000";
    infoBoxInfo.style.borderRadius = "5px";
    infoBoxInfo.style.top = `${infoBox.offsetTop - 103}px`;
    infoBoxInfo.style.left = `${infoBox.offsetLeft - 150}px`;
    infoBoxInfo.style.display = "flex";
    infoBoxInfo.style.flexDirection = "column";
    infoBoxInfo.style.justifyContent = "center";
    infoBoxInfo.style.alignItems = "center";
    infoBoxInfo.style.textAlign = "center";
    infoBoxInfo.style.marginTop = "105px";
    infoBoxInfo.style.marginLeft = "110px";
    infoBoxInfo.style.fontSize = "12px";
    const url = `https://raw.githubusercontent.com/MarryisHotter/VCPlugin/main/OnlineTheme${currentId}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            infoBoxInfo.textContent = `This Theme was created by ${data.contributors} and you can find their theme here: `;
            infoBoxInfo.style.color = "white";
            let link = document.createElement('a');
            link.href = data.source;
            link.textContent = `${data.source}`;
            link.style.textAlign = "center";
            link.style.whiteSpace = "pre-wrap";
            link.style.overflowWrap = "break-word";
            link.style.wordBreak = "break-all";

            infoBoxInfo.appendChild(link);
        })
        .catch(error => console.error('Error:', error));
}

            infoBox.addEventListener("mouseleave", function() {
                const infoBoxInfo = document.querySelector(".info-box-info");
                if (infoBoxInfo && !infoBoxInfo.matches(":hover")) {
                    infoBoxInfo.remove();
                }
            });

            const infoBoxInfo = document.querySelector(".info-box-info");
            if (infoBoxInfo) {
                infoBoxInfo.addEventListener("mouseleave", function() {
                    infoBoxInfo.remove();
                });
            }

            infoBox.addEventListener("mouseenter", InfoSpawn);
        };



        function applyStyles3() {
            let inputElement = document.querySelector('.input__3e05b');
            if (!inputElement) {
                let newElement3 = document.querySelector('.h5__28baa.eyebrow__4e5bb.defaultMarginh5__6e314');
                if (newElement3) {
                    newElement3.remove();
                }
            }
        }

let observer3 = new MutationObserver(applyStyles3);
observer3.observe(document, { childList: true, subtree: true });

function applyStyles2() {
    let inputElement = document.querySelector('.input__3e05b');
    if (!inputElement) {
        let newElement3 = document.querySelector('.inputDefault__22335.input_f27786.textArea__6e373.scrollbarDefault__3545a.scrollbar_b61b2b.textarea__0461c.inputDefault__22335.input_f27786.vc-settings-theme-links');
        if (newElement3) {
            newElement3.remove();
        }
        let newElement4 = document.querySelector('.colorStandard__3d599.size14_b2af01.default_fe8929.formText__20efd.modeDefault__2e882');
        if (newElement4) {
            newElement4.remove();
        }
    }
}

let observer2 = new MutationObserver(applyStyles2);
observer2.observe(document, { childList: true, subtree: true });

function applyStyles() {
    let newElement1 = document.querySelector('.vc-settings-card.vc-text-selectable.cardPrimary__1ee6a.card__4dc22');
    if (newElement1) {
        const htmlElement1 = newElement1 as HTMLElement;
        htmlElement1.style.position = 'relative';
        htmlElement1.style.display = 'flex';
        htmlElement1.style.padding = '1em';
        htmlElement1.style.gap = '53px';
        htmlElement1.style.alignItems = 'center';
        htmlElement1.style.flexGrow = '1';
        htmlElement1.style.flexFlow = 'row wrap';
    }
    let newElement2 = document.querySelector('.h5__28baa.eyebrow__4e5bb.defaultMarginh5__6e314');
    if (newElement2) {
        const htmlElement2 = newElement2 as HTMLElement;
        htmlElement2.style.display = 'none';
    }
}

let observer = new MutationObserver(applyStyles);

observer.observe(document, { childList: true, subtree: true });
})}
//MARK:LOCAL THEMES TAB
function addBox2(targetElement, id, image, text, style) {
    const boxElement = document.createElement("div");
    boxElement.id = id;
    boxElement.classList.add("theme-box");
    const transaction1 = db.transaction(["BetterThemesDB"]);
    const store1 = transaction1.objectStore("BetterThemesDB");
    const request1 = store1.get("regulator");
    request1.onsuccess = function() {
        const regulator = request1.result;
        if (regulator && regulator.value) {
            const scaleValue = regulator.value;
            const newWidth = (scaleValue / 100) * 200;
            const newHeight = (scaleValue / 100) * 112;
            boxElement.style.width = `${newWidth}px`;
            boxElement.style.height = `${newHeight}px`;
        } else {
            boxElement.style.width = "200px";
            boxElement.style.height = "112px";
        }
    };
    boxElement.style.backgroundColor = "blue";
    boxElement.style.marginTop = "20px";
    boxElement.style.marginRight = "20px";
    boxElement.style.borderRadius = "5px"
    boxElement.style.zIndex = '1000';
    boxElement.style.pointerEvents = 'auto';
    boxElement.style.backgroundImage = `url(${image})`;
    boxElement.style.backgroundSize = "cover";
    boxElement.style.backgroundPosition = "center";
    boxElement.dataset.id = id;

boxElement.addEventListener("click", () => {
    if (isHoveringDelete === false) {
        const inputElement = document.querySelector(".online-themes2");
        if (inputElement) {
            const htmlInputElement = inputElement as HTMLInputElement;
            htmlInputElement.value = text;
            const htmlElement = inputElement as HTMLElement;
            htmlElement.style.border = style;
        }
    }
});

boxElement.addEventListener("click", () => {
    if (isHoveringDelete === false) {
        if (text.startsWith("https://raw")) {
            let css = `@import url("${text}");\n`;
            const transaction = db.transaction(["BetterThemesDB"], "readonly");
            const store = transaction.objectStore("BetterThemesDB");
            const getRequest = store.get(id);
            getRequest.onsuccess = function() {
                const data = getRequest.result;
                if (data && data.CSS) {
                    css += data.CSS;
                }
                VencordNative.quickCss.set(css);
            };
            getRequest.onerror = function(e) {
                console.log('Error', e.target.error.name);
            };
        }
    }
const boxes = document.querySelectorAll(".theme-box");
boxes.forEach(box => {
    const htmlBox = box as HTMLElement;
    if (htmlBox !== boxElement) {
        if (htmlBox.style.border !== "3px solid red") {
            htmlBox.style.border = "none";
            const transaction = db.transaction(["BetterThemesDB"], "readwrite");
            const store = transaction.objectStore("BetterThemesDB");
            const getRequest = store.get(htmlBox.dataset.id);
            getRequest.onsuccess = function() {
                const data = getRequest.result;
                if (data) {
                    if (data.border !== "3px solid red") {
                        data.border = "none";
                        const putRequest = store.put(data);
                        putRequest.onerror = function(e) {
                            console.log('Error', e.target.error.name);
                        }
                    }
                }
            };
        }
    }
});
        boxElement.style.border = "3px solid #00aaff";
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const getRequest = store.get(boxElement.dataset.id);
        getRequest.onsuccess = function() {
            const data = getRequest.result;
            if (data) {
                data.border = "3px solid #00aaff";
                const putRequest = store.put(data);
                putRequest.onerror = function(e) {
                    console.log('Error', e.target.error.name);
                }
            }
        };
    });

    boxElement.addEventListener("mouseover", () => {
        boxElement.style.cursor = "pointer";
        const purpleSquare = document.createElement("div");
        const existingPurpleSquare = boxElement.querySelector(".purple-square");
        if (!existingPurpleSquare) {
            purpleSquare.classList.add("purple-square");
            purpleSquare.style.backgroundColor = "#f44236";
            purpleSquare.style.color = "white";
            purpleSquare.style.width = "15px";
            purpleSquare.style.height = "15px";
            purpleSquare.style.position = "relative";
            purpleSquare.style.bottom = "0";
            purpleSquare.style.left = "calc(100% - 15px)";
            purpleSquare.style.backgroundImage = `url(https://i.imgur.com/LLyQigR.png)`;
            purpleSquare.style.backgroundSize = "contain";
            purpleSquare.style.backgroundRepeat = "no-repeat";
            purpleSquare.style.backgroundPosition = "center top";
            purpleSquare.style.borderRadius = "2px 5px 2px 2px";

            boxElement.appendChild(purpleSquare);
            boxElement.appendChild(purpleSquare);
        }

    purpleSquare.addEventListener('mouseover', function() {
        isHoveringDelete = true;
    });

    purpleSquare.addEventListener('mouseout', function() {
        isHoveringDelete = false;
    });

    boxElement.addEventListener("mouseout", (event) => {
        if (event.relatedTarget === purpleSquare) {
            return;
        }
        purpleSquare.remove();
    });
});

    const transaction = db.transaction(["BetterThemesDB"]);
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get(boxElement.dataset.id);
    request.onsuccess = function() {
        const savedBorderStyle = request.result;
        if (savedBorderStyle && savedBorderStyle.border) {
            boxElement.style.border = savedBorderStyle.border;
        }
    };
    const vcSettingsThemeGrid = document.querySelector(".wrapper2");
    if (vcSettingsThemeGrid) {
        vcSettingsThemeGrid.appendChild(boxElement);
    }
}

const spawnBoxes = () => {
    const transaction = db.transaction(["BetterThemesDB"]);
    const store = transaction.objectStore("BetterThemesDB");
    store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            if (/^\d+$/.test(cursor.value.id)) {
                const targetElement = document.querySelector(".vc-settings-quick-actions-card.cardPrimary__1ee6a.card__4dc22");
                const style = {};
                addBox2(targetElement, cursor.value.id, cursor.value.image, cursor.value.text, style);
            }
            cursor.continue();
        }
    };
};

function addEventListeners(element, textValue, inputElement) {
    element.addEventListener("click", () => {
        inputElement.value = textValue;
    });

    element.addEventListener("click", () => {
        if (textValue.startsWith("https://raw")) {
            const css = `@import url("${textValue}");`;
            VencordNative.quickCss.set(css);
        }
    });
}

function addBox(targetElement) {
    const boxElement = document.createElement("div");
    boxElement.classList.add(".online-themes2");
    boxElement.style.width = "200px";
    boxElement.style.height = "112px";
    boxElement.style.border = "3px solid black";
    boxElement.style.position = "absolute";
    boxElement.style.top = "120px";
    boxElement.style.left = "19px";
    boxElement.style.borderRadius = "5px"
    boxElement.style.background = "linear-gradient(to right, #200089, #0080c5)";
let textElement = document.createElement('div');
textElement.style.display = "flex";
textElement.style.justifyContent = "center";
textElement.style.alignItems = "center";
textElement.style.width = "100%";
textElement.style.height = "100%";
textElement.style.textAlign = "center";
textElement.textContent = "Click to upload an image to use it as a theme thumbnail";
textElement.style.fontWeight = "bold";
textElement.style.scale = "0.95"

boxElement.appendChild(textElement);

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";
fileInput.addEventListener("change", (event) => {
    if (event.target) {
        const inputElement = event.target as HTMLInputElement;
        const file = inputElement.files ? inputElement.files[0] : null;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target) {
                    const result = (e.target as FileReader).result;
                    if (result) {
                        boxElement.style.backgroundImage = `url(${result})`;
                        boxElement.style.backgroundSize = "cover";
                        boxElement.textContent = "";
                        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                        const store = transaction.objectStore("BetterThemesDB");
                        store.put({ id: "imageInput", image: result });
                    }
                }
            };
            reader.readAsDataURL(file);
        } else {
            greenSquare.style.backgroundColor = "#f5c32f";
        }
    }
});

    const input = document.createElement("input");
    input.type = "text";
    input.style.color = "white";
    input.placeholder = "Enter CSS link or text here";
    input.style.width = "100%";
    input.style.marginTop = "10px";
    input.style.height = "28px";
    input.style.backgroundColor = "#272727";
    input.className = "CSSLinkInput";
    input.style.borderRadius = "10px";
    input.style.border = "2px solid black";
    input.style.paddingLeft = "5px"

input.addEventListener("input", (event) => {
    if (event.target) {
        const value = (event.target as HTMLInputElement).value;
        let borderColor = "2px solid black";
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        store.put({ id: "textInput", text: value });
        if (value.startsWith("https://raw")) {
            borderColor = "2px solid green";
        } else if (value === "") {
            borderColor = "2px solid black";
        } else {
            borderColor = "2px solid red";
        }
        store.put({ id: "borderColor", color: borderColor });
        const cssLinkInput = document.querySelector(".CSSLinkInput");
        if (cssLinkInput) {
            (cssLinkInput as HTMLElement).style.border = borderColor;
        }
    }
});

const transaction3 = db.transaction(["BetterThemesDB"]);
const store3 = transaction3.objectStore("BetterThemesDB");
const request2 = store3.get("textInput");
const colorRequest = store3.get("borderColor");
request2.onsuccess = function() {
    if (request2.result) {
        input.value = request2.result.text;
        if (input.value.startsWith("https://raw")) {
            const cssLinkInput = document.querySelector(".CSSLinkInput");
            if (cssLinkInput) {
                (cssLinkInput as HTMLElement).style.border = "2px solid green";
            }
        }
    }
};
colorRequest.onsuccess = function() {
    if (colorRequest.result) {
        const cssLinkInput = document.querySelector(".CSSLinkInput");
        if (cssLinkInput) {
            (cssLinkInput as HTMLElement).style.border = colorRequest.result.color;
        }
    }
};

const inputObserver = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'attributes') {
            const value = input.value;
            if (value.startsWith("https://raw")) {
                const cssLinkInput = document.querySelector(".CSSLinkInput");
                if (cssLinkInput) {
                    (cssLinkInput as HTMLElement).style.border = "2px solid green";
                }
            } else {
                const cssLinkInput = document.querySelector(".CSSLinkInput");
                if (cssLinkInput) {
                    (cssLinkInput as HTMLElement).style.border = "2px solid red";
                }
            }
        }
    }
});

    inputObserver.observe(input, { attributes: true, attributeFilter: ["value"] });

    const transaction = db.transaction(["BetterThemesDB"]);
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("textInput");
    request.onsuccess = function() {
        if (request.result) {
            input.value = request.result.text;
            if (input.value.startsWith("https://raw")) {
                const cssLinkInput = document.querySelector(".CSSLinkInput");
                if (cssLinkInput) {
                    (cssLinkInput as HTMLElement).style.border = "2px solid green";
                }
            }
        }
    };

    const imageTransaction = db.transaction(["BetterThemesDB"]);
    const imageStore = imageTransaction.objectStore("BetterThemesDB");
    const imageRequest = imageStore.get("imageInput");
    imageRequest.onsuccess = function() {
        if (imageRequest.result) {
            boxElement.style.backgroundImage = `url(${imageRequest.result.image})`;
            boxElement.style.backgroundSize = "cover";
            boxElement.textContent = "";

        }
    };

    const boxElement3 = document.createElement("div");
    boxElement3.classList.add("boxElement3-void");
    boxElement3.textContent = "";
    boxElement3.style.width = "200px";
    boxElement3.style.height = "112px";
    boxElement3.style.display = "flex";
    boxElement3.style.justifyContent = "center";
    boxElement3.style.alignItems = "center";
    boxElement3.style.background = "transparent";

const descriptionElement = document.createElement("div");
descriptionElement.classList.add("description_vc2");
descriptionElement.textContent = "Better Themes";
descriptionElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
descriptionElement.style.position = "absolute";
descriptionElement.style.top = "130px";
descriptionElement.style.left = "242px";
descriptionElement.style.fontSize = "18px";
descriptionElement.style.fontWeight = "600";
descriptionElement.style.position = "absolute";
descriptionElement.style.background = "linear-gradient(to right, #3100d1, #33b8ff)";
descriptionElement.style.webkitBackgroundClip = "text";
descriptionElement.style.webkitTextFillColor = "transparent";

const descriptionElement3 = document.createElement("div");
descriptionElement3.classList.add("description_vc3");
descriptionElement3.innerHTML = "Manage all your Themes here.<br>Put any Theme link into the input field above and <br>a thumbnail to the left to add a theme. You can<br>get themes from\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0or<br>or add them directly from the Online-Themes Tab. ";
descriptionElement3.style.color = "white";
descriptionElement3.style.fontSize = "12px";
descriptionElement3.style.position = "absolute";
descriptionElement3.style.top = "150px";
descriptionElement3.style.left = "243px";
descriptionElement3.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
descriptionElement3.style.fontWeight = "400";
descriptionElement3.style.lineHeight = "15px";

targetElement.appendChild(descriptionElement3);

const dividerElement2 = document.createElement("div");
dividerElement2.classList.add("divider_vc2");
dividerElement2.style.width = "100%";
dividerElement2.style.height = "1px";
dividerElement2.style.borderTop = "thin solid white";
dividerElement2.style.position = "absolute";
dividerElement2.style.top = "245px";
dividerElement2.style.scale = "0.954";

    const dividerElementvoid = document.createElement("div");
    dividerElementvoid.classList.add("divider_vc2");
    dividerElementvoid.style.width = "100%";
    dividerElementvoid.style.height = "1px";
    dividerElementvoid.style.borderTop = "";

    targetElement.appendChild(input);
    targetElement.appendChild(descriptionElement);
    targetElement.appendChild(boxElement3);
    boxElement.appendChild(fileInput);
    targetElement.appendChild(boxElement);

    boxElement.addEventListener("click", () => {
        if (isHoveringDelete === false) {
        fileInput.click();
        }
    });

    const greenSquare = document.createElement("div");
    greenSquare.classList.add("create-box");
    greenSquare.style.backgroundColor = boxElement.style.backgroundImage ? "#28a836" : "#f5c32f";
    greenSquare.style.marginTop = "20px";
    greenSquare.style.borderRadius = "3px";
    greenSquare.style.padding = "8px";
    greenSquare.style.position = "absolute";
    greenSquare.style.top = "175px";
    greenSquare.style.right = "25px";

    greenSquare.addEventListener("mouseover", () => {
        if (greenSquare.style.backgroundColor === "rgb(27, 112, 36)" || greenSquare.style.backgroundColor === "rgb(40, 168, 54)") {
            greenSquare.style.cursor = "pointer";
        } else {
            greenSquare.style.cursor = "not-allowed";
        }
        isHoveringCreate = true;
        });
    greenSquare.addEventListener("mouseout", () => {
        greenSquare.style.cursor = "default";
        isHoveringCreate = false;
    });

    function darkenColor(color, percentage) {
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const newR = Math.round(r * (100 - percentage) / 100);
        const newG = Math.round(g * (100 - percentage) / 100);
        const newB = Math.round(b * (100 - percentage) / 100);
        const newHex = "#" + newR.toString(16) + newG.toString(16) + newB.toString(16);
        return newHex;
    }

    const greenTextElement = document.createElement('div');
    greenTextElement.classList.add("textinput5");
    greenTextElement.style.display = "flex";
    greenTextElement.style.justifyContent = "center";
    greenTextElement.style.alignItems = "center";
    greenTextElement.style.width = "100%";
    greenTextElement.style.height = "100%";
    greenTextElement.style.fontWeight = "500";
    greenTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    greenTextElement.style.fontSize = "14px";
    greenTextElement.style.fontStyle = "normal";
    greenTextElement.style.textAlign = "center";
    greenTextElement.textContent = "Create Theme";
    greenTextElement.style.color = "white";

    greenSquare.appendChild(greenTextElement);

const boxObserver = new MutationObserver((mutationsList, observer) => {
    if (mutationsList.some(mutation => mutation.attributeName === "style")) {
        if (boxElement.style.backgroundImage) {
            greenSquare.style.backgroundColor = "#28a836";
        } else {
            greenSquare.style.backgroundColor = "#f5c32f";
        }
    }
});

boxObserver.observe(boxElement, { attributes: true });

    const imageObserver = new MutationObserver((mutationsList, observer) => {
        if (mutationsList.some(mutation => mutation.removedNodes.length > 0 && mutation.removedNodes[0] === boxElement)) {
            greenSquare.style.backgroundColor = "#f5c32f";
        }
    });
if (boxElement.parentNode) {
    imageObserver.observe(boxElement.parentNode, { childList: true });
}
    greenSquare.addEventListener("click", () => {
        setTimeout(() => {
    greenSquare.style.backgroundColor = "rgb(173, 139, 38)";
    greenSquare.style.cursor = "not-allowed";
}, 1);
    });

    greenSquare.addEventListener("click", () => {
        if (greenSquare.style.backgroundColor === "rgb(40, 168, 54)" || greenSquare.style.backgroundColor === "rgb(27, 112, 36)") {
            greenSquare.style.backgroundColor = "rgb(173, 139, 38)";
            createBlueSquare(targetElement, input, boxElement.style.backgroundImage.slice(4, -1).replace(/"/g, ""), input.value);
            boxElement.style.backgroundImage = "none";
            const transaction = db.transaction(["BetterThemesDB"], "readwrite");
            const store = transaction.objectStore("BetterThemesDB");
            store.delete("imageInput");
            let textElement = document.createElement('div');
            textElement.classList.add("text-element2");
            textElement.style.display = "flex";
            textElement.style.justifyContent = "center";
            textElement.style.alignItems = "center";
            textElement.style.width = "100%";
            textElement.style.height = "100%";
            textElement.style.textAlign = "center";
            textElement.textContent = "Click to upload an image to use it as a theme thumbnail";
            textElement.style.fontWeight = "bold";
            textElement.style.background = "linear-gradient(to right, #200089, #0080c5)";

            boxElement.appendChild(textElement);

            greenSquare.style.backgroundColor = "#f5c32f !important";
        } else {
            greenSquare.style.backgroundColor = "red";
        }
    });

    targetElement.appendChild(greenSquare);
    targetElement.appendChild(dividerElement2);
    targetElement.appendChild(dividerElementvoid);

function createBlueSquare(targetElement, inputElement, imageUrl, textValue) {
    const transaction2 = db.transaction(["BetterThemesDB"], "readwrite");
    const store2 = transaction2.objectStore("BetterThemesDB");
    const id = Date.now().toString();
    store2.put({ id, image: imageUrl, text: textValue, border: "none" });
        const blueSquare = document.createElement("div");
        blueSquare.id = id;
        blueSquare.classList.add("theme-box");
        const transaction1 = db.transaction(["BetterThemesDB"]);
        const store1 = transaction1.objectStore("BetterThemesDB");
        const request1 = store1.get("regulator");
        request1.onsuccess = function() {
            const regulator = request1.result;
            if (regulator && regulator.value) {
                const scaleValue = regulator.value;
                const newWidth = (scaleValue / 100) * 200;
                const newHeight = (scaleValue / 100) * 112;
                blueSquare.style.width = `${newWidth}px`;
                blueSquare.style.height = `${newHeight}px`;
            } else {
                blueSquare.style.width = "200px";
                blueSquare.style.height = "112px";
            }
        };
        blueSquare.style.backgroundColor = "blue";
        blueSquare.style.marginTop = "20px";
        blueSquare.style.marginRight = "20px";
        blueSquare.style.borderRadius = "5px"
        blueSquare.style.zIndex = '1000';
        blueSquare.style.pointerEvents = 'auto';
        blueSquare.style.backgroundImage = `url(${imageUrl})`;
        blueSquare.style.backgroundSize = "cover";
        blueSquare.style.backgroundPosition = "center";
        blueSquare.dataset.id = id;

        blueSquare.addEventListener("click", () => {
            if (isHoveringDelete === false) {
            inputElement.value = textValue;
        blueSquare.style.border = "3px solid #00aaff";
            }
        });

        blueSquare.addEventListener("click", () => {
            if (isHoveringDelete === false) {
            if (textValue.startsWith("https://raw")) {
                const css = `@import url("${textValue}");`;
                VencordNative.quickCss.set(css);
            }
const squares = document.querySelectorAll(".theme-box");
squares.forEach((square: Element) => {
    if (square !== blueSquare) {
        if ((square as HTMLElement).style.border !== "3px solid red") {
            (square as HTMLElement).style.border = "none";
const transaction = db.transaction(["BetterThemesDB"], "readwrite");
const store = transaction.objectStore("BetterThemesDB");
const getRequest = store.get((square as HTMLElement).dataset.id);
getRequest.onsuccess = function() {
    const data = getRequest.result;
    if (data) {
        if (data.border !== "3px solid red") {
            data.border = "none";
            const putRequest = store.put(data);
            putRequest.onerror = function(e) {
                console.log('Error', e.target.error.name);
            }
        }
    }
};
        }
    }
});
            blueSquare.style.border = "3px solid #00aaff";
            const transaction = db.transaction(["BetterThemesDB"], "readwrite");
            const store = transaction.objectStore("BetterThemesDB");
            const getRequest = store.get(blueSquare.dataset.id);
            getRequest.onsuccess = function() {
                const data = getRequest.result;
                if (data) {
                    data.border = "3px solid #00aaff";
                    const putRequest = store.put(data);
                    putRequest.onerror = function(e) {
                        console.log('Error', e.target.error.name);
                    }
                }
            };}
        });

        blueSquare.addEventListener("mouseover", () => {
            blueSquare.style.cursor = "pointer";
            const purpleSquare = document.createElement("div");
            const existingPurpleSquare = blueSquare.querySelector(".purple-square");
            if (!existingPurpleSquare) {
                purpleSquare.classList.add("purple-square");
                purpleSquare.style.backgroundColor = "#f44236";
                purpleSquare.style.color = "white";
                purpleSquare.style.width = "15px";
                purpleSquare.style.height = "15px";
                purpleSquare.style.position = "relative";
                purpleSquare.style.bottom = "0";
                purpleSquare.style.left = "calc(100% - 15px)";
                purpleSquare.style.backgroundImage = `url(https://i.imgur.com/LLyQigR.png)`;
                purpleSquare.style.backgroundSize = "contain";
                purpleSquare.style.backgroundRepeat = "no-repeat";
                purpleSquare.style.backgroundPosition = "center top";
                purpleSquare.style.borderRadius = "2px 5px 2px 2px";

                blueSquare.appendChild(purpleSquare);
                blueSquare.appendChild(purpleSquare);
            }

            blueSquare.addEventListener("mouseout", (event) => {
                if (event.relatedTarget === purpleSquare) {
                    return;
                }
                purpleSquare.remove();
            });
        });

        const transaction = db.transaction(["BetterThemesDB"]);
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get(blueSquare.dataset.id);
        request.onsuccess = function() {
            const savedBorderStyle = request.result;
            if (savedBorderStyle && savedBorderStyle.border) {
                blueSquare.style.border = savedBorderStyle.border;
            }
        };
        const vcSettingsThemeGrid = document.querySelector(".wrapper2");
        if (vcSettingsThemeGrid) {
            vcSettingsThemeGrid.appendChild(blueSquare);
        } else {
            targetElement.appendChild(blueSquare);
        }
    }

const observer = new MutationObserver((mutationsList, observer) => {
    let childElement = document.querySelector('.vc-settings-quick-actions-card.cardPrimary__1ee6a.card__4dc22.boxes-spawned');
    let children = document.querySelector('.children_b15c64');
    let wrapper = document.querySelector('.wrapper');
    if (childElement) {
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'wrapper';
        }
        if (children && children.parentNode !== wrapper) {
            children.before(wrapper);
            wrapper.appendChild(children);
        }
    } else {
        if (wrapper) {
            wrapper.remove();
        }
    }
});

observer.observe(document, { childList: true, subtree: true });

//MARK:SCALE THEMES

const scaleBox = document.createElement("div");
scaleBox.classList.add("test-box");
scaleBox.style.backgroundColor = "#4f4f4f";
scaleBox.style.marginTop = "-1px";
scaleBox.style.borderRadius = "3px";
scaleBox.style.padding = "8px";
const scaleTextElement = document.createElement('div');
scaleTextElement.classList.add("textinput5");
scaleTextElement.style.display = "flex";
scaleTextElement.style.justifyContent = "center";
scaleTextElement.style.alignItems = "center";
scaleTextElement.style.width = "100%";
scaleTextElement.style.height = "100%";
scaleTextElement.style.textAlign = "center";
scaleTextElement.textContent = "Scale Themes";
scaleTextElement.style.color = "white";
scaleTextElement.style.fontWeight = "500";
scaleTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
scaleTextElement.style.fontSize = "14px";
scaleTextElement.style.fontStyle = "normal";
scaleTextElement.style.backgroundColor = scaleBox.style.backgroundColor;

scaleBox.appendChild(scaleTextElement);

scaleBox.addEventListener("mouseover", () => {
    scaleBox.style.backgroundColor = darkenColor("#4f4f4f", 20);
    scaleTextElement.style.backgroundColor = scaleBox.style.backgroundColor;
    scaleBox.style.cursor = "pointer";
});

scaleBox.addEventListener("click", () => {
    const diashowBox1Elements = document.querySelectorAll('.diashow_box1');
    const diashowBox2Elements = document.querySelectorAll('.diashow_box2');
    const cancelBox3 = document.querySelectorAll('.cancel-box8');
    cancelBox3.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    diashowBox1Elements.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    diashowBox2Elements.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    const editBoxes = document.querySelectorAll('.editbox4');
    editBoxes.forEach((editBox) => {
        if (editBox.parentNode) {
            editBox.parentNode.removeChild(editBox);
        }
    });
    const editbox2sels = document.querySelectorAll('.editbox2');
    editbox2sels.forEach((editbox2sel) => {
        if (editbox2sel) {
            editbox2sel.remove();
        }
    });
});

scaleBox.addEventListener("mouseout", () => {
    scaleBox.style.backgroundColor = "#4f4f4f";
    scaleTextElement.style.backgroundColor = scaleBox.style.backgroundColor;
    scaleBox.style.cursor = "default";
});

scaleBox.addEventListener("click", () => {
    const existingRegulator = document.querySelector(".regulator");
    if (existingRegulator) {
        return;
    }
const regulator = document.createElement('input');
regulator.type = 'range';
regulator.min = '40';
regulator.max = '250';
regulator.step = '0.5';
regulator.style.width = '300px';
regulator.classList.add("regulator");
regulator.id = "regulator";
const transaction = db.transaction(["BetterThemesDB"], "readonly");
const store = transaction.objectStore("BetterThemesDB");
const request = store.get("regulator");
request.onsuccess = function() {
    const regulatorData = request.result;
    if (regulatorData && regulatorData.value) {
        regulator.value = regulatorData.value;
    } else {
        regulator.value = '85';
    }
};

    const targetElement = document.querySelector(".vc-settings-quick-actions-card.cardPrimary__1ee6a.card__4dc22.boxes-spawned");
    if (targetElement) {
        targetElement.appendChild(regulator);

        regulator.addEventListener("input", () => {
            const scaleValue = parseFloat(regulator.value);
            const newWidth = scaleValue / 100 * 200;
            const newHeight = scaleValue / 100 * 112;
const themeBoxes = document.querySelectorAll(".theme-box");
themeBoxes.forEach((themeBox: Element) => {
    (themeBox as HTMLElement).style.width = `${newWidth}px`;
    (themeBox as HTMLElement).style.height = `${newHeight}px`;
});
        });
    }
});
    const saveBox = document.createElement("div");
    saveBox.classList.add("save-box1");
    saveBox.style.backgroundColor = "#28a836";
    saveBox.style.borderRadius = "3px";
    saveBox.style.position = "absolute";
    saveBox.style.bottom = "3px";
    saveBox.style.right = "22px";
    saveBox.style.margin = "8px";
    saveBox.style.padding = "8px";
    const saveTextElement = document.createElement('div');
    saveTextElement.classList.add("textinput5");
    saveTextElement.style.display = "flex";
    saveTextElement.style.justifyContent = "center";
    saveTextElement.style.alignItems = "center";
    saveTextElement.style.width = "100%";
    saveTextElement.style.height = "100%";
    saveTextElement.style.textAlign = "center";
    saveTextElement.textContent = "Save";
    saveTextElement.style.color = "white";
    saveTextElement.style.fontWeight = "500";
    saveTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    saveTextElement.style.fontSize = "14px";
    saveTextElement.style.fontStyle = "normal";
    saveTextElement.style.backgroundColor = saveBox.style.backgroundColor;
    saveBox.appendChild(saveTextElement);

    saveBox.addEventListener("mouseover", () => {
        saveBox.style.backgroundColor = darkenColor("#28a836", 20);
        saveTextElement.style.backgroundColor = saveBox.style.backgroundColor;
        saveBox.style.cursor = "pointer";
});

    saveBox.addEventListener("mouseout", () => {
            saveBox.style.backgroundColor = "#28a836";
            saveTextElement.style.backgroundColor = saveBox.style.backgroundColor;
            saveBox.style.cursor = "default";
    });

scaleBox.addEventListener("click", function() {
    targetElement.appendChild(saveBox);
    targetElement.appendChild(resetBox);
    targetElement.appendChild(cancelBox2);
});

saveBox.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const regulatorElement = document.getElementById("regulator");
    let regulatorValue = '';
    if (regulatorElement) {
        regulatorValue = (regulatorElement as HTMLInputElement).value;
    }
    store.put({ id: "regulator", value: regulatorValue });
    targetElement.removeChild(cancelBox2);
    targetElement.removeChild(saveBox);
    targetElement.removeChild(resetBox);
    const regulatorElementToRemove = targetElement.querySelector('.regulator');
    if (regulatorElementToRemove) {
        targetElement.removeChild(regulatorElementToRemove);
    }
});

const resetBox = document.createElement("div");
resetBox.classList.add("save-box1");
resetBox.style.backgroundColor = "#fa4848";
resetBox.style.borderRadius = "3px";
resetBox.style.position = "absolute";
resetBox.style.bottom = "3px";
resetBox.style.left = "60px";
resetBox.style.margin = "8px";
resetBox.style.padding = "8px";
const resetTextElement = document.createElement('div');
resetTextElement.classList.add("textinput6");
resetTextElement.style.display = "flex";
resetTextElement.style.justifyContent = "center";
resetTextElement.style.alignItems = "center";
resetTextElement.style.width = "100%";
resetTextElement.style.height = "100%";
resetTextElement.style.textAlign = "center";
resetTextElement.textContent = "Reset";
resetTextElement.style.color = "white";
resetTextElement.style.fontWeight = "500";
resetTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
resetTextElement.style.fontSize = "14px";
resetTextElement.style.fontStyle = "normal";
resetTextElement.style.backgroundColor = resetBox.style.backgroundColor;

resetBox.appendChild(resetTextElement);

resetBox.addEventListener("mouseover", () => {
    resetBox.style.backgroundColor = darkenColor("#fa4848", 20);
    resetTextElement.style.backgroundColor = resetBox.style.backgroundColor;
    resetBox.style.cursor = "pointer";
});

resetBox.addEventListener("mouseout", () => {
    resetBox.style.backgroundColor = "#fa4848";
    resetTextElement.style.backgroundColor = resetBox.style.backgroundColor;
    resetBox.style.cursor = "default";
});

resetBox.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const regulatorValue = 100;
    const request = store.put({ id: "regulator", value: regulatorValue });
    request.onsuccess = () => {
        const themeBoxes = document.querySelectorAll(".theme-box");
const newWidth = 200;
const newHeight = 112;
themeBoxes.forEach((box: Element) => {
    (box as HTMLElement).style.width = `${newWidth}px`;
    (box as HTMLElement).style.height = `${newHeight}px`;
});
const savePromises = Array.from(themeBoxes).map((box) => {
    return new Promise<void>((resolve) => {
        const putRequest = store.put(box);
        putRequest.onsuccess = resolve;
        putRequest.onerror = (error) => {
            console.error("Error saving box", error);
            resolve();
        };
    });
});
Promise.all(savePromises).then(() => {
    console.log("All boxes have been updated and saved");
});
    };
    targetElement.removeChild(cancelBox2);
    targetElement.removeChild(saveBox);
    targetElement.removeChild(resetBox);
    const regulatorElement = targetElement.querySelector('.regulator');
    if (regulatorElement) {
        targetElement.removeChild(regulatorElement);
    }
});

    const cancelBox2 = document.createElement("div");
    cancelBox2.classList.add("cancel-box2");
    cancelBox2.style.backgroundColor = "";
    cancelBox2.style.borderRadius = "3px";
    cancelBox2.style.position = "absolute";
    cancelBox2.style.bottom = "3px";
    cancelBox2.style.right = "69px";
    cancelBox2.style.margin = "8px";
    cancelBox2.style.padding = "8px";
    const cancelTextElement2 = document.createElement('div');
    cancelTextElement2.classList.add("textinput6");
    cancelTextElement2.style.display = "flex";
    cancelTextElement2.style.justifyContent = "center";
    cancelTextElement2.style.alignItems = "center";
    cancelTextElement2.style.width = "100%";
    cancelTextElement2.style.height = "100%";
    cancelTextElement2.style.textAlign = "center";
    cancelTextElement2.textContent = "Cancel";
    cancelTextElement2.style.color = "white";
    cancelTextElement2.style.fontWeight = "500";
    cancelTextElement2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    cancelTextElement2.style.fontSize = "14px";
    cancelTextElement2.style.fontStyle = "normal";
    cancelTextElement2.style.backgroundColor = cancelBox2.style.backgroundColor;

    cancelBox2.appendChild(cancelTextElement2);

    cancelBox2.addEventListener("mouseover", () => {
        cancelBox2.style.backgroundColor = "";
        cancelTextElement2.style.backgroundColor = cancelBox2.style.backgroundColor;
        cancelTextElement2.style.textDecoration = "underline";
        cancelBox2.style.cursor = "pointer";
    });

    cancelBox2.addEventListener("mouseout", () => {
        cancelBox2.style.backgroundColor = "";
        cancelTextElement2.style.backgroundColor = cancelBox2.style.backgroundColor;
        cancelTextElement2.style.textDecoration = "none";
        cancelBox2.style.cursor = "default";
    });

    scaleBox.addEventListener("click", function() {
        targetElement.appendChild(cancelBox2);
    });

    cancelBox2.addEventListener("click", () => {
        const themeBoxes = document.querySelectorAll(".theme-box");
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("regulator");
        request.onsuccess = function() {
            let newWidth = 200;
            let newHeight = 112;
            const regulatorData = request.result;
            if (regulatorData && regulatorData.value) {
                const scaleValue = parseFloat(regulatorData.value);
                newWidth = scaleValue / 100 * 200;
                newHeight = scaleValue / 100 * 112;
            }
            themeBoxes.forEach((box: Element) => {
                (box as HTMLElement).style.setProperty('width', `${newWidth}px`, 'important');
                (box as HTMLElement).style.setProperty('height', `${newHeight}px`, 'important');
            });
        };
        targetElement.removeChild(cancelBox2);
        targetElement.removeChild(saveBox);
        targetElement.removeChild(resetBox);
        const regulatorElement = targetElement.querySelector('.regulator');
        if (regulatorElement) {
            targetElement.removeChild(regulatorElement);
        }
    });

//MARK:DIASHOW




//MARK:DIASHOW CORE AKTIVATE

let diashowTimeout;
let progressInterval;
let isRunning = false;

function startDiashow(isFirstCall = false) {
    console.log('startDiashow called', { isFirstCall, isRunning });
    if (isRunning && !isFirstCall) {
        return;
    }
    isRunning = true;
    if (diashowTimeout) {
        clearTimeout(diashowTimeout);
        diashowTimeout = null;
    }
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        console.log('diashow', diashow);
        if (diashow) {
            diashow.function = 2;
            store.put(diashow);
            if (diashow.lastTime !== diashow.time) {
                diashow.progress = 0;
                diashow.lastTime = diashow.time;
                store.put(diashow);
            } else if (diashow.progress !== 0) {
                console.log('Last time is the same as current time and progress is not 0');
            } else {
                console.log('Last time was not the same as current time or progress is 0');
            }
        }
        if (diashow && diashow.status === "active" && diashow.time) {
            console.log('diashow is active and has time');
            const timeValue = Number(diashow.time.slice(0, -1));
            let intervalTime;
            switch (diashow.time.slice(-1)) {
                case 's':
                    intervalTime = timeValue * 1000;
                    break;
                case 'm':
                    intervalTime = timeValue * 60 * 1000;
                    break;
                case 'h':
                    intervalTime = timeValue * 60 * 60 * 1000;
                    break;
                default:
                    console.log('Invalid time format');
                    return;
            }
            let remainingTime = intervalTime - (diashow.progress * 1000);
            if (remainingTime < 0) {
                remainingTime = intervalTime;
                diashow.progress = 0;
                store.put(diashow);
            }
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = function() {
                const allItems = getAllRequest.result;
                const numberedItems = allItems.filter(item => !isNaN(item.id));
                let selectedItem;
                switch (diashow.order) {
                    case 'randomized':
                        selectedItem = numberedItems[Math.floor(Math.random() * numberedItems.length)];
                        break;
                    case 'in order':
                        selectedItem = numberedItems[diashow.last % numberedItems.length];
                        diashow.last = (diashow.last + 1) % numberedItems.length;
                        break;
                    case 'custom':
                        if (typeof diashow.setorder === 'string' && diashow.setorder.length > 0) {
                            const setOrder = Array.from(diashow.setorder).map(Number);
                            const currentId = setOrder[diashow.last % setOrder.length];
                            selectedItem = numberedItems[currentId - 1];
                            diashow.last = (diashow.last + 1) % setOrder.length;
                        } else {
                            console.log('Invalid setOrder');
                            return;
                        }
                        break;
                    default:
                        console.log('Invalid order');
                        return;
                }
                if (remainingTime === intervalTime) {
                    const link = selectedItem.text;
                    console.log('selectedItem link', link);
                    if (selectedItem.text.startsWith("https://raw")) {
                     const transaction = db.transaction(["BetterThemesDB"], "readonly");
                     const store = transaction.objectStore("BetterThemesDB");
                     const getRequest = store.get(selectedItem.id);
                       getRequest.onsuccess = function() {
                         const data = getRequest.result;
                         let css = `@import url("${selectedItem.text}");\n`;
                            if (data && data.CSS) {
                               css += data.CSS;
                            }
                              VencordNative.quickCss.set(css);
                         };
                        getRequest.onerror = function(e) {
                         console.log('Error', e.target.error.name);
                        };
                    }
                    const themeBoxes = document.querySelectorAll(".theme-box");
                    themeBoxes.forEach((themeBox: Element) => {
                        const id = themeBox.id;
                        const request = indexedDB.open("BetterThemesDBStore", 1);
                        request.onsuccess = function(event) {
                            if (event.target) {
                                const db = (event.target as IDBOpenDBRequest).result;
                                const transaction = db.transaction(["BetterThemesDB"], 'readwrite');
                                const objectStore = transaction.objectStore("BetterThemesDB");
                                const getRequest = objectStore.get(id);
                                getRequest.onsuccess = function(event) {
                                    if (event.target) {
                                        const data = (event.target as IDBRequest).result;
                                        if ((themeBox as HTMLElement).id === selectedItem.id) {
                                            (themeBox as HTMLElement).style.border = '3px solid #00aaff';
                                            data.border = '3px solid #00aaff';
                                        } else {
                                            (themeBox as HTMLElement).style.border = '';
                                            data.border = '';
                                        }
                                        const putRequest = objectStore.put(data);
                                        putRequest.onerror = function(e) {
                                        }
                                    }
                                };
                            }
                        };
                    });
                }
                store.put(diashow);
                if (diashow.lastTime !== diashow.time) {
                    diashow.progress = 0;
                    store.put(diashow);
                }
                diashowTimeout = setTimeout(() => {
                    startDiashow();
                    isRunning = false;
                }, remainingTime);
                progressInterval = setInterval(function() {
                    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                    const store = transaction.objectStore("BetterThemesDB");
                    const request = store.get("diashow");
                    request.onsuccess = function() {
                        const diashow = request.result;
                        if (diashow && diashow.status === "active") {
                            if (diashow.progress * 1000 >= intervalTime) {
                                diashow.progress = 0;
                                clearInterval(progressInterval);
                                startDiashow();
                            } else {
                                diashow.progress += 1;
                            }
                            store.put(diashow);
                        }
                    }
                }, 1000);
            };
        } else {
            console.log('diashow is not active or does not have time');
            if (diashowTimeout) {
                clearTimeout(diashowTimeout);
                diashowTimeout = null;
            }
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            isRunning = false;
        }
    };
}

setInterval(() => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "" ) {
            if (diashowTimeout) {
                clearTimeout(diashowTimeout);
                diashowTimeout = null;
            }
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            store.put(diashow);
        }
    }
}, 1000);

function changeThemeByDay() {
    const currentDate = new Date().toDateString();
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "active" && diashow.time) {
            if (diashow.time === '1d') {
                if (!diashow.lastChange || new Date(diashow.lastChange).toDateString() !== currentDate) {
                    updateTheme();
                    diashow.lastChange = new Date();
                    const putRequest = store.put(diashow);
                    putRequest.onsuccess = function() {
                        console.log('diashow.lastChange has been updated in IndexedDB');
                    };
                    putRequest.onerror = function() {
                        console.error('Failed to update diashow.lastChange in IndexedDB', putRequest.error);
                    };
                }
            }
        }
    };
}

setInterval(changeThemeByDay, 60 * 1000);

function updateTheme() {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const updatedRequest = store.get("diashow");
    updatedRequest.onsuccess = function() {
        const updatedDiashow = updatedRequest.result;
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = function() {
            const allItems = getAllRequest.result;
            const numberedItems = allItems.filter(item => !isNaN(item.id));
            let selectedItem;
            switch (updatedDiashow.order) {
                case 'randomized':
                    selectedItem = numberedItems[Math.floor(Math.random() * numberedItems.length)];
                    break;
                case 'in order':
                    selectedItem = numberedItems[updatedDiashow.last % numberedItems.length];
                    if (updatedDiashow.firstChange) {
                        updatedDiashow.last = (updatedDiashow.last + 1) % numberedItems.length;
                        updatedDiashow.firstChange = false;
                    } else {
                        updatedDiashow.firstChange = true;
                    }
                    break;
                    case 'custom':
                        if (typeof updatedDiashow.setorder === 'string' && updatedDiashow.setorder.length > 0) {
                            const setOrder = Array.from(updatedDiashow.setorder).map(Number);
                            const currentId = setOrder[updatedDiashow.last % setOrder.length];
                            selectedItem = numberedItems[currentId - 1];
                            if (updatedDiashow.firstChange) {
                                updatedDiashow.last = (updatedDiashow.last + 1) % setOrder.length;
                                updatedDiashow.firstChange = false;
                            } else {
                                updatedDiashow.firstChange = true;
                            }
                        } else {
                            console.log('Invalid setOrder');
                            return;
                        }
                        break;
                default:
                    console.log('Invalid order');
                    return;
            }
             console.log('selectedItem:', selectedItem);
            const link = selectedItem.text;
             console.log('link:', link);
            if (link.startsWith("https://raw")) {
                const css = `@import url("${link}");`;
                VencordNative.quickCss.set(css);
            }
            store.put(updatedDiashow);
            const themeBoxes = document.querySelectorAll(".theme-box");
    themeBoxes.forEach((themeBox) => {
    const id = themeBox.id;
    const request = indexedDB.open("BetterThemesDBStore", 1);
    request.onsuccess = function(event) {
        console.log('IndexedDB request successful');
        if (event.target) {
            const db = (event.target as IDBOpenDBRequest).result;
            const transaction = db.transaction(["BetterThemesDB"], 'readwrite');
            const objectStore = transaction.objectStore("BetterThemesDB");
            const getRequest = objectStore.get(id);
            getRequest.onsuccess = function(event) {
                if (event.target) {
                    const data = (event.target as IDBRequest).result;
                    if ((themeBox as HTMLElement).id === selectedItem.id) {
                        (themeBox as HTMLElement).style.border = '3px solid #00aaff';
                        data.border = '3px solid #00aaff';
                    } else {
                        (themeBox as HTMLElement).style.border = '';
                        data.border = '';
                    }
                    const putRequest = objectStore.put(data);
                    putRequest.onerror = function(e) {
                    }
                }
            };
        }
    };
});
        };
    };
}

changeThemeByDay();

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

function changeThemeByWeek() {
    const currentDate = new Date();
    const currentWeek = getWeekNumber(currentDate);
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        const diashow = getRequest.result;
        if (diashow && diashow.status === "active" && diashow.time) {
            if (/^\d+w$/.test(diashow.time)) {
                const weeks = parseInt(diashow.time, 10);
                const lastChangeWeek = diashow.lastChange ? getWeekNumber(new Date(diashow.lastChange)) : 0;
                const weeksPassed = currentWeek - lastChangeWeek;
                if (weeksPassed >= weeks) {
                    updateTheme();
                    diashow.lastChange = currentDate;
                    const putRequest = store.put(diashow);
                    putRequest.onsuccess = function() {
                        console.log('diashow.lastChange has been updated in IndexedDB');
                    };
                    putRequest.onerror = function() {
                        console.error('Failed to update diashow.lastChange in IndexedDB', putRequest.error);
                    };
                }
            }
        }
    };
}

setInterval(changeThemeByWeek, 60 * 1000);

changeThemeByWeek();

const diashowThemesBox = document.createElement("div");
diashowThemesBox.classList.add("test-box2");
diashowThemesBox.style.backgroundColor = "#4287f5";
diashowThemesBox.style.marginTop = "-1px";
diashowThemesBox.style.borderRadius = "3px";
diashowThemesBox.style.padding = "8px";
const diashowThemesBoxTextElement = document.createElement('div');
diashowThemesBoxTextElement.classList.add("textinput7");
diashowThemesBoxTextElement.style.display = "flex";
diashowThemesBoxTextElement.style.justifyContent = "center";
diashowThemesBoxTextElement.style.alignItems = "center";
diashowThemesBoxTextElement.style.width = "100%";
diashowThemesBoxTextElement.style.height = "100%";
diashowThemesBoxTextElement.style.textAlign = "center";
diashowThemesBoxTextElement.textContent = "Themes Diashow";
diashowThemesBoxTextElement.style.color = "white";
diashowThemesBoxTextElement.style.fontWeight = "500";
diashowThemesBoxTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
diashowThemesBoxTextElement.style.fontSize = "14px";
diashowThemesBoxTextElement.style.fontStyle = "normal";
diashowThemesBoxTextElement.style.backgroundColor = diashowThemesBox.style.backgroundColor;

diashowThemesBox.appendChild(diashowThemesBoxTextElement);

diashowThemesBox.addEventListener("mouseover", () => {
    diashowThemesBox.style.backgroundColor = darkenColor("#4287f5", 20);
    diashowThemesBoxTextElement.style.backgroundColor = diashowThemesBox.style.backgroundColor;
    diashowThemesBox.style.cursor = "pointer";
});

diashowThemesBox.addEventListener("click", () => {
if (targetElement.contains(cancelBox2)) {
    targetElement.removeChild(cancelBox2);
}
if (targetElement.contains(saveBox)) {
    targetElement.removeChild(saveBox);
}
if (targetElement.contains(resetBox)) {
    targetElement.removeChild(resetBox);
}
const regulatorElement = targetElement.querySelector('.regulator');
if (regulatorElement && targetElement.contains(regulatorElement)) {
    targetElement.removeChild(regulatorElement);
}
});

diashowThemesBox.addEventListener("click", () => {
    const cancelBox3 = document.querySelectorAll('.cancel-box8');
    cancelBox3.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    const editbox2sels = document.querySelectorAll('.editbox2');
    editbox2sels.forEach((editbox2sel) => {
        if (editbox2sel) {
            editbox2sel.remove();
        }
    });
    });

const transaction2 = db.transaction(["BetterThemesDB"], "readwrite");
const store2 = transaction2.objectStore("BetterThemesDB");
const getRequest = store2.get("diashow");
getRequest.onsuccess = function() {
    if (getRequest.result && getRequest.result.menuReloadStatus === "true") {
        const intervalId = setInterval(() => {
            const testBox2 = document.querySelector('.test-box2');
            if (testBox2) {
                console.log('Dispatching click event');
                testBox2.dispatchEvent(new Event('click'));
                clearInterval(intervalId);
            }
        }, 10);
    }
};
getRequest.onerror = function() {
    console.error("Error", getRequest.error);
};
diashowThemesBox.addEventListener("mouseout", () => {
    diashowThemesBox.style.backgroundColor = "#4287f5";
    diashowThemesBoxTextElement.style.backgroundColor = diashowThemesBox.style.backgroundColor;
    diashowThemesBox.style.cursor = "default";
});

diashowThemesBox.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        if (!getRequest.result) {
            const diashow = {
                id: "diashow",
                time: "",
                order: "",
                status: "",
                setorder: "",
                last: "0",
                menuReloadStatus: "",
            };
            const putRequest = store.put(diashow);
            putRequest.onsuccess = function() {
                console.log("Diashow saved successfully");
            };
            putRequest.onerror = function() {
                console.error("Error", putRequest.error);
            };
        }
    };
    getRequest.onerror = function() {
        console.error("Error", getRequest.error);
    };
});

diashowThemesBox.addEventListener("click", () => {
    const existingdiashow = document.querySelector(".diashow_box3");
    if (existingdiashow) {
        return;
    }
    const longBox = document.createElement("div");
    longBox.classList.add("diashow_box1");
    longBox.style.height = "32px";
    longBox.style.width = "70%";
    longBox.style.border = "none";
    longBox.style.backgroundColor = "transparent";
    longBox.style.borderRadius = "50px";
    longBox.style.marginLeft = "-10px";

    targetElement.appendChild(longBox);

    const lenghtBox = document.createElement("div");
    lenghtBox.classList.add("diashow_box5");
    lenghtBox.style.backgroundColor = "#272727";
    lenghtBox.style.marginTop = "-1px";
    lenghtBox.style.borderRadius = "50px 0px 0px 50px";
    lenghtBox.style.padding = "8px";
    lenghtBox.style.position = "absolute";
    lenghtBox.style.left = "110px";
    lenghtBox.style.border = "1px solid black";
    lenghtBox.style.marginLeft = "-20px";
    const lenghtBoxTextElement = document.createElement('div');
    lenghtBoxTextElement.classList.add("textinput10");
    lenghtBoxTextElement.style.display = "flex";
    lenghtBoxTextElement.style.justifyContent = "center";
    lenghtBoxTextElement.style.alignItems = "center";
    lenghtBoxTextElement.style.width = "100%";
    lenghtBoxTextElement.style.height = "100%";
    lenghtBoxTextElement.style.textAlign = "center";
    lenghtBoxTextElement.textContent = "Length";
    lenghtBoxTextElement.style.color = "white";
    lenghtBoxTextElement.style.fontWeight = "500";
    lenghtBoxTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    lenghtBoxTextElement.style.fontSize = "14px";
    lenghtBoxTextElement.style.fontStyle = "normal";
    lenghtBoxTextElement.style.backgroundColor = lenghtBox.style.backgroundColor;

    lenghtBox.appendChild(lenghtBoxTextElement);
    longBox.appendChild(lenghtBox);

const observer = new MutationObserver((mutationsList, observer) => {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const targetElement = document.querySelector(".vc-settings-quick-actions-card.cardPrimary__1ee6a.card__4dc22");
            if (targetElement && !targetElement.classList.contains('boxes-spawned')) {
                if (!targetElement.querySelector(".online-themes2")) {
                    addBox(targetElement);
                }
                spawnBoxes();
                targetElement.classList.add('boxes-spawned');
            }
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });

var switchContainer = document.createElement("div");
switchContainer.classList.add("switch-container");
switchContainer.setAttribute("class", "switch");
switchContainer.style.position = "relative";
switchContainer.style.display = "inline-block";
switchContainer.style.width = "42px";
switchContainer.style.height = "24px";
switchContainer.style.position = "absolute";
switchContainer.style.left = "39px";
switchContainer.style.top = "328px";

var checkbox = document.createElement("input");
checkbox.setAttribute("type", "checkbox");
checkbox.setAttribute("id", "switch");
checkbox.style.display = "none";

var slider = document.createElement("label");
slider.setAttribute("class", "slider");
slider.setAttribute("for", "switch");
slider.style.position = "absolute";
slider.style.cursor = "pointer";
slider.style.top = "0";
slider.style.left = "0";
slider.style.right = "0";
slider.style.bottom = "0";
slider.style.backgroundColor = "#7e878f";
slider.style.transition = ".4s";
slider.style.borderRadius = "34px";

var sliderButton = document.createElement("div");
sliderButton.classList.add("slider-button");
sliderButton.style.position = "absolute";
sliderButton.style.content = "";
sliderButton.style.height = "18px";
sliderButton.style.width = "18px";
sliderButton.style.left = "4px";
sliderButton.style.bottom = "3px";
sliderButton.style.backgroundColor = "white";
sliderButton.style.transition = ".4s";
sliderButton.style.borderRadius = "50%";

slider.appendChild(sliderButton);
switchContainer.appendChild(checkbox);
switchContainer.appendChild(slider);
document.body.appendChild(switchContainer);

var xSymbol = document.createElement("span");
xSymbol.classList.add("x-symbol");
xSymbol.textContent = "×";
xSymbol.style.fontWeight = "600";
xSymbol.style.color = "#7e878f";
xSymbol.style.fontSize = "21px";
xSymbol.style.position = "absolute";
xSymbol.style.left = "8px";
xSymbol.style.bottom = "-9px";
xSymbol.style.transform = "translateY(-50%)";
xSymbol.style.display = "block";
xSymbol.style.pointerEvents = "none";
xSymbol.style.opacity = "1";
xSymbol.style.transition = "opacity .2s, left .4s";

var checkSymbol = document.createElementNS("http://www.w3.org/2000/svg", "svg");
checkSymbol.classList.add("check-symbol");
checkSymbol.setAttribute("viewBox", "0 0 24 24");
checkSymbol.style.position = "absolute";
checkSymbol.style.right = "-22px";
checkSymbol.style.top = "-7px";
checkSymbol.style.color = "#22ac42";
checkSymbol.style.transform = "scale(0.35) translateY(-50%)";
checkSymbol.style.display = "none";
checkSymbol.style.pointerEvents = "none";
checkSymbol.style.opacity = "0";
checkSymbol.style.transition = "opacity .2s, right .4s";

var path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
path1.setAttribute("fill", "rgba(35, 165, 90, 1)");
path1.setAttribute("d", "M7.89561 14.8538L6.30462 13.2629L14.3099 5.25755L15.9009 6.84854L7.89561 14.8538Z");

var path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
path2.setAttribute("fill", "rgba(35, 165, 90, 1)");
path2.setAttribute("d", "M4.08643 11.0903L5.67742 9.49929L9.4485 13.2704L7.85751 14.8614L4.08643 11.0903Z");

checkSymbol.appendChild(path1);
checkSymbol.appendChild(path2);
switchContainer.appendChild(xSymbol);
switchContainer.appendChild(checkSymbol);

checkbox.addEventListener('change', function() {
    if (this.checked) {
        slider.style.backgroundColor = '#22ac42';
        sliderButton.style.transform = 'translateX(17px)';
        xSymbol.style.opacity = "0";
        checkSymbol.style.opacity = "1";
        setTimeout(() => {
            xSymbol.style.display = "none";
            checkSymbol.style.display = "block";
        }, 200);
    } else {
        slider.style.backgroundColor = '#7e878f';
        sliderButton.style.transform = 'translateX(0)';
        xSymbol.style.opacity = "1";
        checkSymbol.style.opacity = "0";
        setTimeout(() => {
            xSymbol.style.display = "block";
            checkSymbol.style.display = "none";
        }, 200);
    }
});

function loadDiashowStatus() {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        let diashow = getRequest.result;
        if (diashow.status === 'active') {
            activateSlider();
        } else {
            deactivateSlider();
        }
    };
    getRequest.onerror = function() {
        console.error("Error", getRequest.error);
    };
}

loadDiashowStatus();

slider.addEventListener('click', function() {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        let diashow = getRequest.result;
        if (diashow.status === 'active') {
            deactivateSlider();
            diashow.status = '';
            if (diashowTimeout) {
                clearTimeout(diashowTimeout);
                clearInterval(progressInterval);
                diashowTimeout = null;
            }
        } else {
            activateSlider();
            diashow.status = 'active';
            startDiashow();
            changeThemeByDay();
            changeThemeByWeek();
        }
        const putRequest = store.put(diashow);
        putRequest.onsuccess = function() {
        };
        putRequest.onerror = function() {
            console.error("Error", putRequest.error);
        };
    };
});

function activateSlider() {
    slider.style.backgroundColor = '#22ac42';
    sliderButton.style.transform = 'translateX(17px)';
    xSymbol.style.opacity = "0";
    checkSymbol.style.opacity = "1";
    setTimeout(() => {
        xSymbol.style.display = "none";
        checkSymbol.style.display = "block";
    }, 200);
}

function deactivateSlider() {
    slider.style.backgroundColor = '#7e878f';
    sliderButton.style.transform = 'translateX(0)';
    xSymbol.style.opacity = "1";
    checkSymbol.style.opacity = "0";
    setTimeout(() => {
        xSymbol.style.display = "block";
        checkSymbol.style.display = "none";
    }, 200);
}

slider.addEventListener("click", () => startDiashow(true));

longBox.appendChild(switchContainer);

var switchContainer2 = document.createElement("div");
switchContainer2.classList.add("switch-container2");
switchContainer2.setAttribute("class", "switch2");
switchContainer2.style.position = "relative";
switchContainer2.style.display = "inline-block";
switchContainer2.style.width = "42px";
switchContainer2.style.height = "24px";
switchContainer2.style.position = "absolute";
switchContainer2.style.left = "39px";
switchContainer2.style.top = "376px";

var checkbox2 = document.createElement("input");
checkbox2.setAttribute("type", "checkbox2");
checkbox2.setAttribute("id", "switch2");
checkbox2.style.display = "none";

var slider2 = document.createElement("label");
slider2.setAttribute("class", "slider2");
slider2.setAttribute("for", "switch2");
slider2.style.position = "absolute";
slider2.style.cursor = "pointer";
slider2.style.top = "0";
slider2.style.left = "0";
slider2.style.right = "0";
slider2.style.bottom = "0";
slider2.style.backgroundColor = "#7e878f";
slider2.style.transition = ".4s";
slider2.style.borderRadius = "34px";

var sliderButton2 = document.createElement("div");
sliderButton2.classList.add("slider-button2");
sliderButton2.style.position = "absolute";
sliderButton2.style.content = "";
sliderButton2.style.height = "18px";
sliderButton2.style.width = "18px";
sliderButton2.style.left = "4px";
sliderButton2.style.bottom = "3px";
sliderButton2.style.backgroundColor = "white";
sliderButton2.style.transition = ".4s";
sliderButton2.style.borderRadius = "50%";

slider2.appendChild(sliderButton2);
switchContainer2.appendChild(checkbox2);
switchContainer2.appendChild(slider2);
document.body.appendChild(switchContainer2);

var xSymbol2 = document.createElement("span");
xSymbol2.classList.add("x-symbol2");
xSymbol2.textContent = "×";
xSymbol2.style.fontWeight = "600";
xSymbol2.style.color = "#7e878f";
xSymbol2.style.fontSize = "21px";
xSymbol2.style.position = "absolute";
xSymbol2.style.left = "8px";
xSymbol2.style.bottom = "-9px";
xSymbol2.style.transform = "translateY(-50%)";
xSymbol2.style.display = "block";
xSymbol2.style.pointerEvents = "none";
xSymbol2.style.opacity = "1";
xSymbol2.style.transition = "opacity .2s, left .4s";

var checkSymbol2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
checkSymbol2.classList.add("check-symbol2");
checkSymbol2.setAttribute("viewBox", "0 0 24 24");
checkSymbol2.style.position = "absolute";
checkSymbol2.style.right = "-22px";
checkSymbol2.style.top = "-7px";
checkSymbol2.style.color = "#22ac42";
checkSymbol2.style.transform = "scale(0.35) translateY(-50%)";
checkSymbol2.style.display = "none";
checkSymbol2.style.pointerEvents = "none";
checkSymbol2.style.opacity = "0";
checkSymbol2.style.transition = "opacity .2s, right .4s";

var path12 = document.createElementNS("http://www.w3.org/2000/svg", "path");
path12.setAttribute("fill", "rgba(35, 165, 90, 1)");
path12.setAttribute("d", "M7.89561 14.8538L6.30462 13.2629L14.3099 5.25755L15.9009 6.84854L7.89561 14.8538Z");

var path22 = document.createElementNS("http://www.w3.org/2000/svg", "path");
path22.setAttribute("fill", "rgba(35, 165, 90, 1)");
path22.setAttribute("d", "M4.08643 11.0903L5.67742 9.49929L9.4485 13.2704L7.85751 14.8614L4.08643 11.0903Z");

checkSymbol2.appendChild(path12);
checkSymbol2.appendChild(path22);
switchContainer2.appendChild(xSymbol2);
switchContainer2.appendChild(checkSymbol2);

checkbox2.addEventListener('change', function() {
    if (this.checked) {
        slider2.style.backgroundColor = '#22ac42';
        sliderButton2.style.transform = 'translateX(17px)';
        xSymbol2.style.opacity = "0";
        checkSymbol2.style.opacity = "1";
        setTimeout(() => {
            xSymbol2.style.display = "none";
            checkSymbol2.style.display = "block";
        }, 200);
    } else {
        slider2.style.backgroundColor = '#7e878f';
        sliderButton2.style.transform = 'translateX(0)';
        xSymbol2.style.opacity = "1";
        checkSymbol2.style.opacity = "0";
        setTimeout(() => {
            xSymbol2.style.display = "block";
            checkSymbol2.style.display = "none";
        }, 200);
    }
});

function activateBox2() {
    slider2.style.backgroundColor = '#22ac42';
    sliderButton2.style.transform = 'translateX(17px)';
    xSymbol2.style.opacity = "0";
    checkSymbol2.style.opacity = "1";
    setTimeout(() => {
        xSymbol2.style.display = "none";
        checkSymbol2.style.display = "block";
    }, 200);
}

function deactivateBox2() {
    slider2.style.backgroundColor = '#7e878f';
    sliderButton2.style.transform = 'translateX(0)';
    xSymbol2.style.opacity = "1";
    checkSymbol2.style.opacity = "0";
    setTimeout(() => {
        xSymbol2.style.display = "block";
        checkSymbol2.style.display = "none";
    }, 200);
}

function loadDiashowStatus2() {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        let diashow = getRequest.result;
        if (diashow.menuReloadStatus === 'true') {
            activateBox2();
        } else {
            deactivateBox2();
        }
    };
    getRequest.onerror = function() {
        console.error("Error", getRequest.error);
    };
}

loadDiashowStatus2();

slider2.addEventListener('click', function() {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const getRequest = store.get("diashow");
    getRequest.onsuccess = function() {
        let diashow = getRequest.result;
        if (diashow.menuReloadStatus === 'true') {
            deactivateBox2();
            diashow.menuReloadStatus = 'false';
        } else {
            activateBox2();
            diashow.menuReloadStatus = 'true';
        }
        const putRequest = store.put(diashow);
        putRequest.onsuccess = function() {
            console.log("Diashow menu reload status saved successfully");
        };
        putRequest.onerror = function() {
            console.error("Error", putRequest.error);
        };
    };
});

const lenghtBox1 = document.createElement("div");
lenghtBox1.classList.add("diashow_box3");
const transaction3 = db.transaction(["BetterThemesDB"], "readonly");
const store3 = transaction3.objectStore("BetterThemesDB");
const request3 = store3.get("diashow");
request3.onsuccess = function() {
    const diashow = request3.result;
    if (diashow.isClicked === 1) {
        lenghtBox1.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghtBox1.style.backgroundColor = "#4e4e4e";
    }

};

lenghtBox1.style.marginTop = "-1px";
lenghtBox1.style.borderRadius = "0px 0px 0px 0px";
lenghtBox1.style.padding = "8px";
lenghtBox1.style.position = "absolute";
lenghtBox1.style.left = "164px";
lenghtBox1.style.border = "1px solid black";
lenghtBox1.style.marginLeft = "-20px";
const lenghtBox1TextElement = document.createElement('div');
lenghtBox1TextElement.classList.add("textinput8");
lenghtBox1TextElement.style.display = "flex";
lenghtBox1TextElement.style.justifyContent = "center";
lenghtBox1TextElement.style.alignItems = "center";
lenghtBox1TextElement.style.width = "100%";
lenghtBox1TextElement.style.height = "100%";
lenghtBox1TextElement.style.textAlign = "center";
lenghtBox1TextElement.textContent = "90s";
lenghtBox1TextElement.style.color = "white";
lenghtBox1TextElement.style.fontWeight = "500";
lenghtBox1TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghtBox1TextElement.style.fontSize = "14px";
lenghtBox1TextElement.style.fontStyle = "normal";
lenghtBox1TextElement.style.backgroundColor = lenghtBox1.style.backgroundColor;
lenghtBox1.appendChild(lenghtBox1TextElement);
longBox.appendChild(lenghtBox1);

lenghtBox1.addEventListener("mouseenter", () => {
    lenghtBox1.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghtBox1TextElement.style.backgroundColor = lenghtBox1.style.backgroundColor;
    lenghtBox1.style.cursor = "pointer";
});

lenghtBox1.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "90s";
        store.put(diashow);
    };
});

lenghtBox1.addEventListener('click', () => {
    lenghtBox1.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghtBox1.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 1) {
            lenghtBox1.style.backgroundColor = "#4e4e4e";
            lenghtBox1TextElement.style.backgroundColor = lenghtBox1.style.backgroundColor;
            lenghtBox1.style.cursor = "default";
        }
    };
});

lenghtBox1.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 1;
        store.put(diashow);
        lenghtBox1.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBox1TextElement.style.backgroundColor = lenghtBox1.style.backgroundColor;
    };
});

lenghtBox1TextElement.addEventListener("mouseenter", () => {
    lenghtBox1TextElement.style.cursor = "pointer";
});

lenghtBox1TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 1) {
            lenghtBox1.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBox1TextElement.style.backgroundColor = lenghtBox1.style.backgroundColor;
        }
    };
});

lenghtBox1.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghtBox1);

const lenghtBox2 = document.createElement("div");
lenghtBox2.classList.add("diashow_box3");
const transaction4 = db.transaction(["BetterThemesDB"], "readonly");
const store4 = transaction4.objectStore("BetterThemesDB");
const request4 = store4.get("diashow");
request4.onsuccess = function() {
    const diashow = request4.result;
    if (diashow.isClicked === 2) {
        lenghtBox2.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghtBox2.style.backgroundColor = "#4e4e4e";
    }
};
lenghtBox2.style.marginTop = "-1px";
lenghtBox2.style.borderRadius = "0px 0px 0px 0px";
lenghtBox2.style.padding = "8px";
lenghtBox2.style.position = "absolute";
lenghtBox2.style.left = "203px";
lenghtBox2.style.border = "1px solid black";
lenghtBox2.style.marginLeft = "-20px";
const lenghtBox2TextElement = document.createElement('div');
lenghtBox2TextElement.classList.add("textinput8");
lenghtBox2TextElement.style.display = "flex";
lenghtBox2TextElement.style.justifyContent = "center";
lenghtBox2TextElement.style.alignItems = "center";
lenghtBox2TextElement.style.width = "100%";
lenghtBox2TextElement.style.height = "100%";
lenghtBox2TextElement.style.textAlign = "center";
lenghtBox2TextElement.textContent = "5min";
lenghtBox2TextElement.style.color = "white";
lenghtBox2TextElement.style.fontWeight = "500";
lenghtBox2TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghtBox2TextElement.style.fontSize = "14px";
lenghtBox2TextElement.style.fontStyle = "normal";
lenghtBox2TextElement.style.backgroundColor = lenghtBox2.style.backgroundColor;

lenghtBox2.appendChild(lenghtBox2TextElement);

lenghtBox2.addEventListener("mouseenter", () => {
    lenghtBox2.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghtBox2TextElement.style.backgroundColor = lenghtBox2.style.backgroundColor;
    lenghtBox2.style.cursor = "pointer";
});

lenghtBox2.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "5m";
        store.put(diashow);
    };
});

lenghtBox2.addEventListener('click', () => {
    lenghtBox2.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghtBox2.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 2) {
            lenghtBox2.style.backgroundColor = "#4e4e4e";
            lenghtBox2TextElement.style.backgroundColor = lenghtBox2.style.backgroundColor;
            lenghtBox2.style.cursor = "default";
        }
    };
});

lenghtBox2.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 2;
        store.put(diashow);
        lenghtBox2.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBox2TextElement.style.backgroundColor = lenghtBox2.style.backgroundColor;
    };
});

lenghtBox2TextElement.addEventListener("mouseenter", () => {
    lenghtBox2TextElement.style.cursor = "pointer";
});

lenghtBox2TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 2) {
            lenghtBox2.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBox2TextElement.style.backgroundColor = lenghtBox2.style.backgroundColor;
        }
    };
});

lenghtBox2.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghtBox2);

const longhbox3 = document.createElement("div");
longhbox3.classList.add("diashow_box3");
const transaction5 = db.transaction(["BetterThemesDB"], "readonly");
const store5 = transaction5.objectStore("BetterThemesDB");
const request5 = store5.get("diashow");
request5.onsuccess = function() {
    const diashow = request5.result;
    if (diashow.isClicked === 3) {
        longhbox3.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        longhbox3.style.backgroundColor = "#4e4e4e";
    }
};
longhbox3.style.marginTop = "-1px";
longhbox3.style.borderRadius = "0px 0px 0px 0px";
longhbox3.style.padding = "8px";
longhbox3.style.position = "absolute";
longhbox3.style.left = "249px";
longhbox3.style.border = "1px solid black";
longhbox3.style.marginLeft = "-20px";
const longhbox3TextElement = document.createElement('div');
longhbox3TextElement.classList.add("textinput8");
longhbox3TextElement.style.display = "flex";
longhbox3TextElement.style.justifyContent = "center";
longhbox3TextElement.style.alignItems = "center";
longhbox3TextElement.style.width = "100%";
longhbox3TextElement.style.height = "100%";
longhbox3TextElement.style.textAlign = "center";
longhbox3TextElement.textContent = "15min";
longhbox3TextElement.style.color = "white";
longhbox3TextElement.style.fontWeight = "500";
longhbox3TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
longhbox3TextElement.style.fontSize = "14px";
longhbox3TextElement.style.fontStyle = "normal";
longhbox3TextElement.style.backgroundColor = longhbox3.style.backgroundColor;

longhbox3.appendChild(longhbox3TextElement);

longhbox3.addEventListener("mouseenter", () => {
    longhbox3.style.backgroundColor = darkenColor("#4e4e4e", 30);
    longhbox3TextElement.style.backgroundColor = longhbox3.style.backgroundColor;
    longhbox3.style.cursor = "pointer";
});

longhbox3.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "15m";
        store.put(diashow);
    };
});

longhbox3.addEventListener('click', () => {
    longhbox3.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

longhbox3.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 3) {
            longhbox3.style.backgroundColor = "#4e4e4e";
            longhbox3TextElement.style.backgroundColor = longhbox3.style.backgroundColor;
            longhbox3.style.cursor = "default";
        }
    };
});

longhbox3.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 3;
        store.put(diashow);
        longhbox3.style.backgroundColor = darkenColor("#4e4e4e", 30);
        longhbox3TextElement.style.backgroundColor = longhbox3.style.backgroundColor;
    };
});

longhbox3TextElement.addEventListener("mouseenter", () => {
    longhbox3TextElement.style.cursor = "pointer";
});

longhbox3TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 3) {
            longhbox3.style.backgroundColor = darkenColor("#4e4e4e", 30);
            longhbox3TextElement.style.backgroundColor = longhbox3.style.backgroundColor;
        }
    };
});

longhbox3.addEventListener("click", () => startDiashow(true));

longBox.appendChild(longhbox3);

const lenghbox4 = document.createElement("div");
lenghbox4.classList.add("diashow_box3");
const transaction6 = db.transaction(["BetterThemesDB"], "readonly");
const store6 = transaction6.objectStore("BetterThemesDB");
const request6 = store6.get("diashow");
request6.onsuccess = function() {
    const diashow = request6.result;
    if (diashow.isClicked === 4) {
        lenghbox4.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox4.style.backgroundColor = "#4e4e4e";
    }
};

lenghbox4.style.marginTop = "-1px";
lenghbox4.style.borderRadius = "0px 0px 0px 0px";
lenghbox4.style.padding = "8px";
lenghbox4.style.position = "absolute";
lenghbox4.style.left = "304px";
lenghbox4.style.border = "1px solid black";
lenghbox4.style.marginLeft = "-20px";
const lenghbox4TextElement = document.createElement('div');
lenghbox4TextElement.classList.add("textinput8");
lenghbox4TextElement.style.display = "flex";
lenghbox4TextElement.style.justifyContent = "center";
lenghbox4TextElement.style.alignItems = "center";
lenghbox4TextElement.style.width = "100%";
lenghbox4TextElement.style.height = "100%";
lenghbox4TextElement.style.textAlign = "center";
lenghbox4TextElement.textContent = "30min";
lenghbox4TextElement.style.color = "white";
lenghbox4TextElement.style.fontWeight = "500";
lenghbox4TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox4TextElement.style.fontSize = "14px";
lenghbox4TextElement.style.fontStyle = "normal";
lenghbox4TextElement.style.backgroundColor = lenghbox4.style.backgroundColor;

lenghbox4.appendChild(lenghbox4TextElement);

lenghbox4.addEventListener("mouseenter", () => {
    lenghbox4.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox4TextElement.style.backgroundColor = lenghbox4.style.backgroundColor;
    lenghbox4.style.cursor = "pointer";
});

lenghbox4.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "30m";
        store.put(diashow);
    };
});

lenghbox4.addEventListener('click', () => {
    lenghbox4.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox4.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 4) {
            lenghbox4.style.backgroundColor = "#4e4e4e";
            lenghbox4TextElement.style.backgroundColor = lenghbox4.style.backgroundColor;
            lenghbox4.style.cursor = "default";
        }
    };
});

lenghbox4.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 4;
        store.put(diashow);
        lenghbox4.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox4TextElement.style.backgroundColor = lenghbox4.style.backgroundColor;
    };
});

lenghbox4TextElement.addEventListener("mouseenter", () => {
    lenghbox4TextElement.style.cursor = "pointer";
});

lenghbox4TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 4) {
            lenghbox4.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox4TextElement.style.backgroundColor = lenghbox4.style.backgroundColor;
        }
    };
});

lenghbox4.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghbox4);

const lenghtbox5 = document.createElement("div");
lenghtbox5.classList.add("diashow_box3");
const transaction7 = db.transaction(["BetterThemesDB"], "readonly");
const store7 = transaction7.objectStore("BetterThemesDB");
const request7 = store7.get("diashow");
request7.onsuccess = function() {
    const diashow = request7.result;
    if (diashow.isClicked === 5) {
        lenghtbox5.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghtbox5.style.backgroundColor = "#4e4e4e";
    }
};

lenghtbox5.style.marginTop = "-1px";
lenghtbox5.style.borderRadius = "0px 0px 0px 0px";
lenghtbox5.style.padding = "8px";
lenghtbox5.style.position = "absolute";
lenghtbox5.style.left = "358px";
lenghtbox5.style.border = "1px solid black";
lenghtbox5.style.marginLeft = "-20px";
const lenghtbox5TextElement = document.createElement('div');
lenghtbox5TextElement.classList.add("textinput8");
lenghtbox5TextElement.style.display = "flex";
lenghtbox5TextElement.style.justifyContent = "center";
lenghtbox5TextElement.style.alignItems = "center";
lenghtbox5TextElement.style.width = "100%";
lenghtbox5TextElement.style.height = "100%";
lenghtbox5TextElement.style.textAlign = "center";
lenghtbox5TextElement.textContent = "\u00A01h\u00A0";
lenghtbox5TextElement.style.color = "white";
lenghtbox5TextElement.style.fontWeight = "500";
lenghtbox5TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghtbox5TextElement.style.fontSize = "14px";
lenghtbox5TextElement.style.fontStyle = "normal";
lenghtbox5TextElement.style.backgroundColor = lenghtbox5.style.backgroundColor;

lenghtbox5.appendChild(lenghtbox5TextElement);

lenghtbox5.addEventListener("mouseenter", () => {
    lenghtbox5.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghtbox5TextElement.style.backgroundColor = lenghtbox5.style.backgroundColor;
    lenghtbox5.style.cursor = "pointer";
});

lenghtbox5.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "1h";
        store.put(diashow);
    };
});

lenghtbox5.addEventListener('click', () => {
    lenghtbox5.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghtbox5.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 5) {
            lenghtbox5.style.backgroundColor = "#4e4e4e";
            lenghtbox5TextElement.style.backgroundColor = lenghtbox5.style.backgroundColor;
            lenghtbox5.style.cursor = "default";
        }
    };
});

lenghtbox5.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 5;
        store.put(diashow);
        lenghtbox5.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtbox5TextElement.style.backgroundColor = lenghtbox5.style.backgroundColor;
    };
});

lenghtbox5TextElement.addEventListener("mouseenter", () => {
    lenghtbox5TextElement.style.cursor = "pointer";
});

lenghtbox5TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 5) {
            lenghtbox5.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtbox5TextElement.style.backgroundColor = lenghtbox5.style.backgroundColor;
        }
    };
});

lenghtbox5.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghtbox5);

const lenghbox6 = document.createElement("div");
lenghbox6.classList.add("diashow_box3");
const transaction8 = db.transaction(["BetterThemesDB"], "readonly");
const store8 = transaction8.objectStore("BetterThemesDB");
const request8 = store8.get("diashow");
request8.onsuccess = function() {
    const diashow = request8.result;
    if (diashow.isClicked === 6) {
        lenghbox6.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox6.style.backgroundColor = "#4e4e4e";
    }
};
lenghbox6.style.marginTop = "-1px";
lenghbox6.style.borderRadius = "0px 0px 0px 0px";
lenghbox6.style.padding = "8px";
lenghbox6.style.position = "absolute";
lenghbox6.style.left = "398px";
lenghbox6.style.border = "1px solid black";
lenghbox6.style.marginLeft = "-20px";
const lenghbox6TextElement = document.createElement('div');
lenghbox6TextElement.classList.add("textinput8");
lenghbox6TextElement.style.display = "flex";
lenghbox6TextElement.style.justifyContent = "center";
lenghbox6TextElement.style.alignItems = "center";
lenghbox6TextElement.style.width = "100%";
lenghbox6TextElement.style.height = "100%";
lenghbox6TextElement.style.textAlign = "center";
lenghbox6TextElement.textContent = "\u00A03h\u00A0";
lenghbox6TextElement.style.color = "white";
lenghbox6TextElement.style.fontWeight = "500";
lenghbox6TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox6TextElement.style.fontSize = "14px";
lenghbox6TextElement.style.fontStyle = "normal";
lenghbox6TextElement.style.backgroundColor = lenghbox6.style.backgroundColor;

lenghbox6.appendChild(lenghbox6TextElement);

lenghbox6.addEventListener("mouseenter", () => {
    lenghbox6.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox6TextElement.style.backgroundColor = lenghbox6.style.backgroundColor;
    lenghbox6.style.cursor = "pointer";
});

lenghbox6.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "3h";
        store.put(diashow);
    };
});

lenghbox6.addEventListener('click', () => {
    lenghbox6.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox6.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 6) {
            lenghbox6.style.backgroundColor = "#4e4e4e";
            lenghbox6TextElement.style.backgroundColor = lenghbox6.style.backgroundColor;
            lenghbox6.style.cursor = "default";
        }
    };
});

lenghbox6.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 6;
        store.put(diashow);
        lenghbox6.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox6TextElement.style.backgroundColor = lenghbox6.style.backgroundColor;
    };
});

lenghbox6TextElement.addEventListener("mouseenter", () => {
    lenghbox6TextElement.style.cursor = "pointer";
});

lenghbox6TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 6) {
            lenghbox6.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox6TextElement.style.backgroundColor = lenghbox6.style.backgroundColor;
        }
    };
});

lenghbox6.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghbox6);

const lenghbox7 = document.createElement("div");
lenghbox7.classList.add("diashow_box3");
const transaction9 = db.transaction(["BetterThemesDB"], "readonly");
const store9 = transaction9.objectStore("BetterThemesDB");

const request9 = store9.get("diashow");
request9.onsuccess = function() {
    const diashow = request9.result;
    if (diashow.isClicked === 7) {
        lenghbox7.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox7.style.backgroundColor = "#4e4e4e";
    }
};
lenghbox7.style.marginTop = "-1px";
lenghbox7.style.borderRadius = "0px 0px 0px 0px";
lenghbox7.style.padding = "8px";
lenghbox7.style.position = "absolute";
lenghbox7.style.left = "438px";
lenghbox7.style.border = "1px solid black";
lenghbox7.style.marginLeft = "-20px";
const lenghbox7TextElement = document.createElement('div');
lenghbox7TextElement.classList.add("textinput8");
lenghbox7TextElement.style.display = "flex";
lenghbox7TextElement.style.justifyContent = "center";
lenghbox7TextElement.style.alignItems = "center";
lenghbox7TextElement.style.width = "100%";
lenghbox7TextElement.style.height = "100%";
lenghbox7TextElement.style.textAlign = "center";
lenghbox7TextElement.textContent = "12h";
lenghbox7TextElement.style.color = "white";
lenghbox7TextElement.style.fontWeight = "500";
lenghbox7TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox7TextElement.style.fontSize = "14px";
lenghbox7TextElement.style.fontStyle = "normal";
lenghbox7TextElement.style.backgroundColor = lenghbox7.style.backgroundColor;

lenghbox7.appendChild(lenghbox7TextElement);

lenghbox7.addEventListener("mouseenter", () => {
    lenghbox7.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox7TextElement.style.backgroundColor = lenghbox7.style.backgroundColor;
    lenghbox7.style.cursor = "pointer";
});

lenghbox7.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "12h";
        store.put(diashow);
    };
});

lenghbox7.addEventListener('click', () => {
    lenghbox7.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox7.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 7) {
            lenghbox7.style.backgroundColor = "#4e4e4e";
            lenghbox7TextElement.style.backgroundColor = lenghbox7.style.backgroundColor;
            lenghbox7.style.cursor = "default";
        }
    };
});

lenghbox7.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 7;
        store.put(diashow);
        lenghbox7.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox7TextElement.style.backgroundColor = lenghbox7.style.backgroundColor;
    };
});

lenghbox7TextElement.addEventListener("mouseenter", () => {
    lenghbox7TextElement.style.cursor = "pointer";
});

lenghbox7TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 7) {
            lenghbox7.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox7TextElement.style.backgroundColor = lenghbox7.style.backgroundColor;
        }
    };
});

lenghbox7.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghbox7);

const lenghbox8 = document.createElement("div");
lenghbox8.classList.add("diashow_box3");
const transaction10 = db.transaction(["BetterThemesDB"], "readonly");
const store10 = transaction10.objectStore("BetterThemesDB");
const request10 = store10.get("diashow");
request10.onsuccess = function() {
    const diashow = request10.result;
    if (diashow.isClicked === 8) {
        lenghbox8.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox8.style.backgroundColor = "#4e4e4e";
    }
};
lenghbox8.style.marginTop = "-1px";
lenghbox8.style.borderRadius = "0px 0px 0px 0px";
lenghbox8.style.padding = "8px";
lenghbox8.style.position = "absolute";
lenghbox8.style.left = "478px";
lenghbox8.style.border = "1px solid black";
lenghbox8.style.marginLeft = "-20px";
const lenghbox8TextElement = document.createElement('div');
lenghbox8TextElement.classList.add("textinput8");
lenghbox8TextElement.style.display = "flex";
lenghbox8TextElement.style.justifyContent = "center";
lenghbox8TextElement.style.alignItems = "center";
lenghbox8TextElement.style.width = "100%";
lenghbox8TextElement.style.height = "100%";
lenghbox8TextElement.style.textAlign = "center";
lenghbox8TextElement.textContent = "\u00A01d\u00A0";
lenghbox8TextElement.style.color = "white";
lenghbox8TextElement.style.fontWeight = "500";
lenghbox8TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox8TextElement.style.fontSize = "14px";
lenghbox8TextElement.style.fontStyle = "normal";
lenghbox8TextElement.style.backgroundColor = lenghbox8.style.backgroundColor;

lenghbox8.appendChild(lenghbox8TextElement);

lenghbox8.addEventListener("mouseenter", () => {
    lenghbox8.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox8TextElement.style.backgroundColor = lenghbox8.style.backgroundColor;
    lenghbox8.style.cursor = "pointer";
});

lenghbox8.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "1d";
        store.put(diashow);
    };
});

lenghbox8.addEventListener('click', () => {
    lenghbox8.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox8.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 8) {
            lenghbox8.style.backgroundColor = "#4e4e4e";
            lenghbox8TextElement.style.backgroundColor = lenghbox8.style.backgroundColor;
            lenghbox8.style.cursor = "default";
        }
    };
});

lenghbox8.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 8;
        store.put(diashow);
        lenghbox8.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox8TextElement.style.backgroundColor = lenghbox8.style.backgroundColor;
    };
});

lenghbox8TextElement.addEventListener("mouseenter", () => {
    lenghbox8TextElement.style.cursor = "pointer";
});

lenghbox8TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 8) {
            lenghbox8.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox8TextElement.style.backgroundColor = lenghbox8.style.backgroundColor;
        }
    };
});

lenghbox8.addEventListener("click", changeThemeByDay);
lenghbox8.addEventListener("click", updateTheme);

longBox.appendChild(lenghbox8);

const lenghbox9 = document.createElement("div");
lenghbox9.classList.add("diashow_box3");
const transaction11 = db.transaction(["BetterThemesDB"], "readonly");
const store11 = transaction11.objectStore("BetterThemesDB");
const request11 = store11.get("diashow");
request11.onsuccess = function() {
    const diashow = request11.result;
    if (diashow.isClicked === 9) {
        lenghbox9.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox9.style.backgroundColor = "#4e4e4e";
    }
};
lenghbox9.style.marginTop = "-1px";
lenghbox9.style.borderRadius = "0px 50px 50px 0px";
lenghbox9.style.padding = "8px";
lenghbox9.style.position = "absolute";
lenghbox9.style.left = "518px";
lenghbox9.style.border = "1px solid black";
lenghbox9.style.marginLeft = "-20px";
const lenghbox9TextElement = document.createElement('div');
lenghbox9TextElement.classList.add("textinput8");
lenghbox9TextElement.style.display = "flex";
lenghbox9TextElement.style.justifyContent = "center";
lenghbox9TextElement.style.alignItems = "center";
lenghbox9TextElement.style.width = "100%";
lenghbox9TextElement.style.height = "100%";
lenghbox9TextElement.style.textAlign = "center";
lenghbox9TextElement.textContent = "\u00A01w\u00A0";
lenghbox9TextElement.style.color = "white";
lenghbox9TextElement.style.fontWeight = "500";
lenghbox9TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox9TextElement.style.fontSize = "14px";
lenghbox9TextElement.style.fontStyle = "normal";
lenghbox9TextElement.style.backgroundColor = lenghbox9.style.backgroundColor;

lenghbox9.appendChild(lenghbox9TextElement);

lenghbox9.addEventListener("mouseenter", () => {
    lenghbox9.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox9TextElement.style.backgroundColor = lenghbox9.style.backgroundColor;
    lenghbox9.style.cursor = "pointer";
});

lenghbox9.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.time = "1w";
        store.put(diashow);
    };
});

lenghbox9.addEventListener('click', () => {
    lenghbox9.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox9.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 9) {
            lenghbox9.style.backgroundColor = "#4e4e4e";
            lenghbox9TextElement.style.backgroundColor = lenghbox9.style.backgroundColor;
            lenghbox9.style.cursor = "default";
        }
    };
});

lenghbox9.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 9;
        store.put(diashow);
        lenghbox9.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox9TextElement.style.backgroundColor = lenghbox9.style.backgroundColor;
    };
});

lenghbox9TextElement.addEventListener("mouseenter", () => {
    lenghbox9TextElement.style.cursor = "pointer";
});

lenghbox9TextElement.addEventListener("mouseleave", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 9) {
            lenghbox9.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox9TextElement.style.backgroundColor = lenghbox9.style.backgroundColor;
        }
    };
});

lenghbox9.addEventListener("click", changeThemeByWeek);
lenghbox9.addEventListener("click", updateTheme);

longBox.appendChild(lenghbox9);

const lenghbox18 = document.createElement("div");
lenghbox18.classList.add("diashow_box3");
const transaction12 = db.transaction(["BetterThemesDB"], "readonly");
const store12 = transaction12.objectStore("BetterThemesDB");
const request12 = store12.get("diashow");
request12.onsuccess = function() {
    const diashow = request12.result;
    if (diashow.isClicked === 10) {
        lenghbox18.style.backgroundColor = darkenColor("#4e4e4e", 30);
    }
    else {
        lenghbox18.style.backgroundColor = "#4e4e4e";
    }
};
lenghbox18.style.marginTop = "-1px";
lenghbox18.style.borderRadius = "50px 50px 50px 50px";
lenghbox18.style.padding = "8px";
lenghbox18.style.position = "absolute";
lenghbox18.style.left = "570px";
lenghbox18.style.border = "1px solid black";
lenghbox18.style.marginLeft = "-20px";
const lenghbox18TextElement = document.createElement('div');
lenghbox18TextElement.classList.add("textinput8");
lenghbox18TextElement.style.display = "flex";
lenghbox18TextElement.style.justifyContent = "center";
lenghbox18TextElement.style.alignItems = "center";
lenghbox18TextElement.style.width = "100%";
lenghbox18TextElement.style.height = "100%";
lenghbox18TextElement.style.textAlign = "center";
lenghbox18TextElement.textContent = "Set:\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
lenghbox18TextElement.style.color = "white";
lenghbox18TextElement.style.fontWeight = "500";
lenghbox18TextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
lenghbox18TextElement.style.fontSize = "14px";
lenghbox18TextElement.style.fontStyle = "normal";
lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;

lenghbox18.appendChild(lenghbox18TextElement);

lenghbox18.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
            const inputValue = lenghtBoxTextElement19.value;
            if (inputValue === '') {
                data.time = lenghtBoxTextElement19.placeholder;
            } else {
                data.time = inputValue;
            }
            store.put(data);
        }
    };
});

lenghbox18.addEventListener("mouseenter", () => {
    lenghbox18.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
    lenghbox18.style.cursor = "pointer";
});

lenghbox18.addEventListener('click', () => {
    lenghbox18.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box3, .textinput8').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

lenghbox18.addEventListener("mouseout", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 10) {
            lenghbox18.style.backgroundColor = "#4e4e4e";
            lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
            lenghbox18.style.cursor = "default";
        }
    };
});

lenghbox18.addEventListener("mouseenter", () => {
    lenghbox18.style.backgroundColor = darkenColor("#4e4e4e", 30);
    lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
    lenghbox18.style.cursor = "pointer";
});

lenghbox18.addEventListener("click", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readwrite");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        diashow.isClicked = 10;
        store.put(diashow);
        lenghbox18.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
    };
});

lenghbox18TextElement.addEventListener("mouseover", () => {
    lenghbox18TextElement.style.cursor = "pointer";
});

lenghbox18TextElement.addEventListener("mouseover", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 10) {
            lenghbox18.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
        }
    };
});

lenghbox18TextElement.addEventListener("mouseout", () => {
    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        if (diashow.isClicked !== 10) {
            lenghbox18.style.backgroundColor = "#4e4e4e";
            lenghbox18TextElement.style.backgroundColor = lenghbox18.style.backgroundColor;
        }
    };
});

lenghbox18.addEventListener("click", () => startDiashow(true));

longBox.appendChild(lenghbox18);

        const lenghtBoxTextElement19 = document.createElement('input');
        lenghtBoxTextElement19.classList.add("textinput9");
        lenghtBoxTextElement19.style.position = "absolute";
        lenghtBoxTextElement19.style.left = "45px";
        lenghtBoxTextElement19.style.justifyContent = "center";
        lenghtBoxTextElement19.style.alignItems = "center";
        lenghtBoxTextElement19.style.width = "40px";
        lenghtBoxTextElement19.style.height = "25px";
        lenghtBoxTextElement19.style.textAlign = "center";
        lenghtBoxTextElement19.style.bottom = "2px";
        lenghtBoxTextElement19.style.color = "white";
        lenghtBoxTextElement19.style.fontWeight = "500";
        lenghtBoxTextElement19.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        lenghtBoxTextElement19.style.fontSize = "14px";
        lenghtBoxTextElement19.style.fontStyle = "normal";
        lenghtBoxTextElement19.style.border = "1px solid black";
        lenghtBoxTextElement19.style.borderRadius = "5px";
        lenghtBoxTextElement19.style.backgroundColor = "#4e4e4e";
    const style2 = document.createElement('style');
    style2.textContent = `
    .textinput8::placeholder {
        color: #dbdbdb;
    }`;

    document.head.append(style2);

    const newTransaction2 = db.transaction(["BetterThemesDB"], "readonly");
    const newStore2 = newTransaction2.objectStore("BetterThemesDB");
    const newRequest2 = newStore2.get("diashow");
    newRequest2.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
        lenghtBoxTextElement19.placeholder = data.time;
        }
    };

    lenghtBoxTextElement19.addEventListener('click', function(event) {
        event.stopPropagation();
    });

const textElement2 = document.createElement('span');
textElement2.classList.add("description_text1");
textElement2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
textElement2.innerHTML = '<span style="color: red;">off</span><span style="color: white;">/</span><span style="color: green;">on</span>';
textElement2.style.left = "10px";
textElement2.style.top = "336px";
textElement2.style.scale = "1.8";
textElement2.style.fontSize = '8px';
textElement2.style.position = 'absolute';

longBox.appendChild(textElement2);

const textElement3 = document.createElement('span');
textElement3.classList.add("description_text2");
textElement3.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
textElement3.innerHTML = 'Always <br>display<br>this menu';
textElement3.style.color = "white";
textElement3.style.left = "2px";
textElement3.style.top = "376px";
textElement3.style.fontSize = '8px';
textElement3.style.position = 'absolute';

lenghbox18.appendChild(lenghtBoxTextElement19);

    const longBox2 = document.createElement("div");
    longBox2.classList.add("diashow_box2");
    longBox2.style.height = "40px";
    longBox2.style.width = "70%";
    longBox2.style.border = "none";
    longBox2.style.backgroundColor = "transparent";
    longBox2.style.borderRadius = "50px";
    longBox2.style.marginLeft = "-10px";

    targetElement.appendChild(longBox2);
    longBox2.appendChild(textElement3);

    //MARK:DIASHOW SELECTION

    const lenghtBox10 = document.createElement("div");
        lenghtBox10.classList.add("diashow_box5");
        lenghtBox10.style.backgroundColor = "#272727";
        lenghtBox10.style.marginTop = "-1px";
        lenghtBox10.style.borderRadius = "50px 0px 0px 50px";
        lenghtBox10.style.padding = "8px";
        lenghtBox10.style.position = "absolute";
        lenghtBox10.style.left = "110px";
        lenghtBox10.style.border = "1px solid black";
        lenghtBox10.style.marginLeft = "-20px";
        const lenghtBoxTextElement10 = document.createElement('div');
        lenghtBoxTextElement10.classList.add("textinput10");
        lenghtBoxTextElement10.style.display = "flex";
        lenghtBoxTextElement10.style.justifyContent = "center";
        lenghtBoxTextElement10.style.alignItems = "center";
        lenghtBoxTextElement10.style.width = "100%";
        lenghtBoxTextElement10.style.height = "100%";
        lenghtBoxTextElement10.style.textAlign = "center";
        lenghtBoxTextElement10.textContent = "Selection Type";
        lenghtBoxTextElement10.style.color = "white";
        lenghtBoxTextElement10.style.fontWeight = "500";
        lenghtBoxTextElement10.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        lenghtBoxTextElement10.style.fontSize = "14px";
        lenghtBoxTextElement10.style.fontStyle = "normal";
        lenghtBoxTextElement10.style.backgroundColor = lenghtBox2.style.backgroundColor;

        lenghtBox10.appendChild(lenghtBoxTextElement10);
        longBox2.appendChild(lenghtBox10);
        longBox2.appendChild(switchContainer2);

        const lenghtBox11 = document.createElement("div");
        lenghtBox11.classList.add("diashow_box4");
        const transaction13 = db.transaction(["BetterThemesDB"], "readonly");
        const store13 = transaction13.objectStore("BetterThemesDB");
        const request13 = store13.get("diashow");
        request13.onsuccess = function() {
        const diashow = request13.result;
        if (diashow.isClicked2 === 1) {
            lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
        }
        else {
            lenghtBox11.style.backgroundColor = "#4e4e4e";
        }
        };
        lenghtBox11.style.marginTop = "-1px";
        lenghtBox11.style.borderRadius = "0px 0px 0px 0px";
        lenghtBox11.style.padding = "8px";
        lenghtBox11.style.position = "absolute";
        lenghtBox11.style.left = "218px";
        lenghtBox11.style.border = "1px solid black";
        lenghtBox11.style.marginLeft = "-20px";
        lenghtBox11.style.zIndex = "1";
        const lenghtBoxTextElement11 = document.createElement('div');
        lenghtBoxTextElement11.classList.add("textinput9");
        lenghtBoxTextElement11.style.display = "flex";
        lenghtBoxTextElement11.style.justifyContent = "center";
        lenghtBoxTextElement11.style.alignItems = "center";
        lenghtBoxTextElement11.style.width = "100%";
        lenghtBoxTextElement11.style.height = "100%";
        lenghtBoxTextElement11.style.textAlign = "center";
        lenghtBoxTextElement11.textContent = "\u00A0Randomized\u00A0";
        lenghtBoxTextElement11.style.color = "white";
        lenghtBoxTextElement11.style.fontWeight = "500";
        lenghtBoxTextElement11.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        lenghtBoxTextElement11.style.fontSize = "14px";
        lenghtBoxTextElement11.style.fontStyle = "normal";
        lenghtBoxTextElement11.style.backgroundColor = lenghtBox2.style.backgroundColor;

        lenghtBox11.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = (event) => {
            const data = event.target.result;
            if (data) {
            data.order = "randomized";
            store.put(data);
            }
        };
        });

    lenghtBox11.addEventListener("mouseenter", () => {
        lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
        lenghtBox11.style.cursor = "pointer";
    });

    lenghtBox11.addEventListener('click', () => {
        lenghtBox11.style.backgroundColor = '#4e4e4e';
        document.querySelectorAll('.diashow_box4, .textinput9').forEach(otherElement => {
            if (otherElement !== lenghtBox13) {
                (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
            }
        });
    });

    lenghtBox11.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 1) {
                lenghtBox11.style.backgroundColor = "#4e4e4e";
                lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
                lenghtBox11.style.cursor = "default";
            }
        };
    });

    lenghtBox11.addEventListener("mouseenter", () => {
            lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
    });

    lenghtBox11.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            diashow.isClicked2 = 1;
            store.put(diashow);
            lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
        };
    });

    lenghtBoxTextElement11.addEventListener("mouseenter", () => {
        lenghtBoxTextElement11.style.cursor = "pointer";
    });

    lenghtBoxTextElement11.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 1) {
                lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
            }
        };
    });

    lenghtBoxTextElement11.addEventListener("mouseenter", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 1) {
                lenghtBox11.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement11.style.backgroundColor = lenghtBox11.style.backgroundColor;
            }
        };
    });

    lenghtBox11.addEventListener("click", () => startDiashow(true));

    lenghtBox11.appendChild(lenghtBoxTextElement11);
    longBox2.appendChild(lenghtBox11);

    const lenghtBox12 = document.createElement("div");
    lenghtBox12.classList.add("diashow_box4");
    const transaction14 = db.transaction(["BetterThemesDB"], "readonly");
    const store14 = transaction14.objectStore("BetterThemesDB");
    const request14 = store14.get("diashow");
    request14.onsuccess = function() {
        const diashow = request14.result;
        if (diashow.isClicked2 === 2) {
            lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
        }
        else {
            lenghtBox12.style.backgroundColor = "#4e4e4e";
        }
    };
    lenghtBox12.style.marginTop = "-1px";
    lenghtBox12.style.borderRadius = "0px 0px 0px 0px";
    lenghtBox12.style.padding = "8px";
    lenghtBox12.style.position = "absolute";
    lenghtBox12.style.left = "320px";
    lenghtBox12.style.border = "1px solid black";
    lenghtBox12.style.marginLeft = "-20px";
    lenghtBox12.style.zIndex = "1";
        const lenghtBoxTextElement12 = document.createElement('div');
        lenghtBoxTextElement12.classList.add("textinput9");
        lenghtBoxTextElement12.style.display = "flex";
        lenghtBoxTextElement12.style.justifyContent = "center";
        lenghtBoxTextElement12.style.alignItems = "center";
        lenghtBoxTextElement12.style.width = "100%";
        lenghtBoxTextElement12.style.height = "100%";
        lenghtBoxTextElement12.style.textAlign = "center";
        lenghtBoxTextElement12.textContent = "\u00A0In Order\u00A0";
        lenghtBoxTextElement12.style.color = "white";
        lenghtBoxTextElement12.style.fontWeight = "500";
        lenghtBoxTextElement12.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        lenghtBoxTextElement12.style.fontSize = "14px";
        lenghtBoxTextElement12.style.fontStyle = "normal";
        lenghtBoxTextElement12.style.backgroundColor = lenghtBox2.style.backgroundColor;

            lenghtBox12.addEventListener("click", () => {
                const transaction = db.transaction(["BetterThemesDB"], "readwrite");
                const store = transaction.objectStore("BetterThemesDB");
                const request = store.get("diashow");
                request.onsuccess = (event) => {
                const data = event.target.result;
                if (data) {
                    data.order = "in order";
                    data.last = "0"
                    store.put(data);
                }
                };
            });

    lenghtBox12.addEventListener("mouseenter", () => {
        lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
        lenghtBox12.style.cursor = "pointer";
    });

lenghtBox12.addEventListener('click', () => {
    lenghtBox12.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box4, .textinput9').forEach(otherElement => {
        if (otherElement !== lenghtBox12) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

    lenghtBox12.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 2) {
                lenghtBox12.style.backgroundColor = "#4e4e4e";
                lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
                lenghtBox12.style.cursor = "default";
            }
        };
    });

    lenghtBox12.addEventListener("mouseenter", () => {
            lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
    });

    lenghtBox12.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            diashow.isClicked2 = 2;
            store.put(diashow);
            lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
        };
    });

    lenghtBoxTextElement12.addEventListener("mouseenter", () => {
        lenghtBoxTextElement12.style.cursor = "pointer";
    });

    lenghtBoxTextElement12.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 2) {
                lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
            }
        };
    });

    lenghtBoxTextElement12.addEventListener("mouseenter", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 2) {
                lenghtBox12.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement12.style.backgroundColor = lenghtBox12.style.backgroundColor;
            }
        };
    });

    lenghtBox12.addEventListener("click", () => startDiashow(true));

    lenghtBox12.appendChild(lenghtBoxTextElement12);
    longBox2.appendChild(lenghtBox12);

    const lenghtBox13 = document.createElement("div");
    lenghtBox13.classList.add("diashow_box4");
    const transaction15 = db.transaction(["BetterThemesDB"], "readonly");
    const store15 = transaction15.objectStore("BetterThemesDB");
    const request15 = store15.get("diashow");
    request15.onsuccess = function() {
        const diashow = request15.result;
        if (diashow.isClicked2 === 3) {
            lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
        }
        else {
            lenghtBox13.style.backgroundColor = "#4e4e4e";
        }
    };
    lenghtBox13.style.marginTop = "-1px";
    lenghtBox13.style.borderRadius = "0px 50px 50px 0px";
    lenghtBox13.style.padding = "8px";
    lenghtBox13.style.position = "absolute";
    lenghtBox13.style.left = "386px";
    lenghtBox13.style.border = "1px solid black";
    lenghtBox13.style.marginLeft = "-20px";
    const lenghtBoxTextElement13 = document.createElement('div');
    lenghtBoxTextElement13.classList.add("textinput9");
    lenghtBoxTextElement13.style.display = "flex";
    lenghtBoxTextElement13.style.justifyContent = "center";
    lenghtBoxTextElement13.style.alignItems = "center";
    lenghtBoxTextElement13.style.width = "100%";
    lenghtBoxTextElement13.style.height = "100%";
    lenghtBoxTextElement13.style.textAlign = "center";
    lenghtBoxTextElement13.textContent = "\u00A0Custom\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
    lenghtBoxTextElement13.style.color = "white";
    lenghtBoxTextElement13.style.fontWeight = "500";
    lenghtBoxTextElement13.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    lenghtBoxTextElement13.style.fontSize = "14px";
    lenghtBoxTextElement13.style.fontStyle = "normal";
    lenghtBoxTextElement13.style.backgroundColor = lenghtBox2.style.backgroundColor;

    lenghtBox13.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = (event) => {
            const data = event.target.result;
            if (data) {
                data.order = "custom";
                data.last = "0"
                store.put(data);
            }
        };
    });

    lenghtBox13.addEventListener("mouseenter", () => {
        lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
        lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
        lenghtBox13.style.cursor = "pointer";
    });

lenghtBox13.addEventListener('click', () => {
    lenghtBox13.style.backgroundColor = '#4e4e4e';
    document.querySelectorAll('.diashow_box4, .textinput9').forEach(otherElement => {
        if (otherElement !== lenghtBox13) {
            (otherElement as HTMLElement).style.backgroundColor = '#4e4e4e';
        }
    });
});

    lenghtBox13.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 3) {
                lenghtBox13.style.backgroundColor = "#4e4e4e";
                lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
                lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
                lenghtBox13.style.cursor = "default";
            }
        };
    });

    lenghtBox13.addEventListener("mouseenter", () => {
            lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
            lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
    });

    lenghtBox13.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            diashow.isClicked2 = 3;
            store.put(diashow);
            lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
            lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
            lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
        };
    });

    lenghtBoxTextElement13.addEventListener("mouseenter", () => {
        lenghtBoxTextElement13.style.cursor = "pointer";
    });

    lenghtBoxTextElement13.addEventListener("mouseleave", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 3) {
                lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
                lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
            }
        };
    });

    lenghtBoxTextElement13.addEventListener("mouseenter", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readonly");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = function() {
            const diashow = request.result;
            if (diashow.isClicked2 !== 3) {
                lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
                lenghtBoxTextElement13.style.backgroundColor = lenghtBox13.style.backgroundColor;
                lenghtBoxTextElement132.style.backgroundColor = lenghtBox13.style.backgroundColor;
            }
        };
    });

    lenghtBox13.addEventListener("click", () => startDiashow(true));

    lenghtBox13.appendChild(lenghtBoxTextElement13);
    longBox2.appendChild(lenghtBox13);

    const lenghtBoxTextElement132 = document.createElement('div');
    lenghtBoxTextElement132.classList.add("textinput9");
    lenghtBoxTextElement132.style.top = "12px";
    lenghtBoxTextElement132.style.left = "324px";
    lenghtBoxTextElement132.style.position = "relative";
    lenghtBoxTextElement132.style.zIndex = "1";
    lenghtBoxTextElement132.style.justifyContent = "center";
    lenghtBoxTextElement132.style.alignItems = "center";
    lenghtBoxTextElement132.style.width = "20px";
    lenghtBoxTextElement132.style.height = "10px";
    lenghtBoxTextElement132.style.textAlign = "center";
    lenghtBoxTextElement132.style.color = "white";
    lenghtBoxTextElement132.style.fontWeight = "500";
    lenghtBoxTextElement132.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    lenghtBoxTextElement132.style.fontSize = "7px";
    lenghtBoxTextElement132.style.fontStyle = "normal";
    lenghtBoxTextElement132.style.pointerEvents = "none";

    lenghtBoxTextElement132.addEventListener("mouseenter", () => {
        lenghtBoxTextElement132.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBox13.style.backgroundColor = darkenColor("#4e4e4e", 30);
        lenghtBoxTextElement132.style.cursor = "pointer";
    });

    const transaction = db.transaction(["BetterThemesDB"], "readonly");
    const store = transaction.objectStore("BetterThemesDB");
    const request = store.get("diashow");
    request.onsuccess = function() {
        const diashow = request.result;
        let text = diashow.setorder;
        if (text.length > 10) {
            text = text.substring(0, 10) + "...";
        }
        lenghtBoxTextElement132.textContent = `(${text})`;
    };

    longBox2.appendChild(lenghtBoxTextElement132);

    const lenghtBox15 = document.createElement("div");
    lenghtBox15.classList.add("diashow_box6");
    lenghtBox15.style.backgroundColor = "#3b3b3b";
    lenghtBox15.style.marginTop = "-24px";
    lenghtBox15.style.borderRadius = "3px";
    lenghtBox15.style.padding = "5px";
    lenghtBox15.style.position = "absolute";
    lenghtBox15.style.left = "496px";
    lenghtBox15.style.bottom = "30px";
    lenghtBox15.style.border = "1px solid black";
    lenghtBox15.style.marginLeft = "-20px";
    lenghtBox15.style.zIndex = "1";
    const lenghtBoxTextElement15 = document.createElement('div');
    lenghtBoxTextElement15.classList.add("textinput5");
    lenghtBoxTextElement15.style.display = "flex";
    lenghtBoxTextElement15.style.justifyContent = "center";
    lenghtBoxTextElement15.style.alignItems = "center";
    lenghtBoxTextElement15.style.width = "100%";
    lenghtBoxTextElement15.style.height = "100%";
    lenghtBoxTextElement15.style.textAlign = "center";
    lenghtBoxTextElement15.textContent = "Set Order";
    lenghtBoxTextElement15.style.color = "white";
    lenghtBoxTextElement15.style.fontWeight = "500";
    lenghtBoxTextElement15.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    lenghtBoxTextElement15.style.fontSize = "10px";
    lenghtBoxTextElement15.style.fontStyle = "normal";
    lenghtBoxTextElement15.style.backgroundColor = lenghtBox15.style.backgroundColor;

    lenghtBox15.appendChild(lenghtBoxTextElement15);

    lenghtBox15.addEventListener("mouseover", () => {
        lenghtBox15.style.backgroundColor = darkenColor("#3b3b3b", 30);
        lenghtBoxTextElement15.style.backgroundColor = lenghtBox15.style.backgroundColor;
        lenghtBox15.style.cursor = "pointer";
    });

    lenghtBox15.addEventListener("click", () => {startDiashow()});

    lenghtBox15.addEventListener("mouseout", () => {
        lenghtBox15.style.backgroundColor = "#3b3b3b";
        lenghtBoxTextElement15.style.backgroundColor = lenghtBox15.style.backgroundColor;
        lenghtBox15.style.cursor = "default";
    });

    lenghtBox15.addEventListener("click", () => {
        let text = lenghtBoxTextElement16.value;
        if (text.length > 10) {
            text = text.substring(0, 10) + "...";
        }
        lenghtBoxTextElement132.textContent = `(${text})`;
    });

    lenghtBox15.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.get("diashow");
        request.onsuccess = (event) => {
            const data = event.target.result;
            if (data) {
                data.setorder = lenghtBoxTextElement16.value;
                store.put(data);
            }
        };
    });

    longBox2.appendChild(lenghtBox15);

    const lenghtBox16 = document.createElement("div");
    lenghtBox16.classList.add("diashow_box7");
    lenghtBox16.style.backgroundColor = "#4e4e4e";
    lenghtBox16.style.marginTop = "-1px";
    lenghtBox16.style.borderRadius = "50px 50px 50px 50px";
    lenghtBox16.style.padding = "4px";
    lenghtBox16.style.position = "absolute";
    lenghtBox16.style.left = "568px";
    lenghtBox16.style.border = "1px solid black";
    lenghtBox16.style.marginLeft = "-20px";
    lenghtBox16.style.bottom = "25px";
    lenghtBox16.style.width = "100px";
    const lenghtBoxTextElement16 = document.createElement('input');
    lenghtBoxTextElement16.classList.add("textinput9");
    lenghtBoxTextElement16.style.border = "1px solid black";
    lenghtBoxTextElement16.style.borderRadius = "5px";
    lenghtBoxTextElement16.style.display = "flex";
    lenghtBoxTextElement16.style.justifyContent = "center";
    lenghtBoxTextElement16.style.alignItems = "center";
    lenghtBoxTextElement16.style.width = "100%";
    lenghtBoxTextElement16.style.height = "100%";
    lenghtBoxTextElement16.style.textAlign = "center";
    lenghtBoxTextElement16.placeholder = "";
    lenghtBoxTextElement16.style.color = "white";
    lenghtBoxTextElement16.style.fontWeight = "500";
    lenghtBoxTextElement16.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    lenghtBoxTextElement16.style.fontSize = "14px";
    lenghtBoxTextElement16.style.fontStyle = "normal";
    lenghtBoxTextElement16.style.backgroundColor = "#4e4e4e";
    const style = document.createElement('style');
    style.textContent = `
    .textinput8::placeholder {
        color: gray;
    }`;

    document.head.append(style);

const newTransaction = db.transaction(["BetterThemesDB"], "readonly");
const newStore = newTransaction.objectStore("BetterThemesDB");
const newRequest = newStore.get("diashow");
newRequest.onsuccess = (event) => {
    const data = event.target.result;
    if (data) {
        lenghtBoxTextElement16.placeholder = data.setorder;
    }
};

        lenghtBox16.appendChild(lenghtBoxTextElement16);
        longBox2.appendChild(lenghtBox16);

    const cancelBox4 = document.createElement("div");
    cancelBox4.classList.add("cancel-box4");
    cancelBox4.style.backgroundColor = "";
    cancelBox4.style.borderRadius = "3px";
    cancelBox4.style.margin = "8px";
    cancelBox4.style.padding = "8px";
    cancelBox4.style.position = "absolute";
    cancelBox4.style.left = "570px";
    cancelBox4.style.bottom = "-5px";
    cancelBox4.style.width = "50px"
    cancelBox4.style.height = "20px";
    const cancelTextElement4 = document.createElement('div');
    cancelTextElement4.classList.add("textinput6");
    cancelTextElement4.style.display = "flex";
    cancelTextElement4.style.justifyContent = "center";
    cancelTextElement4.style.alignItems = "center";
    cancelTextElement4.style.width = "100%";
    cancelTextElement4.style.height = "100%";
    cancelTextElement4.style.textAlign = "center";
    cancelTextElement4.textContent = "Close";
    cancelTextElement4.style.color = "white";
    cancelTextElement4.style.fontWeight = "500";
    cancelTextElement4.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    cancelTextElement4.style.fontSize = "14px";
    cancelTextElement4.style.fontStyle = "normal";
    cancelTextElement4.style.backgroundColor = cancelBox4.style.backgroundColor;

    cancelBox4.appendChild(cancelTextElement4);

    cancelBox4.addEventListener("mouseover", () => {
        cancelBox4.style.backgroundColor = "";
        cancelTextElement4.style.backgroundColor = cancelBox4.style.backgroundColor;
        cancelTextElement4.style.textDecoration = "underline";
        cancelBox4.style.cursor = "pointer";
    });

    cancelBox4.addEventListener("mouseout", () => {
        cancelBox4.style.backgroundColor = "";
        cancelTextElement4.style.backgroundColor = cancelBox4.style.backgroundColor;
        cancelTextElement4.style.textDecoration = "none";
        cancelBox4.style.cursor = "default";
    });

cancelBox4.addEventListener("click", () => {
    const diashowBox1Elements = document.querySelectorAll('.diashow_box1');
    const diashowBox2Elements = document.querySelectorAll('.diashow_box2');
    diashowBox1Elements.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    diashowBox2Elements.forEach((element) => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });
    const editBoxes = document.querySelectorAll('.editbox4');
    editBoxes.forEach((editBox) => {
        if (editBox.parentNode) {
            editBox.parentNode.removeChild(editBox);
        }
    });
});

    longBox2.appendChild(cancelBox4);

});

targetElement.appendChild(diashowThemesBox);
targetElement.appendChild(scaleBox);

//MARK:EDIT THEMES

const editBox = document.createElement("div");
editBox.classList.add("test-box");
editBox.style.backgroundColor = "#4f4f4f";
editBox.style.marginTop = "-1px";
editBox.style.borderRadius = "3px";
editBox.style.padding = "8px";
const editTextElement = document.createElement('div');
editTextElement.classList.add("textinput5");
editTextElement.style.display = "flex";
editTextElement.style.justifyContent = "center";
editTextElement.style.alignItems = "center";
editTextElement.style.width = "100%";
editTextElement.style.height = "100%";
editTextElement.style.textAlign = "center";
editTextElement.textContent = "Edit Themes";
editTextElement.style.color = "white";
editTextElement.style.fontWeight = "500";
editTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
editTextElement.style.fontSize = "14px";
editTextElement.style.fontStyle = "normal";
editTextElement.style.backgroundColor = editBox.style.backgroundColor;

editBox.appendChild(editTextElement);

setTimeout(() => {
editBox.addEventListener("mouseover", () => {
    editBox.style.backgroundColor = darkenColor("#4f4f4f", 20);
    editTextElement.style.backgroundColor = editBox.style.backgroundColor;
    editBox.style.cursor = "pointer";
});

editBox.addEventListener("click", () => {

            const diashowBox1Elements = document.querySelectorAll('.diashow_box1');
            const diashowBox2Elements = document.querySelectorAll('.diashow_box2');
            diashowBox1Elements.forEach((element) => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            diashowBox2Elements.forEach((element) => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            const editBoxes = document.querySelectorAll('.editbox4');
            editBoxes.forEach((editBox) => {
                if (editBox.parentNode) {
                    editBox.parentNode.removeChild(editBox);
                }
            });
if (targetElement.contains(cancelBox2)) {
    targetElement.removeChild(cancelBox2);
}
if (targetElement.contains(saveBox)) {
    targetElement.removeChild(saveBox);
}
if (targetElement.contains(resetBox)) {
    targetElement.removeChild(resetBox);
}
const regulatorElement = targetElement.querySelector('.regulator');
if (regulatorElement && targetElement.contains(regulatorElement)) {
    targetElement.removeChild(regulatorElement);
}
});

editBox.addEventListener("mouseout", () => {
    editBox.style.backgroundColor = "#4f4f4f";
    editTextElement.style.backgroundColor = editBox.style.backgroundColor;
    editBox.style.cursor = "default";
});

editBox.addEventListener("click", () => {
    const existingEditBoxes = document.querySelectorAll('.editbox2');
    if (existingEditBoxes.length === 0) {
        const themeBoxes = document.querySelectorAll('.theme-box');
        themeBoxes.forEach((themebox) => {
            const editBox2 = document.createElement('div');
            editBox2.classList.add("editbox2");
            editBox2.style.backgroundColor = "#4f4f4f";
            editBox2.style.marginTop = "-1px";
            editBox2.style.borderRadius = "3px";
            editBox2.style.padding = "7px";
            editBox2.style.position = "absolute";
            const editTextElement2 = document.createElement('div');
            editTextElement2.classList.add("textinput5");
            editTextElement2.style.display = "flex";
            editTextElement2.style.justifyContent = "center";
            editTextElement2.style.alignItems = "center";
            editTextElement2.style.width = "100%";
            editTextElement2.style.height = "100%";
            editTextElement2.style.textAlign = "center";
            editTextElement2.textContent = "Edit";
            editTextElement2.style.color = "white";
            editTextElement2.style.fontWeight = "500";
            editTextElement2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
            editTextElement2.style.fontSize = "12px";
            editTextElement2.style.fontStyle = "normal";
            editTextElement2.style.backgroundColor = editBox2.style.backgroundColor;

            editBox2.appendChild(editTextElement2);
            themebox.appendChild(editBox2);

           const middle1 = ((themebox as HTMLElement).offsetHeight - (editBox2 as HTMLElement).offsetHeight) / 2;
           (editBox2 as HTMLElement).style.marginTop = `${2 * middle1 + 30}px`;
           const middle = ((themebox as HTMLElement).offsetWidth - (editBox2 as HTMLElement).offsetWidth) / 2;
            editBox2.style.marginLeft = `${middle}px`;

            editBox2.addEventListener("mouseover", () => {
                editBox2.style.backgroundColor = darkenColor("#4f4f4f", 20);
                editTextElement2.style.backgroundColor = editBox2.style.backgroundColor;
                editBox2.style.cursor = "pointer";
            });

            editBox2.addEventListener("mouseout", () => {
                editBox2.style.backgroundColor = "#4f4f4f";
                editTextElement2.style.backgroundColor = editBox.style.backgroundColor;
                editBox2.style.cursor = "default";
            });

editBox2.addEventListener("click", () => {
    const popup = document.createElement('div');
    popup.classList.add("popup");
            popup.style.backgroundColor = "#272727";
            popup.style.width = "660px";
            popup.style.height = "555px";
            popup.style.position = "fixed";
            popup.style.borderRadius = "10px";
            popup.style.top = "50%";
            popup.style.left = "50%";
            popup.style.transform = "translate(-50%, -50%)";
            popup.style.border = "1px solid black";
            popup.style.padding = "10px";
            popup.style.display = "flex";
            popup.style.flexDirection = "column";
            popup.style.justifyContent = "center";
            popup.style.alignItems = "center";
            popup.style.zIndex = "9999";
            const fadeAnimation = `
                @keyframes grow {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `;
            const fadeAnimation1 = document.createElement("style");
            fadeAnimation1.textContent = fadeAnimation;

document.head.appendChild(fadeAnimation1);

const shrinkAnimation = `
    @keyframes shrink {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
    }
`;

const styleElementShrink = document.createElement("style");
styleElementShrink.textContent = shrinkAnimation;
document.head.appendChild(styleElementShrink);
            const isOnScreen2 = isElementOnScreen(popup);
            popup.style.animation = "grow 0.2s ease-in";
        if (isOnScreen2) {
            const overlay = document.createElement("div");
            overlay.classList.add("overlay");
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
            overlay.style.zIndex = "9998";
            overlay.style.borderRadius = "10px";
            overlay.style.transition = "background-color 0.15s ease-in";
            document.body.appendChild(overlay);
const shrinkAnimation2 = `
@keyframes shrink1 {
0% {

    opacity: 1;
}
100% {

    opacity: 0;
}
}
`;

const styleElementShrink2 = document.createElement("style");
styleElementShrink2.textContent = shrinkAnimation2;
document.head.appendChild(styleElementShrink2);
            setTimeout(() => {
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            }, 0);
        }
        let overlay;
const applyAnimationsAndRemoveElements = (element, animation) => {
    element.style.animation = animation;
    element.addEventListener('animationend', () => {
        document.body.removeChild(element);
    });
};
const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === overlay) {
        applyAnimationsAndRemoveElements(popup, "shrink 0.15s ease-in forwards");
        applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
    }
};
const handleOverlayClick2 = (event: MouseEvent) => {
    if (event.target === overlay) {
        applyAnimationsAndRemoveElements(popup, "shrink 0.15s ease-in forwards");
        applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
    }
};
const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        if (document.body.contains(popup) && document.body.contains(overlay)) {
            applyAnimationsAndRemoveElements(popup, "shrink 0.15s ease-in forwards");
            applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
            event.stopPropagation();
        }
    }
};
setTimeout(() => {
    overlay = document.querySelector(".overlay");
    if (overlay) {
        overlay.addEventListener("click", handleOverlayClick);
        overlay.addEventListener("click", handleOverlayClick2);
        document.addEventListener("keydown", handleDocumentKeydown);
    }
}, 100);

        function isElementOnScreen(element) {
            const rect = element.getBoundingClientRect();
            return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }
        const message = document.createElement("div");
        message.classList.add("box-description1");
        message.textContent = "Edit Theme-link and Theme-Thumbnail";
        message.style.color = "white";
        message.style.position = "absolute";
        message.style.top = "10px";
        message.style.left = "15px";
        message.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        message.style.fontSize = "large";
        message.style.fontWeight = "500";

        popup.appendChild(message);
        popup.appendChild(message);
document.body.appendChild(popup);


const themebox = editBox2.parentElement;
const transaction = db.transaction(["BetterThemesDB"]);
const store = transaction.objectStore("BetterThemesDB");
const request = themebox ? store.get(themebox.dataset.id) : null;
request.onsuccess = function() {
    const data = request.result;
const box = document.createElement('div');
box.classList.add("theme-box2");
box.style.width = "600px";
box.style.height = "336px";
box.style.border = "2px solid black";
box.style.borderRadius = "5px";
box.style.marginTop = "-25px";

const img = document.createElement('img');
img.src = data.image;
img.style.width = "100%";
img.style.height = "100%";
img.classList.add("theme-box-popup");

box.appendChild(img);

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.style.display = 'none';

document.body.appendChild(fileInput);

box.onclick = function() {
    fileInput.click();
};

fileInput.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            if (typeof reader.result === 'string') {
                img.src = reader.result;
            }
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    }
});

greenSquare2.addEventListener('click', () => {
    if (fileInput.files) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onloadend = function() {
            img.src = reader.result as string;
            (themebox as HTMLElement).style.backgroundImage = `url(${reader.result})`;
            const updateTransaction = db.transaction(["BetterThemesDB"], 'readwrite');
            const updateStore = updateTransaction.objectStore("BetterThemesDB");
            data.image = reader.result;
            const updateRequest = updateStore.put(data);
            updateRequest.onerror = function() {
                console.log('Error', updateRequest.error);
            };
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    }
});

    popup.appendChild(box);

const linkBox = document.createElement('div');

const input = document.createElement('input');
input.type = "text";
input.value = data.text;
input.classList.add("link-box-popup");
input.style.width = "600px";
input.style.height = "30px";
input.style.fontSize = "x-small";
input.style.background = "#141414";
input.style.color = "white";
input.style.border = "1px solid black";
input.style.borderRadius = "5px";
input.style.marginTop = "13px";
input.style.textAlign = "center";
if (themebox) {
    themebox.addEventListener('click', () => {
        if (themebox.dataset.text?.startsWith("https://raw")) {
            const transaction = db.transaction(["BetterThemesDB"], "readonly");
            const store = transaction.objectStore("BetterThemesDB");
            const getRequest = store.get(themebox.dataset.id);
            getRequest.onsuccess = function() {
                const data = getRequest.result;
                let css = `@import url("${themebox.dataset.text}");\n`;
                if (data && data.CSS) {
                    css += data.CSS;
                }
                VencordNative.quickCss.set(css);
            };
            getRequest.onerror = function(e) {
                console.log('Error', e.target.error.name);
            };
        }
    });
}

linkBox.appendChild(input);

const input2 = document.createElement('textarea');
input2.rows = 10;
input2.classList.add("link-box-popup2");
if (data.CSS) {
    input2.value = data.CSS;
}
input2.style.width = "600px";
input2.style.height = "70px";
input2.style.fontSize = "x-small";
input2.style.background = "#141414";
input2.style.color = "white";
input2.style.border = "1px solid black";
input2.style.borderRadius = "5px";
input2.style.marginTop = "13px";
input2.style.textAlign = "left";
input2.style.paddingLeft = "5px";
input2.style.resize = "none";
input2.placeholder = "Put your own CSS rules here";
const style = document.createElement('style');
style.textContent = `
.link-box-popup2::placeholder {
    color: #000000;
    font-weight: bold;
}
`;

document.head.appendChild(style);

greenSquare2.addEventListener('click', () => {
    if (themebox) {
        themebox.dataset.text = input.value;
    }
    if (input.value.startsWith("https://raw")) {
        let css = `@import url("${input.value}");\n`;
        css += input2.value;
        VencordNative.quickCss.set(css);
    }
    if (input2.value.trim() !== '') {
        data.CSS = input2.value;
    } else {
        data.CSS = "";
    }
    const updateTransaction = db.transaction(["BetterThemesDB"], 'readwrite');
    const updateStore = updateTransaction.objectStore("BetterThemesDB");
    data.text = input.value;
    const updateRequest = updateStore.put(data);
    updateRequest.onerror = function() {
        console.log('Error', updateRequest.error);
    };
});

popup.appendChild(input2);
 popup.appendChild(linkBox);

};

const greenSquare2 = document.createElement("div");
greenSquare2.classList.add("create-box2");
greenSquare2.style.backgroundColor = "#28a836";
greenSquare2.style.marginTop = "20px";
greenSquare2.style.borderRadius = "3px";
greenSquare2.style.padding = "8px";
greenSquare2.style.position = "absolute";
greenSquare2.style.bottom = "20px";
greenSquare2.style.right = "22px";
const greenTextElement2 = document.createElement('div');
greenTextElement2.classList.add("textinput5");
greenTextElement2.style.display = "flex";
greenTextElement2.style.justifyContent = "center";
greenTextElement2.style.alignItems = "center";
greenTextElement2.style.width = "100%";
greenTextElement2.style.height = "100%";
greenTextElement2.style.fontWeight = "500";
greenTextElement2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
greenTextElement2.style.fontSize = "14px";
greenTextElement2.style.fontStyle = "normal";
greenTextElement2.style.textAlign = "center";
greenTextElement2.textContent = "Save changes";
greenTextElement2.style.color = "white";

greenSquare2.addEventListener("mouseover", () => {
    greenSquare2.style.backgroundColor = darkenColor("#28a836", 30);
    greenTextElement2.style.backgroundColor = greenSquare2.style.backgroundColor;
    greenSquare2.style.cursor = "pointer";
});

greenSquare2.addEventListener("mouseout", () => {
    greenSquare2.style.backgroundColor = "#28a836";
    greenTextElement2.style.backgroundColor = greenSquare2.style.backgroundColor;
    greenSquare2.style.cursor = "default";
});

greenSquare2.addEventListener("click", () => {
    popup.style.animation = "shrink 0.15s ease-in forwards";
    overlay.style.animation = "shrink1 0.15s ease-in forwards";
    popup.addEventListener('animationend', () => {
    document.body.removeChild(popup);
    document.body.removeChild(overlay);
   });
});

greenSquare2.appendChild(greenTextElement2);
popup.appendChild(greenSquare2)

    const cancelBox6 = document.createElement("div");
    cancelBox6.classList.add("cancel-box2");
    cancelBox6.style.backgroundColor = "";
    cancelBox6.style.borderRadius = "3px";
    cancelBox6.style.position = "absolute";
    cancelBox6.style.bottom = "12px";
    cancelBox6.style.right = "125px";
    cancelBox6.style.margin = "8px";
    cancelBox6.style.padding = "8px";
    const cancelTextElement6 = document.createElement('div');
    cancelTextElement6.classList.add("textinput6");
    cancelTextElement6.style.display = "flex";
    cancelTextElement6.style.justifyContent = "center";
    cancelTextElement6.style.alignItems = "center";
    cancelTextElement6.style.width = "100%";
    cancelTextElement6.style.height = "100%";
    cancelTextElement6.style.textAlign = "center";
    cancelTextElement6.textContent = "Cancel";
    cancelTextElement6.style.color = "white";
    cancelTextElement6.style.fontWeight = "500";
    cancelTextElement6.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
    cancelTextElement6.style.fontSize = "14px";
    cancelTextElement6.style.fontStyle = "normal";
    cancelTextElement6.style.backgroundColor = cancelBox6.style.backgroundColor;

    cancelBox6.appendChild(cancelTextElement6);

    cancelBox6.addEventListener("mouseover", () => {
        cancelBox6.style.backgroundColor = "";
        cancelTextElement6.style.backgroundColor = cancelBox6.style.backgroundColor;
        cancelTextElement6.style.textDecoration = "underline";
        cancelBox6.style.cursor = "pointer";
    });

    cancelBox6.addEventListener("mouseout", () => {
        cancelBox6.style.backgroundColor = "";
        cancelTextElement6.style.backgroundColor = cancelBox6.style.backgroundColor;
        cancelTextElement6.style.textDecoration = "none";
        cancelBox6.style.cursor = "default";
    });

    cancelBox6.addEventListener("click", () => {
        popup.style.animation = "shrink 0.15s ease-in forwards";
        overlay.style.animation = "shrink1 0.15s ease-in forwards";
        popup.addEventListener('animationend', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
       });
    });

    popup.appendChild(cancelBox6);
document.body.appendChild(popup);

});
        });
    }
});

const cancelBox3 = document.createElement("div");
cancelBox3.classList.add("cancel-box8");
cancelBox3.style.backgroundColor = "";
cancelBox3.style.borderRadius = "3px";
cancelBox3.style.margin = "8px";
cancelBox3.style.padding = "8px";
cancelBox3.style.backgroundColor = "#4f4f4f";
const cancelTextElement3 = document.createElement('div');
cancelTextElement3.classList.add("textinput16");
cancelTextElement3.style.display = "flex";
cancelTextElement3.style.justifyContent = "center";
cancelTextElement3.style.alignItems = "center";
cancelTextElement3.style.width = "100%";
cancelTextElement3.style.height = "100%";
cancelTextElement3.style.textAlign = "center";
cancelTextElement3.textContent = "Close";
cancelTextElement3.style.color = "white";
cancelTextElement3.style.fontWeight = "500";
cancelTextElement3.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
cancelTextElement3.style.fontSize = "14px";
cancelTextElement3.style.fontStyle = "normal";
cancelTextElement3.style.backgroundColor = cancelBox3.style.backgroundColor;

cancelBox3.appendChild(cancelTextElement3);

cancelBox3.addEventListener("mouseover", () => {
    cancelBox3.style.backgroundColor = darkenColor("#4f4f4f", 20);
    cancelTextElement3.style.backgroundColor = cancelBox3.style.backgroundColor;
    cancelBox3.style.cursor = "pointer";
});

cancelBox3.addEventListener("mouseout", () => {
    cancelBox3.style.backgroundColor = "#4f4f4f";
    cancelTextElement3.style.backgroundColor = cancelBox3.style.backgroundColor;
    cancelBox3.style.cursor = "default";
});

cancelBox3.addEventListener("click", () => {
    const diashowBoxes = document.querySelectorAll('.diashow_box1, .diashow_box2');
    diashowBoxes.forEach((diashowBox) => {
        diashowBox.removeChild(diashowBox);
    });
});

cancelBox3.addEventListener("click", () => {
    targetElement.removeChild(cancelBox3);
    const editbox2sels = document.querySelectorAll('.editbox2');
    editbox2sels.forEach((editbox2sel) => {
        if (editbox2sel) {
            editbox2sel.remove();
        }
    });
});

editBox.addEventListener("click", function() {

    targetElement.appendChild(cancelBox3);

});
}, 1000);

targetElement.appendChild(editBox);

        const orangeSquare = document.createElement("div");
        orangeSquare.classList.add("test-box");
        orangeSquare.style.backgroundColor = "#fa4848";
        orangeSquare.style.marginTop = "-1px";
        orangeSquare.style.borderRadius = "3px";
        orangeSquare.style.padding = "8px";
        const orangeTextElement = document.createElement('div');
        orangeTextElement.classList.add("textinput4");
        orangeTextElement.style.display = "flex";
        orangeTextElement.style.justifyContent = "center";
        orangeTextElement.style.alignItems = "center";
        orangeTextElement.style.width = "100%";
        orangeTextElement.style.height = "100%";
        orangeTextElement.style.textAlign = "center";
        orangeTextElement.textContent = "Clear Themes";
        orangeTextElement.style.color = "white";
        orangeTextElement.style.fontWeight = "500";
        orangeTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        orangeTextElement.style.fontSize = "14px";
        orangeTextElement.style.fontStyle = "normal";
        orangeTextElement.style.backgroundColor = orangeSquare.style.backgroundColor;

        orangeSquare.appendChild(orangeTextElement);

        orangeSquare.addEventListener("click", () => {
            openPopUpMenu();
        });

orangeSquare.addEventListener("mouseover", () => {
    orangeSquare.style.backgroundColor = darkenColor("#fa4848", 20);
    orangeTextElement.style.backgroundColor = orangeSquare.style.backgroundColor;
    orangeSquare.style.cursor = "pointer";
});

orangeSquare.addEventListener("mouseout", () => {
    orangeSquare.style.backgroundColor = "#fa4848";
    orangeTextElement.style.backgroundColor = orangeSquare.style.backgroundColor;
    orangeSquare.style.cursor = "default";
});

        targetElement.appendChild(orangeSquare);

        function openPopUpMenu() {
            const popUpMenu = document.createElement("div");
            popUpMenu.classList.add("pop-up-menu");
            popUpMenu.style.backgroundColor = "#262626";
            popUpMenu.style.width = "400px";
            popUpMenu.style.height = "120px";
            popUpMenu.style.position = "fixed";
            popUpMenu.style.borderRadius = "10px";
            popUpMenu.style.top = "50%";
            popUpMenu.style.left = "50%";
            popUpMenu.style.transform = "translate(-50%, -50%)";
            popUpMenu.style.border = "1px solid black";
            popUpMenu.style.padding = "10px";
            popUpMenu.style.display = "flex";
            popUpMenu.style.flexDirection = "column";
            popUpMenu.style.justifyContent = "center";
            popUpMenu.style.alignItems = "center";
            popUpMenu.style.zIndex = "9999";
            const fadeAnimation = `
                @keyframes grow {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 0;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `;

            const styleElement = document.createElement("style");
            styleElement.textContent = fadeAnimation;

            document.head.appendChild(styleElement);

            const isOnScreen = isElementOnScreen(popUpMenu);
            popUpMenu.style.animation = "grow 0.15s ease-in";
const shrinkAnimation = `
@keyframes shrink {
    0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
}
`;

const styleElementShrink = document.createElement("style");
styleElementShrink.textContent = shrinkAnimation;

document.head.appendChild(styleElementShrink);

        if (isOnScreen) {
            const overlay = document.createElement("div");
            overlay.classList.add("overlay");
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
            overlay.style.zIndex = "9998";
            overlay.style.borderRadius = "10px";
            overlay.style.transition = "background-color 0.2s ease-in";
            document.body.appendChild(overlay);
            const fadeAnimation2 = `
            @keyframes grow {
                0% {

                    opacity: 0;
                }
                100% {

                    opacity: 1;
                }
            }
        `;

        const styleElement2 = document.createElement("style");
        styleElement2.textContent = fadeAnimation2;

        document.head.appendChild(styleElement2);

        overlay.style.animation = "grow 0.15s ease-in";
const shrinkAnimation2 = `
@keyframes shrink1 {
0% {

    opacity: 1;
}
100% {

    opacity: 0;
}
}
`;

const styleElementShrink2 = document.createElement("style");
styleElementShrink2.textContent = shrinkAnimation2;

document.head.appendChild(styleElementShrink2);

            setTimeout(() => {
            overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
            }, 0);
        }

        let overlay;

        function isElementOnScreen(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }

const applyAnimationsAndRemoveElements = (element, animation) => {
    element.style.animation = animation;
    element.addEventListener('animationend', () => {
        element.remove();
    });
};

const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === overlay) {
        applyAnimationsAndRemoveElements(popUpMenu, "shrink 0.15s ease-in forwards");
        applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
    }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        if (document.body.contains(popUpMenu) && document.body.contains(overlay)) {
            applyAnimationsAndRemoveElements(popUpMenu, "shrink 0.15s ease-in forwards");
            applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
            event.stopPropagation();
        }
    }
};

setTimeout(() => {
    overlay = document.querySelector(".overlay");
    if (overlay) {
        overlay.addEventListener("click", handleOverlayClick);
        document.addEventListener("keydown", handleDocumentKeydown);
    }
}, 100);

        const message = document.createElement("p");
        message.classList.add("popuptext1");
        message.textContent = "Are you sure you want to delete all saved Themes?";
        message.style.color = "red";
        message.style.top = "33px";
        message.style.left = "15px";
        message.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        message.style.position = "absolute";
        message.style.color = "white";

        popUpMenu.appendChild(message);

        const message2 = document.createElement("p2");
        message2.classList.add("popuptext2");
        message2.textContent = "Clear all Themes";
        message2.style.fontWeight = "500";
        message2.style.position = "absolute";
        message2.style.top = "10px";
        message2.style.left = "15px";
        message2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        message2.style.fontSize = "large";
        message2.style.fontWeight = "600";
        message2.style.color = "white";

        popUpMenu.appendChild(message2);
    document.body.appendChild(popUpMenu);

const cancelSquare = document.createElement("div");
cancelSquare.classList.add("cancel-box");
cancelSquare.style.backgroundColor = "transparent";
cancelSquare.style.marginTop = "20px";
cancelSquare.style.borderRadius = "3px";
cancelSquare.style.padding = "8px";
cancelSquare.style.position = "absolute";
cancelSquare.style.top = "75px";
cancelSquare.style.right = "75px";

cancelSquare.addEventListener("mouseover", () => {
    cancelSquare.style.backgroundColor = "transparent";
    grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;
    grayTextElement.style.textDecoration = "underline";
    cancelSquare.style.cursor = "pointer";
});

cancelSquare.addEventListener("mouseout", () => {
    cancelSquare.style.backgroundColor = "transparent";
    grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;
    grayTextElement.style.textDecoration = "none";
    cancelSquare.style.cursor = "default";
});

const grayTextElement = document.createElement('div');
grayTextElement.classList.add("textinput5");
grayTextElement.style.display = "flex";
grayTextElement.style.justifyContent = "center";
grayTextElement.style.alignItems = "center";
grayTextElement.style.width = "100%";
grayTextElement.style.height = "100%";
grayTextElement.style.textAlign = "center";
grayTextElement.style.fontWeight = "500";
grayTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
grayTextElement.style.fontSize = "14px";
grayTextElement.style.fontStyle = "normal";
grayTextElement.textContent = "cancel";
grayTextElement.style.color = "white";
grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;

grayTextElement.addEventListener("mouseover", () => {
    grayTextElement.style.textDecoration = "underline";
});

grayTextElement.addEventListener("mouseout", () => {
    grayTextElement.style.textDecoration = "none";
});

grayTextElement.addEventListener("click", () => {
    popUpMenu.style.animation = "shrink 0.15s ease-in forwards";
    overlay.style.animation = "shrink1 0.15s ease-in forwards";

    popUpMenu.addEventListener('animationend', () => {
        popUpMenu.remove();
        overlay.remove();
    });
});


cancelSquare.appendChild(grayTextElement);
popUpMenu.appendChild(cancelSquare);

const redSquare = document.createElement("div");
redSquare.classList.add("remove-boxes");
redSquare.style.padding = "8px";
redSquare.style.backgroundColor = "#fa4848";
redSquare.style.marginTop = "20px";
redSquare.style.borderRadius = "3px"
redSquare.style.position = "absolute";
redSquare.style.top = "75px";
redSquare.style.right = "19px";
let textElement = document.createElement('div');
textElement.classList.add("text-element3");
textElement.style.background = redSquare.style.backgroundColor;
textElement.style.display = "flex";
textElement.style.justifyContent = "center";
textElement.style.fontWeight = "500";
textElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
textElement.style.fontSize = "14px";
textElement.style.fontStyle = "normal";
textElement.style.alignItems = "center";
textElement.style.textAlign = "center";
textElement.textContent = "Clear";
textElement.style.color = "white";

redSquare.addEventListener("mouseover", () => {
    redSquare.style.backgroundColor = darkenColor2("#fa4848", 20);
    textElement.style.backgroundColor = redSquare.style.backgroundColor;
    redSquare.style.cursor = "pointer";
});

redSquare.addEventListener("mouseout", () => {
    redSquare.style.backgroundColor = "#fa4848";
    textElement.style.backgroundColor = redSquare.style.backgroundColor;
    redSquare.style.cursor = "default";
});

function darkenColor2(color, percentage) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const newR = Math.round(r * (100 - percentage) / 100);
    const newG = Math.round(g * (100 - percentage) / 100);
    const newB = Math.round(b * (100 - percentage) / 100);
    const newHex = "#" + newR.toString(16) + newG.toString(16) + newB.toString(16);
    return newHex;
}

redSquare.addEventListener("click", () => {
    VencordNative.quickCss.set('');
    popUpMenu.style.animation = "shrink 0.15s ease-in forwards";
    overlay.style.animation = "shrink1 0.15s ease-in forwards";

    popUpMenu.addEventListener('animationend', () => {
        popUpMenu.remove();
        overlay.remove();
    });
});

redSquare.appendChild(textElement);

    redSquare.addEventListener("click", () => {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const request = store.openCursor();
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.key !== 'imageInput' && cursor.key !== 'textInput' && cursor.key !== 'regulator') {
                    const deleteRequest = cursor.delete();
                    deleteRequest.onsuccess = function() {
                        console.log(`Record with key ${cursor.key} has been deleted from the store.`);
                    };
                    deleteRequest.onerror = function() {
                        console.log(`Unable to delete record with key ${cursor.key} from the store.`);
                    };
                }
                cursor.continue();
            } else {
                console.log("All other records have been deleted from the store.");
            }
        };
        request.onerror = function(event) {
            console.log("Unable to open cursor on the store.");
        };
        const boxes = document.querySelectorAll(".theme-box:not(.online-themes2):not(.CSSLinkInput)");
        boxes.forEach(box => {
            if (box.id !== 'imageInput' && box.id !== 'textInput') {
                box.remove();
            }
        });

        const handleCloseButtonClick = (event: MouseEvent) => {
            document.body.removeChild(popUpMenu);
            const overlay = document.querySelector(".overlay");
            if (overlay) {
                document.body.removeChild(overlay);
            }
        };
    });

    popUpMenu.appendChild(redSquare);

}

//MARK:IMPLEMENATION

const gridElement = document.querySelector('.vc-settings-theme-grid');
if (gridElement && gridElement.parentNode) {
    const newElement = document.createElement('div');
    newElement.className = 'wrapper2';
    newElement.style.position = 'relative';
    newElement.style.display = 'flex';
    newElement.style.padding = "1em";
    newElement.style.gap = "1em";
    newElement.style.alignItems = "center";
    newElement.style.justifyContent = "space-evenly";
    newElement.style.flexGrow = "1";
    newElement.style.flexFlow = "row wrap";
    newElement.style.left = "10px";

    gridElement.parentNode.replaceChild(newElement, gridElement);

}

const dividerElement = document.createElement("div");
dividerElement.classList.add("divider_vc1");
dividerElement.style.width = "100%";
dividerElement.style.height = "1px";
dividerElement.style.borderTop = "thin solid white";
let elements = document.querySelectorAll('.vc-settings-card.cardPrimary__1ee6a.card__4dc22, .h5__884a2.eyebrow_b7df6b.defaultMarginh5__8514a');
elements.forEach(element => {
    if (element) {
        (element as HTMLElement).style.display = 'none';
    }
});

const newObserver = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
        if(mutation.addedNodes.length) {
            let elements = document.querySelectorAll(".diashow_box3");
            elements.forEach(element => {
                if (element) {
                    (element as HTMLElement).style.border = "1px black solid !important";
                }
            });
        }
    }
});

if (greenSquare.matches(':hover')) {
greenSquare.style.backgroundColor = "purple !important";
} else {
    observer.observe(document, { childList: true, subtree: true });
}
const quickActionsCard = document.querySelector('.vc-settings-quick-actions-card');
if (quickActionsCard) {
    quickActionsCard.appendChild(dividerElement);
}

const greenBoxObserver = new MutationObserver((mutationsList, observer) => {
    const hasImage = boxElement.style.backgroundImage.includes("url");
    if (isHoveringCreate === false) {
    if (hasImage) {
        if (input.value.startsWith("https://raw")) {
            greenSquare.style.backgroundColor = "#28a836";
        } else {
            greenSquare.style.backgroundColor = "#f5c32f";
        }
    } else {
        if (input.value.startsWith("https://raw")) {
            greenSquare.style.backgroundColor = "#f5c32f";
        } else {
            greenSquare.style.backgroundColor = "gray";
        }
    }
}

    greenSquare.addEventListener('mouseover', function() {
        const hasImage = boxElement.style.backgroundImage.includes("url");
        if (hasImage) {
            if (input.value.startsWith("https://raw")) {
                greenSquare.style.backgroundColor = "rgb(27, 112, 36)";
            } else {
                greenSquare.style.backgroundColor = "#ad8b26";
            }
        } else {
            if (input.value.startsWith("https://raw")) {
                greenSquare.style.backgroundColor = "#ad8b26";
            } else {
                greenSquare.style.backgroundColor = "#666666";
            }

        }
    });

    greenSquare.addEventListener('mouseout', function() {
        if (hasImage) {
            if (input.value.startsWith("https://raw")) {
                greenSquare.style.backgroundColor = "#28a836";
            } else {
                greenSquare.style.backgroundColor = "#f5c32f";
            }
        } else {
            if (input.value.startsWith("https://raw")) {
                greenSquare.style.backgroundColor = "#f5c32f";
            } else {
                greenSquare.style.backgroundColor = "gray";
            }
        }
    });

});

greenBoxObserver.observe(boxElement, { childList: true });
greenBoxObserver.observe(input, { childList: true });
greenBoxObserver.observe(boxElement, { attributes: true, attributeFilter: ['tabindex'] });
greenBoxObserver.observe(document, { childList: true, subtree: true });

const inputElement = document.querySelector(".CSSLinkInput");
if (inputElement) {
    greenBoxObserver.observe(inputElement, { attributes: true });
} else {
    console.error('Could not find element with class .CSSLinkInput');
}

const observer2 = new MutationObserver((mutationsList, observer) => {
    for(let mutation of mutationsList) {
        if(mutation.addedNodes.length) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    if (element.classList.contains('pop-up-menu') || element.classList.contains('overlay')) {
                        return;
                    }
                    if (element.classList.contains('purple-square')) {
                        addClickListenerToElement(element);
                    }
                }
            });
        }
    }
});

observer2.observe(document, { childList: true, subtree: true });

let boxToDelete: HTMLElement | null = null;

function addClickListenerToElement(element: Element) {

    element.addEventListener('click', function() {
        if (document.querySelector('.pop-up-menu')) {
            console.log('Pop-up menu already exists, not creating a new one');
            return;
        }
        boxToDelete = element.parentNode as HTMLElement;
        console.log('Element clicked, creating pop-up menu');

        const popUpMenu = document.createElement("div");
        popUpMenu.classList.add("pop-up-menu");
        popUpMenu.style.backgroundColor = "#262626";
        popUpMenu.style.width = "400px";
        popUpMenu.style.height = "120px";
        popUpMenu.style.position = "fixed";
        popUpMenu.style.borderRadius = "10px";
        popUpMenu.style.top = "50%";
        popUpMenu.style.left = "50%";
        popUpMenu.style.transform = "translate(-50%, -50%)";
        popUpMenu.style.border = "1px solid black";
        popUpMenu.style.padding = "10px";
        popUpMenu.style.display = "flex";
        popUpMenu.style.flexDirection = "column";
        popUpMenu.style.justifyContent = "center";
        popUpMenu.style.alignItems = "center";
        popUpMenu.style.zIndex = "9999";
        document.body.appendChild(popUpMenu);
        console.log('Pop-up menu created and appended to document body');
        const fadeAnimation = `
        @keyframes grow {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
    `;

    const styleElement = document.createElement("style");
    styleElement.textContent = fadeAnimation;

    document.head.appendChild(styleElement);

    const isOnScreen = isElementOnScreen(popUpMenu);
    popUpMenu.style.animation = "grow 0.15s ease-in";
    const shrinkAnimation = `
    @keyframes shrink {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0;
        }
    }
`;

const styleElementShrink = document.createElement("style");
styleElementShrink.textContent = shrinkAnimation;

document.head.appendChild(styleElementShrink);

    let overlay;

if (isOnScreen) {
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0)";
    overlay.style.zIndex = "9998";
    overlay.style.borderRadius = "10px";
    overlay.style.transition = "background-color 0.2s ease-in";

    document.body.appendChild(overlay);

const shrinkAnimation = `
@keyframes shrink1 {
    0% {

        opacity: 1;
    }
    100% {

        opacity: 0;
    }
}
`;

const styleElementShrink = document.createElement("style");
styleElementShrink.textContent = shrinkAnimation;

document.head.appendChild(styleElementShrink);

    setTimeout(() => {
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    }, 0);
}

function isElementOnScreen(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

const applyAnimationsAndRemoveElements = (element, animation) => {
    element.style.animation = animation;
    element.addEventListener('animationend', () => {
        element.remove();
    });
};

const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === overlay) {
        applyAnimationsAndRemoveElements(popUpMenu, "shrink 0.15s ease-in forwards");
        applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
    }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        if (document.body.contains(popUpMenu) && document.body.contains(overlay)) {
            applyAnimationsAndRemoveElements(popUpMenu, "shrink 0.15s ease-in forwards");
            applyAnimationsAndRemoveElements(overlay, "shrink1 0.15s ease-in forwards");
            event.stopPropagation();
        }
    }
};

setTimeout(() => {
    overlay = document.querySelector(".overlay");
    if (overlay) {
        overlay.addEventListener("click", handleOverlayClick);
        document.addEventListener("keydown", handleDocumentKeydown);
    }
}, 100);

const message = document.createElement("p");
        message.classList.add("popuptext3");
        message.textContent = "Are you sure you want to delete this Theme?";
        message.style.color = "red";
        message.style.top = "33px";
        message.style.left = "15px";
        message.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        message.style.position = "absolute";
        message.style.color = "white";

        popUpMenu.appendChild(message);

        const message2 = document.createElement("p2");
        message2.classList.add("popuptext4");
        message2.textContent = "Delete Theme";
        message2.style.fontWeight = "500";
        message2.style.position = "absolute";
        message2.style.top = "10px";
        message2.style.left = "15px";
        message2.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
        message2.style.fontSize = "large";
        message2.style.fontWeight = "600";
        message2.style.color = "white";

        popUpMenu.appendChild(message2);
document.body.appendChild(popUpMenu);

const cancelSquare = document.createElement("div");
cancelSquare.classList.add("cancel-box");
cancelSquare.style.backgroundColor = "transparent";
cancelSquare.style.marginTop = "20px";
cancelSquare.style.borderRadius = "3px";
cancelSquare.style.padding = "8px";
cancelSquare.style.position = "absolute";
cancelSquare.style.top = "75px";
cancelSquare.style.right = "75px";

cancelSquare.addEventListener("mouseover", () => {
cancelSquare.style.backgroundColor = "transparent";
grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;
grayTextElement.style.textDecoration = "underline";
cancelSquare.style.cursor = "pointer";
});

cancelSquare.addEventListener("mouseout", () => {
cancelSquare.style.backgroundColor = "transparent";
grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;
grayTextElement.style.textDecoration = "none";
cancelSquare.style.cursor = "default";
});

const grayTextElement = document.createElement('div');
grayTextElement.classList.add("textinput5");
grayTextElement.style.display = "flex";
grayTextElement.style.justifyContent = "center";
grayTextElement.style.alignItems = "center";
grayTextElement.style.width = "100%";
grayTextElement.style.height = "100%";
grayTextElement.style.textAlign = "center";
grayTextElement.style.fontWeight = "500";
grayTextElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
grayTextElement.style.fontSize = "14px";
grayTextElement.style.fontStyle = "normal";
grayTextElement.textContent = "cancel";
grayTextElement.style.color = "white";
grayTextElement.style.backgroundColor = cancelSquare.style.backgroundColor;

grayTextElement.addEventListener("mouseover", () => {
grayTextElement.style.textDecoration = "underline";
});

grayTextElement.addEventListener("mouseout", () => {
grayTextElement.style.textDecoration = "none";
});

cancelSquare.addEventListener("click", () => {
    popUpMenu.style.animation = "shrink 0.15s ease-in forwards";
    const overlays = document.querySelectorAll('.overlay');
    overlays.forEach((overlayElement) => {
        (overlayElement as HTMLElement).style.animation = "shrink1 0.15s ease-in forwards";
        overlayElement.addEventListener('animationend', () => {
            (overlayElement as HTMLElement).remove();
        });
    });

    popUpMenu.addEventListener('animationend', () => {
        popUpMenu.remove();
    });

});

cancelSquare.appendChild(grayTextElement);
popUpMenu.appendChild(cancelSquare);

const redSquare = document.createElement("div");
redSquare.classList.add("remove-boxes");
redSquare.style.padding = "8px";
redSquare.style.backgroundColor = "#fa4848";
redSquare.style.marginTop = "20px";
redSquare.style.borderRadius = "3px"
redSquare.style.position = "absolute";
redSquare.style.top = "75px";
redSquare.style.right = "19px";

let textElement = document.createElement('div');
textElement.classList.add("text-element3");
textElement.style.background = redSquare.style.backgroundColor;
textElement.style.display = "flex";
textElement.style.justifyContent = "center";
textElement.style.fontWeight = "500";
textElement.style.fontFamily = "Whitney, 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif";
textElement.style.fontSize = "14px";
textElement.style.fontStyle = "normal";
textElement.style.alignItems = "center";
textElement.style.textAlign = "center";
textElement.textContent = "Delete";
textElement.style.color = "white";

redSquare.addEventListener("mouseover", () => {
redSquare.style.backgroundColor = darkenColor2("#fa4848", 20);
textElement.style.backgroundColor = redSquare.style.backgroundColor;
redSquare.style.cursor = "pointer";
});

redSquare.addEventListener("mouseout", () => {
redSquare.style.backgroundColor = "#fa4848";
textElement.style.backgroundColor = redSquare.style.backgroundColor;
redSquare.style.cursor = "default";
});

function darkenColor2(color, percentage) {
const hex = color.replace("#", "");
const r = parseInt(hex.substring(0, 2), 16);
const g = parseInt(hex.substring(2, 4), 16);
const b = parseInt(hex.substring(4, 6), 16);
const newR = Math.round(r * (100 - percentage) / 100);
const newG = Math.round(g * (100 - percentage) / 100);
const newB = Math.round(b * (100 - percentage) / 100);
const newHex = "#" + newR.toString(16) + newG.toString(16) + newB.toString(16);
return newHex;
}

redSquare.addEventListener("click", () => {
    VencordNative.quickCss.set('');
    popUpMenu.style.animation = "shrink 0.15s ease-in forwards";
    const overlays = document.querySelectorAll('.overlay');
    overlays.forEach((overlayElement) => {
        (overlayElement as HTMLElement).style.animation = "shrink1 0.15s ease-in forwards";
        overlayElement.addEventListener('animationend', () => {
            (overlayElement as HTMLElement).remove();
        });
    });

    popUpMenu.addEventListener('animationend', () => {
        popUpMenu.remove();
    });

});

redSquare.appendChild(textElement);

redSquare.addEventListener("click", () => {
    if (boxToDelete) {
        const transaction = db.transaction(["BetterThemesDB"], "readwrite");
        const store = transaction.objectStore("BetterThemesDB");
        const deleteRequest = store.delete((boxToDelete as unknown as HTMLElement).id);
        transaction.oncomplete = function() {
            (boxToDelete as unknown as HTMLElement).remove();
            const overlay = document.querySelector(".overlay");
            if (overlay) {
                document.body.removeChild(overlay);
            }
        };
    }
});

popUpMenu.appendChild(redSquare);

    });
}

    let link1 = document.createElement('a');
    link1.classList.add('link_1');
    link1.setAttribute('role', 'link');
    link1.setAttribute('target', '_blank');
    link1.setAttribute('href', 'https://betterdiscord.app/themes');
    link1.style.marginRight = '0.5em';
    link1.textContent = 'BetterDiscord Themes';
    link1.style.position = 'absolute';
    link1.style.top = '196px';
    link1.style.left = '332px';
    link1.style.fontSize = "12px";

    let link2 = document.createElement('a');
    link2.classList.add('link_2');
    link2.setAttribute('role', 'link');
    link2.setAttribute('target', '_blank');
    link2.setAttribute('href', 'https://github.com/search?q=discord+theme');
    link2.textContent = 'GitHub';
    link2.style.position = 'absolute';
    link2.style.top = '196px';
    link2.style.left = '462px';
    link2.style.fontSize = "12px";

    targetElement.appendChild(link1);
    targetElement.appendChild(link2);

    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
    ::-webkit-scrollbar {
        width: 13px !important;
        height: 5px !important;
        background: transparent !important;
        border-color: transparent !important;
        border-radius: 50px!important;
    }
    `, styleSheet.cssRules.length);

    styleSheet.insertRule(`
    ::-webkit-scrollbar-thumb {
        background: #444 !important; // dark grey
        border-radius: 50px !important;
    }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
    ::-webkit-scrollbar-thumb:hover {
        background: #222 !important; // very dark grey
        border-radius: 50px !important;
    }
`, styleSheet.cssRules.length);

    styleSheet.insertRule(`
        ::-webkit-scrollbar-track, ::-webkit-scrollbar-track-piece {
            background: transparent !important;
            border-color: transparent !important;
        }
    `, styleSheet.cssRules.length);

    styleSheet.insertRule(`
        .thin-RnSY0a::-webkit-scrollbar {
            width: calc(var(--scrollbar-width) / 2) !important;
            height: calc(var(--scrollbar-width) / 2) !important;
        }
    `, styleSheet.cssRules.length);

    styleSheet.insertRule(`
        .none-1rXy4P::-webkit-scrollbar {
            width: 0 !important;
            height: 0 !important;
        }
    `, styleSheet.cssRules.length);

    styleSheet.insertRule(`
    ::-webkit-scrollbar:hover {
        cursor: default !important;
    }
`, styleSheet.cssRules.length);

}