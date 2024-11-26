/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 sadan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const clamp = (min: number, max: number) => (num: number) =>
    Math.max(min, Math.min(max, num));
const clampContrast = clamp(1, 21);
const snap = (mult: number, num: number) =>
    Math.floor((num % mult) / (mult / 2)) * mult + (num - (num % mult));

// NOTE: All color values are 0-1 and multiplied when stringified
interface sRGB {
    type: "srgb";
    r: number;
    g: number;
    b: number;
}
interface lRGB {
    type: "lrgb";
    r: number;
    g: number;
    b: number;
}
interface HSL {
    type: "hsl";
    h: number;
    s: number;
    l: number;
}
interface OKLAB {
    type: "oklab";
    l: number;
    a: number;
    b: number;
}

const RGB_REGEX = /rgb\((?:(\d+(?:\.\d+)?),? ?)(?:(\d+(?:\.\d+)?),? ?)(?:(\d+(?:\.\d+)?),? ?)\)/;

export class Color {
    private sRGB: sRGB;
    private get lRGB(): lRGB {
        return {
            type: "lrgb",
            r: this.sRGB.r <= 0.03928 ? this.sRGB.r / 12.92 : ((this.sRGB.r + 0.055) / 1.055) ** 2.4,
            g: this.sRGB.g <= 0.03928 ? this.sRGB.g / 12.92 : ((this.sRGB.g + 0.055) / 1.055) ** 2.4,
            b: this.sRGB.b <= 0.03928 ? this.sRGB.b / 12.92 : ((this.sRGB.b + 0.055) / 1.055) ** 2.4,
        };

    }
    private get HSL(): HSL {
        const cmin = Math.min(this.sRGB.r, this.sRGB.g, this.sRGB.b);
        const cmax = Math.max(this.sRGB.r, this.sRGB.g, this.sRGB.b);
        const delta = cmax - cmin;
        let h = 0;
        let s = 0;
        let l = (cmax + cmin) / 2;

        if (delta === 0) {
            s = 0;
            l = 0;
        } else {
            s = delta / (1 - Math.abs(2 * l - 1));

            switch (cmax) {
                case this.sRGB.r: {
                    h = ((this.sRGB.g - this.sRGB.b) / delta + (this.sRGB.g < this.sRGB.b ? 6 : 0)) % 6;
                    break;
                }
                case this.sRGB.g: {
                    h = (this.sRGB.b - this.sRGB.r) / delta + 2;
                    break;
                }
                case this.sRGB.b: {
                    h = (this.sRGB.r - this.sRGB.g) / delta + 4;
                    break;
                }
            }
            h = Math.round(h * 60);
        }
        return {
            type: "hsl",
            h,
            s,
            l,
        };

    }
    private get OKLAB(): OKLAB {
        const { r, g, b } = this.lRGB;

        let l = 0.4121656120 * r + 0.5362752080 * g + 0.0514575653 * b;
        let m = 0.2118591070 * r + 0.6807189570 * g + 0.1074065790 * b;
        let s = 0.0883097947 * r + 0.2818474170 * g + 0.6302613616 * b;

        l = Math.cbrt(l);
        m = Math.cbrt(m);
        s = Math.cbrt(s);

        return {
            type: "oklab",
            l: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        };
    }

    private get lumin(): number {
        return (
            0.2126 * this.lRGB.r + 0.7152 * this.lRGB.g + 0.0722 * this.lRGB.b
        );
    }

    public get rbgString(): string {
        return `rgb(${this.sRGB.r * 255}, ${this.sRGB.g * 255}, ${this.sRGB.b * 255})`;
    }

    public get lightness(): number {
        return this.HSL.l;
    }

    private constructor(c: sRGB | HSL | OKLAB) {
        switch (c.type) {
            case "srgb":
                this.sRGB = c;
                break;
            case "oklab": {
                this.sRGB = Color.lRGBtosRGB(Color.OKLABtolRGB(c));
                break;
            }
            case "hsl":
                this.sRGB = Color.HSLtosRGB(c);
                break;
        }
    }

    public static parse(color: string): Color {
        {
            const c = color.replaceAll("#", "");
            if (c.length === 3 || c.length === 6)
                return new Color(Color.hexToRGB(color));
        }
        rgb: {
            const c = color.match(RGB_REGEX);
            if (!c) break rgb;
            const r = parseFloat(c[1]),
                g = parseFloat(c[2]),
                b = parseFloat(c[3]);
            if (Number.isNaN(r + g + b))
                throw new Error("invalid rgb value. got: " + color);
            return new Color({
                type: "srgb",
                r: r / 255,
                g: g / 255,
                b: b / 255
            });
        }
        throw new Error("Color not recognized. got: " + color);
    }

    public static contrast(fg: Color, bg: Color): number {
        return (fg.lumin + 0.05) / (bg.lumin + 0.05);
    }

    public mix(colorspace: "oklab", thisPercent: number, other: Color, otherPercent = 1 - thisPercent): Color {
        switch (colorspace) {
            case "oklab": {
                const okl1 = this.OKLAB;
                const okl2 = other.OKLAB;

                if (thisPercent + otherPercent !== 1) {
                    throw new Error("percentages must add up to 1");
                }
                const mixedOKLAB: OKLAB = {
                    type: "oklab",
                    l: okl1.l * thisPercent + okl2.l * otherPercent,
                    a: okl1.a * thisPercent + okl2.a * otherPercent,
                    b: okl1.b * thisPercent + okl2.b * otherPercent,
                };
                return new Color(mixedOKLAB);
            }
        }
        throw new Error("unsupported colorspace: " + colorspace);
    }

    public bumpLightness(amount: number): Color {
        return new Color({
            type: "hsl",
            h: this.HSL.h,
            s: this.HSL.s,
            l: clamp(0, 1)(this.HSL.l + amount),
        });
    }

    private static OKLABtolRGB({ l, a, b }: OKLAB): lRGB {
        const l1 = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
        const m1 = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
        const s1 = Math.pow(l - 0.0894841775 * a - 1.2914855480 * b, 3);

        return {
            type: "lrgb",
            r: 4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
            g: -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
            b: -0.0041960863 * l1 - 0.7034186147 * m1 + 1.7076147010 * s1,
        };
    }

    private static lRGBtosRGB({ r, g, b }: lRGB): sRGB {
        // Apply gamma correction to each channel
        const sr =
            r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055;
        const sg =
            g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055;
        const sb =
            b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055;
        return {
            type: "srgb",
            r: sr,
            g: sg,
            b: sb,
        };
    }

    private static HSLtosRGB({ h, s, l }: HSL): sRGB {
        const k = (n: number) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1);

        const r = f(0);
        const g = f(8);
        const b = f(4);
        return {
            type: "srgb",
            r, g, b
        };
    }

    private static hexToRGB(color: string): sRGB {
        color = color.replace("#", "");
        let c: [number, number, number] = [0, 0, 0];
        if (color.length === 3) {
            c[0] = parseInt(color[0], 16);
            c[1] = parseInt(color[1], 16);
            c[2] = parseInt(color[2], 16);
        } else if (color.length === 6) {
            c[0] = parseInt(color.substring(0, 2), 16);
            c[1] = parseInt(color.substring(2, 4), 16);
            c[2] = parseInt(color.substring(4, 6), 16);
        } else {
            throw new Error("invalid color: " + color);
        }
        // @ts-expect-error
        c = c.map(x => x / 255);
        return {
            type: "srgb",
            r: c[0],
            g: c[1],
            b: c[2],
        };
    }
}

export class Contrast {
    public constructor(private bg: Color) {
    }

    private ratio(c: Color) {
        return Color.contrast(c, this.bg);
    }

    public calculateMinContrastColor(fg: Color, contrast: number, step: number = .01): string {
        step = Math.abs(step);
        step = this.bg.lightness > 0.5 ? -step : step;
        const snapStep = snap.bind(null, step);
        contrast = clampContrast(contrast);
        contrast = snapStep(contrast);
        const startingContrast = this.ratio(fg);
        if (startingContrast >= contrast) return fg.rbgString;
        let currentColor: Color = fg;
        let tries =
            (snapStep(this.bg.lightness) - snapStep(fg.lightness)) / step +
            (Math.abs(.5 - snapStep(this.bg.lightness)) + .5) / Math.abs(step);
        while (this.ratio(currentColor) <= contrast && tries--) {
            currentColor = currentColor.bumpLightness(step);
            if (this.ratio(currentColor) >= contrast) {
                break;
            }
        }
        return currentColor.rbgString;
    }
}

