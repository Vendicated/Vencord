/* eslint-disable */

/**
 * apng-canvas v2.1.2
 *
 * @copyright 2011-2019 David Mzareulyan
 * @link https://github.com/davidmz/apng-canvas
 * @license MIT
 */
!(function i(o, a, s) {
    function u(n, t) {
        if (!a[n]) {
            if (!o[n]) {
                var e = "function" == typeof require && require;
                if (!t && e) return e(n, !0);
                if (c) return c(n, !0);
                throw new Error("Cannot find module '" + n + "'");
            }
            var r = (a[n] = { exports: {} });
            o[n][0].call(
                r.exports,
                function (t) {
                    var e = o[n][1][t];
                    return u(e || t);
                },
                r,
                r.exports,
                i,
                o,
                a,
                s
            );
        }
        return a[n].exports;
    }
    for (
        var c = "function" == typeof require && require, t = 0;
        t < s.length;
        t++
    )
        u(s[t]);
    return u;
})(
    {
        1: [
            function (Y, n, r) {
                (function (G, q) {
                    var t, e;
                    (t = this),
                        (e = function () {
                            "use strict";
                            function u(t) {
                                return "function" == typeof t;
                            }
                            var n = Array.isArray
                                ? Array.isArray
                                : function (t) {
                                    return (
                                        "[object Array]" ===
                                        Object.prototype.toString.call(t)
                                    );
                                },
                                r = 0,
                                e = void 0,
                                i = void 0,
                                a = function (t, e) {
                                    (l[r] = t),
                                        (l[r + 1] = e),
                                        2 === (r += 2) && (i ? i(d) : g());
                                };
                            var t =
                                "undefined" != typeof window
                                    ? window
                                    : void 0,
                                o = t || {},
                                s =
                                    o.MutationObserver ||
                                    o.WebKitMutationObserver,
                                c =
                                    "undefined" == typeof self &&
                                    void 0 !== G &&
                                    "[object process]" === {}.toString.call(G),
                                f =
                                    "undefined" != typeof Uint8ClampedArray &&
                                    "undefined" != typeof importScripts &&
                                    "undefined" != typeof MessageChannel;
                            function h() {
                                var t = setTimeout;
                                return function () {
                                    return t(d, 1);
                                };
                            }
                            var l = new Array(1e3);
                            function d() {
                                for (var t = 0; t < r; t += 2) {
                                    (0, l[t])(l[t + 1]),
                                        (l[t] = void 0),
                                        (l[t + 1] = void 0);
                                }
                                r = 0;
                            }
                            var p,
                                v,
                                A,
                                m,
                                g = void 0;
                            function w(t, e) {
                                var n = this,
                                    r = new this.constructor(b);
                                void 0 === r[_] && j(r);
                                var i = n._state;
                                if (i) {
                                    var o = arguments[i - 1];
                                    a(function () {
                                        return L(i, r, o, n._result);
                                    });
                                } else U(n, r, t, e);
                                return r;
                            }
                            function y(t) {
                                if (
                                    t &&
                                    "object" == typeof t &&
                                    t.constructor === this
                                )
                                    return t;
                                var e = new this(b);
                                return T(e, t), e;
                            }
                            g = c
                                ? function () {
                                    return G.nextTick(d);
                                }
                                : s
                                    ? ((v = 0),
                                        (A = new s(d)),
                                        (m = document.createTextNode("")),
                                        A.observe(m, { characterData: !0 }),
                                        function () {
                                            m.data = v = ++v % 2;
                                        })
                                    : f
                                        ? (((p = new MessageChannel()).port1.onmessage =
                                            d),
                                            function () {
                                                return p.port2.postMessage(0);
                                            })
                                        : void 0 === t && "function" == typeof Y
                                            ? (function () {
                                                try {
                                                    var t =
                                                        Function("return this")().require(
                                                            "vertx"
                                                        );
                                                    return void 0 !==
                                                        (e =
                                                            t.runOnLoop || t.runOnContext)
                                                        ? function () {
                                                            e(d);
                                                        }
                                                        : h();
                                                } catch (t) {
                                                    return h();
                                                }
                                            })()
                                            : h();
                            var _ = Math.random().toString(36).substring(2);
                            function b() { }
                            var E = void 0,
                                P = 1,
                                x = 2;
                            function N(t, r, i) {
                                a(function (e) {
                                    var n = !1,
                                        t = (function (t, e, n, r) {
                                            try {
                                                t.call(e, n, r);
                                            } catch (t) {
                                                return t;
                                            }
                                        })(
                                            i,
                                            r,
                                            function (t) {
                                                n ||
                                                    ((n = !0),
                                                        r !== t
                                                            ? T(e, t)
                                                            : O(e, t));
                                            },
                                            function (t) {
                                                n || ((n = !0), R(e, t));
                                            },
                                            e._label
                                        );
                                    !n && t && ((n = !0), R(e, t));
                                }, t);
                            }
                            function C(t, e, n) {
                                e.constructor === t.constructor &&
                                    n === w &&
                                    e.constructor.resolve === y
                                    ? (function (e, t) {
                                        t._state === P
                                            ? O(e, t._result)
                                            : t._state === x
                                                ? R(e, t._result)
                                                : U(
                                                    t,
                                                    void 0,
                                                    function (t) {
                                                        return T(e, t);
                                                    },
                                                    function (t) {
                                                        return R(e, t);
                                                    }
                                                );
                                    })(t, e)
                                    : void 0 === n
                                        ? O(t, e)
                                        : u(n)
                                            ? N(t, e, n)
                                            : O(t, e);
                            }
                            function T(e, t) {
                                if (e === t)
                                    R(
                                        e,
                                        new TypeError(
                                            "You cannot resolve a promise with itself"
                                        )
                                    );
                                else if (
                                    (function (t) {
                                        var e = typeof t;
                                        return (
                                            null !== t &&
                                            ("object" == e || "function" == e)
                                        );
                                    })(t)
                                ) {
                                    var n = void 0;
                                    try {
                                        n = t.then;
                                    } catch (t) {
                                        return void R(e, t);
                                    }
                                    C(e, t, n);
                                } else O(e, t);
                            }
                            function B(t) {
                                t._onerror && t._onerror(t._result), I(t);
                            }
                            function O(t, e) {
                                t._state === E &&
                                    ((t._result = e),
                                        (t._state = P),
                                        0 !== t._subscribers.length && a(I, t));
                            }
                            function R(t, e) {
                                t._state === E &&
                                    ((t._state = x), (t._result = e), a(B, t));
                            }
                            function U(t, e, n, r) {
                                var i = t._subscribers,
                                    o = i.length;
                                (t._onerror = null),
                                    (i[o] = e),
                                    (i[o + P] = n),
                                    (i[o + x] = r),
                                    0 === o && t._state && a(I, t);
                            }
                            function I(t) {
                                var e = t._subscribers,
                                    n = t._state;
                                if (0 !== e.length) {
                                    for (
                                        var r = void 0,
                                        i = void 0,
                                        o = t._result,
                                        a = 0;
                                        a < e.length;
                                        a += 3
                                    )
                                        (r = e[a]),
                                            (i = e[a + n]),
                                            r ? L(n, r, i, o) : i(o);
                                    t._subscribers.length = 0;
                                }
                            }
                            function L(t, e, n, r) {
                                var i = u(n),
                                    o = void 0,
                                    a = void 0,
                                    s = !0;
                                if (i) {
                                    try {
                                        o = n(r);
                                    } catch (t) {
                                        (s = !1), (a = t);
                                    }
                                    if (e === o)
                                        return void R(
                                            e,
                                            new TypeError(
                                                "A promises callback cannot return that same promise."
                                            )
                                        );
                                } else o = r;
                                e._state !== E ||
                                    (i && s
                                        ? T(e, o)
                                        : !1 === s
                                            ? R(e, a)
                                            : t === P
                                                ? O(e, o)
                                                : t === x && R(e, o));
                            }
                            var D = 0;
                            function j(t) {
                                (t[_] = D++),
                                    (t._state = void 0),
                                    (t._result = void 0),
                                    (t._subscribers = []);
                            }
                            var k =
                                ((F.prototype._enumerate = function (t) {
                                    for (
                                        var e = 0;
                                        this._state === E && e < t.length;
                                        e++
                                    )
                                        this._eachEntry(t[e], e);
                                }),
                                    (F.prototype._eachEntry = function (e, t) {
                                        var n = this._instanceConstructor,
                                            r = n.resolve;
                                        if (r === y) {
                                            var i = void 0,
                                                o = void 0,
                                                a = !1;
                                            try {
                                                i = e.then;
                                            } catch (t) {
                                                (a = !0), (o = t);
                                            }
                                            if (i === w && e._state !== E)
                                                this._settledAt(
                                                    e._state,
                                                    t,
                                                    e._result
                                                );
                                            else if ("function" != typeof i)
                                                this._remaining--,
                                                    (this._result[t] = e);
                                            else if (n === S) {
                                                var s = new n(b);
                                                a ? R(s, o) : C(s, e, i),
                                                    this._willSettleAt(s, t);
                                            } else
                                                this._willSettleAt(
                                                    new n(function (t) {
                                                        return t(e);
                                                    }),
                                                    t
                                                );
                                        } else this._willSettleAt(r(e), t);
                                    }),
                                    (F.prototype._settledAt = function (t, e, n) {
                                        var r = this.promise;
                                        r._state === E &&
                                            (this._remaining--,
                                                t === x
                                                    ? R(r, n)
                                                    : (this._result[e] = n)),
                                            0 === this._remaining &&
                                            O(r, this._result);
                                    }),
                                    (F.prototype._willSettleAt = function (t, e) {
                                        var n = this;
                                        U(
                                            t,
                                            void 0,
                                            function (t) {
                                                return n._settledAt(P, e, t);
                                            },
                                            function (t) {
                                                return n._settledAt(x, e, t);
                                            }
                                        );
                                    }),
                                    F);
                            function F(t, e) {
                                (this._instanceConstructor = t),
                                    (this.promise = new t(b)),
                                    this.promise[_] || j(this.promise),
                                    n(e)
                                        ? ((this.length = e.length),
                                            (this._remaining = e.length),
                                            (this._result = new Array(
                                                this.length
                                            )),
                                            0 === this.length
                                                ? O(this.promise, this._result)
                                                : ((this.length =
                                                    this.length || 0),
                                                    this._enumerate(e),
                                                    0 === this._remaining &&
                                                    O(
                                                        this.promise,
                                                        this._result
                                                    )))
                                        : R(
                                            this.promise,
                                            new Error(
                                                "Array Methods must be provided an Array"
                                            )
                                        );
                            }
                            var S =
                                ((M.prototype.catch = function (t) {
                                    return this.then(null, t);
                                }),
                                    (M.prototype.finally = function (e) {
                                        var n = this.constructor;
                                        return u(e)
                                            ? this.then(
                                                function (t) {
                                                    return n
                                                        .resolve(e())
                                                        .then(function () {
                                                            return t;
                                                        });
                                                },
                                                function (t) {
                                                    return n
                                                        .resolve(e())
                                                        .then(function () {
                                                            throw t;
                                                        });
                                                }
                                            )
                                            : this.then(e, e);
                                    }),
                                    M);
                            function M(t) {
                                (this[_] = D++),
                                    (this._result = this._state = void 0),
                                    (this._subscribers = []),
                                    b !== t &&
                                    ("function" != typeof t &&
                                        (function () {
                                            throw new TypeError(
                                                "You must pass a resolver function as the first argument to the promise constructor"
                                            );
                                        })(),
                                        this instanceof M
                                            ? (function (e, t) {
                                                try {
                                                    t(
                                                        function (t) {
                                                            T(e, t);
                                                        },
                                                        function (t) {
                                                            R(e, t);
                                                        }
                                                    );
                                                } catch (t) {
                                                    R(e, t);
                                                }
                                            })(this, t)
                                            : (function () {
                                                throw new TypeError(
                                                    "Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function."
                                                );
                                            })());
                            }
                            return (
                                (S.prototype.then = w),
                                (S.all = function (t) {
                                    return new k(this, t).promise;
                                }),
                                (S.race = function (i) {
                                    var o = this;
                                    return n(i)
                                        ? new o(function (t, e) {
                                            for (
                                                var n = i.length, r = 0;
                                                r < n;
                                                r++
                                            )
                                                o.resolve(i[r]).then(t, e);
                                        })
                                        : new o(function (t, e) {
                                            return e(
                                                new TypeError(
                                                    "You must pass an array to race."
                                                )
                                            );
                                        });
                                }),
                                (S.resolve = y),
                                (S.reject = function (t) {
                                    var e = new this(b);
                                    return R(e, t), e;
                                }),
                                (S._setScheduler = function (t) {
                                    i = t;
                                }),
                                (S._setAsap = function (t) {
                                    a = t;
                                }),
                                (S._asap = a),
                                (S.polyfill = function () {
                                    var t = void 0;
                                    if (void 0 !== q) t = q;
                                    else if ("undefined" != typeof self)
                                        t = self;
                                    else
                                        try {
                                            t = Function("return this")();
                                        } catch (t) {
                                            throw new Error(
                                                "polyfill failed because global object is unavailable in this environment"
                                            );
                                        }
                                    var e = t.Promise;
                                    if (e) {
                                        var n = null;
                                        try {
                                            n = Object.prototype.toString.call(
                                                e.resolve()
                                            );
                                        } catch (t) { }
                                        if ("[object Promise]" === n && !e.cast)
                                            return;
                                    }
                                    t.Promise = S;
                                }),
                                (S.Promise = S)
                            );
                        }),
                        "object" == typeof r && void 0 !== n
                            ? (n.exports = e())
                            : "function" == typeof define && define.amd
                                ? define(e)
                                : (t.ES6Promise = e());
                }).call(
                    this,
                    Y("VCmEsw"),
                    module.exports
                );
            },
            { VCmEsw: 2 },
        ],
        2: [
            function (t, e, n) {
                var r = (e.exports = {});
                function i() { }
                (r.nextTick = (function () {
                    var t = "undefined" != typeof window && window.setImmediate,
                        e =
                            "undefined" != typeof window &&
                            window.postMessage &&
                            window.addEventListener;
                    if (t)
                        return function (t) {
                            return window.setImmediate(t);
                        };
                    if (e) {
                        var n = [];
                        return (
                            window.addEventListener(
                                "message",
                                function (t) {
                                    var e = t.source;
                                    (e !== window && null !== e) ||
                                        "process-tick" !== t.data ||
                                        (t.stopPropagation(),
                                            0 < n.length && n.shift()());
                                },
                                !0
                            ),
                            function (t) {
                                n.push(t),
                                    window.postMessage("process-tick", "*");
                            }
                        );
                    }
                    return function (t) {
                        setTimeout(t, 0);
                    };
                })()),
                    (r.title = "browser"),
                    (r.browser = !0),
                    (r.env = {}),
                    (r.argv = []),
                    (r.on = i),
                    (r.addListener = i),
                    (r.once = i),
                    (r.off = i),
                    (r.removeListener = i),
                    (r.removeAllListeners = i),
                    (r.emit = i),
                    (r.binding = function (t) {
                        throw new Error("process.binding is not supported");
                    }),
                    (r.cwd = function () {
                        return "/";
                    }),
                    (r.chdir = function (t) {
                        throw new Error("process.chdir is not supported");
                    });
            },
            {},
        ],
        3: [
            function (t, e, n) {
                "use strict";
                e.exports = function () {
                    (this.width = 0),
                        (this.height = 0),
                        (this.numPlays = 0),
                        (this.playTime = 0),
                        (this.frames = []),
                        (this.play = function () {
                            s ||
                                u ||
                                (this.rewind(),
                                    (s = !0),
                                    requestAnimationFrame(e));
                        }),
                        (this.rewind = function () {
                            (o = i = 0), (a = null), (u = s = !1);
                        }),
                        (this.addContext = function (t) {
                            if (0 < c.length) {
                                var e = c[0].getImageData(
                                    0,
                                    0,
                                    this.width,
                                    this.height
                                );
                                t.putImageData(e, 0, 0);
                            }
                            c.push(t), (t._apng_animation = this);
                        }),
                        (this.removeContext = function (t) {
                            var e = c.indexOf(t);
                            -1 !== e &&
                                (c.splice(e, 1),
                                    0 === c.length && this.rewind(),
                                    "_apng_animation" in t &&
                                    delete t._apng_animation);
                        }),
                        (this.isPlayed = function () {
                            return s;
                        }),
                        (this.isFinished = function () {
                            return u;
                        });
                    var r = this,
                        i = 0,
                        o = 0,
                        a = null,
                        s = !1,
                        u = !1,
                        c = [],
                        e = function (t) {
                            for (; s && i <= t;) n(t);
                            s && requestAnimationFrame(e);
                        },
                        n = function (t) {
                            var e = o++ % r.frames.length,
                                n = r.frames[e];
                            if (
                                0 == r.numPlays ||
                                o / r.frames.length <= r.numPlays
                            ) {
                                for (
                                    0 == e &&
                                    (c.forEach(function (t) {
                                        t.clearRect(
                                            0,
                                            0,
                                            r.width,
                                            r.height
                                        );
                                    }),
                                        (a = null),
                                        2 == n.disposeOp && (n.disposeOp = 1)),
                                    a && 1 == a.disposeOp
                                        ? c.forEach(function (t) {
                                            t.clearRect(
                                                a.left,
                                                a.top,
                                                a.width,
                                                a.height
                                            );
                                        })
                                        : a &&
                                        2 == a.disposeOp &&
                                        c.forEach(function (t) {
                                            t.putImageData(
                                                a.iData,
                                                a.left,
                                                a.top
                                            );
                                        }),
                                    (a = n).iData = null,
                                    2 == a.disposeOp &&
                                    (a.iData = c[0].getImageData(
                                        n.left,
                                        n.top,
                                        n.width,
                                        n.height
                                    )),
                                    0 == n.blendOp &&
                                    c.forEach(function (t) {
                                        t.clearRect(
                                            n.left,
                                            n.top,
                                            n.width,
                                            n.height
                                        );
                                    }),
                                    c.forEach(function (t) {
                                        t.drawImage(n.img, n.left, n.top);
                                    }),
                                    0 == i && (i = t);
                                    t > i + r.playTime;

                                )
                                    i += r.playTime;
                                i += n.delay;
                            } else u = !(s = !1);
                        };
                };
            },
            {},
        ],
        4: [
            function (t, e, n) {
                "use strict";
                for (var a = new Uint32Array(256), r = 0; r < 256; r++) {
                    for (var i = r, o = 0; o < 8; o++)
                        i = 1 & i ? 3988292384 ^ (i >>> 1) : i >>> 1;
                    a[r] = i;
                }
                e.exports = function (t, e, n) {
                    for (
                        var r = -1,
                        i = (e = e || 0),
                        o = e + (n = n || t.length - e);
                        i < o;
                        i++
                    )
                        r = (r >>> 8) ^ a[255 & (r ^ t[i])];
                    return -1 ^ r;
                };
            },
            {},
        ],
        5: [
            function (a, t, e) {
                (function (t) {
                    "use strict";
                    var e = a("./support-test"),
                        n = a("./parser"),
                        r = a("./loader"),
                        i = (t.APNG = {});
                    (i.checkNativeFeatures = e.checkNativeFeatures),
                        (i.ifNeeded = e.ifNeeded),
                        (i.parseBuffer = function (t) {
                            return n(t);
                        });
                    var o = {};
                    (i.parseURL = function (t) {
                        return t in o || (o[t] = r(t).then(n)), o[t];
                    }),
                        (i.animateContext = function (t, e) {
                            return i.parseURL(t).then(function (t) {
                                return t.addContext(e), t.play(), t;
                            });
                        }),
                        (i.animateImage = function (s) {
                            return (
                                s.setAttribute("data-is-apng", "progress"),
                                i.parseURL(s.src).then(
                                    function (t) {
                                        s.setAttribute("data-is-apng", "yes");
                                        var e =
                                            document.createElement("canvas");
                                        (e.width = t.width),
                                            (e.height = t.height),
                                            Array.prototype.slice
                                                .call(s.attributes)
                                                .forEach(function (t) {
                                                    -1 ==
                                                        [
                                                            "alt",
                                                            "src",
                                                            "usemap",
                                                            "ismap",
                                                            "data-is-apng",
                                                            "width",
                                                            "height",
                                                        ].indexOf(t.nodeName) &&
                                                        e.setAttributeNode(
                                                            t.cloneNode(!1)
                                                        );
                                                }),
                                            e.setAttribute(
                                                "data-apng-src",
                                                s.src
                                            ),
                                            "" != s.alt &&
                                            e.appendChild(
                                                document.createTextNode(
                                                    s.alt
                                                )
                                            );
                                        var n = "",
                                            r = "",
                                            i = 0,
                                            o = "";
                                        "" != s.style.width &&
                                            "auto" != s.style.width
                                            ? (n = s.style.width)
                                            : s.hasAttribute("width") &&
                                            (n =
                                                s.getAttribute("width") +
                                                "px"),
                                            "" != s.style.height &&
                                                "auto" != s.style.height
                                                ? (r = s.style.height)
                                                : s.hasAttribute("height") &&
                                                (r =
                                                    s.getAttribute("height") +
                                                    "px"),
                                            "" != n &&
                                            "" == r &&
                                            ((i = parseFloat(n)),
                                                (o = n.match(/\D+$/)[0]),
                                                (r =
                                                    Math.round(
                                                        (e.height * i) / e.width
                                                    ) + o)),
                                            "" != r &&
                                            "" == n &&
                                            ((i = parseFloat(r)),
                                                (o = r.match(/\D+$/)[0]),
                                                (n =
                                                    Math.round(
                                                        (e.width * i) / e.height
                                                    ) + o)),
                                            (e.style.width = n),
                                            (e.style.height = r);
                                        var a = s.parentNode;
                                        a.insertBefore(e, s),
                                            a.removeChild(s),
                                            t.addContext(e.getContext("2d")),
                                            t.play();
                                    },
                                    function () {
                                        s.setAttribute("data-is-apng", "no");
                                    }
                                )
                            );
                        }),
                        (i.releaseCanvas = function (t) {
                            var e = t.getContext("2d");
                            "_apng_animation" in e &&
                                e._apng_animation.removeContext(e);
                        });
                }).call(
                    this,
                    module.exports
                );
            },
            { "./loader": 6, "./parser": 7, "./support-test": 8 },
        ],
        6: [
            function (t, e, n) {
                "use strict";
                var i = i || t("es6-promise").Promise;
                e.exports = function (r) {
                    return new i(function (t, e) {
                        var n = new XMLHttpRequest();
                        n.open("GET", r),
                            (n.responseType = "arraybuffer"),
                            (n.onload = function () {
                                200 == this.status ? t(this.response) : e(this);
                            }),
                            n.send();
                    });
                };
            },
            { "es6-promise": 1 },
        ],
        7: [
            function (t, e, n) {
                "use strict";
                var r = r || t("es6-promise").Promise,
                    m = t("./animation"),
                    o = t("./crc32"),
                    g = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
                e.exports = function (t) {
                    var A = new Uint8Array(t);
                    return new r(function (t, e) {
                        for (var n = 0; n < g.length; n++)
                            if (g[n] != A[n])
                                return void e(
                                    "Not a PNG file (invalid file signature)"
                                );
                        var r = !1;
                        if (
                            (w(A, function (t) {
                                return "acTL" != t || !(r = !0);
                            }),
                                r)
                        ) {
                            var a = [],
                                s = [],
                                u = null,
                                c = null,
                                f = new m();
                            if (
                                (w(A, function (t, e, n, r) {
                                    switch (t) {
                                        case "IHDR":
                                            (u = e.subarray(n + 8, n + 8 + r)),
                                                (f.width = y(e, n + 8)),
                                                (f.height = y(e, n + 12));
                                            break;
                                        case "acTL":
                                            f.numPlays = y(e, n + 8 + 4);
                                            break;
                                        case "fcTL":
                                            c && f.frames.push(c),
                                                ((c = {}).width = y(
                                                    e,
                                                    n + 8 + 4
                                                )),
                                                (c.height = y(e, n + 8 + 8)),
                                                (c.left = y(e, n + 8 + 12)),
                                                (c.top = y(e, n + 8 + 16));
                                            var i = _(e, n + 8 + 20),
                                                o = _(e, n + 8 + 22);
                                            0 == o && (o = 100),
                                                (c.delay = (1e3 * i) / o),
                                                c.delay <= 10 &&
                                                (c.delay = 100),
                                                (f.playTime += c.delay),
                                                (c.disposeOp = b(
                                                    e,
                                                    n + 8 + 24
                                                )),
                                                (c.blendOp = b(e, n + 8 + 25)),
                                                (c.dataParts = []);
                                            break;
                                        case "fdAT":
                                            c &&
                                                c.dataParts.push(
                                                    e.subarray(
                                                        n + 8 + 4,
                                                        n + 8 + r
                                                    )
                                                );
                                            break;
                                        case "IDAT":
                                            c &&
                                                c.dataParts.push(
                                                    e.subarray(n + 8, n + 8 + r)
                                                );
                                            break;
                                        case "IEND":
                                            s.push(E(e, n, 12 + r));
                                            break;
                                        default:
                                            a.push(E(e, n, 12 + r));
                                    }
                                }),
                                    c && f.frames.push(c),
                                    0 != f.frames.length)
                            )
                                for (
                                    var i = 0,
                                    o = new Blob(a),
                                    h = new Blob(s),
                                    l = 0;
                                    l < f.frames.length;
                                    l++
                                ) {
                                    c = f.frames[l];
                                    var d = [];
                                    d.push(g),
                                        u.set(P(c.width), 0),
                                        u.set(P(c.height), 4),
                                        d.push(x("IHDR", u)),
                                        d.push(o);
                                    for (var p = 0; p < c.dataParts.length; p++)
                                        d.push(x("IDAT", c.dataParts[p]));
                                    d.push(h);
                                    var v = URL.createObjectURL(
                                        new Blob(d, { type: "image/png" })
                                    );
                                    delete c.dataParts,
                                        (d = null),
                                        (c.img = document.createElement("img")),
                                        (c.img.onload = function () {
                                            URL.revokeObjectURL(this.src),
                                                ++i == f.frames.length && t(f);
                                        }),
                                        (c.img.onerror = function () {
                                            e("Image creation error");
                                        }),
                                        (c.img.src = v);
                                }
                            else e("Not an animated PNG");
                        } else e("Not an animated PNG");
                    });
                };
                var w = function (t, e) {
                    var n = 8;
                    do {
                        var r = y(t, n),
                            i = a(t, n + 4, 4),
                            o = e(i, t, n, r);
                        n += 12 + r;
                    } while (!1 !== o && "IEND" != i && n < t.length);
                },
                    y = function (t, e) {
                        var n = 0;
                        n += (t[0 + e] << 24) >>> 0;
                        for (var r = 1; r < 4; r++)
                            n += t[r + e] << (8 * (3 - r));
                        return n;
                    },
                    _ = function (t, e) {
                        for (var n = 0, r = 0; r < 2; r++)
                            n += t[r + e] << (8 * (1 - r));
                        return n;
                    },
                    b = function (t, e) {
                        return t[e];
                    },
                    E = function (t, e, n) {
                        var r = new Uint8Array(n);
                        return r.set(t.subarray(e, e + n)), r;
                    },
                    a = function (t, e, n) {
                        var r = Array.prototype.slice.call(
                            t.subarray(e, e + n)
                        );
                        return String.fromCharCode.apply(String, r);
                    },
                    P = function (t) {
                        return [
                            (t >>> 24) & 255,
                            (t >>> 16) & 255,
                            (t >>> 8) & 255,
                            255 & t,
                        ];
                    },
                    x = function (t, e) {
                        var n = t.length + e.length,
                            r = new Uint8Array(new ArrayBuffer(n + 8));
                        r.set(P(e.length), 0),
                            r.set(
                                (function (t) {
                                    for (var e = [], n = 0; n < t.length; n++)
                                        e.push(t.charCodeAt(n));
                                    return e;
                                })(t),
                                4
                            ),
                            r.set(e, 8);
                        var i = o(r, 4, n);
                        return r.set(P(i), n + 4), r;
                    };
            },
            { "./animation": 3, "./crc32": 4, "es6-promise": 1 },
        ],
        8: [
            function (o, a, t) {
                (function (t) {
                    "use strict";
                    var e,
                        n,
                        r = r || o("es6-promise").Promise,
                        i =
                            ((e = function (e) {
                                var n = document.createElement("canvas"),
                                    r = {
                                        TypedArrays: "ArrayBuffer" in t,
                                        BlobURLs: "URL" in t,
                                        requestAnimationFrame:
                                            "requestAnimationFrame" in t,
                                        pageProtocol:
                                            "http:" == location.protocol ||
                                            "https:" == location.protocol,
                                        canvas:
                                            "getContext" in
                                            document.createElement("canvas"),
                                        APNG: !1,
                                    };
                                if (r.canvas) {
                                    var i = new Image();
                                    (i.onload = function () {
                                        var t = n.getContext("2d");
                                        t.drawImage(i, 0, 0),
                                            (r.APNG =
                                                0 ===
                                                t.getImageData(0, 0, 1, 1)
                                                    .data[3]),
                                            e(r);
                                    }),
                                        (i.src =
                                            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACGFjVEwAAAABAAAAAcMq2TYAAAANSURBVAiZY2BgYPgPAAEEAQB9ssjfAAAAGmZjVEwAAAAAAAAAAQAAAAEAAAAAAAAAAAD6A+gBAbNU+2sAAAARZmRBVAAAAAEImWNgYGBgAAAABQAB6MzFdgAAAABJRU5ErkJggg==");
                                } else e(r);
                            }),
                                (n = null),
                                function (t) {
                                    return (n = n || new r(e)), t && n.then(t), n;
                                });
                    a.exports = {
                        checkNativeFeatures: i,
                        ifNeeded: function (r) {
                            return (
                                void 0 === r && (r = !1),
                                i().then(function (t) {
                                    if (t.APNG && !r) reject();
                                    else {
                                        var e = !0;
                                        for (var n in t)
                                            t.hasOwnProperty(n) &&
                                                "APNG" != n &&
                                                (e = e && t[n]);
                                    }
                                })
                            );
                        },
                    };
                }).call(
                    this,
                    module.exports
                );
            },
            { "es6-promise": 1 },
        ],
    },
    {},
    [5]
);
