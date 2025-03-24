/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from ".";

interface regexes {
    imperial: {
        [key: string]: {
            regex: RegExp,
            convert: (...groups: string[]) => string;
        };
    };
    metric: {
        [key: string]: {
            regex: RegExp,
            convert: (...groups: string[]) => string;
        };
    };
}
// TODO: add grams, kilograms, ounces, and pounds
const regexes: regexes = {
    // matches imperial units, converts them to metric
    imperial: {
        farenheight: {
            regex: /(-?\d+(?:\.\d+)?)°?(f)(?!\w)/ig,
            convert(...groups) {
                const c = ((parseFloat(groups[1]) - 32) * (5 / 9)).toFixed(2);
                return `${c}°C`;
            },
        },
        feetInchesMark: {
            regex: /(\d+)(') ?(\d+(?:\.\d+)?)("|'')?/g,
            convert(...groups) {
                let ftin = parseFloat(groups[1]) / 3.281;
                ftin += parseFloat(groups[3]) / 39.37;
                return `${ftin.toFixed(2)}m`;
            },
        },
        feetWord: {
            regex: /(\d+(?:\.\d+)?) *(f(ee)?t)(?! *\d)/ig,
            convert(...groups) {
                const ft = (parseFloat(groups[1]) / 3.281).toFixed(2);
                return `${ft}m`;
            },
        },
        inchesWord: {
            regex: /(?<!\d+ *(?:f(?:ee|oo)?t) *)(\d+(?:\.\d+)?) *(in(?:ches?)?)/ig,
            convert(...groups) {
                const inches = (parseFloat(groups[1]) / 2.54).toFixed(2);
                return `${inches}cm`;
            },
        },
        feetInchesWord: {
            regex: /(\d+) *(f(?:ee|oo)?t) *(\d+(?:\.\d+)?) *(in(?:ches?)?)/ig,
            convert(...groups) {
                let ftin = parseFloat(groups[1]) / 3.281;
                ftin += parseFloat(groups[3]) / 39.37;
                return `${ftin.toFixed(2)}m`;
            },
        },
        poundWord: {
            regex: /(\d+(?:\.\d+)?) *(lbs?|pounds?)(?! ?\d)/ig,
            convert(...groups: string[]) {
                const lbs = (parseFloat(groups[1]) / 2.205).toFixed(2);
                return `${lbs}kg`;
            },
        },
        poundOunceWord: {
            regex: /(\d+(?:\.\d+)?) *(lbs?|pounds?) *(\d+(?:\.\d+)?) *(ozs?|ounces?)/ig,
            convert(...groups) {
                let lbs = (parseInt(groups[1]) / 2.205);
                lbs += (parseFloat(groups[2]) / 35.274);
                return `${lbs.toFixed(2)}kg`;
            }
        },
        ounceWord: {
            regex: /(\d+(?:\.\d+)?) ?(ounces?|oz)/gi,
            convert(...groups) {
                const ozs = (parseFloat(groups[1]) * 28.35).toFixed(2);
                return `${ozs}g`;
            },
        },
        milesPerHour: {
            regex: /(\d+(?:\.\d+)?) ?(m(?:p|\/)h)/gi,
            convert(...groups) {
                const mph = (parseFloat(groups[1]) * 1.609).toFixed(2);
                return `${mph}km/h`;
            },
        }
    },
    // matches metric untis, converts them into imperial
    metric: {
        // i dont think people ever write metric units as 1m3cm or something like that
        celcius: {
            regex: /(-?\d+(?:\.\d+)?)\s?°?c(?!\w)/ig,
            convert(...groups) {
                const f = ((parseFloat(groups[1]) * (9 / 5)) + 32).toFixed(2);
                return `${f}°F`;
            }
        },
        // convert to inches
        centimeters: {
            regex: /(\d+(?:\.\d+)?) ?(cm|centimeters?)(?!\w)/gi,
            convert(...groups) {
                const cm = (parseFloat(groups[1]) / 2.54).toFixed(2);
                return `${cm}in`;
            },
        },
        // convert to feet
        meters: {
            regex: /(\d+(?:\.\d+)?) ?(m|meters?)(?!\w)/gi,
            convert(...groups) {
                const m = parseFloat((parseFloat(groups[1]) * 3.821).toFixed(2));
                if (Number.isInteger(m))
                    return `${m}ft`;
                return `${m.toFixed(0)}ft${((m % 1) * 12).toFixed(2)}in`;
            },
        },
        // covnert to miles
        kilometers: {
            regex: /(\d+(?:\.\d+)?) ?(km|kilometers?|kms?)(?!\w)/gi,
            convert(...groups) {
                const m = (parseFloat(groups[1]) / 1.609).toFixed(2);
                return `${m}mi`;
            },
        },
        grams: {
            regex: /(\d+(?:\.\d+)?) ?(grams?|g)/gi,
            convert(...groups) {
                const g = (parseFloat(groups[1]) / 28.35).toFixed(2);
                return `${g}oz(s)`;
            },
        },
        kilograms: {
            regex: /(\d+(?:\.\d+)?) ?(kg|kilo(?:gram)?s?)/gi,
            convert(...groups) {
                const kg = (parseFloat(groups[1]) * 2.205).toFixed(2);
                return `${kg}lb(s)`;
            },
        },
        kilometersPerHour: {
            regex: /(\d+(?:\.\d+)?) ?(km\/h|kmph|kph|kilometers?\/?h)/gi,
            convert(...groups) {
                const kph = (parseFloat(groups[1]) / 1.609).toFixed(2);
                return `${kph}mph`;
            },
        }
    }

};
export function convert(message: string): string {
    let newMessage = message;
    if (settings.store.myUnits === "imperial") {
        for (const unit in regexes.metric) {
            newMessage = newMessage.replaceAll(regexes.metric[unit].regex, regexes.metric[unit].convert);
        }
    } else {
        for (const unit in regexes.imperial) {
            newMessage = newMessage.replaceAll(regexes.imperial[unit].regex, regexes.imperial[unit].convert);
        }
    }
    return newMessage;
}
