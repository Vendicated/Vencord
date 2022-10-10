"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/constants.js"(exports, module2) {
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    module2.exports = {
      SEMVER_SPEC_VERSION,
      MAX_LENGTH,
      MAX_SAFE_INTEGER,
      MAX_SAFE_COMPONENT_LENGTH
    };
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/debug.js"(exports, module2) {
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/re.js"(exports, module2) {
    var { MAX_SAFE_COMPONENT_LENGTH } = require_constants();
    var debug = require_debug();
    exports = module2.exports = {};
    var re = exports.re = [];
    var src = exports.src = [];
    var t = exports.t = {};
    var R = 0;
    var createToken = (name, value, isGlobal) => {
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "[0-9]+");
    createToken("NONNUMERICIDENTIFIER", "\\d*[a-zA-Z-][a-zA-Z0-9-]*");
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", "[0-9A-Za-z-]+");
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCE", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/parse-options.js"(exports, module2) {
    var opts = ["includePrerelease", "loose", "rtl"];
    var parseOptions = (options) => !options ? {} : typeof options !== "object" ? { loose: true } : opts.filter((k) => options[k]).reduce((o, k) => {
      o[k] = true;
      return o;
    }, {});
    module2.exports = parseOptions;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/internal/identifiers.js"(exports, module2) {
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/semver.js"(exports, module2) {
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof SemVer)) {
          other = new SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      inc(release, identifier) {
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier);
            this.inc("pre", identifier);
            break;
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier);
            }
            this.inc("pre", identifier);
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          case "pre":
            if (this.prerelease.length === 0) {
              this.prerelease = [0];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                this.prerelease.push(0);
              }
            }
            if (identifier) {
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = [identifier, 0];
                }
              } else {
                this.prerelease = [identifier, 0];
              }
            }
            break;
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.format();
        this.raw = this.version;
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/parse.js"(exports, module2) {
    var { MAX_LENGTH } = require_constants();
    var { re, t } = require_re();
    var SemVer = require_semver();
    var parseOptions = require_parse_options();
    var parse = (version, options) => {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version !== "string") {
        return null;
      }
      if (version.length > MAX_LENGTH) {
        return null;
      }
      const r = options.loose ? re[t.LOOSE] : re[t.FULL];
      if (!r.test(version)) {
        return null;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        return null;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/valid.js"(exports, module2) {
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/clean.js"(exports, module2) {
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/inc.js"(exports, module2) {
    var SemVer = require_semver();
    var inc = (version, release, options, identifier) => {
      if (typeof options === "string") {
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare.js"(exports, module2) {
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/eq.js"(exports, module2) {
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/diff.js"(exports, module2) {
    var parse = require_parse();
    var eq = require_eq();
    var diff = (version1, version2) => {
      if (eq(version1, version2)) {
        return null;
      } else {
        const v1 = parse(version1);
        const v2 = parse(version2);
        const hasPre = v1.prerelease.length || v2.prerelease.length;
        const prefix = hasPre ? "pre" : "";
        const defaultResult = hasPre ? "prerelease" : "";
        for (const key in v1) {
          if (key === "major" || key === "minor" || key === "patch") {
            if (v1[key] !== v2[key]) {
              return prefix + key;
            }
          }
        }
        return defaultResult;
      }
    };
    module2.exports = diff;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/major.js"(exports, module2) {
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/minor.js"(exports, module2) {
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/patch.js"(exports, module2) {
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/prerelease.js"(exports, module2) {
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/rcompare.js"(exports, module2) {
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare-loose.js"(exports, module2) {
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/compare-build.js"(exports, module2) {
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/sort.js"(exports, module2) {
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/rsort.js"(exports, module2) {
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/gt.js"(exports, module2) {
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/lt.js"(exports, module2) {
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/neq.js"(exports, module2) {
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/gte.js"(exports, module2) {
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/lte.js"(exports, module2) {
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/cmp.js"(exports, module2) {
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/coerce.js"(exports, module2) {
    var SemVer = require_semver();
    var parse = require_parse();
    var { re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(re[t.COERCE]);
      } else {
        let next;
        while ((next = re[t.COERCERTL].exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          re[t.COERCERTL].lastIndex = next.index + next[1].length + next[2].length;
        }
        re[t.COERCERTL].lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      return parse(`${match[2]}.${match[3] || "0"}.${match[4] || "0"}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/.pnpm/yallist@4.0.0/node_modules/yallist/iterator.js
var require_iterator = __commonJS({
  "node_modules/.pnpm/yallist@4.0.0/node_modules/yallist/iterator.js"(exports, module2) {
    "use strict";
    module2.exports = function(Yallist) {
      Yallist.prototype[Symbol.iterator] = function* () {
        for (let walker = this.head; walker; walker = walker.next) {
          yield walker.value;
        }
      };
    };
  }
});

// node_modules/.pnpm/yallist@4.0.0/node_modules/yallist/yallist.js
var require_yallist = __commonJS({
  "node_modules/.pnpm/yallist@4.0.0/node_modules/yallist/yallist.js"(exports, module2) {
    "use strict";
    module2.exports = Yallist;
    Yallist.Node = Node;
    Yallist.create = Yallist;
    function Yallist(list) {
      var self2 = this;
      if (!(self2 instanceof Yallist)) {
        self2 = new Yallist();
      }
      self2.tail = null;
      self2.head = null;
      self2.length = 0;
      if (list && typeof list.forEach === "function") {
        list.forEach(function(item) {
          self2.push(item);
        });
      } else if (arguments.length > 0) {
        for (var i = 0, l = arguments.length; i < l; i++) {
          self2.push(arguments[i]);
        }
      }
      return self2;
    }
    Yallist.prototype.removeNode = function(node) {
      if (node.list !== this) {
        throw new Error("removing node which does not belong to this list");
      }
      var next = node.next;
      var prev = node.prev;
      if (next) {
        next.prev = prev;
      }
      if (prev) {
        prev.next = next;
      }
      if (node === this.head) {
        this.head = next;
      }
      if (node === this.tail) {
        this.tail = prev;
      }
      node.list.length--;
      node.next = null;
      node.prev = null;
      node.list = null;
      return next;
    };
    Yallist.prototype.unshiftNode = function(node) {
      if (node === this.head) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var head = this.head;
      node.list = this;
      node.next = head;
      if (head) {
        head.prev = node;
      }
      this.head = node;
      if (!this.tail) {
        this.tail = node;
      }
      this.length++;
    };
    Yallist.prototype.pushNode = function(node) {
      if (node === this.tail) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var tail = this.tail;
      node.list = this;
      node.prev = tail;
      if (tail) {
        tail.next = node;
      }
      this.tail = node;
      if (!this.head) {
        this.head = node;
      }
      this.length++;
    };
    Yallist.prototype.push = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        push(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.unshift = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        unshift(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.pop = function() {
      if (!this.tail) {
        return void 0;
      }
      var res = this.tail.value;
      this.tail = this.tail.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.shift = function() {
      if (!this.head) {
        return void 0;
      }
      var res = this.head.value;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.head, i = 0; walker !== null; i++) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.next;
      }
    };
    Yallist.prototype.forEachReverse = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.prev;
      }
    };
    Yallist.prototype.get = function(n) {
      for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
        walker = walker.next;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.getReverse = function(n) {
      for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
        walker = walker.prev;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.map = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.head; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.next;
      }
      return res;
    };
    Yallist.prototype.mapReverse = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.tail; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.prev;
      }
      return res;
    };
    Yallist.prototype.reduce = function(fn, initial) {
      var acc;
      var walker = this.head;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.head) {
        walker = this.head.next;
        acc = this.head.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = 0; walker !== null; i++) {
        acc = fn(acc, walker.value, i);
        walker = walker.next;
      }
      return acc;
    };
    Yallist.prototype.reduceReverse = function(fn, initial) {
      var acc;
      var walker = this.tail;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.tail) {
        walker = this.tail.prev;
        acc = this.tail.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = this.length - 1; walker !== null; i--) {
        acc = fn(acc, walker.value, i);
        walker = walker.prev;
      }
      return acc;
    };
    Yallist.prototype.toArray = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.head; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.next;
      }
      return arr;
    };
    Yallist.prototype.toArrayReverse = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.tail; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.prev;
      }
      return arr;
    };
    Yallist.prototype.slice = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
        walker = walker.next;
      }
      for (; walker !== null && i < to; i++, walker = walker.next) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.sliceReverse = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
        walker = walker.prev;
      }
      for (; walker !== null && i > from; i--, walker = walker.prev) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.splice = function(start, deleteCount, ...nodes) {
      if (start > this.length) {
        start = this.length - 1;
      }
      if (start < 0) {
        start = this.length + start;
      }
      for (var i = 0, walker = this.head; walker !== null && i < start; i++) {
        walker = walker.next;
      }
      var ret = [];
      for (var i = 0; walker && i < deleteCount; i++) {
        ret.push(walker.value);
        walker = this.removeNode(walker);
      }
      if (walker === null) {
        walker = this.tail;
      }
      if (walker !== this.head && walker !== this.tail) {
        walker = walker.prev;
      }
      for (var i = 0; i < nodes.length; i++) {
        walker = insert(this, walker, nodes[i]);
      }
      return ret;
    };
    Yallist.prototype.reverse = function() {
      var head = this.head;
      var tail = this.tail;
      for (var walker = head; walker !== null; walker = walker.prev) {
        var p = walker.prev;
        walker.prev = walker.next;
        walker.next = p;
      }
      this.head = tail;
      this.tail = head;
      return this;
    };
    function insert(self2, node, value) {
      var inserted = node === self2.head ? new Node(value, null, node, self2) : new Node(value, node, node.next, self2);
      if (inserted.next === null) {
        self2.tail = inserted;
      }
      if (inserted.prev === null) {
        self2.head = inserted;
      }
      self2.length++;
      return inserted;
    }
    function push(self2, item) {
      self2.tail = new Node(item, self2.tail, null, self2);
      if (!self2.head) {
        self2.head = self2.tail;
      }
      self2.length++;
    }
    function unshift(self2, item) {
      self2.head = new Node(item, null, self2.head, self2);
      if (!self2.tail) {
        self2.tail = self2.head;
      }
      self2.length++;
    }
    function Node(value, prev, next, list) {
      if (!(this instanceof Node)) {
        return new Node(value, prev, next, list);
      }
      this.list = list;
      this.value = value;
      if (prev) {
        prev.next = this;
        this.prev = prev;
      } else {
        this.prev = null;
      }
      if (next) {
        next.prev = this;
        this.next = next;
      } else {
        this.next = null;
      }
    }
    try {
      require_iterator()(Yallist);
    } catch (er) {
    }
  }
});

// node_modules/.pnpm/lru-cache@6.0.0/node_modules/lru-cache/index.js
var require_lru_cache = __commonJS({
  "node_modules/.pnpm/lru-cache@6.0.0/node_modules/lru-cache/index.js"(exports, module2) {
    "use strict";
    var Yallist = require_yallist();
    var MAX = Symbol("max");
    var LENGTH = Symbol("length");
    var LENGTH_CALCULATOR = Symbol("lengthCalculator");
    var ALLOW_STALE = Symbol("allowStale");
    var MAX_AGE = Symbol("maxAge");
    var DISPOSE = Symbol("dispose");
    var NO_DISPOSE_ON_SET = Symbol("noDisposeOnSet");
    var LRU_LIST = Symbol("lruList");
    var CACHE = Symbol("cache");
    var UPDATE_AGE_ON_GET = Symbol("updateAgeOnGet");
    var naiveLength = () => 1;
    var LRUCache = class {
      constructor(options) {
        if (typeof options === "number")
          options = { max: options };
        if (!options)
          options = {};
        if (options.max && (typeof options.max !== "number" || options.max < 0))
          throw new TypeError("max must be a non-negative number");
        const max = this[MAX] = options.max || Infinity;
        const lc = options.length || naiveLength;
        this[LENGTH_CALCULATOR] = typeof lc !== "function" ? naiveLength : lc;
        this[ALLOW_STALE] = options.stale || false;
        if (options.maxAge && typeof options.maxAge !== "number")
          throw new TypeError("maxAge must be a number");
        this[MAX_AGE] = options.maxAge || 0;
        this[DISPOSE] = options.dispose;
        this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
        this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
        this.reset();
      }
      set max(mL) {
        if (typeof mL !== "number" || mL < 0)
          throw new TypeError("max must be a non-negative number");
        this[MAX] = mL || Infinity;
        trim(this);
      }
      get max() {
        return this[MAX];
      }
      set allowStale(allowStale) {
        this[ALLOW_STALE] = !!allowStale;
      }
      get allowStale() {
        return this[ALLOW_STALE];
      }
      set maxAge(mA) {
        if (typeof mA !== "number")
          throw new TypeError("maxAge must be a non-negative number");
        this[MAX_AGE] = mA;
        trim(this);
      }
      get maxAge() {
        return this[MAX_AGE];
      }
      set lengthCalculator(lC) {
        if (typeof lC !== "function")
          lC = naiveLength;
        if (lC !== this[LENGTH_CALCULATOR]) {
          this[LENGTH_CALCULATOR] = lC;
          this[LENGTH] = 0;
          this[LRU_LIST].forEach((hit) => {
            hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
            this[LENGTH] += hit.length;
          });
        }
        trim(this);
      }
      get lengthCalculator() {
        return this[LENGTH_CALCULATOR];
      }
      get length() {
        return this[LENGTH];
      }
      get itemCount() {
        return this[LRU_LIST].length;
      }
      rforEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this[LRU_LIST].tail; walker !== null; ) {
          const prev = walker.prev;
          forEachStep(this, fn, walker, thisp);
          walker = prev;
        }
      }
      forEach(fn, thisp) {
        thisp = thisp || this;
        for (let walker = this[LRU_LIST].head; walker !== null; ) {
          const next = walker.next;
          forEachStep(this, fn, walker, thisp);
          walker = next;
        }
      }
      keys() {
        return this[LRU_LIST].toArray().map((k) => k.key);
      }
      values() {
        return this[LRU_LIST].toArray().map((k) => k.value);
      }
      reset() {
        if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
          this[LRU_LIST].forEach((hit) => this[DISPOSE](hit.key, hit.value));
        }
        this[CACHE] = /* @__PURE__ */ new Map();
        this[LRU_LIST] = new Yallist();
        this[LENGTH] = 0;
      }
      dump() {
        return this[LRU_LIST].map((hit) => isStale(this, hit) ? false : {
          k: hit.key,
          v: hit.value,
          e: hit.now + (hit.maxAge || 0)
        }).toArray().filter((h) => h);
      }
      dumpLru() {
        return this[LRU_LIST];
      }
      set(key, value, maxAge) {
        maxAge = maxAge || this[MAX_AGE];
        if (maxAge && typeof maxAge !== "number")
          throw new TypeError("maxAge must be a number");
        const now = maxAge ? Date.now() : 0;
        const len = this[LENGTH_CALCULATOR](value, key);
        if (this[CACHE].has(key)) {
          if (len > this[MAX]) {
            del(this, this[CACHE].get(key));
            return false;
          }
          const node = this[CACHE].get(key);
          const item = node.value;
          if (this[DISPOSE]) {
            if (!this[NO_DISPOSE_ON_SET])
              this[DISPOSE](key, item.value);
          }
          item.now = now;
          item.maxAge = maxAge;
          item.value = value;
          this[LENGTH] += len - item.length;
          item.length = len;
          this.get(key);
          trim(this);
          return true;
        }
        const hit = new Entry(key, value, len, now, maxAge);
        if (hit.length > this[MAX]) {
          if (this[DISPOSE])
            this[DISPOSE](key, value);
          return false;
        }
        this[LENGTH] += hit.length;
        this[LRU_LIST].unshift(hit);
        this[CACHE].set(key, this[LRU_LIST].head);
        trim(this);
        return true;
      }
      has(key) {
        if (!this[CACHE].has(key))
          return false;
        const hit = this[CACHE].get(key).value;
        return !isStale(this, hit);
      }
      get(key) {
        return get(this, key, true);
      }
      peek(key) {
        return get(this, key, false);
      }
      pop() {
        const node = this[LRU_LIST].tail;
        if (!node)
          return null;
        del(this, node);
        return node.value;
      }
      del(key) {
        del(this, this[CACHE].get(key));
      }
      load(arr) {
        this.reset();
        const now = Date.now();
        for (let l = arr.length - 1; l >= 0; l--) {
          const hit = arr[l];
          const expiresAt = hit.e || 0;
          if (expiresAt === 0)
            this.set(hit.k, hit.v);
          else {
            const maxAge = expiresAt - now;
            if (maxAge > 0) {
              this.set(hit.k, hit.v, maxAge);
            }
          }
        }
      }
      prune() {
        this[CACHE].forEach((value, key) => get(this, key, false));
      }
    };
    var get = (self2, key, doUse) => {
      const node = self2[CACHE].get(key);
      if (node) {
        const hit = node.value;
        if (isStale(self2, hit)) {
          del(self2, node);
          if (!self2[ALLOW_STALE])
            return void 0;
        } else {
          if (doUse) {
            if (self2[UPDATE_AGE_ON_GET])
              node.value.now = Date.now();
            self2[LRU_LIST].unshiftNode(node);
          }
        }
        return hit.value;
      }
    };
    var isStale = (self2, hit) => {
      if (!hit || !hit.maxAge && !self2[MAX_AGE])
        return false;
      const diff = Date.now() - hit.now;
      return hit.maxAge ? diff > hit.maxAge : self2[MAX_AGE] && diff > self2[MAX_AGE];
    };
    var trim = (self2) => {
      if (self2[LENGTH] > self2[MAX]) {
        for (let walker = self2[LRU_LIST].tail; self2[LENGTH] > self2[MAX] && walker !== null; ) {
          const prev = walker.prev;
          del(self2, walker);
          walker = prev;
        }
      }
    };
    var del = (self2, node) => {
      if (node) {
        const hit = node.value;
        if (self2[DISPOSE])
          self2[DISPOSE](hit.key, hit.value);
        self2[LENGTH] -= hit.length;
        self2[CACHE].delete(hit.key);
        self2[LRU_LIST].removeNode(node);
      }
    };
    var Entry = class {
      constructor(key, value, length, now, maxAge) {
        this.key = key;
        this.value = value;
        this.length = length;
        this.now = now;
        this.maxAge = maxAge || 0;
      }
    };
    var forEachStep = (self2, fn, node, thisp) => {
      let hit = node.value;
      if (isStale(self2, hit)) {
        del(self2, node);
        if (!self2[ALLOW_STALE])
          hit = void 0;
      }
      if (hit)
        fn.call(thisp, hit.value, hit.key, self2);
    };
    module2.exports = LRUCache;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/range.js"(exports, module2) {
    var Range = class {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.format();
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range;
        this.set = range.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${range}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.format();
      }
      format() {
        this.range = this.set.map((comps) => {
          return comps.join(" ").trim();
        }).join("||").trim();
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        range = range.trim();
        const memoOpts = Object.keys(this.options).join(",");
        const memoKey = `parseRange:${memoOpts}:${range}`;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        range = range.split(/\s+/).join(" ");
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lru_cache();
    var cache = new LRU({ max: 1e3 });
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => comp.trim().split(/\s+/).map((c) => {
      return replaceTilde(c, options);
    }).join(" ");
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => comp.trim().split(/\s+/).map((c) => {
      return replaceCaret(c, options);
    }).join(" ");
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => {
        return replaceXRange(c, options);
      }).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, tb) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/classes/comparator.js"(exports, module2) {
    var ANY = Symbol("SemVer ANY");
    var Comparator = class {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (!options || typeof options !== "object") {
          options = {
            loose: !!options,
            includePrerelease: false
          };
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        const sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
        const sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
        const sameSemVer = this.semver.version === comp.semver.version;
        const differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
        const oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && (this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<");
        const oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && (this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">");
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/functions/satisfies.js"(exports, module2) {
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/to-comparators.js"(exports, module2) {
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/max-satisfying.js"(exports, module2) {
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/min-satisfying.js"(exports, module2) {
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/min-version.js"(exports, module2) {
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/valid.js"(exports, module2) {
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/outside.js"(exports, module2) {
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/gtr.js"(exports, module2) {
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/ltr.js"(exports, module2) {
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/intersects.js"(exports, module2) {
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2);
    };
    module2.exports = intersects;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/simplify.js"(exports, module2) {
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/ranges/subset.js"(exports, module2) {
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER:
        for (const simpleSub of sub.set) {
          for (const simpleDom of dom.set) {
            const isSub = simpleSubset(simpleSub, simpleDom, options);
            sawNonNull = sawNonNull || isSub !== null;
            if (isSub) {
              continue OUTER;
            }
          }
          if (sawNonNull) {
            return false;
          }
        }
      return true;
    };
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = [new Comparator(">=0.0.0-0")];
        } else {
          sub = [new Comparator(">=0.0.0")];
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = [new Comparator(">=0.0.0")];
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/.pnpm/semver@7.3.7/node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/.pnpm/semver@7.3.7/node_modules/semver/index.js"(exports, module2) {
    var internalRe = require_re();
    module2.exports = {
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: require_constants().SEMVER_SPEC_VERSION,
      SemVer: require_semver(),
      compareIdentifiers: require_identifiers().compareIdentifiers,
      rcompareIdentifiers: require_identifiers().rcompareIdentifiers,
      parse: require_parse(),
      valid: require_valid(),
      clean: require_clean(),
      inc: require_inc(),
      diff: require_diff(),
      major: require_major(),
      minor: require_minor(),
      patch: require_patch(),
      prerelease: require_prerelease(),
      compare: require_compare(),
      rcompare: require_rcompare(),
      compareLoose: require_compare_loose(),
      compareBuild: require_compare_build(),
      sort: require_sort(),
      rsort: require_rsort(),
      gt: require_gt(),
      lt: require_lt(),
      eq: require_eq(),
      neq: require_neq(),
      gte: require_gte(),
      lte: require_lte(),
      cmp: require_cmp(),
      coerce: require_coerce(),
      Comparator: require_comparator(),
      Range: require_range(),
      satisfies: require_satisfies(),
      toComparators: require_to_comparators(),
      maxSatisfying: require_max_satisfying(),
      minSatisfying: require_min_satisfying(),
      minVersion: require_min_version(),
      validRange: require_valid2(),
      outside: require_outside(),
      gtr: require_gtr(),
      ltr: require_ltr(),
      intersects: require_intersects(),
      simplifyRange: require_simplify(),
      subset: require_subset()
    };
  }
});

// node_modules/.pnpm/fs.realpath@1.0.0/node_modules/fs.realpath/old.js
var require_old = __commonJS({
  "node_modules/.pnpm/fs.realpath@1.0.0/node_modules/fs.realpath/old.js"(exports) {
    var pathModule = require("path");
    var isWindows = process.platform === "win32";
    var fs = require("fs");
    var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);
    function rethrow() {
      var callback;
      if (DEBUG) {
        var backtrace = new Error();
        callback = debugCallback;
      } else
        callback = missingCallback;
      return callback;
      function debugCallback(err) {
        if (err) {
          backtrace.message = err.message;
          err = backtrace;
          missingCallback(err);
        }
      }
      function missingCallback(err) {
        if (err) {
          if (process.throwDeprecation)
            throw err;
          else if (!process.noDeprecation) {
            var msg = "fs: missing callback " + (err.stack || err.message);
            if (process.traceDeprecation)
              console.trace(msg);
            else
              console.error(msg);
          }
        }
      }
    }
    function maybeCallback(cb) {
      return typeof cb === "function" ? cb : rethrow();
    }
    var normalize = pathModule.normalize;
    if (isWindows) {
      nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
    } else {
      nextPartRe = /(.*?)(?:[\/]+|$)/g;
    }
    var nextPartRe;
    if (isWindows) {
      splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
    } else {
      splitRootRe = /^[\/]*/;
    }
    var splitRootRe;
    exports.realpathSync = function realpathSync(p, cache) {
      p = pathModule.resolve(p);
      if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
        return cache[p];
      }
      var original = p, seenLinks = {}, knownHard = {};
      var pos;
      var current;
      var base;
      var previous;
      start();
      function start() {
        var m = splitRootRe.exec(p);
        pos = m[0].length;
        current = m[0];
        base = m[0];
        previous = "";
        if (isWindows && !knownHard[base]) {
          fs.lstatSync(base);
          knownHard[base] = true;
        }
      }
      while (pos < p.length) {
        nextPartRe.lastIndex = pos;
        var result = nextPartRe.exec(p);
        previous = current;
        current += result[0];
        base = previous + result[1];
        pos = nextPartRe.lastIndex;
        if (knownHard[base] || cache && cache[base] === base) {
          continue;
        }
        var resolvedLink;
        if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
          resolvedLink = cache[base];
        } else {
          var stat = fs.lstatSync(base);
          if (!stat.isSymbolicLink()) {
            knownHard[base] = true;
            if (cache)
              cache[base] = base;
            continue;
          }
          var linkTarget = null;
          if (!isWindows) {
            var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
            if (seenLinks.hasOwnProperty(id)) {
              linkTarget = seenLinks[id];
            }
          }
          if (linkTarget === null) {
            fs.statSync(base);
            linkTarget = fs.readlinkSync(base);
          }
          resolvedLink = pathModule.resolve(previous, linkTarget);
          if (cache)
            cache[base] = resolvedLink;
          if (!isWindows)
            seenLinks[id] = linkTarget;
        }
        p = pathModule.resolve(resolvedLink, p.slice(pos));
        start();
      }
      if (cache)
        cache[original] = p;
      return p;
    };
    exports.realpath = function realpath(p, cache, cb) {
      if (typeof cb !== "function") {
        cb = maybeCallback(cache);
        cache = null;
      }
      p = pathModule.resolve(p);
      if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
        return process.nextTick(cb.bind(null, null, cache[p]));
      }
      var original = p, seenLinks = {}, knownHard = {};
      var pos;
      var current;
      var base;
      var previous;
      start();
      function start() {
        var m = splitRootRe.exec(p);
        pos = m[0].length;
        current = m[0];
        base = m[0];
        previous = "";
        if (isWindows && !knownHard[base]) {
          fs.lstat(base, function(err) {
            if (err)
              return cb(err);
            knownHard[base] = true;
            LOOP();
          });
        } else {
          process.nextTick(LOOP);
        }
      }
      function LOOP() {
        if (pos >= p.length) {
          if (cache)
            cache[original] = p;
          return cb(null, p);
        }
        nextPartRe.lastIndex = pos;
        var result = nextPartRe.exec(p);
        previous = current;
        current += result[0];
        base = previous + result[1];
        pos = nextPartRe.lastIndex;
        if (knownHard[base] || cache && cache[base] === base) {
          return process.nextTick(LOOP);
        }
        if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
          return gotResolvedLink(cache[base]);
        }
        return fs.lstat(base, gotStat);
      }
      function gotStat(err, stat) {
        if (err)
          return cb(err);
        if (!stat.isSymbolicLink()) {
          knownHard[base] = true;
          if (cache)
            cache[base] = base;
          return process.nextTick(LOOP);
        }
        if (!isWindows) {
          var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
          if (seenLinks.hasOwnProperty(id)) {
            return gotTarget(null, seenLinks[id], base);
          }
        }
        fs.stat(base, function(err2) {
          if (err2)
            return cb(err2);
          fs.readlink(base, function(err3, target) {
            if (!isWindows)
              seenLinks[id] = target;
            gotTarget(err3, target);
          });
        });
      }
      function gotTarget(err, target, base2) {
        if (err)
          return cb(err);
        var resolvedLink = pathModule.resolve(previous, target);
        if (cache)
          cache[base2] = resolvedLink;
        gotResolvedLink(resolvedLink);
      }
      function gotResolvedLink(resolvedLink) {
        p = pathModule.resolve(resolvedLink, p.slice(pos));
        start();
      }
    };
  }
});

// node_modules/.pnpm/fs.realpath@1.0.0/node_modules/fs.realpath/index.js
var require_fs = __commonJS({
  "node_modules/.pnpm/fs.realpath@1.0.0/node_modules/fs.realpath/index.js"(exports, module2) {
    module2.exports = realpath;
    realpath.realpath = realpath;
    realpath.sync = realpathSync;
    realpath.realpathSync = realpathSync;
    realpath.monkeypatch = monkeypatch;
    realpath.unmonkeypatch = unmonkeypatch;
    var fs = require("fs");
    var origRealpath = fs.realpath;
    var origRealpathSync = fs.realpathSync;
    var version = process.version;
    var ok = /^v[0-5]\./.test(version);
    var old = require_old();
    function newError(er) {
      return er && er.syscall === "realpath" && (er.code === "ELOOP" || er.code === "ENOMEM" || er.code === "ENAMETOOLONG");
    }
    function realpath(p, cache, cb) {
      if (ok) {
        return origRealpath(p, cache, cb);
      }
      if (typeof cache === "function") {
        cb = cache;
        cache = null;
      }
      origRealpath(p, cache, function(er, result) {
        if (newError(er)) {
          old.realpath(p, cache, cb);
        } else {
          cb(er, result);
        }
      });
    }
    function realpathSync(p, cache) {
      if (ok) {
        return origRealpathSync(p, cache);
      }
      try {
        return origRealpathSync(p, cache);
      } catch (er) {
        if (newError(er)) {
          return old.realpathSync(p, cache);
        } else {
          throw er;
        }
      }
    }
    function monkeypatch() {
      fs.realpath = realpath;
      fs.realpathSync = realpathSync;
    }
    function unmonkeypatch() {
      fs.realpath = origRealpath;
      fs.realpathSync = origRealpathSync;
    }
  }
});

// node_modules/.pnpm/concat-map@0.0.1/node_modules/concat-map/index.js
var require_concat_map = __commonJS({
  "node_modules/.pnpm/concat-map@0.0.1/node_modules/concat-map/index.js"(exports, module2) {
    module2.exports = function(xs, fn) {
      var res = [];
      for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x))
          res.push.apply(res, x);
        else
          res.push(x);
      }
      return res;
    };
    var isArray = Array.isArray || function(xs) {
      return Object.prototype.toString.call(xs) === "[object Array]";
    };
  }
});

// node_modules/.pnpm/balanced-match@1.0.2/node_modules/balanced-match/index.js
var require_balanced_match = __commonJS({
  "node_modules/.pnpm/balanced-match@1.0.2/node_modules/balanced-match/index.js"(exports, module2) {
    "use strict";
    module2.exports = balanced;
    function balanced(a, b, str) {
      if (a instanceof RegExp)
        a = maybeMatch(a, str);
      if (b instanceof RegExp)
        b = maybeMatch(b, str);
      var r = range(a, b, str);
      return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
      };
    }
    function maybeMatch(reg, str) {
      var m = str.match(reg);
      return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
      var begs, beg, left, right, result;
      var ai = str.indexOf(a);
      var bi = str.indexOf(b, ai + 1);
      var i = ai;
      if (ai >= 0 && bi > 0) {
        if (a === b) {
          return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
          if (i == ai) {
            begs.push(i);
            ai = str.indexOf(a, i + 1);
          } else if (begs.length == 1) {
            result = [begs.pop(), bi];
          } else {
            beg = begs.pop();
            if (beg < left) {
              left = beg;
              right = bi;
            }
            bi = str.indexOf(b, i + 1);
          }
          i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length) {
          result = [left, right];
        }
      }
      return result;
    }
  }
});

// node_modules/.pnpm/brace-expansion@1.1.11/node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS({
  "node_modules/.pnpm/brace-expansion@1.1.11/node_modules/brace-expansion/index.js"(exports, module2) {
    var concatMap = require_concat_map();
    var balanced = require_balanced_match();
    module2.exports = expandTop;
    var escSlash = "\0SLASH" + Math.random() + "\0";
    var escOpen = "\0OPEN" + Math.random() + "\0";
    var escClose = "\0CLOSE" + Math.random() + "\0";
    var escComma = "\0COMMA" + Math.random() + "\0";
    var escPeriod = "\0PERIOD" + Math.random() + "\0";
    function numeric(str) {
      return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
      return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
    }
    function unescapeBraces(str) {
      return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
    }
    function parseCommaParts(str) {
      if (!str)
        return [""];
      var parts = [];
      var m = balanced("{", "}", str);
      if (!m)
        return str.split(",");
      var pre = m.pre;
      var body = m.body;
      var post = m.post;
      var p = pre.split(",");
      p[p.length - 1] += "{" + body + "}";
      var postParts = parseCommaParts(post);
      if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
      }
      parts.push.apply(parts, p);
      return parts;
    }
    function expandTop(str) {
      if (!str)
        return [];
      if (str.substr(0, 2) === "{}") {
        str = "\\{\\}" + str.substr(2);
      }
      return expand(escapeBraces(str), true).map(unescapeBraces);
    }
    function embrace(str) {
      return "{" + str + "}";
    }
    function isPadded(el) {
      return /^-?0\d/.test(el);
    }
    function lte(i, y) {
      return i <= y;
    }
    function gte(i, y) {
      return i >= y;
    }
    function expand(str, isTop) {
      var expansions = [];
      var m = balanced("{", "}", str);
      if (!m || /\$$/.test(m.pre))
        return [str];
      var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
      var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
      var isSequence = isNumericSequence || isAlphaSequence;
      var isOptions = m.body.indexOf(",") >= 0;
      if (!isSequence && !isOptions) {
        if (m.post.match(/,.*\}/)) {
          str = m.pre + "{" + m.body + escClose + m.post;
          return expand(str);
        }
        return [str];
      }
      var n;
      if (isSequence) {
        n = m.body.split(/\.\./);
      } else {
        n = parseCommaParts(m.body);
        if (n.length === 1) {
          n = expand(n[0], false).map(embrace);
          if (n.length === 1) {
            var post = m.post.length ? expand(m.post, false) : [""];
            return post.map(function(p) {
              return m.pre + n[0] + p;
            });
          }
        }
      }
      var pre = m.pre;
      var post = m.post.length ? expand(m.post, false) : [""];
      var N;
      if (isSequence) {
        var x = numeric(n[0]);
        var y = numeric(n[1]);
        var width = Math.max(n[0].length, n[1].length);
        var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
        var test = lte;
        var reverse = y < x;
        if (reverse) {
          incr *= -1;
          test = gte;
        }
        var pad = n.some(isPadded);
        N = [];
        for (var i = x; test(i, y); i += incr) {
          var c;
          if (isAlphaSequence) {
            c = String.fromCharCode(i);
            if (c === "\\")
              c = "";
          } else {
            c = String(i);
            if (pad) {
              var need = width - c.length;
              if (need > 0) {
                var z = new Array(need + 1).join("0");
                if (i < 0)
                  c = "-" + z + c.slice(1);
                else
                  c = z + c;
              }
            }
          }
          N.push(c);
        }
      } else {
        N = concatMap(n, function(el) {
          return expand(el, false);
        });
      }
      for (var j = 0; j < N.length; j++) {
        for (var k = 0; k < post.length; k++) {
          var expansion = pre + N[j] + post[k];
          if (!isTop || isSequence || expansion)
            expansions.push(expansion);
        }
      }
      return expansions;
    }
  }
});

// node_modules/.pnpm/minimatch@3.1.2/node_modules/minimatch/minimatch.js
var require_minimatch = __commonJS({
  "node_modules/.pnpm/minimatch@3.1.2/node_modules/minimatch/minimatch.js"(exports, module2) {
    module2.exports = minimatch;
    minimatch.Minimatch = Minimatch;
    var path = function() {
      try {
        return require("path");
      } catch (e) {
      }
    }() || {
      sep: "/"
    };
    minimatch.sep = path.sep;
    var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
    var expand = require_brace_expansion();
    var plTypes = {
      "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
      "?": { open: "(?:", close: ")?" },
      "+": { open: "(?:", close: ")+" },
      "*": { open: "(?:", close: ")*" },
      "@": { open: "(?:", close: ")" }
    };
    var qmark = "[^/]";
    var star = qmark + "*?";
    var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
    var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
    var reSpecials = charSet("().*{}+?[]^$\\!");
    function charSet(s) {
      return s.split("").reduce(function(set, c) {
        set[c] = true;
        return set;
      }, {});
    }
    var slashSplit = /\/+/;
    minimatch.filter = filter;
    function filter(pattern, options) {
      options = options || {};
      return function(p, i, list) {
        return minimatch(p, pattern, options);
      };
    }
    function ext(a, b) {
      b = b || {};
      var t = {};
      Object.keys(a).forEach(function(k) {
        t[k] = a[k];
      });
      Object.keys(b).forEach(function(k) {
        t[k] = b[k];
      });
      return t;
    }
    minimatch.defaults = function(def) {
      if (!def || typeof def !== "object" || !Object.keys(def).length) {
        return minimatch;
      }
      var orig = minimatch;
      var m = function minimatch2(p, pattern, options) {
        return orig(p, pattern, ext(def, options));
      };
      m.Minimatch = function Minimatch2(pattern, options) {
        return new orig.Minimatch(pattern, ext(def, options));
      };
      m.Minimatch.defaults = function defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      };
      m.filter = function filter2(pattern, options) {
        return orig.filter(pattern, ext(def, options));
      };
      m.defaults = function defaults(options) {
        return orig.defaults(ext(def, options));
      };
      m.makeRe = function makeRe2(pattern, options) {
        return orig.makeRe(pattern, ext(def, options));
      };
      m.braceExpand = function braceExpand2(pattern, options) {
        return orig.braceExpand(pattern, ext(def, options));
      };
      m.match = function(list, pattern, options) {
        return orig.match(list, pattern, ext(def, options));
      };
      return m;
    };
    Minimatch.defaults = function(def) {
      return minimatch.defaults(def).Minimatch;
    };
    function minimatch(p, pattern, options) {
      assertValidPattern(pattern);
      if (!options)
        options = {};
      if (!options.nocomment && pattern.charAt(0) === "#") {
        return false;
      }
      return new Minimatch(pattern, options).match(p);
    }
    function Minimatch(pattern, options) {
      if (!(this instanceof Minimatch)) {
        return new Minimatch(pattern, options);
      }
      assertValidPattern(pattern);
      if (!options)
        options = {};
      pattern = pattern.trim();
      if (!options.allowWindowsEscape && path.sep !== "/") {
        pattern = pattern.split(path.sep).join("/");
      }
      this.options = options;
      this.set = [];
      this.pattern = pattern;
      this.regexp = null;
      this.negate = false;
      this.comment = false;
      this.empty = false;
      this.partial = !!options.partial;
      this.make();
    }
    Minimatch.prototype.debug = function() {
    };
    Minimatch.prototype.make = make;
    function make() {
      var pattern = this.pattern;
      var options = this.options;
      if (!options.nocomment && pattern.charAt(0) === "#") {
        this.comment = true;
        return;
      }
      if (!pattern) {
        this.empty = true;
        return;
      }
      this.parseNegate();
      var set = this.globSet = this.braceExpand();
      if (options.debug)
        this.debug = function debug() {
          console.error.apply(console, arguments);
        };
      this.debug(this.pattern, set);
      set = this.globParts = set.map(function(s) {
        return s.split(slashSplit);
      });
      this.debug(this.pattern, set);
      set = set.map(function(s, si, set2) {
        return s.map(this.parse, this);
      }, this);
      this.debug(this.pattern, set);
      set = set.filter(function(s) {
        return s.indexOf(false) === -1;
      });
      this.debug(this.pattern, set);
      this.set = set;
    }
    Minimatch.prototype.parseNegate = parseNegate;
    function parseNegate() {
      var pattern = this.pattern;
      var negate = false;
      var options = this.options;
      var negateOffset = 0;
      if (options.nonegate)
        return;
      for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
        negate = !negate;
        negateOffset++;
      }
      if (negateOffset)
        this.pattern = pattern.substr(negateOffset);
      this.negate = negate;
    }
    minimatch.braceExpand = function(pattern, options) {
      return braceExpand(pattern, options);
    };
    Minimatch.prototype.braceExpand = braceExpand;
    function braceExpand(pattern, options) {
      if (!options) {
        if (this instanceof Minimatch) {
          options = this.options;
        } else {
          options = {};
        }
      }
      pattern = typeof pattern === "undefined" ? this.pattern : pattern;
      assertValidPattern(pattern);
      if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
        return [pattern];
      }
      return expand(pattern);
    }
    var MAX_PATTERN_LENGTH = 1024 * 64;
    var assertValidPattern = function(pattern) {
      if (typeof pattern !== "string") {
        throw new TypeError("invalid pattern");
      }
      if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new TypeError("pattern is too long");
      }
    };
    Minimatch.prototype.parse = parse;
    var SUBPARSE = {};
    function parse(pattern, isSub) {
      assertValidPattern(pattern);
      var options = this.options;
      if (pattern === "**") {
        if (!options.noglobstar)
          return GLOBSTAR;
        else
          pattern = "*";
      }
      if (pattern === "")
        return "";
      var re = "";
      var hasMagic = !!options.nocase;
      var escaping = false;
      var patternListStack = [];
      var negativeLists = [];
      var stateChar;
      var inClass = false;
      var reClassStart = -1;
      var classStart = -1;
      var patternStart = pattern.charAt(0) === "." ? "" : options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
      var self2 = this;
      function clearStateChar() {
        if (stateChar) {
          switch (stateChar) {
            case "*":
              re += star;
              hasMagic = true;
              break;
            case "?":
              re += qmark;
              hasMagic = true;
              break;
            default:
              re += "\\" + stateChar;
              break;
          }
          self2.debug("clearStateChar %j %j", stateChar, re);
          stateChar = false;
        }
      }
      for (var i = 0, len = pattern.length, c; i < len && (c = pattern.charAt(i)); i++) {
        this.debug("%s	%s %s %j", pattern, i, re, c);
        if (escaping && reSpecials[c]) {
          re += "\\" + c;
          escaping = false;
          continue;
        }
        switch (c) {
          case "/": {
            return false;
          }
          case "\\":
            clearStateChar();
            escaping = true;
            continue;
          case "?":
          case "*":
          case "+":
          case "@":
          case "!":
            this.debug("%s	%s %s %j <-- stateChar", pattern, i, re, c);
            if (inClass) {
              this.debug("  in class");
              if (c === "!" && i === classStart + 1)
                c = "^";
              re += c;
              continue;
            }
            self2.debug("call clearStateChar %j", stateChar);
            clearStateChar();
            stateChar = c;
            if (options.noext)
              clearStateChar();
            continue;
          case "(":
            if (inClass) {
              re += "(";
              continue;
            }
            if (!stateChar) {
              re += "\\(";
              continue;
            }
            patternListStack.push({
              type: stateChar,
              start: i - 1,
              reStart: re.length,
              open: plTypes[stateChar].open,
              close: plTypes[stateChar].close
            });
            re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
            this.debug("plType %j %j", stateChar, re);
            stateChar = false;
            continue;
          case ")":
            if (inClass || !patternListStack.length) {
              re += "\\)";
              continue;
            }
            clearStateChar();
            hasMagic = true;
            var pl = patternListStack.pop();
            re += pl.close;
            if (pl.type === "!") {
              negativeLists.push(pl);
            }
            pl.reEnd = re.length;
            continue;
          case "|":
            if (inClass || !patternListStack.length || escaping) {
              re += "\\|";
              escaping = false;
              continue;
            }
            clearStateChar();
            re += "|";
            continue;
          case "[":
            clearStateChar();
            if (inClass) {
              re += "\\" + c;
              continue;
            }
            inClass = true;
            classStart = i;
            reClassStart = re.length;
            re += c;
            continue;
          case "]":
            if (i === classStart + 1 || !inClass) {
              re += "\\" + c;
              escaping = false;
              continue;
            }
            var cs = pattern.substring(classStart + 1, i);
            try {
              RegExp("[" + cs + "]");
            } catch (er) {
              var sp = this.parse(cs, SUBPARSE);
              re = re.substr(0, reClassStart) + "\\[" + sp[0] + "\\]";
              hasMagic = hasMagic || sp[1];
              inClass = false;
              continue;
            }
            hasMagic = true;
            inClass = false;
            re += c;
            continue;
          default:
            clearStateChar();
            if (escaping) {
              escaping = false;
            } else if (reSpecials[c] && !(c === "^" && inClass)) {
              re += "\\";
            }
            re += c;
        }
      }
      if (inClass) {
        cs = pattern.substr(classStart + 1);
        sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + "\\[" + sp[0];
        hasMagic = hasMagic || sp[1];
      }
      for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + pl.open.length);
        this.debug("setting tail", re, pl);
        tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
          if (!$2) {
            $2 = "\\";
          }
          return $1 + $1 + $2 + "|";
        });
        this.debug("tail=%j\n   %s", tail, tail, pl, re);
        var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + "\\(" + tail;
      }
      clearStateChar();
      if (escaping) {
        re += "\\\\";
      }
      var addPatternStart = false;
      switch (re.charAt(0)) {
        case "[":
        case ".":
        case "(":
          addPatternStart = true;
      }
      for (var n = negativeLists.length - 1; n > -1; n--) {
        var nl = negativeLists[n];
        var nlBefore = re.slice(0, nl.reStart);
        var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
        var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
        var nlAfter = re.slice(nl.reEnd);
        nlLast += nlAfter;
        var openParensBefore = nlBefore.split("(").length - 1;
        var cleanAfter = nlAfter;
        for (i = 0; i < openParensBefore; i++) {
          cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
        }
        nlAfter = cleanAfter;
        var dollar = "";
        if (nlAfter === "" && isSub !== SUBPARSE) {
          dollar = "$";
        }
        var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
        re = newRe;
      }
      if (re !== "" && hasMagic) {
        re = "(?=.)" + re;
      }
      if (addPatternStart) {
        re = patternStart + re;
      }
      if (isSub === SUBPARSE) {
        return [re, hasMagic];
      }
      if (!hasMagic) {
        return globUnescape(pattern);
      }
      var flags = options.nocase ? "i" : "";
      try {
        var regExp = new RegExp("^" + re + "$", flags);
      } catch (er) {
        return new RegExp("$.");
      }
      regExp._glob = pattern;
      regExp._src = re;
      return regExp;
    }
    minimatch.makeRe = function(pattern, options) {
      return new Minimatch(pattern, options || {}).makeRe();
    };
    Minimatch.prototype.makeRe = makeRe;
    function makeRe() {
      if (this.regexp || this.regexp === false)
        return this.regexp;
      var set = this.set;
      if (!set.length) {
        this.regexp = false;
        return this.regexp;
      }
      var options = this.options;
      var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
      var flags = options.nocase ? "i" : "";
      var re = set.map(function(pattern) {
        return pattern.map(function(p) {
          return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
        }).join("\\/");
      }).join("|");
      re = "^(?:" + re + ")$";
      if (this.negate)
        re = "^(?!" + re + ").*$";
      try {
        this.regexp = new RegExp(re, flags);
      } catch (ex) {
        this.regexp = false;
      }
      return this.regexp;
    }
    minimatch.match = function(list, pattern, options) {
      options = options || {};
      var mm = new Minimatch(pattern, options);
      list = list.filter(function(f) {
        return mm.match(f);
      });
      if (mm.options.nonull && !list.length) {
        list.push(pattern);
      }
      return list;
    };
    Minimatch.prototype.match = function match(f, partial) {
      if (typeof partial === "undefined")
        partial = this.partial;
      this.debug("match", f, this.pattern);
      if (this.comment)
        return false;
      if (this.empty)
        return f === "";
      if (f === "/" && partial)
        return true;
      var options = this.options;
      if (path.sep !== "/") {
        f = f.split(path.sep).join("/");
      }
      f = f.split(slashSplit);
      this.debug(this.pattern, "split", f);
      var set = this.set;
      this.debug(this.pattern, "set", set);
      var filename;
      var i;
      for (i = f.length - 1; i >= 0; i--) {
        filename = f[i];
        if (filename)
          break;
      }
      for (i = 0; i < set.length; i++) {
        var pattern = set[i];
        var file = f;
        if (options.matchBase && pattern.length === 1) {
          file = [filename];
        }
        var hit = this.matchOne(file, pattern, partial);
        if (hit) {
          if (options.flipNegate)
            return true;
          return !this.negate;
        }
      }
      if (options.flipNegate)
        return false;
      return this.negate;
    };
    Minimatch.prototype.matchOne = function(file, pattern, partial) {
      var options = this.options;
      this.debug(
        "matchOne",
        { "this": this, file, pattern }
      );
      this.debug("matchOne", file.length, pattern.length);
      for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
        this.debug("matchOne loop");
        var p = pattern[pi];
        var f = file[fi];
        this.debug(pattern, p, f);
        if (p === false)
          return false;
        if (p === GLOBSTAR) {
          this.debug("GLOBSTAR", [pattern, p, f]);
          var fr = fi;
          var pr = pi + 1;
          if (pr === pl) {
            this.debug("** at the end");
            for (; fi < fl; fi++) {
              if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
                return false;
            }
            return true;
          }
          while (fr < fl) {
            var swallowee = file[fr];
            this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              this.debug("globstar found match!", fr, fl, swallowee);
              return true;
            } else {
              if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
                this.debug("dot detected!", file, fr, pattern, pr);
                break;
              }
              this.debug("globstar swallow a segment, and continue");
              fr++;
            }
          }
          if (partial) {
            this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
            if (fr === fl)
              return true;
          }
          return false;
        }
        var hit;
        if (typeof p === "string") {
          hit = f === p;
          this.debug("string match", p, f, hit);
        } else {
          hit = f.match(p);
          this.debug("pattern match", p, f, hit);
        }
        if (!hit)
          return false;
      }
      if (fi === fl && pi === pl) {
        return true;
      } else if (fi === fl) {
        return partial;
      } else if (pi === pl) {
        return fi === fl - 1 && file[fi] === "";
      }
      throw new Error("wtf?");
    };
    function globUnescape(s) {
      return s.replace(/\\(.)/g, "$1");
    }
    function regExpEscape(s) {
      return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
  }
});

// node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits_browser.js"(exports, module2) {
    if (typeof Object.create === "function") {
      module2.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      module2.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  }
});

// node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits.js
var require_inherits = __commonJS({
  "node_modules/.pnpm/inherits@2.0.4/node_modules/inherits/inherits.js"(exports, module2) {
    try {
      util = require("util");
      if (typeof util.inherits !== "function")
        throw "";
      module2.exports = util.inherits;
    } catch (e) {
      module2.exports = require_inherits_browser();
    }
    var util;
  }
});

// node_modules/.pnpm/path-is-absolute@1.0.1/node_modules/path-is-absolute/index.js
var require_path_is_absolute = __commonJS({
  "node_modules/.pnpm/path-is-absolute@1.0.1/node_modules/path-is-absolute/index.js"(exports, module2) {
    "use strict";
    function posix(path) {
      return path.charAt(0) === "/";
    }
    function win32(path) {
      var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
      var result = splitDeviceRe.exec(path);
      var device = result[1] || "";
      var isUnc = Boolean(device && device.charAt(1) !== ":");
      return Boolean(result[2] || isUnc);
    }
    module2.exports = process.platform === "win32" ? win32 : posix;
    module2.exports.posix = posix;
    module2.exports.win32 = win32;
  }
});

// node_modules/.pnpm/glob@7.2.3/node_modules/glob/common.js
var require_common = __commonJS({
  "node_modules/.pnpm/glob@7.2.3/node_modules/glob/common.js"(exports) {
    exports.setopts = setopts;
    exports.ownProp = ownProp;
    exports.makeAbs = makeAbs;
    exports.finish = finish;
    exports.mark = mark;
    exports.isIgnored = isIgnored;
    exports.childrenIgnored = childrenIgnored;
    function ownProp(obj, field) {
      return Object.prototype.hasOwnProperty.call(obj, field);
    }
    var fs = require("fs");
    var path = require("path");
    var minimatch = require_minimatch();
    var isAbsolute = require_path_is_absolute();
    var Minimatch = minimatch.Minimatch;
    function alphasort(a, b) {
      return a.localeCompare(b, "en");
    }
    function setupIgnores(self2, options) {
      self2.ignore = options.ignore || [];
      if (!Array.isArray(self2.ignore))
        self2.ignore = [self2.ignore];
      if (self2.ignore.length) {
        self2.ignore = self2.ignore.map(ignoreMap);
      }
    }
    function ignoreMap(pattern) {
      var gmatcher = null;
      if (pattern.slice(-3) === "/**") {
        var gpattern = pattern.replace(/(\/\*\*)+$/, "");
        gmatcher = new Minimatch(gpattern, { dot: true });
      }
      return {
        matcher: new Minimatch(pattern, { dot: true }),
        gmatcher
      };
    }
    function setopts(self2, pattern, options) {
      if (!options)
        options = {};
      if (options.matchBase && -1 === pattern.indexOf("/")) {
        if (options.noglobstar) {
          throw new Error("base matching requires globstar");
        }
        pattern = "**/" + pattern;
      }
      self2.silent = !!options.silent;
      self2.pattern = pattern;
      self2.strict = options.strict !== false;
      self2.realpath = !!options.realpath;
      self2.realpathCache = options.realpathCache || /* @__PURE__ */ Object.create(null);
      self2.follow = !!options.follow;
      self2.dot = !!options.dot;
      self2.mark = !!options.mark;
      self2.nodir = !!options.nodir;
      if (self2.nodir)
        self2.mark = true;
      self2.sync = !!options.sync;
      self2.nounique = !!options.nounique;
      self2.nonull = !!options.nonull;
      self2.nosort = !!options.nosort;
      self2.nocase = !!options.nocase;
      self2.stat = !!options.stat;
      self2.noprocess = !!options.noprocess;
      self2.absolute = !!options.absolute;
      self2.fs = options.fs || fs;
      self2.maxLength = options.maxLength || Infinity;
      self2.cache = options.cache || /* @__PURE__ */ Object.create(null);
      self2.statCache = options.statCache || /* @__PURE__ */ Object.create(null);
      self2.symlinks = options.symlinks || /* @__PURE__ */ Object.create(null);
      setupIgnores(self2, options);
      self2.changedCwd = false;
      var cwd = process.cwd();
      if (!ownProp(options, "cwd"))
        self2.cwd = cwd;
      else {
        self2.cwd = path.resolve(options.cwd);
        self2.changedCwd = self2.cwd !== cwd;
      }
      self2.root = options.root || path.resolve(self2.cwd, "/");
      self2.root = path.resolve(self2.root);
      if (process.platform === "win32")
        self2.root = self2.root.replace(/\\/g, "/");
      self2.cwdAbs = isAbsolute(self2.cwd) ? self2.cwd : makeAbs(self2, self2.cwd);
      if (process.platform === "win32")
        self2.cwdAbs = self2.cwdAbs.replace(/\\/g, "/");
      self2.nomount = !!options.nomount;
      options.nonegate = true;
      options.nocomment = true;
      options.allowWindowsEscape = false;
      self2.minimatch = new Minimatch(pattern, options);
      self2.options = self2.minimatch.options;
    }
    function finish(self2) {
      var nou = self2.nounique;
      var all = nou ? [] : /* @__PURE__ */ Object.create(null);
      for (var i = 0, l = self2.matches.length; i < l; i++) {
        var matches = self2.matches[i];
        if (!matches || Object.keys(matches).length === 0) {
          if (self2.nonull) {
            var literal = self2.minimatch.globSet[i];
            if (nou)
              all.push(literal);
            else
              all[literal] = true;
          }
        } else {
          var m = Object.keys(matches);
          if (nou)
            all.push.apply(all, m);
          else
            m.forEach(function(m2) {
              all[m2] = true;
            });
        }
      }
      if (!nou)
        all = Object.keys(all);
      if (!self2.nosort)
        all = all.sort(alphasort);
      if (self2.mark) {
        for (var i = 0; i < all.length; i++) {
          all[i] = self2._mark(all[i]);
        }
        if (self2.nodir) {
          all = all.filter(function(e) {
            var notDir = !/\/$/.test(e);
            var c = self2.cache[e] || self2.cache[makeAbs(self2, e)];
            if (notDir && c)
              notDir = c !== "DIR" && !Array.isArray(c);
            return notDir;
          });
        }
      }
      if (self2.ignore.length)
        all = all.filter(function(m2) {
          return !isIgnored(self2, m2);
        });
      self2.found = all;
    }
    function mark(self2, p) {
      var abs = makeAbs(self2, p);
      var c = self2.cache[abs];
      var m = p;
      if (c) {
        var isDir = c === "DIR" || Array.isArray(c);
        var slash = p.slice(-1) === "/";
        if (isDir && !slash)
          m += "/";
        else if (!isDir && slash)
          m = m.slice(0, -1);
        if (m !== p) {
          var mabs = makeAbs(self2, m);
          self2.statCache[mabs] = self2.statCache[abs];
          self2.cache[mabs] = self2.cache[abs];
        }
      }
      return m;
    }
    function makeAbs(self2, f) {
      var abs = f;
      if (f.charAt(0) === "/") {
        abs = path.join(self2.root, f);
      } else if (isAbsolute(f) || f === "") {
        abs = f;
      } else if (self2.changedCwd) {
        abs = path.resolve(self2.cwd, f);
      } else {
        abs = path.resolve(f);
      }
      if (process.platform === "win32")
        abs = abs.replace(/\\/g, "/");
      return abs;
    }
    function isIgnored(self2, path2) {
      if (!self2.ignore.length)
        return false;
      return self2.ignore.some(function(item) {
        return item.matcher.match(path2) || !!(item.gmatcher && item.gmatcher.match(path2));
      });
    }
    function childrenIgnored(self2, path2) {
      if (!self2.ignore.length)
        return false;
      return self2.ignore.some(function(item) {
        return !!(item.gmatcher && item.gmatcher.match(path2));
      });
    }
  }
});

// node_modules/.pnpm/glob@7.2.3/node_modules/glob/sync.js
var require_sync = __commonJS({
  "node_modules/.pnpm/glob@7.2.3/node_modules/glob/sync.js"(exports, module2) {
    module2.exports = globSync;
    globSync.GlobSync = GlobSync;
    var rp = require_fs();
    var minimatch = require_minimatch();
    var Minimatch = minimatch.Minimatch;
    var Glob = require_glob().Glob;
    var util = require("util");
    var path = require("path");
    var assert = require("assert");
    var isAbsolute = require_path_is_absolute();
    var common = require_common();
    var setopts = common.setopts;
    var ownProp = common.ownProp;
    var childrenIgnored = common.childrenIgnored;
    var isIgnored = common.isIgnored;
    function globSync(pattern, options) {
      if (typeof options === "function" || arguments.length === 3)
        throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
      return new GlobSync(pattern, options).found;
    }
    function GlobSync(pattern, options) {
      if (!pattern)
        throw new Error("must provide pattern");
      if (typeof options === "function" || arguments.length === 3)
        throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
      if (!(this instanceof GlobSync))
        return new GlobSync(pattern, options);
      setopts(this, pattern, options);
      if (this.noprocess)
        return this;
      var n = this.minimatch.set.length;
      this.matches = new Array(n);
      for (var i = 0; i < n; i++) {
        this._process(this.minimatch.set[i], i, false);
      }
      this._finish();
    }
    GlobSync.prototype._finish = function() {
      assert.ok(this instanceof GlobSync);
      if (this.realpath) {
        var self2 = this;
        this.matches.forEach(function(matchset, index) {
          var set = self2.matches[index] = /* @__PURE__ */ Object.create(null);
          for (var p in matchset) {
            try {
              p = self2._makeAbs(p);
              var real = rp.realpathSync(p, self2.realpathCache);
              set[real] = true;
            } catch (er) {
              if (er.syscall === "stat")
                set[self2._makeAbs(p)] = true;
              else
                throw er;
            }
          }
        });
      }
      common.finish(this);
    };
    GlobSync.prototype._process = function(pattern, index, inGlobStar) {
      assert.ok(this instanceof GlobSync);
      var n = 0;
      while (typeof pattern[n] === "string") {
        n++;
      }
      var prefix;
      switch (n) {
        case pattern.length:
          this._processSimple(pattern.join("/"), index);
          return;
        case 0:
          prefix = null;
          break;
        default:
          prefix = pattern.slice(0, n).join("/");
          break;
      }
      var remain = pattern.slice(n);
      var read;
      if (prefix === null)
        read = ".";
      else if (isAbsolute(prefix) || isAbsolute(pattern.map(function(p) {
        return typeof p === "string" ? p : "[*]";
      }).join("/"))) {
        if (!prefix || !isAbsolute(prefix))
          prefix = "/" + prefix;
        read = prefix;
      } else
        read = prefix;
      var abs = this._makeAbs(read);
      if (childrenIgnored(this, read))
        return;
      var isGlobStar = remain[0] === minimatch.GLOBSTAR;
      if (isGlobStar)
        this._processGlobStar(prefix, read, abs, remain, index, inGlobStar);
      else
        this._processReaddir(prefix, read, abs, remain, index, inGlobStar);
    };
    GlobSync.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar) {
      var entries = this._readdir(abs, inGlobStar);
      if (!entries)
        return;
      var pn = remain[0];
      var negate = !!this.minimatch.negate;
      var rawGlob = pn._glob;
      var dotOk = this.dot || rawGlob.charAt(0) === ".";
      var matchedEntries = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.charAt(0) !== "." || dotOk) {
          var m;
          if (negate && !prefix) {
            m = !e.match(pn);
          } else {
            m = e.match(pn);
          }
          if (m)
            matchedEntries.push(e);
        }
      }
      var len = matchedEntries.length;
      if (len === 0)
        return;
      if (remain.length === 1 && !this.mark && !this.stat) {
        if (!this.matches[index])
          this.matches[index] = /* @__PURE__ */ Object.create(null);
        for (var i = 0; i < len; i++) {
          var e = matchedEntries[i];
          if (prefix) {
            if (prefix.slice(-1) !== "/")
              e = prefix + "/" + e;
            else
              e = prefix + e;
          }
          if (e.charAt(0) === "/" && !this.nomount) {
            e = path.join(this.root, e);
          }
          this._emitMatch(index, e);
        }
        return;
      }
      remain.shift();
      for (var i = 0; i < len; i++) {
        var e = matchedEntries[i];
        var newPattern;
        if (prefix)
          newPattern = [prefix, e];
        else
          newPattern = [e];
        this._process(newPattern.concat(remain), index, inGlobStar);
      }
    };
    GlobSync.prototype._emitMatch = function(index, e) {
      if (isIgnored(this, e))
        return;
      var abs = this._makeAbs(e);
      if (this.mark)
        e = this._mark(e);
      if (this.absolute) {
        e = abs;
      }
      if (this.matches[index][e])
        return;
      if (this.nodir) {
        var c = this.cache[abs];
        if (c === "DIR" || Array.isArray(c))
          return;
      }
      this.matches[index][e] = true;
      if (this.stat)
        this._stat(e);
    };
    GlobSync.prototype._readdirInGlobStar = function(abs) {
      if (this.follow)
        return this._readdir(abs, false);
      var entries;
      var lstat;
      var stat;
      try {
        lstat = this.fs.lstatSync(abs);
      } catch (er) {
        if (er.code === "ENOENT") {
          return null;
        }
      }
      var isSym = lstat && lstat.isSymbolicLink();
      this.symlinks[abs] = isSym;
      if (!isSym && lstat && !lstat.isDirectory())
        this.cache[abs] = "FILE";
      else
        entries = this._readdir(abs, false);
      return entries;
    };
    GlobSync.prototype._readdir = function(abs, inGlobStar) {
      var entries;
      if (inGlobStar && !ownProp(this.symlinks, abs))
        return this._readdirInGlobStar(abs);
      if (ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (!c || c === "FILE")
          return null;
        if (Array.isArray(c))
          return c;
      }
      try {
        return this._readdirEntries(abs, this.fs.readdirSync(abs));
      } catch (er) {
        this._readdirError(abs, er);
        return null;
      }
    };
    GlobSync.prototype._readdirEntries = function(abs, entries) {
      if (!this.mark && !this.stat) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (abs === "/")
            e = abs + e;
          else
            e = abs + "/" + e;
          this.cache[e] = true;
        }
      }
      this.cache[abs] = entries;
      return entries;
    };
    GlobSync.prototype._readdirError = function(f, er) {
      switch (er.code) {
        case "ENOTSUP":
        case "ENOTDIR":
          var abs = this._makeAbs(f);
          this.cache[abs] = "FILE";
          if (abs === this.cwdAbs) {
            var error = new Error(er.code + " invalid cwd " + this.cwd);
            error.path = this.cwd;
            error.code = er.code;
            throw error;
          }
          break;
        case "ENOENT":
        case "ELOOP":
        case "ENAMETOOLONG":
        case "UNKNOWN":
          this.cache[this._makeAbs(f)] = false;
          break;
        default:
          this.cache[this._makeAbs(f)] = false;
          if (this.strict)
            throw er;
          if (!this.silent)
            console.error("glob error", er);
          break;
      }
    };
    GlobSync.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar) {
      var entries = this._readdir(abs, inGlobStar);
      if (!entries)
        return;
      var remainWithoutGlobStar = remain.slice(1);
      var gspref = prefix ? [prefix] : [];
      var noGlobStar = gspref.concat(remainWithoutGlobStar);
      this._process(noGlobStar, index, false);
      var len = entries.length;
      var isSym = this.symlinks[abs];
      if (isSym && inGlobStar)
        return;
      for (var i = 0; i < len; i++) {
        var e = entries[i];
        if (e.charAt(0) === "." && !this.dot)
          continue;
        var instead = gspref.concat(entries[i], remainWithoutGlobStar);
        this._process(instead, index, true);
        var below = gspref.concat(entries[i], remain);
        this._process(below, index, true);
      }
    };
    GlobSync.prototype._processSimple = function(prefix, index) {
      var exists = this._stat(prefix);
      if (!this.matches[index])
        this.matches[index] = /* @__PURE__ */ Object.create(null);
      if (!exists)
        return;
      if (prefix && isAbsolute(prefix) && !this.nomount) {
        var trail = /[\/\\]$/.test(prefix);
        if (prefix.charAt(0) === "/") {
          prefix = path.join(this.root, prefix);
        } else {
          prefix = path.resolve(this.root, prefix);
          if (trail)
            prefix += "/";
        }
      }
      if (process.platform === "win32")
        prefix = prefix.replace(/\\/g, "/");
      this._emitMatch(index, prefix);
    };
    GlobSync.prototype._stat = function(f) {
      var abs = this._makeAbs(f);
      var needDir = f.slice(-1) === "/";
      if (f.length > this.maxLength)
        return false;
      if (!this.stat && ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (Array.isArray(c))
          c = "DIR";
        if (!needDir || c === "DIR")
          return c;
        if (needDir && c === "FILE")
          return false;
      }
      var exists;
      var stat = this.statCache[abs];
      if (!stat) {
        var lstat;
        try {
          lstat = this.fs.lstatSync(abs);
        } catch (er) {
          if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
            this.statCache[abs] = false;
            return false;
          }
        }
        if (lstat && lstat.isSymbolicLink()) {
          try {
            stat = this.fs.statSync(abs);
          } catch (er) {
            stat = lstat;
          }
        } else {
          stat = lstat;
        }
      }
      this.statCache[abs] = stat;
      var c = true;
      if (stat)
        c = stat.isDirectory() ? "DIR" : "FILE";
      this.cache[abs] = this.cache[abs] || c;
      if (needDir && c === "FILE")
        return false;
      return c;
    };
    GlobSync.prototype._mark = function(p) {
      return common.mark(this, p);
    };
    GlobSync.prototype._makeAbs = function(f) {
      return common.makeAbs(this, f);
    };
  }
});

// node_modules/.pnpm/wrappy@1.0.2/node_modules/wrappy/wrappy.js
var require_wrappy = __commonJS({
  "node_modules/.pnpm/wrappy@1.0.2/node_modules/wrappy/wrappy.js"(exports, module2) {
    module2.exports = wrappy;
    function wrappy(fn, cb) {
      if (fn && cb)
        return wrappy(fn)(cb);
      if (typeof fn !== "function")
        throw new TypeError("need wrapper function");
      Object.keys(fn).forEach(function(k) {
        wrapper[k] = fn[k];
      });
      return wrapper;
      function wrapper() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        var ret = fn.apply(this, args);
        var cb2 = args[args.length - 1];
        if (typeof ret === "function" && ret !== cb2) {
          Object.keys(cb2).forEach(function(k) {
            ret[k] = cb2[k];
          });
        }
        return ret;
      }
    }
  }
});

// node_modules/.pnpm/once@1.4.0/node_modules/once/once.js
var require_once = __commonJS({
  "node_modules/.pnpm/once@1.4.0/node_modules/once/once.js"(exports, module2) {
    var wrappy = require_wrappy();
    module2.exports = wrappy(once);
    module2.exports.strict = wrappy(onceStrict);
    once.proto = once(function() {
      Object.defineProperty(Function.prototype, "once", {
        value: function() {
          return once(this);
        },
        configurable: true
      });
      Object.defineProperty(Function.prototype, "onceStrict", {
        value: function() {
          return onceStrict(this);
        },
        configurable: true
      });
    });
    function once(fn) {
      var f = function() {
        if (f.called)
          return f.value;
        f.called = true;
        return f.value = fn.apply(this, arguments);
      };
      f.called = false;
      return f;
    }
    function onceStrict(fn) {
      var f = function() {
        if (f.called)
          throw new Error(f.onceError);
        f.called = true;
        return f.value = fn.apply(this, arguments);
      };
      var name = fn.name || "Function wrapped with `once`";
      f.onceError = name + " shouldn't be called more than once";
      f.called = false;
      return f;
    }
  }
});

// node_modules/.pnpm/inflight@1.0.6/node_modules/inflight/inflight.js
var require_inflight = __commonJS({
  "node_modules/.pnpm/inflight@1.0.6/node_modules/inflight/inflight.js"(exports, module2) {
    var wrappy = require_wrappy();
    var reqs = /* @__PURE__ */ Object.create(null);
    var once = require_once();
    module2.exports = wrappy(inflight);
    function inflight(key, cb) {
      if (reqs[key]) {
        reqs[key].push(cb);
        return null;
      } else {
        reqs[key] = [cb];
        return makeres(key);
      }
    }
    function makeres(key) {
      return once(function RES() {
        var cbs = reqs[key];
        var len = cbs.length;
        var args = slice(arguments);
        try {
          for (var i = 0; i < len; i++) {
            cbs[i].apply(null, args);
          }
        } finally {
          if (cbs.length > len) {
            cbs.splice(0, len);
            process.nextTick(function() {
              RES.apply(null, args);
            });
          } else {
            delete reqs[key];
          }
        }
      });
    }
    function slice(args) {
      var length = args.length;
      var array = [];
      for (var i = 0; i < length; i++)
        array[i] = args[i];
      return array;
    }
  }
});

// node_modules/.pnpm/glob@7.2.3/node_modules/glob/glob.js
var require_glob = __commonJS({
  "node_modules/.pnpm/glob@7.2.3/node_modules/glob/glob.js"(exports, module2) {
    module2.exports = glob;
    var rp = require_fs();
    var minimatch = require_minimatch();
    var Minimatch = minimatch.Minimatch;
    var inherits = require_inherits();
    var EE = require("events").EventEmitter;
    var path = require("path");
    var assert = require("assert");
    var isAbsolute = require_path_is_absolute();
    var globSync = require_sync();
    var common = require_common();
    var setopts = common.setopts;
    var ownProp = common.ownProp;
    var inflight = require_inflight();
    var util = require("util");
    var childrenIgnored = common.childrenIgnored;
    var isIgnored = common.isIgnored;
    var once = require_once();
    function glob(pattern, options, cb) {
      if (typeof options === "function")
        cb = options, options = {};
      if (!options)
        options = {};
      if (options.sync) {
        if (cb)
          throw new TypeError("callback provided to sync glob");
        return globSync(pattern, options);
      }
      return new Glob(pattern, options, cb);
    }
    glob.sync = globSync;
    var GlobSync = glob.GlobSync = globSync.GlobSync;
    glob.glob = glob;
    function extend(origin, add) {
      if (add === null || typeof add !== "object") {
        return origin;
      }
      var keys = Object.keys(add);
      var i = keys.length;
      while (i--) {
        origin[keys[i]] = add[keys[i]];
      }
      return origin;
    }
    glob.hasMagic = function(pattern, options_) {
      var options = extend({}, options_);
      options.noprocess = true;
      var g = new Glob(pattern, options);
      var set = g.minimatch.set;
      if (!pattern)
        return false;
      if (set.length > 1)
        return true;
      for (var j = 0; j < set[0].length; j++) {
        if (typeof set[0][j] !== "string")
          return true;
      }
      return false;
    };
    glob.Glob = Glob;
    inherits(Glob, EE);
    function Glob(pattern, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = null;
      }
      if (options && options.sync) {
        if (cb)
          throw new TypeError("callback provided to sync glob");
        return new GlobSync(pattern, options);
      }
      if (!(this instanceof Glob))
        return new Glob(pattern, options, cb);
      setopts(this, pattern, options);
      this._didRealPath = false;
      var n = this.minimatch.set.length;
      this.matches = new Array(n);
      if (typeof cb === "function") {
        cb = once(cb);
        this.on("error", cb);
        this.on("end", function(matches) {
          cb(null, matches);
        });
      }
      var self2 = this;
      this._processing = 0;
      this._emitQueue = [];
      this._processQueue = [];
      this.paused = false;
      if (this.noprocess)
        return this;
      if (n === 0)
        return done();
      var sync = true;
      for (var i = 0; i < n; i++) {
        this._process(this.minimatch.set[i], i, false, done);
      }
      sync = false;
      function done() {
        --self2._processing;
        if (self2._processing <= 0) {
          if (sync) {
            process.nextTick(function() {
              self2._finish();
            });
          } else {
            self2._finish();
          }
        }
      }
    }
    Glob.prototype._finish = function() {
      assert(this instanceof Glob);
      if (this.aborted)
        return;
      if (this.realpath && !this._didRealpath)
        return this._realpath();
      common.finish(this);
      this.emit("end", this.found);
    };
    Glob.prototype._realpath = function() {
      if (this._didRealpath)
        return;
      this._didRealpath = true;
      var n = this.matches.length;
      if (n === 0)
        return this._finish();
      var self2 = this;
      for (var i = 0; i < this.matches.length; i++)
        this._realpathSet(i, next);
      function next() {
        if (--n === 0)
          self2._finish();
      }
    };
    Glob.prototype._realpathSet = function(index, cb) {
      var matchset = this.matches[index];
      if (!matchset)
        return cb();
      var found = Object.keys(matchset);
      var self2 = this;
      var n = found.length;
      if (n === 0)
        return cb();
      var set = this.matches[index] = /* @__PURE__ */ Object.create(null);
      found.forEach(function(p, i) {
        p = self2._makeAbs(p);
        rp.realpath(p, self2.realpathCache, function(er, real) {
          if (!er)
            set[real] = true;
          else if (er.syscall === "stat")
            set[p] = true;
          else
            self2.emit("error", er);
          if (--n === 0) {
            self2.matches[index] = set;
            cb();
          }
        });
      });
    };
    Glob.prototype._mark = function(p) {
      return common.mark(this, p);
    };
    Glob.prototype._makeAbs = function(f) {
      return common.makeAbs(this, f);
    };
    Glob.prototype.abort = function() {
      this.aborted = true;
      this.emit("abort");
    };
    Glob.prototype.pause = function() {
      if (!this.paused) {
        this.paused = true;
        this.emit("pause");
      }
    };
    Glob.prototype.resume = function() {
      if (this.paused) {
        this.emit("resume");
        this.paused = false;
        if (this._emitQueue.length) {
          var eq = this._emitQueue.slice(0);
          this._emitQueue.length = 0;
          for (var i = 0; i < eq.length; i++) {
            var e = eq[i];
            this._emitMatch(e[0], e[1]);
          }
        }
        if (this._processQueue.length) {
          var pq = this._processQueue.slice(0);
          this._processQueue.length = 0;
          for (var i = 0; i < pq.length; i++) {
            var p = pq[i];
            this._processing--;
            this._process(p[0], p[1], p[2], p[3]);
          }
        }
      }
    };
    Glob.prototype._process = function(pattern, index, inGlobStar, cb) {
      assert(this instanceof Glob);
      assert(typeof cb === "function");
      if (this.aborted)
        return;
      this._processing++;
      if (this.paused) {
        this._processQueue.push([pattern, index, inGlobStar, cb]);
        return;
      }
      var n = 0;
      while (typeof pattern[n] === "string") {
        n++;
      }
      var prefix;
      switch (n) {
        case pattern.length:
          this._processSimple(pattern.join("/"), index, cb);
          return;
        case 0:
          prefix = null;
          break;
        default:
          prefix = pattern.slice(0, n).join("/");
          break;
      }
      var remain = pattern.slice(n);
      var read;
      if (prefix === null)
        read = ".";
      else if (isAbsolute(prefix) || isAbsolute(pattern.map(function(p) {
        return typeof p === "string" ? p : "[*]";
      }).join("/"))) {
        if (!prefix || !isAbsolute(prefix))
          prefix = "/" + prefix;
        read = prefix;
      } else
        read = prefix;
      var abs = this._makeAbs(read);
      if (childrenIgnored(this, read))
        return cb();
      var isGlobStar = remain[0] === minimatch.GLOBSTAR;
      if (isGlobStar)
        this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
      else
        this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
    };
    Glob.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar, cb) {
      var self2 = this;
      this._readdir(abs, inGlobStar, function(er, entries) {
        return self2._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
      });
    };
    Glob.prototype._processReaddir2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
      if (!entries)
        return cb();
      var pn = remain[0];
      var negate = !!this.minimatch.negate;
      var rawGlob = pn._glob;
      var dotOk = this.dot || rawGlob.charAt(0) === ".";
      var matchedEntries = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.charAt(0) !== "." || dotOk) {
          var m;
          if (negate && !prefix) {
            m = !e.match(pn);
          } else {
            m = e.match(pn);
          }
          if (m)
            matchedEntries.push(e);
        }
      }
      var len = matchedEntries.length;
      if (len === 0)
        return cb();
      if (remain.length === 1 && !this.mark && !this.stat) {
        if (!this.matches[index])
          this.matches[index] = /* @__PURE__ */ Object.create(null);
        for (var i = 0; i < len; i++) {
          var e = matchedEntries[i];
          if (prefix) {
            if (prefix !== "/")
              e = prefix + "/" + e;
            else
              e = prefix + e;
          }
          if (e.charAt(0) === "/" && !this.nomount) {
            e = path.join(this.root, e);
          }
          this._emitMatch(index, e);
        }
        return cb();
      }
      remain.shift();
      for (var i = 0; i < len; i++) {
        var e = matchedEntries[i];
        var newPattern;
        if (prefix) {
          if (prefix !== "/")
            e = prefix + "/" + e;
          else
            e = prefix + e;
        }
        this._process([e].concat(remain), index, inGlobStar, cb);
      }
      cb();
    };
    Glob.prototype._emitMatch = function(index, e) {
      if (this.aborted)
        return;
      if (isIgnored(this, e))
        return;
      if (this.paused) {
        this._emitQueue.push([index, e]);
        return;
      }
      var abs = isAbsolute(e) ? e : this._makeAbs(e);
      if (this.mark)
        e = this._mark(e);
      if (this.absolute)
        e = abs;
      if (this.matches[index][e])
        return;
      if (this.nodir) {
        var c = this.cache[abs];
        if (c === "DIR" || Array.isArray(c))
          return;
      }
      this.matches[index][e] = true;
      var st = this.statCache[abs];
      if (st)
        this.emit("stat", e, st);
      this.emit("match", e);
    };
    Glob.prototype._readdirInGlobStar = function(abs, cb) {
      if (this.aborted)
        return;
      if (this.follow)
        return this._readdir(abs, false, cb);
      var lstatkey = "lstat\0" + abs;
      var self2 = this;
      var lstatcb = inflight(lstatkey, lstatcb_);
      if (lstatcb)
        self2.fs.lstat(abs, lstatcb);
      function lstatcb_(er, lstat) {
        if (er && er.code === "ENOENT")
          return cb();
        var isSym = lstat && lstat.isSymbolicLink();
        self2.symlinks[abs] = isSym;
        if (!isSym && lstat && !lstat.isDirectory()) {
          self2.cache[abs] = "FILE";
          cb();
        } else
          self2._readdir(abs, false, cb);
      }
    };
    Glob.prototype._readdir = function(abs, inGlobStar, cb) {
      if (this.aborted)
        return;
      cb = inflight("readdir\0" + abs + "\0" + inGlobStar, cb);
      if (!cb)
        return;
      if (inGlobStar && !ownProp(this.symlinks, abs))
        return this._readdirInGlobStar(abs, cb);
      if (ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (!c || c === "FILE")
          return cb();
        if (Array.isArray(c))
          return cb(null, c);
      }
      var self2 = this;
      self2.fs.readdir(abs, readdirCb(this, abs, cb));
    };
    function readdirCb(self2, abs, cb) {
      return function(er, entries) {
        if (er)
          self2._readdirError(abs, er, cb);
        else
          self2._readdirEntries(abs, entries, cb);
      };
    }
    Glob.prototype._readdirEntries = function(abs, entries, cb) {
      if (this.aborted)
        return;
      if (!this.mark && !this.stat) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (abs === "/")
            e = abs + e;
          else
            e = abs + "/" + e;
          this.cache[e] = true;
        }
      }
      this.cache[abs] = entries;
      return cb(null, entries);
    };
    Glob.prototype._readdirError = function(f, er, cb) {
      if (this.aborted)
        return;
      switch (er.code) {
        case "ENOTSUP":
        case "ENOTDIR":
          var abs = this._makeAbs(f);
          this.cache[abs] = "FILE";
          if (abs === this.cwdAbs) {
            var error = new Error(er.code + " invalid cwd " + this.cwd);
            error.path = this.cwd;
            error.code = er.code;
            this.emit("error", error);
            this.abort();
          }
          break;
        case "ENOENT":
        case "ELOOP":
        case "ENAMETOOLONG":
        case "UNKNOWN":
          this.cache[this._makeAbs(f)] = false;
          break;
        default:
          this.cache[this._makeAbs(f)] = false;
          if (this.strict) {
            this.emit("error", er);
            this.abort();
          }
          if (!this.silent)
            console.error("glob error", er);
          break;
      }
      return cb();
    };
    Glob.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar, cb) {
      var self2 = this;
      this._readdir(abs, inGlobStar, function(er, entries) {
        self2._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
      });
    };
    Glob.prototype._processGlobStar2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
      if (!entries)
        return cb();
      var remainWithoutGlobStar = remain.slice(1);
      var gspref = prefix ? [prefix] : [];
      var noGlobStar = gspref.concat(remainWithoutGlobStar);
      this._process(noGlobStar, index, false, cb);
      var isSym = this.symlinks[abs];
      var len = entries.length;
      if (isSym && inGlobStar)
        return cb();
      for (var i = 0; i < len; i++) {
        var e = entries[i];
        if (e.charAt(0) === "." && !this.dot)
          continue;
        var instead = gspref.concat(entries[i], remainWithoutGlobStar);
        this._process(instead, index, true, cb);
        var below = gspref.concat(entries[i], remain);
        this._process(below, index, true, cb);
      }
      cb();
    };
    Glob.prototype._processSimple = function(prefix, index, cb) {
      var self2 = this;
      this._stat(prefix, function(er, exists) {
        self2._processSimple2(prefix, index, er, exists, cb);
      });
    };
    Glob.prototype._processSimple2 = function(prefix, index, er, exists, cb) {
      if (!this.matches[index])
        this.matches[index] = /* @__PURE__ */ Object.create(null);
      if (!exists)
        return cb();
      if (prefix && isAbsolute(prefix) && !this.nomount) {
        var trail = /[\/\\]$/.test(prefix);
        if (prefix.charAt(0) === "/") {
          prefix = path.join(this.root, prefix);
        } else {
          prefix = path.resolve(this.root, prefix);
          if (trail)
            prefix += "/";
        }
      }
      if (process.platform === "win32")
        prefix = prefix.replace(/\\/g, "/");
      this._emitMatch(index, prefix);
      cb();
    };
    Glob.prototype._stat = function(f, cb) {
      var abs = this._makeAbs(f);
      var needDir = f.slice(-1) === "/";
      if (f.length > this.maxLength)
        return cb();
      if (!this.stat && ownProp(this.cache, abs)) {
        var c = this.cache[abs];
        if (Array.isArray(c))
          c = "DIR";
        if (!needDir || c === "DIR")
          return cb(null, c);
        if (needDir && c === "FILE")
          return cb();
      }
      var exists;
      var stat = this.statCache[abs];
      if (stat !== void 0) {
        if (stat === false)
          return cb(null, stat);
        else {
          var type = stat.isDirectory() ? "DIR" : "FILE";
          if (needDir && type === "FILE")
            return cb();
          else
            return cb(null, type, stat);
        }
      }
      var self2 = this;
      var statcb = inflight("stat\0" + abs, lstatcb_);
      if (statcb)
        self2.fs.lstat(abs, statcb);
      function lstatcb_(er, lstat) {
        if (lstat && lstat.isSymbolicLink()) {
          return self2.fs.stat(abs, function(er2, stat2) {
            if (er2)
              self2._stat2(f, abs, null, lstat, cb);
            else
              self2._stat2(f, abs, er2, stat2, cb);
          });
        } else {
          self2._stat2(f, abs, er, lstat, cb);
        }
      }
    };
    Glob.prototype._stat2 = function(f, abs, er, stat, cb) {
      if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
        this.statCache[abs] = false;
        return cb();
      }
      var needDir = f.slice(-1) === "/";
      this.statCache[abs] = stat;
      if (abs.slice(-1) === "/" && stat && !stat.isDirectory())
        return cb(null, false, stat);
      var c = true;
      if (stat)
        c = stat.isDirectory() ? "DIR" : "FILE";
      this.cache[abs] = this.cache[abs] || c;
      if (needDir && c === "FILE")
        return cb();
      return cb(null, c, stat);
    };
  }
});

// node_modules/.pnpm/rimraf@3.0.2/node_modules/rimraf/rimraf.js
var require_rimraf = __commonJS({
  "node_modules/.pnpm/rimraf@3.0.2/node_modules/rimraf/rimraf.js"(exports, module2) {
    var assert = require("assert");
    var path = require("path");
    var fs = require("fs");
    var glob = void 0;
    try {
      glob = require_glob();
    } catch (_err) {
    }
    var defaultGlobOpts = {
      nosort: true,
      silent: true
    };
    var timeout = 0;
    var isWindows = process.platform === "win32";
    var defaults = (options) => {
      const methods = [
        "unlink",
        "chmod",
        "stat",
        "lstat",
        "rmdir",
        "readdir"
      ];
      methods.forEach((m) => {
        options[m] = options[m] || fs[m];
        m = m + "Sync";
        options[m] = options[m] || fs[m];
      });
      options.maxBusyTries = options.maxBusyTries || 3;
      options.emfileWait = options.emfileWait || 1e3;
      if (options.glob === false) {
        options.disableGlob = true;
      }
      if (options.disableGlob !== true && glob === void 0) {
        throw Error("glob dependency not found, set `options.disableGlob = true` if intentional");
      }
      options.disableGlob = options.disableGlob || false;
      options.glob = options.glob || defaultGlobOpts;
    };
    var rimraf = (p, options, cb) => {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      assert(p, "rimraf: missing path");
      assert.equal(typeof p, "string", "rimraf: path should be a string");
      assert.equal(typeof cb, "function", "rimraf: callback function required");
      assert(options, "rimraf: invalid options argument provided");
      assert.equal(typeof options, "object", "rimraf: options should be object");
      defaults(options);
      let busyTries = 0;
      let errState = null;
      let n = 0;
      const next = (er) => {
        errState = errState || er;
        if (--n === 0)
          cb(errState);
      };
      const afterGlob = (er, results) => {
        if (er)
          return cb(er);
        n = results.length;
        if (n === 0)
          return cb();
        results.forEach((p2) => {
          const CB = (er2) => {
            if (er2) {
              if ((er2.code === "EBUSY" || er2.code === "ENOTEMPTY" || er2.code === "EPERM") && busyTries < options.maxBusyTries) {
                busyTries++;
                return setTimeout(() => rimraf_(p2, options, CB), busyTries * 100);
              }
              if (er2.code === "EMFILE" && timeout < options.emfileWait) {
                return setTimeout(() => rimraf_(p2, options, CB), timeout++);
              }
              if (er2.code === "ENOENT")
                er2 = null;
            }
            timeout = 0;
            next(er2);
          };
          rimraf_(p2, options, CB);
        });
      };
      if (options.disableGlob || !glob.hasMagic(p))
        return afterGlob(null, [p]);
      options.lstat(p, (er, stat) => {
        if (!er)
          return afterGlob(null, [p]);
        glob(p, options.glob, afterGlob);
      });
    };
    var rimraf_ = (p, options, cb) => {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.lstat(p, (er, st) => {
        if (er && er.code === "ENOENT")
          return cb(null);
        if (er && er.code === "EPERM" && isWindows)
          fixWinEPERM(p, options, er, cb);
        if (st && st.isDirectory())
          return rmdir(p, options, er, cb);
        options.unlink(p, (er2) => {
          if (er2) {
            if (er2.code === "ENOENT")
              return cb(null);
            if (er2.code === "EPERM")
              return isWindows ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
            if (er2.code === "EISDIR")
              return rmdir(p, options, er2, cb);
          }
          return cb(er2);
        });
      });
    };
    var fixWinEPERM = (p, options, er, cb) => {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.chmod(p, 438, (er2) => {
        if (er2)
          cb(er2.code === "ENOENT" ? null : er);
        else
          options.stat(p, (er3, stats) => {
            if (er3)
              cb(er3.code === "ENOENT" ? null : er);
            else if (stats.isDirectory())
              rmdir(p, options, er, cb);
            else
              options.unlink(p, cb);
          });
      });
    };
    var fixWinEPERMSync = (p, options, er) => {
      assert(p);
      assert(options);
      try {
        options.chmodSync(p, 438);
      } catch (er2) {
        if (er2.code === "ENOENT")
          return;
        else
          throw er;
      }
      let stats;
      try {
        stats = options.statSync(p);
      } catch (er3) {
        if (er3.code === "ENOENT")
          return;
        else
          throw er;
      }
      if (stats.isDirectory())
        rmdirSync(p, options, er);
      else
        options.unlinkSync(p);
    };
    var rmdir = (p, options, originalEr, cb) => {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.rmdir(p, (er) => {
        if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
          rmkids(p, options, cb);
        else if (er && er.code === "ENOTDIR")
          cb(originalEr);
        else
          cb(er);
      });
    };
    var rmkids = (p, options, cb) => {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.readdir(p, (er, files) => {
        if (er)
          return cb(er);
        let n = files.length;
        if (n === 0)
          return options.rmdir(p, cb);
        let errState;
        files.forEach((f) => {
          rimraf(path.join(p, f), options, (er2) => {
            if (errState)
              return;
            if (er2)
              return cb(errState = er2);
            if (--n === 0)
              options.rmdir(p, cb);
          });
        });
      });
    };
    var rimrafSync = (p, options) => {
      options = options || {};
      defaults(options);
      assert(p, "rimraf: missing path");
      assert.equal(typeof p, "string", "rimraf: path should be a string");
      assert(options, "rimraf: missing options");
      assert.equal(typeof options, "object", "rimraf: options should be object");
      let results;
      if (options.disableGlob || !glob.hasMagic(p)) {
        results = [p];
      } else {
        try {
          options.lstatSync(p);
          results = [p];
        } catch (er) {
          results = glob.sync(p, options.glob);
        }
      }
      if (!results.length)
        return;
      for (let i = 0; i < results.length; i++) {
        const p2 = results[i];
        let st;
        try {
          st = options.lstatSync(p2);
        } catch (er) {
          if (er.code === "ENOENT")
            return;
          if (er.code === "EPERM" && isWindows)
            fixWinEPERMSync(p2, options, er);
        }
        try {
          if (st && st.isDirectory())
            rmdirSync(p2, options, null);
          else
            options.unlinkSync(p2);
        } catch (er) {
          if (er.code === "ENOENT")
            return;
          if (er.code === "EPERM")
            return isWindows ? fixWinEPERMSync(p2, options, er) : rmdirSync(p2, options, er);
          if (er.code !== "EISDIR")
            throw er;
          rmdirSync(p2, options, er);
        }
      }
    };
    var rmdirSync = (p, options, originalEr) => {
      assert(p);
      assert(options);
      try {
        options.rmdirSync(p);
      } catch (er) {
        if (er.code === "ENOENT")
          return;
        if (er.code === "ENOTDIR")
          throw originalEr;
        if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
          rmkidsSync(p, options);
      }
    };
    var rmkidsSync = (p, options) => {
      assert(p);
      assert(options);
      options.readdirSync(p).forEach((f) => rimrafSync(path.join(p, f), options));
      const retries = isWindows ? 100 : 1;
      let i = 0;
      do {
        let threw = true;
        try {
          const ret = options.rmdirSync(p, options);
          threw = false;
          return ret;
        } finally {
          if (++i < retries && threw)
            continue;
        }
      } while (true);
    };
    module2.exports = rimraf;
    rimraf.sync = rimrafSync;
  }
});

// node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.changePermissions = exports.downloadFile = exports.getPath = void 0;
    var electron_1 = require("electron");
    var fs = require("fs");
    var path = require("path");
    var https = require("https");
    var getPath = () => {
      const savePath = electron_1.app.getPath("userData");
      return path.resolve(`${savePath}/extensions`);
    };
    exports.getPath = getPath;
    var request = electron_1.net ? electron_1.net.request : https.get;
    var downloadFile = (from, to) => {
      return new Promise((resolve, reject) => {
        const req = request(from);
        req.on("response", (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return exports.downloadFile(res.headers.location, to).then(resolve).catch(reject);
          }
          res.pipe(fs.createWriteStream(to)).on("close", resolve);
          res.on("error", reject);
        });
        req.on("error", reject);
        req.end();
      });
    };
    exports.downloadFile = downloadFile;
    var changePermissions = (dir, mode) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        fs.chmodSync(filePath, parseInt(`${mode}`, 8));
        if (fs.statSync(filePath).isDirectory()) {
          exports.changePermissions(filePath, mode);
        }
      });
    };
    exports.changePermissions = changePermissions;
  }
});

// node_modules/.pnpm/process-nextick-args@2.0.1/node_modules/process-nextick-args/index.js
var require_process_nextick_args = __commonJS({
  "node_modules/.pnpm/process-nextick-args@2.0.1/node_modules/process-nextick-args/index.js"(exports, module2) {
    "use strict";
    if (typeof process === "undefined" || !process.version || process.version.indexOf("v0.") === 0 || process.version.indexOf("v1.") === 0 && process.version.indexOf("v1.8.") !== 0) {
      module2.exports = { nextTick };
    } else {
      module2.exports = process;
    }
    function nextTick(fn, arg1, arg2, arg3) {
      if (typeof fn !== "function") {
        throw new TypeError('"callback" argument must be a function');
      }
      var len = arguments.length;
      var args, i;
      switch (len) {
        case 0:
        case 1:
          return process.nextTick(fn);
        case 2:
          return process.nextTick(function afterTickOne() {
            fn.call(null, arg1);
          });
        case 3:
          return process.nextTick(function afterTickTwo() {
            fn.call(null, arg1, arg2);
          });
        case 4:
          return process.nextTick(function afterTickThree() {
            fn.call(null, arg1, arg2, arg3);
          });
        default:
          args = new Array(len - 1);
          i = 0;
          while (i < args.length) {
            args[i++] = arguments[i];
          }
          return process.nextTick(function afterTick() {
            fn.apply(null, args);
          });
      }
    }
  }
});

// node_modules/.pnpm/isarray@1.0.0/node_modules/isarray/index.js
var require_isarray = __commonJS({
  "node_modules/.pnpm/isarray@1.0.0/node_modules/isarray/index.js"(exports, module2) {
    var toString = {}.toString;
    module2.exports = Array.isArray || function(arr) {
      return toString.call(arr) == "[object Array]";
    };
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/stream.js
var require_stream = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/stream.js"(exports, module2) {
    module2.exports = require("stream");
  }
});

// node_modules/.pnpm/safe-buffer@5.1.2/node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/.pnpm/safe-buffer@5.1.2/node_modules/safe-buffer/index.js"(exports, module2) {
    var buffer = require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module2.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/.pnpm/core-util-is@1.0.3/node_modules/core-util-is/lib/util.js
var require_util = __commonJS({
  "node_modules/.pnpm/core-util-is@1.0.3/node_modules/core-util-is/lib/util.js"(exports) {
    function isArray(arg) {
      if (Array.isArray) {
        return Array.isArray(arg);
      }
      return objectToString(arg) === "[object Array]";
    }
    exports.isArray = isArray;
    function isBoolean(arg) {
      return typeof arg === "boolean";
    }
    exports.isBoolean = isBoolean;
    function isNull(arg) {
      return arg === null;
    }
    exports.isNull = isNull;
    function isNullOrUndefined(arg) {
      return arg == null;
    }
    exports.isNullOrUndefined = isNullOrUndefined;
    function isNumber(arg) {
      return typeof arg === "number";
    }
    exports.isNumber = isNumber;
    function isString(arg) {
      return typeof arg === "string";
    }
    exports.isString = isString;
    function isSymbol(arg) {
      return typeof arg === "symbol";
    }
    exports.isSymbol = isSymbol;
    function isUndefined(arg) {
      return arg === void 0;
    }
    exports.isUndefined = isUndefined;
    function isRegExp(re) {
      return objectToString(re) === "[object RegExp]";
    }
    exports.isRegExp = isRegExp;
    function isObject(arg) {
      return typeof arg === "object" && arg !== null;
    }
    exports.isObject = isObject;
    function isDate(d) {
      return objectToString(d) === "[object Date]";
    }
    exports.isDate = isDate;
    function isError(e) {
      return objectToString(e) === "[object Error]" || e instanceof Error;
    }
    exports.isError = isError;
    function isFunction(arg) {
      return typeof arg === "function";
    }
    exports.isFunction = isFunction;
    function isPrimitive(arg) {
      return arg === null || typeof arg === "boolean" || typeof arg === "number" || typeof arg === "string" || typeof arg === "symbol" || typeof arg === "undefined";
    }
    exports.isPrimitive = isPrimitive;
    exports.isBuffer = require("buffer").Buffer.isBuffer;
    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/BufferList.js
var require_BufferList = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/BufferList.js"(exports, module2) {
    "use strict";
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    var Buffer2 = require_safe_buffer().Buffer;
    var util = require("util");
    function copyBuffer(src, target, offset) {
      src.copy(target, offset);
    }
    module2.exports = function() {
      function BufferList() {
        _classCallCheck(this, BufferList);
        this.head = null;
        this.tail = null;
        this.length = 0;
      }
      BufferList.prototype.push = function push(v) {
        var entry = { data: v, next: null };
        if (this.length > 0)
          this.tail.next = entry;
        else
          this.head = entry;
        this.tail = entry;
        ++this.length;
      };
      BufferList.prototype.unshift = function unshift(v) {
        var entry = { data: v, next: this.head };
        if (this.length === 0)
          this.tail = entry;
        this.head = entry;
        ++this.length;
      };
      BufferList.prototype.shift = function shift() {
        if (this.length === 0)
          return;
        var ret = this.head.data;
        if (this.length === 1)
          this.head = this.tail = null;
        else
          this.head = this.head.next;
        --this.length;
        return ret;
      };
      BufferList.prototype.clear = function clear() {
        this.head = this.tail = null;
        this.length = 0;
      };
      BufferList.prototype.join = function join4(s) {
        if (this.length === 0)
          return "";
        var p = this.head;
        var ret = "" + p.data;
        while (p = p.next) {
          ret += s + p.data;
        }
        return ret;
      };
      BufferList.prototype.concat = function concat(n) {
        if (this.length === 0)
          return Buffer2.alloc(0);
        if (this.length === 1)
          return this.head.data;
        var ret = Buffer2.allocUnsafe(n >>> 0);
        var p = this.head;
        var i = 0;
        while (p) {
          copyBuffer(p.data, ret, i);
          i += p.data.length;
          p = p.next;
        }
        return ret;
      };
      return BufferList;
    }();
    if (util && util.inspect && util.inspect.custom) {
      module2.exports.prototype[util.inspect.custom] = function() {
        var obj = util.inspect({ length: this.length });
        return this.constructor.name + " " + obj;
      };
    }
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/destroy.js
var require_destroy = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/internal/streams/destroy.js"(exports, module2) {
    "use strict";
    var pna = require_process_nextick_args();
    function destroy(err, cb) {
      var _this = this;
      var readableDestroyed = this._readableState && this._readableState.destroyed;
      var writableDestroyed = this._writableState && this._writableState.destroyed;
      if (readableDestroyed || writableDestroyed) {
        if (cb) {
          cb(err);
        } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
          pna.nextTick(emitErrorNT, this, err);
        }
        return this;
      }
      if (this._readableState) {
        this._readableState.destroyed = true;
      }
      if (this._writableState) {
        this._writableState.destroyed = true;
      }
      this._destroy(err || null, function(err2) {
        if (!cb && err2) {
          pna.nextTick(emitErrorNT, _this, err2);
          if (_this._writableState) {
            _this._writableState.errorEmitted = true;
          }
        } else if (cb) {
          cb(err2);
        }
      });
      return this;
    }
    function undestroy() {
      if (this._readableState) {
        this._readableState.destroyed = false;
        this._readableState.reading = false;
        this._readableState.ended = false;
        this._readableState.endEmitted = false;
      }
      if (this._writableState) {
        this._writableState.destroyed = false;
        this._writableState.ended = false;
        this._writableState.ending = false;
        this._writableState.finished = false;
        this._writableState.errorEmitted = false;
      }
    }
    function emitErrorNT(self2, err) {
      self2.emit("error", err);
    }
    module2.exports = {
      destroy,
      undestroy
    };
  }
});

// node_modules/.pnpm/util-deprecate@1.0.2/node_modules/util-deprecate/node.js
var require_node = __commonJS({
  "node_modules/.pnpm/util-deprecate@1.0.2/node_modules/util-deprecate/node.js"(exports, module2) {
    module2.exports = require("util").deprecate;
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_writable.js
var require_stream_writable = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_writable.js"(exports, module2) {
    "use strict";
    var pna = require_process_nextick_args();
    module2.exports = Writable;
    function CorkedRequest(state) {
      var _this = this;
      this.next = null;
      this.entry = null;
      this.finish = function() {
        onCorkedFinish(_this, state);
      };
    }
    var asyncWrite = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
    var Duplex;
    Writable.WritableState = WritableState;
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var internalUtil = {
      deprecate: require_node()
    };
    var Stream = require_stream();
    var Buffer2 = require_safe_buffer().Buffer;
    var OurUint8Array = global.Uint8Array || function() {
    };
    function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk);
    }
    function _isUint8Array(obj) {
      return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
    }
    var destroyImpl = require_destroy();
    util.inherits(Writable, Stream);
    function nop() {
    }
    function WritableState(options, stream) {
      Duplex = Duplex || require_stream_duplex();
      options = options || {};
      var isDuplex = stream instanceof Duplex;
      this.objectMode = !!options.objectMode;
      if (isDuplex)
        this.objectMode = this.objectMode || !!options.writableObjectMode;
      var hwm = options.highWaterMark;
      var writableHwm = options.writableHighWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      if (hwm || hwm === 0)
        this.highWaterMark = hwm;
      else if (isDuplex && (writableHwm || writableHwm === 0))
        this.highWaterMark = writableHwm;
      else
        this.highWaterMark = defaultHwm;
      this.highWaterMark = Math.floor(this.highWaterMark);
      this.finalCalled = false;
      this.needDrain = false;
      this.ending = false;
      this.ended = false;
      this.finished = false;
      this.destroyed = false;
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;
      this.defaultEncoding = options.defaultEncoding || "utf8";
      this.length = 0;
      this.writing = false;
      this.corked = 0;
      this.sync = true;
      this.bufferProcessing = false;
      this.onwrite = function(er) {
        onwrite(stream, er);
      };
      this.writecb = null;
      this.writelen = 0;
      this.bufferedRequest = null;
      this.lastBufferedRequest = null;
      this.pendingcb = 0;
      this.prefinished = false;
      this.errorEmitted = false;
      this.bufferedRequestCount = 0;
      this.corkedRequestsFree = new CorkedRequest(this);
    }
    WritableState.prototype.getBuffer = function getBuffer() {
      var current = this.bufferedRequest;
      var out = [];
      while (current) {
        out.push(current);
        current = current.next;
      }
      return out;
    };
    (function() {
      try {
        Object.defineProperty(WritableState.prototype, "buffer", {
          get: internalUtil.deprecate(function() {
            return this.getBuffer();
          }, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
        });
      } catch (_) {
      }
    })();
    var realHasInstance;
    if (typeof Symbol === "function" && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === "function") {
      realHasInstance = Function.prototype[Symbol.hasInstance];
      Object.defineProperty(Writable, Symbol.hasInstance, {
        value: function(object) {
          if (realHasInstance.call(this, object))
            return true;
          if (this !== Writable)
            return false;
          return object && object._writableState instanceof WritableState;
        }
      });
    } else {
      realHasInstance = function(object) {
        return object instanceof this;
      };
    }
    function Writable(options) {
      Duplex = Duplex || require_stream_duplex();
      if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
        return new Writable(options);
      }
      this._writableState = new WritableState(options, this);
      this.writable = true;
      if (options) {
        if (typeof options.write === "function")
          this._write = options.write;
        if (typeof options.writev === "function")
          this._writev = options.writev;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
        if (typeof options.final === "function")
          this._final = options.final;
      }
      Stream.call(this);
    }
    Writable.prototype.pipe = function() {
      this.emit("error", new Error("Cannot pipe, not readable"));
    };
    function writeAfterEnd(stream, cb) {
      var er = new Error("write after end");
      stream.emit("error", er);
      pna.nextTick(cb, er);
    }
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      var er = false;
      if (chunk === null) {
        er = new TypeError("May not write null values to stream");
      } else if (typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
        er = new TypeError("Invalid non-string/buffer chunk");
      }
      if (er) {
        stream.emit("error", er);
        pna.nextTick(cb, er);
        valid = false;
      }
      return valid;
    }
    Writable.prototype.write = function(chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;
      var isBuf = !state.objectMode && _isUint8Array(chunk);
      if (isBuf && !Buffer2.isBuffer(chunk)) {
        chunk = _uint8ArrayToBuffer(chunk);
      }
      if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      if (isBuf)
        encoding = "buffer";
      else if (!encoding)
        encoding = state.defaultEncoding;
      if (typeof cb !== "function")
        cb = nop;
      if (state.ended)
        writeAfterEnd(this, cb);
      else if (isBuf || validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
      }
      return ret;
    };
    Writable.prototype.cork = function() {
      var state = this._writableState;
      state.corked++;
    };
    Writable.prototype.uncork = function() {
      var state = this._writableState;
      if (state.corked) {
        state.corked--;
        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest)
          clearBuffer(this, state);
      }
    };
    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      if (typeof encoding === "string")
        encoding = encoding.toLowerCase();
      if (!(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((encoding + "").toLowerCase()) > -1))
        throw new TypeError("Unknown encoding: " + encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };
    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && typeof chunk === "string") {
        chunk = Buffer2.from(chunk, encoding);
      }
      return chunk;
    }
    Object.defineProperty(Writable.prototype, "writableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._writableState.highWaterMark;
      }
    });
    function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
      if (!isBuf) {
        var newChunk = decodeChunk(state, chunk, encoding);
        if (chunk !== newChunk) {
          isBuf = true;
          encoding = "buffer";
          chunk = newChunk;
        }
      }
      var len = state.objectMode ? 1 : chunk.length;
      state.length += len;
      var ret = state.length < state.highWaterMark;
      if (!ret)
        state.needDrain = true;
      if (state.writing || state.corked) {
        var last = state.lastBufferedRequest;
        state.lastBufferedRequest = {
          chunk,
          encoding,
          isBuf,
          callback: cb,
          next: null
        };
        if (last) {
          last.next = state.lastBufferedRequest;
        } else {
          state.bufferedRequest = state.lastBufferedRequest;
        }
        state.bufferedRequestCount += 1;
      } else {
        doWrite(stream, state, false, len, chunk, encoding, cb);
      }
      return ret;
    }
    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev)
        stream._writev(chunk, state.onwrite);
      else
        stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    function onwriteError(stream, state, sync, er, cb) {
      --state.pendingcb;
      if (sync) {
        pna.nextTick(cb, er);
        pna.nextTick(finishMaybe, stream, state);
        stream._writableState.errorEmitted = true;
        stream.emit("error", er);
      } else {
        cb(er);
        stream._writableState.errorEmitted = true;
        stream.emit("error", er);
        finishMaybe(stream, state);
      }
    }
    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }
    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;
      onwriteStateUpdate(state);
      if (er)
        onwriteError(stream, state, sync, er, cb);
      else {
        var finished = needFinish(state);
        if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
          clearBuffer(stream, state);
        }
        if (sync) {
          asyncWrite(afterWrite, stream, state, finished, cb);
        } else {
          afterWrite(stream, state, finished, cb);
        }
      }
    }
    function afterWrite(stream, state, finished, cb) {
      if (!finished)
        onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit("drain");
      }
    }
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      var entry = state.bufferedRequest;
      if (stream._writev && entry && entry.next) {
        var l = state.bufferedRequestCount;
        var buffer = new Array(l);
        var holder = state.corkedRequestsFree;
        holder.entry = entry;
        var count = 0;
        var allBuffers = true;
        while (entry) {
          buffer[count] = entry;
          if (!entry.isBuf)
            allBuffers = false;
          entry = entry.next;
          count += 1;
        }
        buffer.allBuffers = allBuffers;
        doWrite(stream, state, true, state.length, buffer, "", holder.finish);
        state.pendingcb++;
        state.lastBufferedRequest = null;
        if (holder.next) {
          state.corkedRequestsFree = holder.next;
          holder.next = null;
        } else {
          state.corkedRequestsFree = new CorkedRequest(state);
        }
        state.bufferedRequestCount = 0;
      } else {
        while (entry) {
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;
          doWrite(stream, state, false, len, chunk, encoding, cb);
          entry = entry.next;
          state.bufferedRequestCount--;
          if (state.writing) {
            break;
          }
        }
        if (entry === null)
          state.lastBufferedRequest = null;
      }
      state.bufferedRequest = entry;
      state.bufferProcessing = false;
    }
    Writable.prototype._write = function(chunk, encoding, cb) {
      cb(new Error("_write() is not implemented"));
    };
    Writable.prototype._writev = null;
    Writable.prototype.end = function(chunk, encoding, cb) {
      var state = this._writableState;
      if (typeof chunk === "function") {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === "function") {
        cb = encoding;
        encoding = null;
      }
      if (chunk !== null && chunk !== void 0)
        this.write(chunk, encoding);
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }
      if (!state.ending && !state.finished)
        endWritable(this, state, cb);
    };
    function needFinish(state) {
      return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
    }
    function callFinal(stream, state) {
      stream._final(function(err) {
        state.pendingcb--;
        if (err) {
          stream.emit("error", err);
        }
        state.prefinished = true;
        stream.emit("prefinish");
        finishMaybe(stream, state);
      });
    }
    function prefinish(stream, state) {
      if (!state.prefinished && !state.finalCalled) {
        if (typeof stream._final === "function") {
          state.pendingcb++;
          state.finalCalled = true;
          pna.nextTick(callFinal, stream, state);
        } else {
          state.prefinished = true;
          stream.emit("prefinish");
        }
      }
    }
    function finishMaybe(stream, state) {
      var need = needFinish(state);
      if (need) {
        prefinish(stream, state);
        if (state.pendingcb === 0) {
          state.finished = true;
          stream.emit("finish");
        }
      }
      return need;
    }
    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished)
          pna.nextTick(cb);
        else
          stream.once("finish", cb);
      }
      state.ended = true;
      stream.writable = false;
    }
    function onCorkedFinish(corkReq, state, err) {
      var entry = corkReq.entry;
      corkReq.entry = null;
      while (entry) {
        var cb = entry.callback;
        state.pendingcb--;
        cb(err);
        entry = entry.next;
      }
      if (state.corkedRequestsFree) {
        state.corkedRequestsFree.next = corkReq;
      } else {
        state.corkedRequestsFree = corkReq;
      }
    }
    Object.defineProperty(Writable.prototype, "destroyed", {
      get: function() {
        if (this._writableState === void 0) {
          return false;
        }
        return this._writableState.destroyed;
      },
      set: function(value) {
        if (!this._writableState) {
          return;
        }
        this._writableState.destroyed = value;
      }
    });
    Writable.prototype.destroy = destroyImpl.destroy;
    Writable.prototype._undestroy = destroyImpl.undestroy;
    Writable.prototype._destroy = function(err, cb) {
      this.end();
      cb(err);
    };
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_duplex.js
var require_stream_duplex = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_duplex.js"(exports, module2) {
    "use strict";
    var pna = require_process_nextick_args();
    var objectKeys = Object.keys || function(obj) {
      var keys2 = [];
      for (var key in obj) {
        keys2.push(key);
      }
      return keys2;
    };
    module2.exports = Duplex;
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var Readable = require_stream_readable();
    var Writable = require_stream_writable();
    util.inherits(Duplex, Readable);
    {
      keys = objectKeys(Writable.prototype);
      for (v = 0; v < keys.length; v++) {
        method = keys[v];
        if (!Duplex.prototype[method])
          Duplex.prototype[method] = Writable.prototype[method];
      }
    }
    var keys;
    var method;
    var v;
    function Duplex(options) {
      if (!(this instanceof Duplex))
        return new Duplex(options);
      Readable.call(this, options);
      Writable.call(this, options);
      if (options && options.readable === false)
        this.readable = false;
      if (options && options.writable === false)
        this.writable = false;
      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false)
        this.allowHalfOpen = false;
      this.once("end", onend);
    }
    Object.defineProperty(Duplex.prototype, "writableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._writableState.highWaterMark;
      }
    });
    function onend() {
      if (this.allowHalfOpen || this._writableState.ended)
        return;
      pna.nextTick(onEndNT, this);
    }
    function onEndNT(self2) {
      self2.end();
    }
    Object.defineProperty(Duplex.prototype, "destroyed", {
      get: function() {
        if (this._readableState === void 0 || this._writableState === void 0) {
          return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set: function(value) {
        if (this._readableState === void 0 || this._writableState === void 0) {
          return;
        }
        this._readableState.destroyed = value;
        this._writableState.destroyed = value;
      }
    });
    Duplex.prototype._destroy = function(err, cb) {
      this.push(null);
      this.end();
      pna.nextTick(cb, err);
    };
  }
});

// node_modules/.pnpm/string_decoder@1.1.1/node_modules/string_decoder/lib/string_decoder.js
var require_string_decoder = __commonJS({
  "node_modules/.pnpm/string_decoder@1.1.1/node_modules/string_decoder/lib/string_decoder.js"(exports) {
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var isEncoding = Buffer2.isEncoding || function(encoding) {
      encoding = "" + encoding;
      switch (encoding && encoding.toLowerCase()) {
        case "hex":
        case "utf8":
        case "utf-8":
        case "ascii":
        case "binary":
        case "base64":
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
        case "raw":
          return true;
        default:
          return false;
      }
    };
    function _normalizeEncoding(enc) {
      if (!enc)
        return "utf8";
      var retried;
      while (true) {
        switch (enc) {
          case "utf8":
          case "utf-8":
            return "utf8";
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return "utf16le";
          case "latin1":
          case "binary":
            return "latin1";
          case "base64":
          case "ascii":
          case "hex":
            return enc;
          default:
            if (retried)
              return;
            enc = ("" + enc).toLowerCase();
            retried = true;
        }
      }
    }
    function normalizeEncoding(enc) {
      var nenc = _normalizeEncoding(enc);
      if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc)))
        throw new Error("Unknown encoding: " + enc);
      return nenc || enc;
    }
    exports.StringDecoder = StringDecoder;
    function StringDecoder(encoding) {
      this.encoding = normalizeEncoding(encoding);
      var nb;
      switch (this.encoding) {
        case "utf16le":
          this.text = utf16Text;
          this.end = utf16End;
          nb = 4;
          break;
        case "utf8":
          this.fillLast = utf8FillLast;
          nb = 4;
          break;
        case "base64":
          this.text = base64Text;
          this.end = base64End;
          nb = 3;
          break;
        default:
          this.write = simpleWrite;
          this.end = simpleEnd;
          return;
      }
      this.lastNeed = 0;
      this.lastTotal = 0;
      this.lastChar = Buffer2.allocUnsafe(nb);
    }
    StringDecoder.prototype.write = function(buf) {
      if (buf.length === 0)
        return "";
      var r;
      var i;
      if (this.lastNeed) {
        r = this.fillLast(buf);
        if (r === void 0)
          return "";
        i = this.lastNeed;
        this.lastNeed = 0;
      } else {
        i = 0;
      }
      if (i < buf.length)
        return r ? r + this.text(buf, i) : this.text(buf, i);
      return r || "";
    };
    StringDecoder.prototype.end = utf8End;
    StringDecoder.prototype.text = utf8Text;
    StringDecoder.prototype.fillLast = function(buf) {
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
      this.lastNeed -= buf.length;
    };
    function utf8CheckByte(byte) {
      if (byte <= 127)
        return 0;
      else if (byte >> 5 === 6)
        return 2;
      else if (byte >> 4 === 14)
        return 3;
      else if (byte >> 3 === 30)
        return 4;
      return byte >> 6 === 2 ? -1 : -2;
    }
    function utf8CheckIncomplete(self2, buf, i) {
      var j = buf.length - 1;
      if (j < i)
        return 0;
      var nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0)
          self2.lastNeed = nb - 1;
        return nb;
      }
      if (--j < i || nb === -2)
        return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0)
          self2.lastNeed = nb - 2;
        return nb;
      }
      if (--j < i || nb === -2)
        return 0;
      nb = utf8CheckByte(buf[j]);
      if (nb >= 0) {
        if (nb > 0) {
          if (nb === 2)
            nb = 0;
          else
            self2.lastNeed = nb - 3;
        }
        return nb;
      }
      return 0;
    }
    function utf8CheckExtraBytes(self2, buf, p) {
      if ((buf[0] & 192) !== 128) {
        self2.lastNeed = 0;
        return "\uFFFD";
      }
      if (self2.lastNeed > 1 && buf.length > 1) {
        if ((buf[1] & 192) !== 128) {
          self2.lastNeed = 1;
          return "\uFFFD";
        }
        if (self2.lastNeed > 2 && buf.length > 2) {
          if ((buf[2] & 192) !== 128) {
            self2.lastNeed = 2;
            return "\uFFFD";
          }
        }
      }
    }
    function utf8FillLast(buf) {
      var p = this.lastTotal - this.lastNeed;
      var r = utf8CheckExtraBytes(this, buf, p);
      if (r !== void 0)
        return r;
      if (this.lastNeed <= buf.length) {
        buf.copy(this.lastChar, p, 0, this.lastNeed);
        return this.lastChar.toString(this.encoding, 0, this.lastTotal);
      }
      buf.copy(this.lastChar, p, 0, buf.length);
      this.lastNeed -= buf.length;
    }
    function utf8Text(buf, i) {
      var total = utf8CheckIncomplete(this, buf, i);
      if (!this.lastNeed)
        return buf.toString("utf8", i);
      this.lastTotal = total;
      var end = buf.length - (total - this.lastNeed);
      buf.copy(this.lastChar, 0, end);
      return buf.toString("utf8", i, end);
    }
    function utf8End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed)
        return r + "\uFFFD";
      return r;
    }
    function utf16Text(buf, i) {
      if ((buf.length - i) % 2 === 0) {
        var r = buf.toString("utf16le", i);
        if (r) {
          var c = r.charCodeAt(r.length - 1);
          if (c >= 55296 && c <= 56319) {
            this.lastNeed = 2;
            this.lastTotal = 4;
            this.lastChar[0] = buf[buf.length - 2];
            this.lastChar[1] = buf[buf.length - 1];
            return r.slice(0, -1);
          }
        }
        return r;
      }
      this.lastNeed = 1;
      this.lastTotal = 2;
      this.lastChar[0] = buf[buf.length - 1];
      return buf.toString("utf16le", i, buf.length - 1);
    }
    function utf16End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed) {
        var end = this.lastTotal - this.lastNeed;
        return r + this.lastChar.toString("utf16le", 0, end);
      }
      return r;
    }
    function base64Text(buf, i) {
      var n = (buf.length - i) % 3;
      if (n === 0)
        return buf.toString("base64", i);
      this.lastNeed = 3 - n;
      this.lastTotal = 3;
      if (n === 1) {
        this.lastChar[0] = buf[buf.length - 1];
      } else {
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
      }
      return buf.toString("base64", i, buf.length - n);
    }
    function base64End(buf) {
      var r = buf && buf.length ? this.write(buf) : "";
      if (this.lastNeed)
        return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
      return r;
    }
    function simpleWrite(buf) {
      return buf.toString(this.encoding);
    }
    function simpleEnd(buf) {
      return buf && buf.length ? this.write(buf) : "";
    }
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_readable.js
var require_stream_readable = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_readable.js"(exports, module2) {
    "use strict";
    var pna = require_process_nextick_args();
    module2.exports = Readable;
    var isArray = require_isarray();
    var Duplex;
    Readable.ReadableState = ReadableState;
    var EE = require("events").EventEmitter;
    var EElistenerCount = function(emitter, type) {
      return emitter.listeners(type).length;
    };
    var Stream = require_stream();
    var Buffer2 = require_safe_buffer().Buffer;
    var OurUint8Array = global.Uint8Array || function() {
    };
    function _uint8ArrayToBuffer(chunk) {
      return Buffer2.from(chunk);
    }
    function _isUint8Array(obj) {
      return Buffer2.isBuffer(obj) || obj instanceof OurUint8Array;
    }
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    var debugUtil = require("util");
    var debug = void 0;
    if (debugUtil && debugUtil.debuglog) {
      debug = debugUtil.debuglog("stream");
    } else {
      debug = function() {
      };
    }
    var BufferList = require_BufferList();
    var destroyImpl = require_destroy();
    var StringDecoder;
    util.inherits(Readable, Stream);
    var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
    function prependListener(emitter, event, fn) {
      if (typeof emitter.prependListener === "function")
        return emitter.prependListener(event, fn);
      if (!emitter._events || !emitter._events[event])
        emitter.on(event, fn);
      else if (isArray(emitter._events[event]))
        emitter._events[event].unshift(fn);
      else
        emitter._events[event] = [fn, emitter._events[event]];
    }
    function ReadableState(options, stream) {
      Duplex = Duplex || require_stream_duplex();
      options = options || {};
      var isDuplex = stream instanceof Duplex;
      this.objectMode = !!options.objectMode;
      if (isDuplex)
        this.objectMode = this.objectMode || !!options.readableObjectMode;
      var hwm = options.highWaterMark;
      var readableHwm = options.readableHighWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      if (hwm || hwm === 0)
        this.highWaterMark = hwm;
      else if (isDuplex && (readableHwm || readableHwm === 0))
        this.highWaterMark = readableHwm;
      else
        this.highWaterMark = defaultHwm;
      this.highWaterMark = Math.floor(this.highWaterMark);
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;
      this.sync = true;
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;
      this.destroyed = false;
      this.defaultEncoding = options.defaultEncoding || "utf8";
      this.awaitDrain = 0;
      this.readingMore = false;
      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        if (!StringDecoder)
          StringDecoder = require_string_decoder().StringDecoder;
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {
      Duplex = Duplex || require_stream_duplex();
      if (!(this instanceof Readable))
        return new Readable(options);
      this._readableState = new ReadableState(options, this);
      this.readable = true;
      if (options) {
        if (typeof options.read === "function")
          this._read = options.read;
        if (typeof options.destroy === "function")
          this._destroy = options.destroy;
      }
      Stream.call(this);
    }
    Object.defineProperty(Readable.prototype, "destroyed", {
      get: function() {
        if (this._readableState === void 0) {
          return false;
        }
        return this._readableState.destroyed;
      },
      set: function(value) {
        if (!this._readableState) {
          return;
        }
        this._readableState.destroyed = value;
      }
    });
    Readable.prototype.destroy = destroyImpl.destroy;
    Readable.prototype._undestroy = destroyImpl.undestroy;
    Readable.prototype._destroy = function(err, cb) {
      this.push(null);
      cb(err);
    };
    Readable.prototype.push = function(chunk, encoding) {
      var state = this._readableState;
      var skipChunkCheck;
      if (!state.objectMode) {
        if (typeof chunk === "string") {
          encoding = encoding || state.defaultEncoding;
          if (encoding !== state.encoding) {
            chunk = Buffer2.from(chunk, encoding);
            encoding = "";
          }
          skipChunkCheck = true;
        }
      } else {
        skipChunkCheck = true;
      }
      return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
    };
    Readable.prototype.unshift = function(chunk) {
      return readableAddChunk(this, chunk, null, true, false);
    };
    function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
      var state = stream._readableState;
      if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else {
        var er;
        if (!skipChunkCheck)
          er = chunkInvalid(state, chunk);
        if (er) {
          stream.emit("error", er);
        } else if (state.objectMode || chunk && chunk.length > 0) {
          if (typeof chunk !== "string" && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer2.prototype) {
            chunk = _uint8ArrayToBuffer(chunk);
          }
          if (addToFront) {
            if (state.endEmitted)
              stream.emit("error", new Error("stream.unshift() after end event"));
            else
              addChunk(stream, state, chunk, true);
          } else if (state.ended) {
            stream.emit("error", new Error("stream.push() after EOF"));
          } else {
            state.reading = false;
            if (state.decoder && !encoding) {
              chunk = state.decoder.write(chunk);
              if (state.objectMode || chunk.length !== 0)
                addChunk(stream, state, chunk, false);
              else
                maybeReadMore(stream, state);
            } else {
              addChunk(stream, state, chunk, false);
            }
          }
        } else if (!addToFront) {
          state.reading = false;
        }
      }
      return needMoreData(state);
    }
    function addChunk(stream, state, chunk, addToFront) {
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit("data", chunk);
        stream.read(0);
      } else {
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);
        if (state.needReadable)
          emitReadable(stream);
      }
      maybeReadMore(stream, state);
    }
    function chunkInvalid(state, chunk) {
      var er;
      if (!_isUint8Array(chunk) && typeof chunk !== "string" && chunk !== void 0 && !state.objectMode) {
        er = new TypeError("Invalid non-string/buffer chunk");
      }
      return er;
    }
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }
    Readable.prototype.isPaused = function() {
      return this._readableState.flowing === false;
    };
    Readable.prototype.setEncoding = function(enc) {
      if (!StringDecoder)
        StringDecoder = require_string_decoder().StringDecoder;
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };
    var MAX_HWM = 8388608;
    function computeNewHighWaterMark(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended)
        return 0;
      if (state.objectMode)
        return 1;
      if (n !== n) {
        if (state.flowing && state.length)
          return state.buffer.head.data.length;
        else
          return state.length;
      }
      if (n > state.highWaterMark)
        state.highWaterMark = computeNewHighWaterMark(n);
      if (n <= state.length)
        return n;
      if (!state.ended) {
        state.needReadable = true;
        return 0;
      }
      return state.length;
    }
    Readable.prototype.read = function(n) {
      debug("read", n);
      n = parseInt(n, 10);
      var state = this._readableState;
      var nOrig = n;
      if (n !== 0)
        state.emittedReadable = false;
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug("read: emitReadable", state.length, state.ended);
        if (state.length === 0 && state.ended)
          endReadable(this);
        else
          emitReadable(this);
        return null;
      }
      n = howMuchToRead(n, state);
      if (n === 0 && state.ended) {
        if (state.length === 0)
          endReadable(this);
        return null;
      }
      var doRead = state.needReadable;
      debug("need readable", doRead);
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug("length less than watermark", doRead);
      }
      if (state.ended || state.reading) {
        doRead = false;
        debug("reading or ended", doRead);
      } else if (doRead) {
        debug("do read");
        state.reading = true;
        state.sync = true;
        if (state.length === 0)
          state.needReadable = true;
        this._read(state.highWaterMark);
        state.sync = false;
        if (!state.reading)
          n = howMuchToRead(nOrig, state);
      }
      var ret;
      if (n > 0)
        ret = fromList(n, state);
      else
        ret = null;
      if (ret === null) {
        state.needReadable = true;
        n = 0;
      } else {
        state.length -= n;
      }
      if (state.length === 0) {
        if (!state.ended)
          state.needReadable = true;
        if (nOrig !== n && state.ended)
          endReadable(this);
      }
      if (ret !== null)
        this.emit("data", ret);
      return ret;
    };
    function onEofChunk(stream, state) {
      if (state.ended)
        return;
      if (state.decoder) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;
      emitReadable(stream);
    }
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug("emitReadable", state.flowing);
        state.emittedReadable = true;
        if (state.sync)
          pna.nextTick(emitReadable_, stream);
        else
          emitReadable_(stream);
      }
    }
    function emitReadable_(stream) {
      debug("emit readable");
      stream.emit("readable");
      flow(stream);
    }
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        pna.nextTick(maybeReadMore_, stream, state);
      }
    }
    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug("maybeReadMore read 0");
        stream.read(0);
        if (len === state.length)
          break;
        else
          len = state.length;
      }
      state.readingMore = false;
    }
    Readable.prototype._read = function(n) {
      this.emit("error", new Error("_read() is not implemented"));
    };
    Readable.prototype.pipe = function(dest, pipeOpts) {
      var src = this;
      var state = this._readableState;
      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug("pipe count=%d opts=%j", state.pipesCount, pipeOpts);
      var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
      var endFn = doEnd ? onend : unpipe;
      if (state.endEmitted)
        pna.nextTick(endFn);
      else
        src.once("end", endFn);
      dest.on("unpipe", onunpipe);
      function onunpipe(readable, unpipeInfo) {
        debug("onunpipe");
        if (readable === src) {
          if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
            unpipeInfo.hasUnpiped = true;
            cleanup();
          }
        }
      }
      function onend() {
        debug("onend");
        dest.end();
      }
      var ondrain = pipeOnDrain(src);
      dest.on("drain", ondrain);
      var cleanedUp = false;
      function cleanup() {
        debug("cleanup");
        dest.removeListener("close", onclose);
        dest.removeListener("finish", onfinish);
        dest.removeListener("drain", ondrain);
        dest.removeListener("error", onerror);
        dest.removeListener("unpipe", onunpipe);
        src.removeListener("end", onend);
        src.removeListener("end", unpipe);
        src.removeListener("data", ondata);
        cleanedUp = true;
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain))
          ondrain();
      }
      var increasedAwaitDrain = false;
      src.on("data", ondata);
      function ondata(chunk) {
        debug("ondata");
        increasedAwaitDrain = false;
        var ret = dest.write(chunk);
        if (false === ret && !increasedAwaitDrain) {
          if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
            debug("false write response, pause", src._readableState.awaitDrain);
            src._readableState.awaitDrain++;
            increasedAwaitDrain = true;
          }
          src.pause();
        }
      }
      function onerror(er) {
        debug("onerror", er);
        unpipe();
        dest.removeListener("error", onerror);
        if (EElistenerCount(dest, "error") === 0)
          dest.emit("error", er);
      }
      prependListener(dest, "error", onerror);
      function onclose() {
        dest.removeListener("finish", onfinish);
        unpipe();
      }
      dest.once("close", onclose);
      function onfinish() {
        debug("onfinish");
        dest.removeListener("close", onclose);
        unpipe();
      }
      dest.once("finish", onfinish);
      function unpipe() {
        debug("unpipe");
        src.unpipe(dest);
      }
      dest.emit("pipe", src);
      if (!state.flowing) {
        debug("pipe resume");
        src.resume();
      }
      return dest;
    };
    function pipeOnDrain(src) {
      return function() {
        var state = src._readableState;
        debug("pipeOnDrain", state.awaitDrain);
        if (state.awaitDrain)
          state.awaitDrain--;
        if (state.awaitDrain === 0 && EElistenerCount(src, "data")) {
          state.flowing = true;
          flow(src);
        }
      };
    }
    Readable.prototype.unpipe = function(dest) {
      var state = this._readableState;
      var unpipeInfo = { hasUnpiped: false };
      if (state.pipesCount === 0)
        return this;
      if (state.pipesCount === 1) {
        if (dest && dest !== state.pipes)
          return this;
        if (!dest)
          dest = state.pipes;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest)
          dest.emit("unpipe", this, unpipeInfo);
        return this;
      }
      if (!dest) {
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        for (var i = 0; i < len; i++) {
          dests[i].emit("unpipe", this, unpipeInfo);
        }
        return this;
      }
      var index = indexOf(state.pipes, dest);
      if (index === -1)
        return this;
      state.pipes.splice(index, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1)
        state.pipes = state.pipes[0];
      dest.emit("unpipe", this, unpipeInfo);
      return this;
    };
    Readable.prototype.on = function(ev, fn) {
      var res = Stream.prototype.on.call(this, ev, fn);
      if (ev === "data") {
        if (this._readableState.flowing !== false)
          this.resume();
      } else if (ev === "readable") {
        var state = this._readableState;
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.emittedReadable = false;
          if (!state.reading) {
            pna.nextTick(nReadingNextTick, this);
          } else if (state.length) {
            emitReadable(this);
          }
        }
      }
      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;
    function nReadingNextTick(self2) {
      debug("readable nexttick read 0");
      self2.read(0);
    }
    Readable.prototype.resume = function() {
      var state = this._readableState;
      if (!state.flowing) {
        debug("resume");
        state.flowing = true;
        resume(this, state);
      }
      return this;
    };
    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        pna.nextTick(resume_, stream, state);
      }
    }
    function resume_(stream, state) {
      if (!state.reading) {
        debug("resume read 0");
        stream.read(0);
      }
      state.resumeScheduled = false;
      state.awaitDrain = 0;
      stream.emit("resume");
      flow(stream);
      if (state.flowing && !state.reading)
        stream.read(0);
    }
    Readable.prototype.pause = function() {
      debug("call pause flowing=%j", this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug("pause");
        this._readableState.flowing = false;
        this.emit("pause");
      }
      return this;
    };
    function flow(stream) {
      var state = stream._readableState;
      debug("flow", state.flowing);
      while (state.flowing && stream.read() !== null) {
      }
    }
    Readable.prototype.wrap = function(stream) {
      var _this = this;
      var state = this._readableState;
      var paused = false;
      stream.on("end", function() {
        debug("wrapped end");
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length)
            _this.push(chunk);
        }
        _this.push(null);
      });
      stream.on("data", function(chunk) {
        debug("wrapped data");
        if (state.decoder)
          chunk = state.decoder.write(chunk);
        if (state.objectMode && (chunk === null || chunk === void 0))
          return;
        else if (!state.objectMode && (!chunk || !chunk.length))
          return;
        var ret = _this.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });
      for (var i in stream) {
        if (this[i] === void 0 && typeof stream[i] === "function") {
          this[i] = function(method) {
            return function() {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }
      for (var n = 0; n < kProxyEvents.length; n++) {
        stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
      }
      this._read = function(n2) {
        debug("wrapped _read", n2);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };
      return this;
    };
    Object.defineProperty(Readable.prototype, "readableHighWaterMark", {
      enumerable: false,
      get: function() {
        return this._readableState.highWaterMark;
      }
    });
    Readable._fromList = fromList;
    function fromList(n, state) {
      if (state.length === 0)
        return null;
      var ret;
      if (state.objectMode)
        ret = state.buffer.shift();
      else if (!n || n >= state.length) {
        if (state.decoder)
          ret = state.buffer.join("");
        else if (state.buffer.length === 1)
          ret = state.buffer.head.data;
        else
          ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        ret = fromListPartial(n, state.buffer, state.decoder);
      }
      return ret;
    }
    function fromListPartial(n, list, hasStrings) {
      var ret;
      if (n < list.head.data.length) {
        ret = list.head.data.slice(0, n);
        list.head.data = list.head.data.slice(n);
      } else if (n === list.head.data.length) {
        ret = list.shift();
      } else {
        ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
      }
      return ret;
    }
    function copyFromBufferString(n, list) {
      var p = list.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length)
          ret += str;
        else
          ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next)
              list.head = p.next;
            else
              list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }
    function copyFromBuffer(n, list) {
      var ret = Buffer2.allocUnsafe(n);
      var p = list.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next)
              list.head = p.next;
            else
              list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }
    function endReadable(stream) {
      var state = stream._readableState;
      if (state.length > 0)
        throw new Error('"endReadable()" called on non-empty stream');
      if (!state.endEmitted) {
        state.ended = true;
        pna.nextTick(endReadableNT, state, stream);
      }
    }
    function endReadableNT(state, stream) {
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit("end");
      }
    }
    function indexOf(xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x)
          return i;
      }
      return -1;
    }
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_transform.js
var require_stream_transform = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_transform.js"(exports, module2) {
    "use strict";
    module2.exports = Transform;
    var Duplex = require_stream_duplex();
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    util.inherits(Transform, Duplex);
    function afterTransform(er, data) {
      var ts = this._transformState;
      ts.transforming = false;
      var cb = ts.writecb;
      if (!cb) {
        return this.emit("error", new Error("write callback called multiple times"));
      }
      ts.writechunk = null;
      ts.writecb = null;
      if (data != null)
        this.push(data);
      cb(er);
      var rs = this._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        this._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform))
        return new Transform(options);
      Duplex.call(this, options);
      this._transformState = {
        afterTransform: afterTransform.bind(this),
        needTransform: false,
        transforming: false,
        writecb: null,
        writechunk: null,
        writeencoding: null
      };
      this._readableState.needReadable = true;
      this._readableState.sync = false;
      if (options) {
        if (typeof options.transform === "function")
          this._transform = options.transform;
        if (typeof options.flush === "function")
          this._flush = options.flush;
      }
      this.on("prefinish", prefinish);
    }
    function prefinish() {
      var _this = this;
      if (typeof this._flush === "function") {
        this._flush(function(er, data) {
          done(_this, er, data);
        });
      } else {
        done(this, null, null);
      }
    }
    Transform.prototype.push = function(chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };
    Transform.prototype._transform = function(chunk, encoding, cb) {
      throw new Error("_transform() is not implemented");
    };
    Transform.prototype._write = function(chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark)
          this._read(rs.highWaterMark);
      }
    };
    Transform.prototype._read = function(n) {
      var ts = this._transformState;
      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        ts.needTransform = true;
      }
    };
    Transform.prototype._destroy = function(err, cb) {
      var _this2 = this;
      Duplex.prototype._destroy.call(this, err, function(err2) {
        cb(err2);
        _this2.emit("close");
      });
    };
    function done(stream, er, data) {
      if (er)
        return stream.emit("error", er);
      if (data != null)
        stream.push(data);
      if (stream._writableState.length)
        throw new Error("Calling transform done when ws.length != 0");
      if (stream._transformState.transforming)
        throw new Error("Calling transform done when still transforming");
      return stream.push(null);
    }
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_passthrough.js
var require_stream_passthrough = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/lib/_stream_passthrough.js"(exports, module2) {
    "use strict";
    module2.exports = PassThrough;
    var Transform = require_stream_transform();
    var util = Object.create(require_util());
    util.inherits = require_inherits();
    util.inherits(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough))
        return new PassThrough(options);
      Transform.call(this, options);
    }
    PassThrough.prototype._transform = function(chunk, encoding, cb) {
      cb(null, chunk);
    };
  }
});

// node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/readable.js
var require_readable = __commonJS({
  "node_modules/.pnpm/readable-stream@2.3.7/node_modules/readable-stream/readable.js"(exports, module2) {
    var Stream = require("stream");
    if (process.env.READABLE_STREAM === "disable" && Stream) {
      module2.exports = Stream;
      exports = module2.exports = Stream.Readable;
      exports.Readable = Stream.Readable;
      exports.Writable = Stream.Writable;
      exports.Duplex = Stream.Duplex;
      exports.Transform = Stream.Transform;
      exports.PassThrough = Stream.PassThrough;
      exports.Stream = Stream;
    } else {
      exports = module2.exports = require_stream_readable();
      exports.Stream = Stream || exports;
      exports.Readable = exports;
      exports.Writable = require_stream_writable();
      exports.Duplex = require_stream_duplex();
      exports.Transform = require_stream_transform();
      exports.PassThrough = require_stream_passthrough();
    }
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/support.js
var require_support = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/support.js"(exports) {
    "use strict";
    exports.base64 = true;
    exports.array = true;
    exports.string = true;
    exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
    exports.nodebuffer = typeof Buffer !== "undefined";
    exports.uint8array = typeof Uint8Array !== "undefined";
    if (typeof ArrayBuffer === "undefined") {
      exports.blob = false;
    } else {
      buffer = new ArrayBuffer(0);
      try {
        exports.blob = new Blob([buffer], {
          type: "application/zip"
        }).size === 0;
      } catch (e) {
        try {
          Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
          builder = new Builder();
          builder.append(buffer);
          exports.blob = builder.getBlob("application/zip").size === 0;
        } catch (e2) {
          exports.blob = false;
        }
      }
    }
    var buffer;
    var Builder;
    var builder;
    try {
      exports.nodestream = !!require_readable().Readable;
    } catch (e) {
      exports.nodestream = false;
    }
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/base64.js
var require_base64 = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/base64.js"(exports) {
    "use strict";
    var utils = require_utils2();
    var support = require_support();
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    exports.encode = function(input) {
      var output = [];
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0, len = input.length, remainingBytes = len;
      var isArray = utils.getTypeOf(input) !== "string";
      while (i < input.length) {
        remainingBytes = len - i;
        if (!isArray) {
          chr1 = input.charCodeAt(i++);
          chr2 = i < len ? input.charCodeAt(i++) : 0;
          chr3 = i < len ? input.charCodeAt(i++) : 0;
        } else {
          chr1 = input[i++];
          chr2 = i < len ? input[i++] : 0;
          chr3 = i < len ? input[i++] : 0;
        }
        enc1 = chr1 >> 2;
        enc2 = (chr1 & 3) << 4 | chr2 >> 4;
        enc3 = remainingBytes > 1 ? (chr2 & 15) << 2 | chr3 >> 6 : 64;
        enc4 = remainingBytes > 2 ? chr3 & 63 : 64;
        output.push(_keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4));
      }
      return output.join("");
    };
    exports.decode = function(input) {
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0, resultIndex = 0;
      var dataUrlPrefix = "data:";
      if (input.substr(0, dataUrlPrefix.length) === dataUrlPrefix) {
        throw new Error("Invalid base64 input, it looks like a data url.");
      }
      input = input.replace(/[^A-Za-z0-9+/=]/g, "");
      var totalLength = input.length * 3 / 4;
      if (input.charAt(input.length - 1) === _keyStr.charAt(64)) {
        totalLength--;
      }
      if (input.charAt(input.length - 2) === _keyStr.charAt(64)) {
        totalLength--;
      }
      if (totalLength % 1 !== 0) {
        throw new Error("Invalid base64 input, bad content length.");
      }
      var output;
      if (support.uint8array) {
        output = new Uint8Array(totalLength | 0);
      } else {
        output = new Array(totalLength | 0);
      }
      while (i < input.length) {
        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output[resultIndex++] = chr1;
        if (enc3 !== 64) {
          output[resultIndex++] = chr2;
        }
        if (enc4 !== 64) {
          output[resultIndex++] = chr3;
        }
      }
      return output;
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejsUtils.js
var require_nodejsUtils = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejsUtils.js"(exports, module2) {
    "use strict";
    module2.exports = {
      isNode: typeof Buffer !== "undefined",
      newBufferFrom: function(data, encoding) {
        if (Buffer.from && Buffer.from !== Uint8Array.from) {
          return Buffer.from(data, encoding);
        } else {
          if (typeof data === "number") {
            throw new Error('The "data" argument must not be a number');
          }
          return new Buffer(data, encoding);
        }
      },
      allocBuffer: function(size) {
        if (Buffer.alloc) {
          return Buffer.alloc(size);
        } else {
          var buf = new Buffer(size);
          buf.fill(0);
          return buf;
        }
      },
      isBuffer: function(b) {
        return Buffer.isBuffer(b);
      },
      isStream: function(obj) {
        return obj && typeof obj.on === "function" && typeof obj.pause === "function" && typeof obj.resume === "function";
      }
    };
  }
});

// node_modules/.pnpm/immediate@3.0.6/node_modules/immediate/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/immediate@3.0.6/node_modules/immediate/lib/index.js"(exports, module2) {
    "use strict";
    var Mutation = global.MutationObserver || global.WebKitMutationObserver;
    var scheduleDrain;
    if (process.browser) {
      if (Mutation) {
        called = 0;
        observer = new Mutation(nextTick);
        element = global.document.createTextNode("");
        observer.observe(element, {
          characterData: true
        });
        scheduleDrain = function() {
          element.data = called = ++called % 2;
        };
      } else if (!global.setImmediate && typeof global.MessageChannel !== "undefined") {
        channel = new global.MessageChannel();
        channel.port1.onmessage = nextTick;
        scheduleDrain = function() {
          channel.port2.postMessage(0);
        };
      } else if ("document" in global && "onreadystatechange" in global.document.createElement("script")) {
        scheduleDrain = function() {
          var scriptEl = global.document.createElement("script");
          scriptEl.onreadystatechange = function() {
            nextTick();
            scriptEl.onreadystatechange = null;
            scriptEl.parentNode.removeChild(scriptEl);
            scriptEl = null;
          };
          global.document.documentElement.appendChild(scriptEl);
        };
      } else {
        scheduleDrain = function() {
          setTimeout(nextTick, 0);
        };
      }
    } else {
      scheduleDrain = function() {
        process.nextTick(nextTick);
      };
    }
    var called;
    var observer;
    var element;
    var channel;
    var draining;
    var queue = [];
    function nextTick() {
      draining = true;
      var i, oldQueue;
      var len = queue.length;
      while (len) {
        oldQueue = queue;
        queue = [];
        i = -1;
        while (++i < len) {
          oldQueue[i]();
        }
        len = queue.length;
      }
      draining = false;
    }
    module2.exports = immediate;
    function immediate(task) {
      if (queue.push(task) === 1 && !draining) {
        scheduleDrain();
      }
    }
  }
});

// node_modules/.pnpm/lie@3.3.0/node_modules/lie/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/.pnpm/lie@3.3.0/node_modules/lie/lib/index.js"(exports, module2) {
    "use strict";
    var immediate = require_lib();
    function INTERNAL() {
    }
    var handlers = {};
    var REJECTED = ["REJECTED"];
    var FULFILLED = ["FULFILLED"];
    var PENDING = ["PENDING"];
    if (!process.browser) {
      UNHANDLED = ["UNHANDLED"];
    }
    var UNHANDLED;
    module2.exports = Promise2;
    function Promise2(resolver) {
      if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function");
      }
      this.state = PENDING;
      this.queue = [];
      this.outcome = void 0;
      if (!process.browser) {
        this.handled = UNHANDLED;
      }
      if (resolver !== INTERNAL) {
        safelyResolveThenable(this, resolver);
      }
    }
    Promise2.prototype.finally = function(callback) {
      if (typeof callback !== "function") {
        return this;
      }
      var p = this.constructor;
      return this.then(resolve2, reject2);
      function resolve2(value) {
        function yes() {
          return value;
        }
        return p.resolve(callback()).then(yes);
      }
      function reject2(reason) {
        function no() {
          throw reason;
        }
        return p.resolve(callback()).then(no);
      }
    };
    Promise2.prototype.catch = function(onRejected) {
      return this.then(null, onRejected);
    };
    Promise2.prototype.then = function(onFulfilled, onRejected) {
      if (typeof onFulfilled !== "function" && this.state === FULFILLED || typeof onRejected !== "function" && this.state === REJECTED) {
        return this;
      }
      var promise = new this.constructor(INTERNAL);
      if (!process.browser) {
        if (this.handled === UNHANDLED) {
          this.handled = null;
        }
      }
      if (this.state !== PENDING) {
        var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
        unwrap(promise, resolver, this.outcome);
      } else {
        this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
      }
      return promise;
    };
    function QueueItem(promise, onFulfilled, onRejected) {
      this.promise = promise;
      if (typeof onFulfilled === "function") {
        this.onFulfilled = onFulfilled;
        this.callFulfilled = this.otherCallFulfilled;
      }
      if (typeof onRejected === "function") {
        this.onRejected = onRejected;
        this.callRejected = this.otherCallRejected;
      }
    }
    QueueItem.prototype.callFulfilled = function(value) {
      handlers.resolve(this.promise, value);
    };
    QueueItem.prototype.otherCallFulfilled = function(value) {
      unwrap(this.promise, this.onFulfilled, value);
    };
    QueueItem.prototype.callRejected = function(value) {
      handlers.reject(this.promise, value);
    };
    QueueItem.prototype.otherCallRejected = function(value) {
      unwrap(this.promise, this.onRejected, value);
    };
    function unwrap(promise, func, value) {
      immediate(function() {
        var returnValue;
        try {
          returnValue = func(value);
        } catch (e) {
          return handlers.reject(promise, e);
        }
        if (returnValue === promise) {
          handlers.reject(promise, new TypeError("Cannot resolve promise with itself"));
        } else {
          handlers.resolve(promise, returnValue);
        }
      });
    }
    handlers.resolve = function(self2, value) {
      var result = tryCatch(getThen, value);
      if (result.status === "error") {
        return handlers.reject(self2, result.value);
      }
      var thenable = result.value;
      if (thenable) {
        safelyResolveThenable(self2, thenable);
      } else {
        self2.state = FULFILLED;
        self2.outcome = value;
        var i = -1;
        var len = self2.queue.length;
        while (++i < len) {
          self2.queue[i].callFulfilled(value);
        }
      }
      return self2;
    };
    handlers.reject = function(self2, error) {
      self2.state = REJECTED;
      self2.outcome = error;
      if (!process.browser) {
        if (self2.handled === UNHANDLED) {
          immediate(function() {
            if (self2.handled === UNHANDLED) {
              process.emit("unhandledRejection", error, self2);
            }
          });
        }
      }
      var i = -1;
      var len = self2.queue.length;
      while (++i < len) {
        self2.queue[i].callRejected(error);
      }
      return self2;
    };
    function getThen(obj) {
      var then = obj && obj.then;
      if (obj && (typeof obj === "object" || typeof obj === "function") && typeof then === "function") {
        return function appyThen() {
          then.apply(obj, arguments);
        };
      }
    }
    function safelyResolveThenable(self2, thenable) {
      var called = false;
      function onError(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.reject(self2, value);
      }
      function onSuccess(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.resolve(self2, value);
      }
      function tryToUnwrap() {
        thenable(onSuccess, onError);
      }
      var result = tryCatch(tryToUnwrap);
      if (result.status === "error") {
        onError(result.value);
      }
    }
    function tryCatch(func, value) {
      var out = {};
      try {
        out.value = func(value);
        out.status = "success";
      } catch (e) {
        out.status = "error";
        out.value = e;
      }
      return out;
    }
    Promise2.resolve = resolve;
    function resolve(value) {
      if (value instanceof this) {
        return value;
      }
      return handlers.resolve(new this(INTERNAL), value);
    }
    Promise2.reject = reject;
    function reject(reason) {
      var promise = new this(INTERNAL);
      return handlers.reject(promise, reason);
    }
    Promise2.all = all;
    function all(iterable) {
      var self2 = this;
      if (Object.prototype.toString.call(iterable) !== "[object Array]") {
        return this.reject(new TypeError("must be an array"));
      }
      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }
      var values = new Array(len);
      var resolved = 0;
      var i = -1;
      var promise = new this(INTERNAL);
      while (++i < len) {
        allResolver(iterable[i], i);
      }
      return promise;
      function allResolver(value, i2) {
        self2.resolve(value).then(resolveFromAll, function(error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
        function resolveFromAll(outValue) {
          values[i2] = outValue;
          if (++resolved === len && !called) {
            called = true;
            handlers.resolve(promise, values);
          }
        }
      }
    }
    Promise2.race = race;
    function race(iterable) {
      var self2 = this;
      if (Object.prototype.toString.call(iterable) !== "[object Array]") {
        return this.reject(new TypeError("must be an array"));
      }
      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }
      var i = -1;
      var promise = new this(INTERNAL);
      while (++i < len) {
        resolver(iterable[i]);
      }
      return promise;
      function resolver(value) {
        self2.resolve(value).then(function(response) {
          if (!called) {
            called = true;
            handlers.resolve(promise, response);
          }
        }, function(error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
      }
    }
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/external.js
var require_external = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/external.js"(exports, module2) {
    "use strict";
    var ES6Promise = null;
    if (typeof Promise !== "undefined") {
      ES6Promise = Promise;
    } else {
      ES6Promise = require_lib2();
    }
    module2.exports = {
      Promise: ES6Promise
    };
  }
});

// node_modules/.pnpm/setimmediate@1.0.5/node_modules/setimmediate/setImmediate.js
var require_setImmediate = __commonJS({
  "node_modules/.pnpm/setimmediate@1.0.5/node_modules/setimmediate/setImmediate.js"(exports) {
    (function(global2, undefined2) {
      "use strict";
      if (global2.setImmediate) {
        return;
      }
      var nextHandle = 1;
      var tasksByHandle = {};
      var currentlyRunningATask = false;
      var doc = global2.document;
      var registerImmediate;
      function setImmediate2(callback) {
        if (typeof callback !== "function") {
          callback = new Function("" + callback);
        }
        var args = new Array(arguments.length - 1);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
        }
        var task = { callback, args };
        tasksByHandle[nextHandle] = task;
        registerImmediate(nextHandle);
        return nextHandle++;
      }
      function clearImmediate(handle) {
        delete tasksByHandle[handle];
      }
      function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
          case 0:
            callback();
            break;
          case 1:
            callback(args[0]);
            break;
          case 2:
            callback(args[0], args[1]);
            break;
          case 3:
            callback(args[0], args[1], args[2]);
            break;
          default:
            callback.apply(undefined2, args);
            break;
        }
      }
      function runIfPresent(handle) {
        if (currentlyRunningATask) {
          setTimeout(runIfPresent, 0, handle);
        } else {
          var task = tasksByHandle[handle];
          if (task) {
            currentlyRunningATask = true;
            try {
              run(task);
            } finally {
              clearImmediate(handle);
              currentlyRunningATask = false;
            }
          }
        }
      }
      function installNextTickImplementation() {
        registerImmediate = function(handle) {
          process.nextTick(function() {
            runIfPresent(handle);
          });
        };
      }
      function canUsePostMessage() {
        if (global2.postMessage && !global2.importScripts) {
          var postMessageIsAsynchronous = true;
          var oldOnMessage = global2.onmessage;
          global2.onmessage = function() {
            postMessageIsAsynchronous = false;
          };
          global2.postMessage("", "*");
          global2.onmessage = oldOnMessage;
          return postMessageIsAsynchronous;
        }
      }
      function installPostMessageImplementation() {
        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
          if (event.source === global2 && typeof event.data === "string" && event.data.indexOf(messagePrefix) === 0) {
            runIfPresent(+event.data.slice(messagePrefix.length));
          }
        };
        if (global2.addEventListener) {
          global2.addEventListener("message", onGlobalMessage, false);
        } else {
          global2.attachEvent("onmessage", onGlobalMessage);
        }
        registerImmediate = function(handle) {
          global2.postMessage(messagePrefix + handle, "*");
        };
      }
      function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
          var handle = event.data;
          runIfPresent(handle);
        };
        registerImmediate = function(handle) {
          channel.port2.postMessage(handle);
        };
      }
      function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
          var script = doc.createElement("script");
          script.onreadystatechange = function() {
            runIfPresent(handle);
            script.onreadystatechange = null;
            html.removeChild(script);
            script = null;
          };
          html.appendChild(script);
        };
      }
      function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
          setTimeout(runIfPresent, 0, handle);
        };
      }
      var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global2);
      attachTo = attachTo && attachTo.setTimeout ? attachTo : global2;
      if ({}.toString.call(global2.process) === "[object process]") {
        installNextTickImplementation();
      } else if (canUsePostMessage()) {
        installPostMessageImplementation();
      } else if (global2.MessageChannel) {
        installMessageChannelImplementation();
      } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        installReadyStateChangeImplementation();
      } else {
        installSetTimeoutImplementation();
      }
      attachTo.setImmediate = setImmediate2;
      attachTo.clearImmediate = clearImmediate;
    })(typeof self === "undefined" ? typeof global === "undefined" ? exports : global : self);
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/utils.js
var require_utils2 = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/utils.js"(exports) {
    "use strict";
    var support = require_support();
    var base64 = require_base64();
    var nodejsUtils = require_nodejsUtils();
    var external = require_external();
    require_setImmediate();
    function string2binary(str) {
      var result = null;
      if (support.uint8array) {
        result = new Uint8Array(str.length);
      } else {
        result = new Array(str.length);
      }
      return stringToArrayLike(str, result);
    }
    exports.newBlob = function(part, type) {
      exports.checkSupport("blob");
      try {
        return new Blob([part], {
          type
        });
      } catch (e) {
        try {
          var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
          var builder = new Builder();
          builder.append(part);
          return builder.getBlob(type);
        } catch (e2) {
          throw new Error("Bug : can't construct the Blob.");
        }
      }
    };
    function identity(input) {
      return input;
    }
    function stringToArrayLike(str, array) {
      for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 255;
      }
      return array;
    }
    var arrayToStringHelper = {
      stringifyByChunk: function(array, type, chunk) {
        var result = [], k = 0, len = array.length;
        if (len <= chunk) {
          return String.fromCharCode.apply(null, array);
        }
        while (k < len) {
          if (type === "array" || type === "nodebuffer") {
            result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
          } else {
            result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
          }
          k += chunk;
        }
        return result.join("");
      },
      stringifyByChar: function(array) {
        var resultStr = "";
        for (var i = 0; i < array.length; i++) {
          resultStr += String.fromCharCode(array[i]);
        }
        return resultStr;
      },
      applyCanBeUsed: {
        uint8array: function() {
          try {
            return support.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
          } catch (e) {
            return false;
          }
        }(),
        nodebuffer: function() {
          try {
            return support.nodebuffer && String.fromCharCode.apply(null, nodejsUtils.allocBuffer(1)).length === 1;
          } catch (e) {
            return false;
          }
        }()
      }
    };
    function arrayLikeToString(array) {
      var chunk = 65536, type = exports.getTypeOf(array), canUseApply = true;
      if (type === "uint8array") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.uint8array;
      } else if (type === "nodebuffer") {
        canUseApply = arrayToStringHelper.applyCanBeUsed.nodebuffer;
      }
      if (canUseApply) {
        while (chunk > 1) {
          try {
            return arrayToStringHelper.stringifyByChunk(array, type, chunk);
          } catch (e) {
            chunk = Math.floor(chunk / 2);
          }
        }
      }
      return arrayToStringHelper.stringifyByChar(array);
    }
    exports.applyFromCharCode = arrayLikeToString;
    function arrayLikeToArrayLike(arrayFrom, arrayTo) {
      for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
      }
      return arrayTo;
    }
    var transform = {};
    transform["string"] = {
      "string": identity,
      "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
      },
      "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
      },
      "nodebuffer": function(input) {
        return stringToArrayLike(input, nodejsUtils.allocBuffer(input.length));
      }
    };
    transform["array"] = {
      "string": arrayLikeToString,
      "array": identity,
      "arraybuffer": function(input) {
        return new Uint8Array(input).buffer;
      },
      "uint8array": function(input) {
        return new Uint8Array(input);
      },
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
      }
    };
    transform["arraybuffer"] = {
      "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
      },
      "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
      },
      "arraybuffer": identity,
      "uint8array": function(input) {
        return new Uint8Array(input);
      },
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(new Uint8Array(input));
      }
    };
    transform["uint8array"] = {
      "string": arrayLikeToString,
      "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return input.buffer;
      },
      "uint8array": identity,
      "nodebuffer": function(input) {
        return nodejsUtils.newBufferFrom(input);
      }
    };
    transform["nodebuffer"] = {
      "string": arrayLikeToString,
      "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
      },
      "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
      },
      "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
      },
      "nodebuffer": identity
    };
    exports.transformTo = function(outputType, input) {
      if (!input) {
        input = "";
      }
      if (!outputType) {
        return input;
      }
      exports.checkSupport(outputType);
      var inputType = exports.getTypeOf(input);
      var result = transform[inputType][outputType](input);
      return result;
    };
    exports.resolve = function(path) {
      var parts = path.split("/");
      var result = [];
      for (var index = 0; index < parts.length; index++) {
        var part = parts[index];
        if (part === "." || part === "" && index !== 0 && index !== parts.length - 1) {
          continue;
        } else if (part === "..") {
          result.pop();
        } else {
          result.push(part);
        }
      }
      return result.join("/");
    };
    exports.getTypeOf = function(input) {
      if (typeof input === "string") {
        return "string";
      }
      if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
      }
      if (support.nodebuffer && nodejsUtils.isBuffer(input)) {
        return "nodebuffer";
      }
      if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
      }
      if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
      }
    };
    exports.checkSupport = function(type) {
      var supported = support[type.toLowerCase()];
      if (!supported) {
        throw new Error(type + " is not supported by this platform");
      }
    };
    exports.MAX_VALUE_16BITS = 65535;
    exports.MAX_VALUE_32BITS = -1;
    exports.pretty = function(str) {
      var res = "", code, i;
      for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += "\\x" + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
      }
      return res;
    };
    exports.delay = function(callback, args, self2) {
      setImmediate(function() {
        callback.apply(self2 || null, args || []);
      });
    };
    exports.inherits = function(ctor, superCtor) {
      var Obj = function() {
      };
      Obj.prototype = superCtor.prototype;
      ctor.prototype = new Obj();
    };
    exports.extend = function() {
      var result = {}, i, attr;
      for (i = 0; i < arguments.length; i++) {
        for (attr in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], attr) && typeof result[attr] === "undefined") {
            result[attr] = arguments[i][attr];
          }
        }
      }
      return result;
    };
    exports.prepareContent = function(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {
      var promise = external.Promise.resolve(inputData).then(function(data) {
        var isBlob = support.blob && (data instanceof Blob || ["[object File]", "[object Blob]"].indexOf(Object.prototype.toString.call(data)) !== -1);
        if (isBlob && typeof FileReader !== "undefined") {
          return new external.Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
              resolve(e.target.result);
            };
            reader.onerror = function(e) {
              reject(e.target.error);
            };
            reader.readAsArrayBuffer(data);
          });
        } else {
          return data;
        }
      });
      return promise.then(function(data) {
        var dataType = exports.getTypeOf(data);
        if (!dataType) {
          return external.Promise.reject(
            new Error("Can't read the data of '" + name + "'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
          );
        }
        if (dataType === "arraybuffer") {
          data = exports.transformTo("uint8array", data);
        } else if (dataType === "string") {
          if (isBase64) {
            data = base64.decode(data);
          } else if (isBinary) {
            if (isOptimizedBinaryString !== true) {
              data = string2binary(data);
            }
          }
        }
        return data;
      });
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/GenericWorker.js
var require_GenericWorker = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/GenericWorker.js"(exports, module2) {
    "use strict";
    function GenericWorker(name) {
      this.name = name || "default";
      this.streamInfo = {};
      this.generatedError = null;
      this.extraStreamInfo = {};
      this.isPaused = true;
      this.isFinished = false;
      this.isLocked = false;
      this._listeners = {
        "data": [],
        "end": [],
        "error": []
      };
      this.previous = null;
    }
    GenericWorker.prototype = {
      push: function(chunk) {
        this.emit("data", chunk);
      },
      end: function() {
        if (this.isFinished) {
          return false;
        }
        this.flush();
        try {
          this.emit("end");
          this.cleanUp();
          this.isFinished = true;
        } catch (e) {
          this.emit("error", e);
        }
        return true;
      },
      error: function(e) {
        if (this.isFinished) {
          return false;
        }
        if (this.isPaused) {
          this.generatedError = e;
        } else {
          this.isFinished = true;
          this.emit("error", e);
          if (this.previous) {
            this.previous.error(e);
          }
          this.cleanUp();
        }
        return true;
      },
      on: function(name, listener) {
        this._listeners[name].push(listener);
        return this;
      },
      cleanUp: function() {
        this.streamInfo = this.generatedError = this.extraStreamInfo = null;
        this._listeners = [];
      },
      emit: function(name, arg) {
        if (this._listeners[name]) {
          for (var i = 0; i < this._listeners[name].length; i++) {
            this._listeners[name][i].call(this, arg);
          }
        }
      },
      pipe: function(next) {
        return next.registerPrevious(this);
      },
      registerPrevious: function(previous) {
        if (this.isLocked) {
          throw new Error("The stream '" + this + "' has already been used.");
        }
        this.streamInfo = previous.streamInfo;
        this.mergeStreamInfo();
        this.previous = previous;
        var self2 = this;
        previous.on("data", function(chunk) {
          self2.processChunk(chunk);
        });
        previous.on("end", function() {
          self2.end();
        });
        previous.on("error", function(e) {
          self2.error(e);
        });
        return this;
      },
      pause: function() {
        if (this.isPaused || this.isFinished) {
          return false;
        }
        this.isPaused = true;
        if (this.previous) {
          this.previous.pause();
        }
        return true;
      },
      resume: function() {
        if (!this.isPaused || this.isFinished) {
          return false;
        }
        this.isPaused = false;
        var withError = false;
        if (this.generatedError) {
          this.error(this.generatedError);
          withError = true;
        }
        if (this.previous) {
          this.previous.resume();
        }
        return !withError;
      },
      flush: function() {
      },
      processChunk: function(chunk) {
        this.push(chunk);
      },
      withStreamInfo: function(key, value) {
        this.extraStreamInfo[key] = value;
        this.mergeStreamInfo();
        return this;
      },
      mergeStreamInfo: function() {
        for (var key in this.extraStreamInfo) {
          if (!Object.prototype.hasOwnProperty.call(this.extraStreamInfo, key)) {
            continue;
          }
          this.streamInfo[key] = this.extraStreamInfo[key];
        }
      },
      lock: function() {
        if (this.isLocked) {
          throw new Error("The stream '" + this + "' has already been used.");
        }
        this.isLocked = true;
        if (this.previous) {
          this.previous.lock();
        }
      },
      toString: function() {
        var me = "Worker " + this.name;
        if (this.previous) {
          return this.previous + " -> " + me;
        } else {
          return me;
        }
      }
    };
    module2.exports = GenericWorker;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/utf8.js
var require_utf8 = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/utf8.js"(exports) {
    "use strict";
    var utils = require_utils2();
    var support = require_support();
    var nodejsUtils = require_nodejsUtils();
    var GenericWorker = require_GenericWorker();
    var _utf8len = new Array(256);
    for (i = 0; i < 256; i++) {
      _utf8len[i] = i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1;
    }
    var i;
    _utf8len[254] = _utf8len[254] = 1;
    var string2buf = function(str) {
      var buf, c, c2, m_pos, i2, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      if (support.uint8array) {
        buf = new Uint8Array(buf_len);
      } else {
        buf = new Array(buf_len);
      }
      for (i2 = 0, m_pos = 0; i2 < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i2++] = c;
        } else if (c < 2048) {
          buf[i2++] = 192 | c >>> 6;
          buf[i2++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i2++] = 224 | c >>> 12;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        } else {
          buf[i2++] = 240 | c >>> 18;
          buf[i2++] = 128 | c >>> 12 & 63;
          buf[i2++] = 128 | c >>> 6 & 63;
          buf[i2++] = 128 | c & 63;
        }
      }
      return buf;
    };
    var utf8border = function(buf, max) {
      var pos;
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
    var buf2string = function(buf) {
      var i2, out, c, c_len;
      var len = buf.length;
      var utf16buf = new Array(len * 2);
      for (out = 0, i2 = 0; i2 < len; ) {
        c = buf[i2++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i2 += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i2 < len) {
          c = c << 6 | buf[i2++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      if (utf16buf.length !== out) {
        if (utf16buf.subarray) {
          utf16buf = utf16buf.subarray(0, out);
        } else {
          utf16buf.length = out;
        }
      }
      return utils.applyFromCharCode(utf16buf);
    };
    exports.utf8encode = function utf8encode(str) {
      if (support.nodebuffer) {
        return nodejsUtils.newBufferFrom(str, "utf-8");
      }
      return string2buf(str);
    };
    exports.utf8decode = function utf8decode(buf) {
      if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
      }
      buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);
      return buf2string(buf);
    };
    function Utf8DecodeWorker() {
      GenericWorker.call(this, "utf-8 decode");
      this.leftOver = null;
    }
    utils.inherits(Utf8DecodeWorker, GenericWorker);
    Utf8DecodeWorker.prototype.processChunk = function(chunk) {
      var data = utils.transformTo(support.uint8array ? "uint8array" : "array", chunk.data);
      if (this.leftOver && this.leftOver.length) {
        if (support.uint8array) {
          var previousData = data;
          data = new Uint8Array(previousData.length + this.leftOver.length);
          data.set(this.leftOver, 0);
          data.set(previousData, this.leftOver.length);
        } else {
          data = this.leftOver.concat(data);
        }
        this.leftOver = null;
      }
      var nextBoundary = utf8border(data);
      var usableData = data;
      if (nextBoundary !== data.length) {
        if (support.uint8array) {
          usableData = data.subarray(0, nextBoundary);
          this.leftOver = data.subarray(nextBoundary, data.length);
        } else {
          usableData = data.slice(0, nextBoundary);
          this.leftOver = data.slice(nextBoundary, data.length);
        }
      }
      this.push({
        data: exports.utf8decode(usableData),
        meta: chunk.meta
      });
    };
    Utf8DecodeWorker.prototype.flush = function() {
      if (this.leftOver && this.leftOver.length) {
        this.push({
          data: exports.utf8decode(this.leftOver),
          meta: {}
        });
        this.leftOver = null;
      }
    };
    exports.Utf8DecodeWorker = Utf8DecodeWorker;
    function Utf8EncodeWorker() {
      GenericWorker.call(this, "utf-8 encode");
    }
    utils.inherits(Utf8EncodeWorker, GenericWorker);
    Utf8EncodeWorker.prototype.processChunk = function(chunk) {
      this.push({
        data: exports.utf8encode(chunk.data),
        meta: chunk.meta
      });
    };
    exports.Utf8EncodeWorker = Utf8EncodeWorker;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/ConvertWorker.js
var require_ConvertWorker = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/ConvertWorker.js"(exports, module2) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    var utils = require_utils2();
    function ConvertWorker(destType) {
      GenericWorker.call(this, "ConvertWorker to " + destType);
      this.destType = destType;
    }
    utils.inherits(ConvertWorker, GenericWorker);
    ConvertWorker.prototype.processChunk = function(chunk) {
      this.push({
        data: utils.transformTo(this.destType, chunk.data),
        meta: chunk.meta
      });
    };
    module2.exports = ConvertWorker;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejs/NodejsStreamOutputAdapter.js
var require_NodejsStreamOutputAdapter = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejs/NodejsStreamOutputAdapter.js"(exports, module2) {
    "use strict";
    var Readable = require_readable().Readable;
    var utils = require_utils2();
    utils.inherits(NodejsStreamOutputAdapter, Readable);
    function NodejsStreamOutputAdapter(helper, options, updateCb) {
      Readable.call(this, options);
      this._helper = helper;
      var self2 = this;
      helper.on("data", function(data, meta) {
        if (!self2.push(data)) {
          self2._helper.pause();
        }
        if (updateCb) {
          updateCb(meta);
        }
      }).on("error", function(e) {
        self2.emit("error", e);
      }).on("end", function() {
        self2.push(null);
      });
    }
    NodejsStreamOutputAdapter.prototype._read = function() {
      this._helper.resume();
    };
    module2.exports = NodejsStreamOutputAdapter;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/StreamHelper.js
var require_StreamHelper = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/StreamHelper.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var ConvertWorker = require_ConvertWorker();
    var GenericWorker = require_GenericWorker();
    var base64 = require_base64();
    var support = require_support();
    var external = require_external();
    var NodejsStreamOutputAdapter = null;
    if (support.nodestream) {
      try {
        NodejsStreamOutputAdapter = require_NodejsStreamOutputAdapter();
      } catch (e) {
      }
    }
    function transformZipOutput(type, content, mimeType) {
      switch (type) {
        case "blob":
          return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
        case "base64":
          return base64.encode(content);
        default:
          return utils.transformTo(type, content);
      }
    }
    function concat(type, dataArray) {
      var i, index = 0, res = null, totalLength = 0;
      for (i = 0; i < dataArray.length; i++) {
        totalLength += dataArray[i].length;
      }
      switch (type) {
        case "string":
          return dataArray.join("");
        case "array":
          return Array.prototype.concat.apply([], dataArray);
        case "uint8array":
          res = new Uint8Array(totalLength);
          for (i = 0; i < dataArray.length; i++) {
            res.set(dataArray[i], index);
            index += dataArray[i].length;
          }
          return res;
        case "nodebuffer":
          return Buffer.concat(dataArray);
        default:
          throw new Error("concat : unsupported type '" + type + "'");
      }
    }
    function accumulate(helper, updateCallback) {
      return new external.Promise(function(resolve, reject) {
        var dataArray = [];
        var chunkType = helper._internalType, resultType = helper._outputType, mimeType = helper._mimeType;
        helper.on("data", function(data, meta) {
          dataArray.push(data);
          if (updateCallback) {
            updateCallback(meta);
          }
        }).on("error", function(err) {
          dataArray = [];
          reject(err);
        }).on("end", function() {
          try {
            var result = transformZipOutput(resultType, concat(chunkType, dataArray), mimeType);
            resolve(result);
          } catch (e) {
            reject(e);
          }
          dataArray = [];
        }).resume();
      });
    }
    function StreamHelper(worker, outputType, mimeType) {
      var internalType = outputType;
      switch (outputType) {
        case "blob":
        case "arraybuffer":
          internalType = "uint8array";
          break;
        case "base64":
          internalType = "string";
          break;
      }
      try {
        this._internalType = internalType;
        this._outputType = outputType;
        this._mimeType = mimeType;
        utils.checkSupport(internalType);
        this._worker = worker.pipe(new ConvertWorker(internalType));
        worker.lock();
      } catch (e) {
        this._worker = new GenericWorker("error");
        this._worker.error(e);
      }
    }
    StreamHelper.prototype = {
      accumulate: function(updateCb) {
        return accumulate(this, updateCb);
      },
      on: function(evt, fn) {
        var self2 = this;
        if (evt === "data") {
          this._worker.on(evt, function(chunk) {
            fn.call(self2, chunk.data, chunk.meta);
          });
        } else {
          this._worker.on(evt, function() {
            utils.delay(fn, arguments, self2);
          });
        }
        return this;
      },
      resume: function() {
        utils.delay(this._worker.resume, [], this._worker);
        return this;
      },
      pause: function() {
        this._worker.pause();
        return this;
      },
      toNodejsStream: function(updateCb) {
        utils.checkSupport("nodestream");
        if (this._outputType !== "nodebuffer") {
          throw new Error(this._outputType + " is not supported by this method");
        }
        return new NodejsStreamOutputAdapter(this, {
          objectMode: this._outputType !== "nodebuffer"
        }, updateCb);
      }
    };
    module2.exports = StreamHelper;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/defaults.js"(exports) {
    "use strict";
    exports.base64 = false;
    exports.binary = false;
    exports.dir = false;
    exports.createFolders = true;
    exports.date = null;
    exports.compression = null;
    exports.compressionOptions = null;
    exports.comment = null;
    exports.unixPermissions = null;
    exports.dosPermissions = null;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/DataWorker.js
var require_DataWorker = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/DataWorker.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    var DEFAULT_BLOCK_SIZE = 16 * 1024;
    function DataWorker(dataP) {
      GenericWorker.call(this, "DataWorker");
      var self2 = this;
      this.dataIsReady = false;
      this.index = 0;
      this.max = 0;
      this.data = null;
      this.type = "";
      this._tickScheduled = false;
      dataP.then(function(data) {
        self2.dataIsReady = true;
        self2.data = data;
        self2.max = data && data.length || 0;
        self2.type = utils.getTypeOf(data);
        if (!self2.isPaused) {
          self2._tickAndRepeat();
        }
      }, function(e) {
        self2.error(e);
      });
    }
    utils.inherits(DataWorker, GenericWorker);
    DataWorker.prototype.cleanUp = function() {
      GenericWorker.prototype.cleanUp.call(this);
      this.data = null;
    };
    DataWorker.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (!this._tickScheduled && this.dataIsReady) {
        this._tickScheduled = true;
        utils.delay(this._tickAndRepeat, [], this);
      }
      return true;
    };
    DataWorker.prototype._tickAndRepeat = function() {
      this._tickScheduled = false;
      if (this.isPaused || this.isFinished) {
        return;
      }
      this._tick();
      if (!this.isFinished) {
        utils.delay(this._tickAndRepeat, [], this);
        this._tickScheduled = true;
      }
    };
    DataWorker.prototype._tick = function() {
      if (this.isPaused || this.isFinished) {
        return false;
      }
      var size = DEFAULT_BLOCK_SIZE;
      var data = null, nextIndex = Math.min(this.max, this.index + size);
      if (this.index >= this.max) {
        return this.end();
      } else {
        switch (this.type) {
          case "string":
            data = this.data.substring(this.index, nextIndex);
            break;
          case "uint8array":
            data = this.data.subarray(this.index, nextIndex);
            break;
          case "array":
          case "nodebuffer":
            data = this.data.slice(this.index, nextIndex);
            break;
        }
        this.index = nextIndex;
        return this.push({
          data,
          meta: {
            percent: this.max ? this.index / this.max * 100 : 0
          }
        });
      }
    };
    module2.exports = DataWorker;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/crc32.js
var require_crc32 = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/crc32.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    function makeTable() {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    }
    var crcTable = makeTable();
    function crc32(crc, buf, len, pos) {
      var t = crcTable, end = pos + len;
      crc = crc ^ -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    }
    function crc32str(crc, str, len, pos) {
      var t = crcTable, end = pos + len;
      crc = crc ^ -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ str.charCodeAt(i)) & 255];
      }
      return crc ^ -1;
    }
    module2.exports = function crc32wrapper(input, crc) {
      if (typeof input === "undefined" || !input.length) {
        return 0;
      }
      var isArray = utils.getTypeOf(input) !== "string";
      if (isArray) {
        return crc32(crc | 0, input, input.length, 0);
      } else {
        return crc32str(crc | 0, input, input.length, 0);
      }
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/Crc32Probe.js
var require_Crc32Probe = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/Crc32Probe.js"(exports, module2) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    var crc32 = require_crc32();
    var utils = require_utils2();
    function Crc32Probe() {
      GenericWorker.call(this, "Crc32Probe");
      this.withStreamInfo("crc32", 0);
    }
    utils.inherits(Crc32Probe, GenericWorker);
    Crc32Probe.prototype.processChunk = function(chunk) {
      this.streamInfo.crc32 = crc32(chunk.data, this.streamInfo.crc32 || 0);
      this.push(chunk);
    };
    module2.exports = Crc32Probe;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/DataLengthProbe.js
var require_DataLengthProbe = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/stream/DataLengthProbe.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    function DataLengthProbe(propName) {
      GenericWorker.call(this, "DataLengthProbe for " + propName);
      this.propName = propName;
      this.withStreamInfo(propName, 0);
    }
    utils.inherits(DataLengthProbe, GenericWorker);
    DataLengthProbe.prototype.processChunk = function(chunk) {
      if (chunk) {
        var length = this.streamInfo[this.propName] || 0;
        this.streamInfo[this.propName] = length + chunk.data.length;
      }
      GenericWorker.prototype.processChunk.call(this, chunk);
    };
    module2.exports = DataLengthProbe;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/compressedObject.js
var require_compressedObject = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/compressedObject.js"(exports, module2) {
    "use strict";
    var external = require_external();
    var DataWorker = require_DataWorker();
    var Crc32Probe = require_Crc32Probe();
    var DataLengthProbe = require_DataLengthProbe();
    function CompressedObject(compressedSize, uncompressedSize, crc32, compression, data) {
      this.compressedSize = compressedSize;
      this.uncompressedSize = uncompressedSize;
      this.crc32 = crc32;
      this.compression = compression;
      this.compressedContent = data;
    }
    CompressedObject.prototype = {
      getContentWorker: function() {
        var worker = new DataWorker(external.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new DataLengthProbe("data_length"));
        var that = this;
        worker.on("end", function() {
          if (this.streamInfo["data_length"] !== that.uncompressedSize) {
            throw new Error("Bug : uncompressed data size mismatch");
          }
        });
        return worker;
      },
      getCompressedWorker: function() {
        return new DataWorker(external.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize", this.compressedSize).withStreamInfo("uncompressedSize", this.uncompressedSize).withStreamInfo("crc32", this.crc32).withStreamInfo("compression", this.compression);
      }
    };
    CompressedObject.createWorkerFrom = function(uncompressedWorker, compression, compressionOptions) {
      return uncompressedWorker.pipe(new Crc32Probe()).pipe(new DataLengthProbe("uncompressedSize")).pipe(compression.compressWorker(compressionOptions)).pipe(new DataLengthProbe("compressedSize")).withStreamInfo("compression", compression);
    };
    module2.exports = CompressedObject;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipObject.js
var require_zipObject = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipObject.js"(exports, module2) {
    "use strict";
    var StreamHelper = require_StreamHelper();
    var DataWorker = require_DataWorker();
    var utf8 = require_utf8();
    var CompressedObject = require_compressedObject();
    var GenericWorker = require_GenericWorker();
    var ZipObject = function(name, data, options) {
      this.name = name;
      this.dir = options.dir;
      this.date = options.date;
      this.comment = options.comment;
      this.unixPermissions = options.unixPermissions;
      this.dosPermissions = options.dosPermissions;
      this._data = data;
      this._dataBinary = options.binary;
      this.options = {
        compression: options.compression,
        compressionOptions: options.compressionOptions
      };
    };
    ZipObject.prototype = {
      internalStream: function(type) {
        var result = null, outputType = "string";
        try {
          if (!type) {
            throw new Error("No output type specified.");
          }
          outputType = type.toLowerCase();
          var askUnicodeString = outputType === "string" || outputType === "text";
          if (outputType === "binarystring" || outputType === "text") {
            outputType = "string";
          }
          result = this._decompressWorker();
          var isUnicodeString = !this._dataBinary;
          if (isUnicodeString && !askUnicodeString) {
            result = result.pipe(new utf8.Utf8EncodeWorker());
          }
          if (!isUnicodeString && askUnicodeString) {
            result = result.pipe(new utf8.Utf8DecodeWorker());
          }
        } catch (e) {
          result = new GenericWorker("error");
          result.error(e);
        }
        return new StreamHelper(result, outputType, "");
      },
      async: function(type, onUpdate) {
        return this.internalStream(type).accumulate(onUpdate);
      },
      nodeStream: function(type, onUpdate) {
        return this.internalStream(type || "nodebuffer").toNodejsStream(onUpdate);
      },
      _compressWorker: function(compression, compressionOptions) {
        if (this._data instanceof CompressedObject && this._data.compression.magic === compression.magic) {
          return this._data.getCompressedWorker();
        } else {
          var result = this._decompressWorker();
          if (!this._dataBinary) {
            result = result.pipe(new utf8.Utf8EncodeWorker());
          }
          return CompressedObject.createWorkerFrom(result, compression, compressionOptions);
        }
      },
      _decompressWorker: function() {
        if (this._data instanceof CompressedObject) {
          return this._data.getContentWorker();
        } else if (this._data instanceof GenericWorker) {
          return this._data;
        } else {
          return new DataWorker(this._data);
        }
      }
    };
    var removedMethods = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"];
    var removedFn = function() {
      throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    };
    for (i = 0; i < removedMethods.length; i++) {
      ZipObject.prototype[removedMethods[i]] = removedFn;
    }
    var i;
    module2.exports = ZipObject;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/utils/common.js
var require_common2 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/utils/common.js"(exports) {
    "use strict";
    var TYPED_OK = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
    function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }
    exports.assign = function(obj) {
      var sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        var source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (var p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    exports.shrinkBuf = function(buf, size) {
      if (buf.length === size) {
        return buf;
      }
      if (buf.subarray) {
        return buf.subarray(0, size);
      }
      buf.length = size;
      return buf;
    };
    var fnTyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        if (src.subarray && dest.subarray) {
          dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
          return;
        }
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        var i, l, len, pos, chunk, result;
        len = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          len += chunks[i].length;
        }
        result = new Uint8Array(len);
        pos = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          chunk = chunks[i];
          result.set(chunk, pos);
          pos += chunk.length;
        }
        return result;
      }
    };
    var fnUntyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        return [].concat.apply([], chunks);
      }
    };
    exports.setTyped = function(on) {
      if (on) {
        exports.Buf8 = Uint8Array;
        exports.Buf16 = Uint16Array;
        exports.Buf32 = Int32Array;
        exports.assign(exports, fnTyped);
      } else {
        exports.Buf8 = Array;
        exports.Buf16 = Array;
        exports.Buf32 = Array;
        exports.assign(exports, fnUntyped);
      }
    };
    exports.setTyped(TYPED_OK);
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/trees.js
var require_trees = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/trees.js"(exports) {
    "use strict";
    var utils = require_common2();
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
    var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }
    function put_short(s, w) {
      s.pending_buf[s.pending++] = w & 255;
      s.pending_buf[s.pending++] = w >>> 8 & 255;
    }
    function send_bits(s, value, length) {
      if (s.bi_valid > Buf_size - length) {
        s.bi_buf |= value << s.bi_valid & 65535;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> Buf_size - s.bi_valid;
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= value << s.bi_valid & 65535;
        s.bi_valid += length;
      }
    }
    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2], tree[c * 2 + 1]);
    }
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 255;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }
    function gen_bitlen(s, desc) {
      var tree = desc.dyn_tree;
      var max_code = desc.max_code;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var extra = desc.stat_desc.extra_bits;
      var base = desc.stat_desc.extra_base;
      var max_length = desc.stat_desc.max_length;
      var h;
      var n, m;
      var bits;
      var xbits;
      var f;
      var overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }
      tree[s.heap[s.heap_max] * 2 + 1] = 0;
      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
          continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
          bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] !== bits) {
            s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
            tree[m * 2 + 1] = bits;
          }
          n--;
        }
      }
    }
    function gen_codes(tree, max_code, bl_count) {
      var next_code = new Array(MAX_BITS + 1);
      var code = 0;
      var bits;
      var n;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        next_code[bits] = code = code + bl_count[bits - 1] << 1;
      }
      for (n = 0; n <= max_code; n++) {
        var len = tree[n * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
      }
    }
    function tr_static_init() {
      var n;
      var bits;
      var length;
      var code;
      var dist;
      var bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    }
    function init_block(s) {
      var n;
      for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
      }
      s.dyn_ltree[END_BLOCK * 2] = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }
    function bi_windup(s) {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }
    function copy_block(s, buf, len, header) {
      bi_windup(s);
      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
      utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
    }
    function pqdownheap(s, tree, k) {
      var v = s.heap[k];
      var j = k << 1;
      while (j <= s.heap_len) {
        if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
      }
      s.heap[k] = v;
    }
    function compress_block(s, ltree, dtree) {
      var dist;
      var lc;
      var lx = 0;
      var code;
      var extra;
      if (s.last_lit !== 0) {
        do {
          dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
          lc = s.pending_buf[s.l_buf + lx];
          lx++;
          if (dist === 0) {
            send_code(s, lc, ltree);
          } else {
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (lx < s.last_lit);
      }
      send_code(s, END_BLOCK, ltree);
    }
    function build_tree(s, desc) {
      var tree = desc.dyn_tree;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems = desc.stat_desc.elems;
      var n, m;
      var max_code = -1;
      var node;
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else {
          tree[n * 2 + 1] = 0;
        }
      }
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree) {
          s.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n = s.heap_len >> 1; n >= 1; n--) {
        pqdownheap(s, tree, n);
      }
      node = elems;
      do {
        n = s.heap[1];
        s.heap[1] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1);
        m = s.heap[1];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[1] = node++;
        pqdownheap(s, tree, 1);
      } while (s.heap_len >= 2);
      s.heap[--s.heap_max] = s.heap[1];
      gen_bitlen(s, desc);
      gen_codes(tree, max_code, s.bl_count);
    }
    function scan_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2]++;
          }
          s.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function send_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);
        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);
        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function build_bl_tree(s) {
      var max_blindex;
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
      build_tree(s, s.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    }
    function send_all_trees(s, lcodes, dcodes, blcodes) {
      var rank;
      send_bits(s, lcodes - 257, 5);
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s, s.dyn_ltree, lcodes - 1);
      send_tree(s, s.dyn_dtree, dcodes - 1);
    }
    function detect_data_type(s) {
      var black_mask = 4093624447;
      var n;
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    }
    var static_init_done = false;
    function _tr_init(s) {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
      s.bi_buf = 0;
      s.bi_valid = 0;
      init_block(s);
    }
    function _tr_stored_block(s, buf, stored_len, last) {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      copy_block(s, buf, stored_len, true);
    }
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }
    function _tr_flush_block(s, buf, stored_len, last) {
      var opt_lenb, static_lenb;
      var max_blindex = 0;
      if (s.level > 0) {
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = s.opt_len + 3 + 7 >>> 3;
        static_lenb = s.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s, buf, stored_len, last);
      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      init_block(s);
      if (last) {
        bi_windup(s);
      }
    }
    function _tr_tally(s, dist, lc) {
      s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
      s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
      s.last_lit++;
      if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
      } else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
      }
      return s.last_lit === s.lit_bufsize - 1;
    }
    exports._tr_init = _tr_init;
    exports._tr_stored_block = _tr_stored_block;
    exports._tr_flush_block = _tr_flush_block;
    exports._tr_tally = _tr_tally;
    exports._tr_align = _tr_align;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/adler32.js
var require_adler32 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/adler32.js"(exports, module2) {
    "use strict";
    function adler32(adler, buf, len, pos) {
      var s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
      while (len !== 0) {
        n = len > 2e3 ? 2e3 : len;
        len -= n;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    }
    module2.exports = adler32;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/crc32.js
var require_crc322 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/crc32.js"(exports, module2) {
    "use strict";
    function makeTable() {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    }
    var crcTable = makeTable();
    function crc32(crc, buf, len, pos) {
      var t = crcTable, end = pos + len;
      crc ^= -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    }
    module2.exports = crc32;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/messages.js
var require_messages = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/messages.js"(exports, module2) {
    "use strict";
    module2.exports = {
      2: "need dictionary",
      1: "stream end",
      0: "",
      "-1": "file error",
      "-2": "stream error",
      "-3": "data error",
      "-4": "insufficient memory",
      "-5": "buffer error",
      "-6": "incompatible version"
    };
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/deflate.js
var require_deflate = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/deflate.js"(exports) {
    "use strict";
    var utils = require_common2();
    var trees = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc322();
    var msg = require_messages();
    var Z_NO_FLUSH = 0;
    var Z_PARTIAL_FLUSH = 1;
    var Z_FULL_FLUSH = 3;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_BUF_ERROR = -5;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_FILTERED = 1;
    var Z_HUFFMAN_ONLY = 2;
    var Z_RLE = 3;
    var Z_FIXED = 4;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_UNKNOWN = 2;
    var Z_DEFLATED = 8;
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    function err(strm, errorCode) {
      strm.msg = msg[errorCode];
      return errorCode;
    }
    function rank(f) {
      return (f << 1) - (f > 4 ? 9 : 0);
    }
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    function flush_pending(strm) {
      var s = strm.state;
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }
    function flush_block_only(s, last) {
      trees._tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }
    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }
    function putShortMSB(s, b) {
      s.pending_buf[s.pending++] = b >>> 8 & 255;
      s.pending_buf[s.pending++] = b & 255;
    }
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      utils.arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    }
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length;
      var scan = s.strstart;
      var match;
      var len;
      var best_len = s.prev_length;
      var nice_match = s.nice_match;
      var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
      var _win = s.window;
      var wmask = s.w_mask;
      var prev = s.prev;
      var strend = s.strstart + MAX_MATCH;
      var scan_end1 = _win[scan + best_len - 1];
      var scan_end = _win[scan + best_len];
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;
      do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          s.block_start -= _w_size;
          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + 1]) & s.hash_mask;
          while (s.insert) {
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
    }
    function deflate_stored(s, flush) {
      var max_block_size = 65535;
      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }
      for (; ; ) {
        if (s.lookahead <= 1) {
          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.strstart += s.lookahead;
        s.lookahead = 0;
        var max_start = s.block_start + max_block_size;
        if (s.strstart === 0 || s.strstart >= max_start) {
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
        if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.strstart > s.block_start) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_NEED_MORE;
    }
    function deflate_fast(s, flush) {
      var hash_head;
      var bflush;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
            s.match_length--;
            do {
              s.strstart++;
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + 1]) & s.hash_mask;
          }
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_slow(s, flush) {
      var hash_head;
      var bflush;
      var max_insert;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
          if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
            s.match_length = MIN_MATCH - 1;
          }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s.match_available) {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
          if (bflush) {
            flush_block_only(s, false);
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      if (s.match_available) {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_rle(s, flush) {
      var bflush;
      var prev;
      var scan, strend;
      var _win = s.window;
      for (; ; ) {
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_huff(s, flush) {
      var bflush;
      for (; ; ) {
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s.match_length = 0;
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table;
    configuration_table = [
      new Config(0, 0, 0, 0, deflate_stored),
      new Config(4, 4, 8, 4, deflate_fast),
      new Config(4, 5, 16, 8, deflate_fast),
      new Config(4, 6, 32, 32, deflate_fast),
      new Config(4, 4, 16, 16, deflate_slow),
      new Config(8, 16, 32, 32, deflate_slow),
      new Config(8, 16, 128, 128, deflate_slow),
      new Config(8, 32, 128, 256, deflate_slow),
      new Config(32, 128, 258, 1024, deflate_slow),
      new Config(32, 258, 258, 4096, deflate_slow)
    ];
    function lm_init(s) {
      s.window_size = 2 * s.w_size;
      zero(s.head);
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;
      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new utils.Buf16(HEAP_SIZE * 2);
      this.dyn_dtree = new utils.Buf16((2 * D_CODES + 1) * 2);
      this.bl_tree = new utils.Buf16((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new utils.Buf16(MAX_BITS + 1);
      this.heap = new utils.Buf16(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new utils.Buf16(2 * L_CODES + 1);
      zero(this.depth);
      this.l_buf = 0;
      this.lit_bufsize = 0;
      this.last_lit = 0;
      this.d_buf = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    function deflateResetKeep(strm) {
      var s;
      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;
      if (s.wrap < 0) {
        s.wrap = -s.wrap;
      }
      s.status = s.wrap ? INIT_STATE : BUSY_STATE;
      strm.adler = s.wrap === 2 ? 0 : 1;
      s.last_flush = Z_NO_FLUSH;
      trees._tr_init(s);
      return Z_OK;
    }
    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    }
    function deflateSetHeader(strm, head) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      if (strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    }
    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      var wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
        return err(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      var s = new DeflateState();
      strm.state = s;
      s.strm = strm;
      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;
      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s.window = new utils.Buf8(s.w_size * 2);
      s.head = new utils.Buf16(s.hash_size);
      s.prev = new utils.Buf16(s.w_size);
      s.lit_bufsize = 1 << memLevel + 6;
      s.pending_buf_size = s.lit_bufsize * 4;
      s.pending_buf = new utils.Buf8(s.pending_buf_size);
      s.d_buf = 1 * s.lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;
      s.level = level;
      s.strategy = strategy;
      s.method = method;
      return deflateReset(strm);
    }
    function deflateInit(strm, level) {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    }
    function deflate(strm, flush) {
      var old_flush, s;
      var beg, val;
      if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      s = strm.state;
      if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH) {
        return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      s.strm = strm;
      old_flush = s.last_flush;
      s.last_flush = flush;
      if (s.status === INIT_STATE) {
        if (s.wrap === 2) {
          strm.adler = 0;
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) {
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          } else {
            put_byte(
              s,
              (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
            );
            put_byte(s, s.gzhead.time & 255);
            put_byte(s, s.gzhead.time >> 8 & 255);
            put_byte(s, s.gzhead.time >> 16 & 255);
            put_byte(s, s.gzhead.time >> 24 & 255);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, s.gzhead.os & 255);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 255);
              put_byte(s, s.gzhead.extra.length >> 8 & 255);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        } else {
          var header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
          var level_flags = -1;
          if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= level_flags << 6;
          if (s.strstart !== 0) {
            header |= PRESET_DICT;
          }
          header += 31 - header % 31;
          s.status = BUSY_STATE;
          putShortMSB(s, header);
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 65535);
          }
          strm.adler = 1;
        }
      }
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
          beg = s.pending;
          while (s.gzindex < (s.gzhead.extra.length & 65535)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 255);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        } else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        } else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        } else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 255);
            put_byte(s, strm.adler >> 8 & 255);
            strm.adler = 0;
            s.status = BUSY_STATE;
          }
        } else {
          s.status = BUSY_STATE;
        }
      }
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }
      if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
        var bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            trees._tr_align(s);
          } else if (flush !== Z_BLOCK) {
            trees._tr_stored_block(s, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s.head);
              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        put_byte(s, strm.adler >> 16 & 255);
        put_byte(s, strm.adler >> 24 & 255);
        put_byte(s, strm.total_in & 255);
        put_byte(s, strm.total_in >> 8 & 255);
        put_byte(s, strm.total_in >> 16 & 255);
        put_byte(s, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    }
    function deflateEnd(strm) {
      var status;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      status = strm.state.status;
      if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.state = null;
      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    }
    function deflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var s;
      var str, n;
      var wrap;
      var avail;
      var next;
      var input;
      var tmpDict;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      s = strm.state;
      wrap = s.wrap;
      if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s.wrap = 0;
      if (dictLength >= s.w_size) {
        if (wrap === 0) {
          zero(s.head);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        tmpDict = new utils.Buf8(s.w_size);
        utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      avail = strm.avail_in;
      next = strm.next_in;
      input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH) {
        str = s.strstart;
        n = s.lookahead - (MIN_MATCH - 1);
        do {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    }
    exports.deflateInit = deflateInit;
    exports.deflateInit2 = deflateInit2;
    exports.deflateReset = deflateReset;
    exports.deflateResetKeep = deflateResetKeep;
    exports.deflateSetHeader = deflateSetHeader;
    exports.deflate = deflate;
    exports.deflateEnd = deflateEnd;
    exports.deflateSetDictionary = deflateSetDictionary;
    exports.deflateInfo = "pako deflate (from Nodeca project)";
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/utils/strings.js
var require_strings = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/utils/strings.js"(exports) {
    "use strict";
    var utils = require_common2();
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, [0]);
    } catch (__) {
      STR_APPLY_OK = false;
    }
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new utils.Buf8(256);
    for (q = 0; q < 256; q++) {
      _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
    }
    var q;
    _utf8len[254] = _utf8len[254] = 1;
    exports.string2buf = function(str) {
      var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      buf = new utils.Buf8(buf_len);
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i++] = c;
        } else if (c < 2048) {
          buf[i++] = 192 | c >>> 6;
          buf[i++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i++] = 224 | c >>> 12;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        } else {
          buf[i++] = 240 | c >>> 18;
          buf[i++] = 128 | c >>> 12 & 63;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        }
      }
      return buf;
    };
    function buf2binstring(buf, len) {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK || !buf.subarray && STR_APPLY_OK) {
          return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
        }
      }
      var result = "";
      for (var i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    }
    exports.buf2binstring = function(buf) {
      return buf2binstring(buf, buf.length);
    };
    exports.binstring2buf = function(str) {
      var buf = new utils.Buf8(str.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };
    exports.buf2string = function(buf, max) {
      var i, out, c, c_len;
      var len = max || buf.length;
      var utf16buf = new Array(len * 2);
      for (out = 0, i = 0; i < len; ) {
        c = buf[i++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i < len) {
          c = c << 6 | buf[i++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    exports.utf8border = function(buf, max) {
      var pos;
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/zstream.js
var require_zstream = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/zstream.js"(exports, module2) {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module2.exports = ZStream;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/deflate.js
var require_deflate2 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/deflate.js"(exports) {
    "use strict";
    var zlib_deflate = require_deflate();
    var utils = require_common2();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var Z_NO_FLUSH = 0;
    var Z_FINISH = 4;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_SYNC_FLUSH = 2;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_DEFLATED = 8;
    function Deflate(options) {
      if (!(this instanceof Deflate))
        return new Deflate(options);
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_deflate.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        var dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status, _mode;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_deflate.deflate(strm, _mode);
        if (status !== Z_STREAM_END && status !== Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.avail_out === 0 || strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH)) {
          if (this.options.to === "string") {
            this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(utils.shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);
      if (_mode === Z_FINISH) {
        status = zlib_deflate.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK;
      }
      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      var deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    exports.Deflate = Deflate;
    exports.deflate = deflate;
    exports.deflateRaw = deflateRaw;
    exports.gzip = gzip;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inffast.js
var require_inffast = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inffast.js"(exports, module2) {
    "use strict";
    var BAD = 30;
    var TYPE = 12;
    module2.exports = function inflate_fast(strm, start) {
      var state;
      var _in;
      var last;
      var _out;
      var beg;
      var end;
      var dmax;
      var wsize;
      var whave;
      var wnext;
      var s_window;
      var hold;
      var bits;
      var lcode;
      var dcode;
      var lmask;
      var dmask;
      var here;
      var op;
      var len;
      var dist;
      var from;
      var from_source;
      var input, output;
      state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits -= op;
                }
                if (bits < 15) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                        if (bits < op) {
                          hold += input[_in++] << bits;
                          bits += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits;
      return;
    };
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inftrees.js
var require_inftrees = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inftrees.js"(exports, module2) {
    "use strict";
    var utils = require_common2();
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ];
    var lext = [
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ];
    var dbase = [
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ];
    var dext = [
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ];
    module2.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
      var bits = opts.bits;
      var len = 0;
      var sym = 0;
      var min = 0, max = 0;
      var root = 0;
      var curr = 0;
      var drop = 0;
      var left = 0;
      var used = 0;
      var huff = 0;
      var incr;
      var fill;
      var low;
      var mask;
      var next;
      var base = null;
      var base_index = 0;
      var end;
      var count = new utils.Buf16(MAXBITS + 1);
      var offs = new utils.Buf16(MAXBITS + 1);
      var extra = null;
      var extra_index = 0;
      var here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        end = 19;
      } else if (type === LENS) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;
      } else {
        base = dbase;
        extra = dext;
        end = -1;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inflate.js
var require_inflate = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/inflate.js"(exports) {
    "use strict";
    var utils = require_common2();
    var adler32 = require_adler32();
    var crc32 = require_crc322();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_TREES = 6;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_NEED_DICT = 2;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_MEM_ERROR = -4;
    var Z_BUF_ERROR = -5;
    var Z_DEFLATED = 8;
    var HEAD = 1;
    var FLAGS = 2;
    var TIME = 3;
    var OS = 4;
    var EXLEN = 5;
    var EXTRA = 6;
    var NAME = 7;
    var COMMENT = 8;
    var HCRC = 9;
    var DICTID = 10;
    var DICT = 11;
    var TYPE = 12;
    var TYPEDO = 13;
    var STORED = 14;
    var COPY_ = 15;
    var COPY = 16;
    var TABLE = 17;
    var LENLENS = 18;
    var CODELENS = 19;
    var LEN_ = 20;
    var LEN = 21;
    var LENEXT = 22;
    var DIST = 23;
    var DISTEXT = 24;
    var MATCH = 25;
    var LIT = 26;
    var CHECK = 27;
    var LENGTH = 28;
    var DONE = 29;
    var BAD = 30;
    var MEM = 31;
    var SYNC = 32;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    function zswap32(q) {
      return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
    }
    function InflateState() {
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new utils.Buf16(320);
      this.work = new utils.Buf16(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    function inflateResetKeep(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
      state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    }
    function inflateReset(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    }
    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }
    function inflateInit2(strm, windowBits) {
      var ret;
      var state;
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      state = new InflateState();
      strm.state = state;
      state.window = null;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    }
    function inflateInit(strm) {
      return inflateInit2(strm, DEF_WBITS);
    }
    var virgin = true;
    var lenfix;
    var distfix;
    function fixedtables(state) {
      if (virgin) {
        var sym;
        lenfix = new utils.Buf32(512);
        distfix = new utils.Buf32(32);
        sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new utils.Buf8(state.wsize);
      }
      if (copy >= state.wsize) {
        utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        utils.arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          utils.arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    }
    function inflate(strm, flush) {
      var state;
      var input, output;
      var next;
      var put;
      var have, left;
      var hold;
      var bits;
      var _in, _out;
      var copy;
      var from;
      var from_source;
      var here = 0;
      var here_bits, here_op, here_val;
      var last_bits, last_op, last_val;
      var len;
      var ret;
      var hbuf = new utils.Buf8(4);
      var opts;
      var n;
      var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits = 0;
                state.mode = FLAGS;
                break;
              }
              state.flags = 0;
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              } else if (len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << len;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits = 0;
              break;
            case FLAGS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = TIME;
            case TIME:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = OS;
            case OS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = EXLEN;
            case EXLEN:
              if (state.flags & 1024) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Array(state.head.extra_len);
                    }
                    utils.arraySet(
                      state.head.extra,
                      input,
                      next,
                      copy,
                      len
                    );
                  }
                  if (state.flags & 512) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            case HCRC:
              if (state.flags & 512) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits = 0;
              state.mode = DICT;
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            case TYPEDO:
              if (state.last) {
                hold >>>= bits & 7;
                bits -= bits & 7;
                state.mode = CHECK;
                break;
              }
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits -= 2;
              break;
            case STORED:
              hold >>>= bits & 7;
              bits -= bits & 7;
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case COPY_:
              state.mode = COPY;
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                utils.arraySet(output, input, next, copy, put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = { bits: state.lenbits };
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n = here_bits + 2;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits -= 2;
                  } else if (here_val === 17) {
                    n = here_bits + 3;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits -= 3;
                  } else {
                    n = here_bits + 7;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = { bits: state.lenbits };
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = { bits: state.distbits };
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case LEN_:
              state.mode = LEN;
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            case LENEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            case DISTEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits;
                  bits += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (_out) {
                  strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = LENGTH;
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = DONE;
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    }
    function inflateEnd(strm) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    }
    function inflateGetHeader(strm, head) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    }
    function inflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var state;
      var dictid;
      var ret;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    }
    exports.inflateReset = inflateReset;
    exports.inflateReset2 = inflateReset2;
    exports.inflateResetKeep = inflateResetKeep;
    exports.inflateInit = inflateInit;
    exports.inflateInit2 = inflateInit2;
    exports.inflate = inflate;
    exports.inflateEnd = inflateEnd;
    exports.inflateGetHeader = inflateGetHeader;
    exports.inflateSetDictionary = inflateSetDictionary;
    exports.inflateInfo = "pako inflate (from Nodeca project)";
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/constants.js
var require_constants2 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/constants.js"(exports, module2) {
    "use strict";
    module2.exports = {
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_BUF_ERROR: -5,
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      Z_BINARY: 0,
      Z_TEXT: 1,
      Z_UNKNOWN: 2,
      Z_DEFLATED: 8
    };
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/gzheader.js
var require_gzheader = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/zlib/gzheader.js"(exports, module2) {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module2.exports = GZheader;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/inflate.js
var require_inflate2 = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/lib/inflate.js"(exports) {
    "use strict";
    var zlib_inflate = require_inflate();
    var utils = require_common2();
    var strings = require_strings();
    var c = require_constants2();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    function Inflate(options) {
      if (!(this instanceof Inflate))
        return new Inflate(options);
      this.options = utils.assign({
        chunkSize: 16384,
        windowBits: 0,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_inflate.inflateInit2(
        this.strm,
        opt.windowBits
      );
      if (status !== c.Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== c.Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var dictionary = this.options.dictionary;
      var status, _mode;
      var next_out_utf8, tail, utf8str;
      var allowBufError = false;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.binstring2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);
        if (status === c.Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(this.strm, dictionary);
        }
        if (status === c.Z_BUF_ERROR && allowBufError === true) {
          status = c.Z_OK;
          allowBufError = false;
        }
        if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === c.Z_STREAM_END || strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)) {
            if (this.options.to === "string") {
              next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              tail = strm.next_out - next_out_utf8;
              utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) {
                utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0);
              }
              this.onData(utf8str);
            } else {
              this.onData(utils.shrinkBuf(strm.output, strm.next_out));
            }
          }
        }
        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);
      if (status === c.Z_STREAM_END) {
        _mode = c.Z_FINISH;
      }
      if (_mode === c.Z_FINISH) {
        status = zlib_inflate.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === c.Z_OK;
      }
      if (_mode === c.Z_SYNC_FLUSH) {
        this.onEnd(c.Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === c.Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      var inflator = new Inflate(options);
      inflator.push(input, true);
      if (inflator.err) {
        throw inflator.msg || msg[inflator.err];
      }
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    exports.Inflate = Inflate;
    exports.inflate = inflate;
    exports.inflateRaw = inflateRaw;
    exports.ungzip = inflate;
  }
});

// node_modules/.pnpm/pako@1.0.11/node_modules/pako/index.js
var require_pako = __commonJS({
  "node_modules/.pnpm/pako@1.0.11/node_modules/pako/index.js"(exports, module2) {
    "use strict";
    var assign = require_common2().assign;
    var deflate = require_deflate2();
    var inflate = require_inflate2();
    var constants = require_constants2();
    var pako = {};
    assign(pako, deflate, inflate, constants);
    module2.exports = pako;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/flate.js
var require_flate = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/flate.js"(exports) {
    "use strict";
    var USE_TYPEDARRAY = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Uint32Array !== "undefined";
    var pako = require_pako();
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    var ARRAY_TYPE = USE_TYPEDARRAY ? "uint8array" : "array";
    exports.magic = "\b\0";
    function FlateWorker(action, options) {
      GenericWorker.call(this, "FlateWorker/" + action);
      this._pako = null;
      this._pakoAction = action;
      this._pakoOptions = options;
      this.meta = {};
    }
    utils.inherits(FlateWorker, GenericWorker);
    FlateWorker.prototype.processChunk = function(chunk) {
      this.meta = chunk.meta;
      if (this._pako === null) {
        this._createPako();
      }
      this._pako.push(utils.transformTo(ARRAY_TYPE, chunk.data), false);
    };
    FlateWorker.prototype.flush = function() {
      GenericWorker.prototype.flush.call(this);
      if (this._pako === null) {
        this._createPako();
      }
      this._pako.push([], true);
    };
    FlateWorker.prototype.cleanUp = function() {
      GenericWorker.prototype.cleanUp.call(this);
      this._pako = null;
    };
    FlateWorker.prototype._createPako = function() {
      this._pako = new pako[this._pakoAction]({
        raw: true,
        level: this._pakoOptions.level || -1
      });
      var self2 = this;
      this._pako.onData = function(data) {
        self2.push({
          data,
          meta: self2.meta
        });
      };
    };
    exports.compressWorker = function(compressionOptions) {
      return new FlateWorker("Deflate", compressionOptions);
    };
    exports.uncompressWorker = function() {
      return new FlateWorker("Inflate", {});
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/compressions.js
var require_compressions = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/compressions.js"(exports) {
    "use strict";
    var GenericWorker = require_GenericWorker();
    exports.STORE = {
      magic: "\0\0",
      compressWorker: function() {
        return new GenericWorker("STORE compression");
      },
      uncompressWorker: function() {
        return new GenericWorker("STORE decompression");
      }
    };
    exports.DEFLATE = require_flate();
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/signature.js
var require_signature = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/signature.js"(exports) {
    "use strict";
    exports.LOCAL_FILE_HEADER = "PK";
    exports.CENTRAL_FILE_HEADER = "PK";
    exports.CENTRAL_DIRECTORY_END = "PK";
    exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x07";
    exports.ZIP64_CENTRAL_DIRECTORY_END = "PK";
    exports.DATA_DESCRIPTOR = "PK\x07\b";
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/generate/ZipFileWorker.js
var require_ZipFileWorker = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/generate/ZipFileWorker.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    var utf8 = require_utf8();
    var crc32 = require_crc32();
    var signature = require_signature();
    var decToHex = function(dec, bytes) {
      var hex = "", i;
      for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 255);
        dec = dec >>> 8;
      }
      return hex;
    };
    var generateUnixExternalFileAttr = function(unixPermissions, isDir) {
      var result = unixPermissions;
      if (!unixPermissions) {
        result = isDir ? 16893 : 33204;
      }
      return (result & 65535) << 16;
    };
    var generateDosExternalFileAttr = function(dosPermissions) {
      return (dosPermissions || 0) & 63;
    };
    var generateZipParts = function(streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) {
      var file = streamInfo["file"], compression = streamInfo["compression"], useCustomEncoding = encodeFileName !== utf8.utf8encode, encodedFileName = utils.transformTo("string", encodeFileName(file.name)), utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)), comment = file.comment, encodedComment = utils.transformTo("string", encodeFileName(comment)), utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)), useUTF8ForFileName = utfEncodedFileName.length !== file.name.length, useUTF8ForComment = utfEncodedComment.length !== comment.length, dosTime, dosDate, extraFields = "", unicodePathExtraField = "", unicodeCommentExtraField = "", dir = file.dir, date = file.date;
      var dataInfo = {
        crc32: 0,
        compressedSize: 0,
        uncompressedSize: 0
      };
      if (!streamedContent || streamingEnded) {
        dataInfo.crc32 = streamInfo["crc32"];
        dataInfo.compressedSize = streamInfo["compressedSize"];
        dataInfo.uncompressedSize = streamInfo["uncompressedSize"];
      }
      var bitflag = 0;
      if (streamedContent) {
        bitflag |= 8;
      }
      if (!useCustomEncoding && (useUTF8ForFileName || useUTF8ForComment)) {
        bitflag |= 2048;
      }
      var extFileAttr = 0;
      var versionMadeBy = 0;
      if (dir) {
        extFileAttr |= 16;
      }
      if (platform === "UNIX") {
        versionMadeBy = 798;
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
      } else {
        versionMadeBy = 20;
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
      }
      dosTime = date.getUTCHours();
      dosTime = dosTime << 6;
      dosTime = dosTime | date.getUTCMinutes();
      dosTime = dosTime << 5;
      dosTime = dosTime | date.getUTCSeconds() / 2;
      dosDate = date.getUTCFullYear() - 1980;
      dosDate = dosDate << 4;
      dosDate = dosDate | date.getUTCMonth() + 1;
      dosDate = dosDate << 5;
      dosDate = dosDate | date.getUTCDate();
      if (useUTF8ForFileName) {
        unicodePathExtraField = decToHex(1, 1) + decToHex(crc32(encodedFileName), 4) + utfEncodedFileName;
        extraFields += "up" + decToHex(unicodePathExtraField.length, 2) + unicodePathExtraField;
      }
      if (useUTF8ForComment) {
        unicodeCommentExtraField = decToHex(1, 1) + decToHex(crc32(encodedComment), 4) + utfEncodedComment;
        extraFields += "uc" + decToHex(unicodeCommentExtraField.length, 2) + unicodeCommentExtraField;
      }
      var header = "";
      header += "\n\0";
      header += decToHex(bitflag, 2);
      header += compression.magic;
      header += decToHex(dosTime, 2);
      header += decToHex(dosDate, 2);
      header += decToHex(dataInfo.crc32, 4);
      header += decToHex(dataInfo.compressedSize, 4);
      header += decToHex(dataInfo.uncompressedSize, 4);
      header += decToHex(encodedFileName.length, 2);
      header += decToHex(extraFields.length, 2);
      var fileRecord = signature.LOCAL_FILE_HEADER + header + encodedFileName + extraFields;
      var dirRecord = signature.CENTRAL_FILE_HEADER + decToHex(versionMadeBy, 2) + header + decToHex(encodedComment.length, 2) + "\0\0\0\0" + decToHex(extFileAttr, 4) + decToHex(offset, 4) + encodedFileName + extraFields + encodedComment;
      return {
        fileRecord,
        dirRecord
      };
    };
    var generateCentralDirectoryEnd = function(entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
      var dirEnd = "";
      var encodedComment = utils.transformTo("string", encodeFileName(comment));
      dirEnd = signature.CENTRAL_DIRECTORY_END + "\0\0\0\0" + decToHex(entriesCount, 2) + decToHex(entriesCount, 2) + decToHex(centralDirLength, 4) + decToHex(localDirLength, 4) + decToHex(encodedComment.length, 2) + encodedComment;
      return dirEnd;
    };
    var generateDataDescriptors = function(streamInfo) {
      var descriptor = "";
      descriptor = signature.DATA_DESCRIPTOR + decToHex(streamInfo["crc32"], 4) + decToHex(streamInfo["compressedSize"], 4) + decToHex(streamInfo["uncompressedSize"], 4);
      return descriptor;
    };
    function ZipFileWorker(streamFiles, comment, platform, encodeFileName) {
      GenericWorker.call(this, "ZipFileWorker");
      this.bytesWritten = 0;
      this.zipComment = comment;
      this.zipPlatform = platform;
      this.encodeFileName = encodeFileName;
      this.streamFiles = streamFiles;
      this.accumulate = false;
      this.contentBuffer = [];
      this.dirRecords = [];
      this.currentSourceOffset = 0;
      this.entriesCount = 0;
      this.currentFile = null;
      this._sources = [];
    }
    utils.inherits(ZipFileWorker, GenericWorker);
    ZipFileWorker.prototype.push = function(chunk) {
      var currentFilePercent = chunk.meta.percent || 0;
      var entriesCount = this.entriesCount;
      var remainingFiles = this._sources.length;
      if (this.accumulate) {
        this.contentBuffer.push(chunk);
      } else {
        this.bytesWritten += chunk.data.length;
        GenericWorker.prototype.push.call(this, {
          data: chunk.data,
          meta: {
            currentFile: this.currentFile,
            percent: entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
          }
        });
      }
    };
    ZipFileWorker.prototype.openedSource = function(streamInfo) {
      this.currentSourceOffset = this.bytesWritten;
      this.currentFile = streamInfo["file"].name;
      var streamedContent = this.streamFiles && !streamInfo["file"].dir;
      if (streamedContent) {
        var record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 }
        });
      } else {
        this.accumulate = true;
      }
    };
    ZipFileWorker.prototype.closedSource = function(streamInfo) {
      this.accumulate = false;
      var streamedContent = this.streamFiles && !streamInfo["file"].dir;
      var record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
      this.dirRecords.push(record.dirRecord);
      if (streamedContent) {
        this.push({
          data: generateDataDescriptors(streamInfo),
          meta: { percent: 100 }
        });
      } else {
        this.push({
          data: record.fileRecord,
          meta: { percent: 0 }
        });
        while (this.contentBuffer.length) {
          this.push(this.contentBuffer.shift());
        }
      }
      this.currentFile = null;
    };
    ZipFileWorker.prototype.flush = function() {
      var localDirLength = this.bytesWritten;
      for (var i = 0; i < this.dirRecords.length; i++) {
        this.push({
          data: this.dirRecords[i],
          meta: { percent: 100 }
        });
      }
      var centralDirLength = this.bytesWritten - localDirLength;
      var dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);
      this.push({
        data: dirEnd,
        meta: { percent: 100 }
      });
    };
    ZipFileWorker.prototype.prepareNextSource = function() {
      this.previous = this._sources.shift();
      this.openedSource(this.previous.streamInfo);
      if (this.isPaused) {
        this.previous.pause();
      } else {
        this.previous.resume();
      }
    };
    ZipFileWorker.prototype.registerPrevious = function(previous) {
      this._sources.push(previous);
      var self2 = this;
      previous.on("data", function(chunk) {
        self2.processChunk(chunk);
      });
      previous.on("end", function() {
        self2.closedSource(self2.previous.streamInfo);
        if (self2._sources.length) {
          self2.prepareNextSource();
        } else {
          self2.end();
        }
      });
      previous.on("error", function(e) {
        self2.error(e);
      });
      return this;
    };
    ZipFileWorker.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (!this.previous && this._sources.length) {
        this.prepareNextSource();
        return true;
      }
      if (!this.previous && !this._sources.length && !this.generatedError) {
        this.end();
        return true;
      }
    };
    ZipFileWorker.prototype.error = function(e) {
      var sources = this._sources;
      if (!GenericWorker.prototype.error.call(this, e)) {
        return false;
      }
      for (var i = 0; i < sources.length; i++) {
        try {
          sources[i].error(e);
        } catch (e2) {
        }
      }
      return true;
    };
    ZipFileWorker.prototype.lock = function() {
      GenericWorker.prototype.lock.call(this);
      var sources = this._sources;
      for (var i = 0; i < sources.length; i++) {
        sources[i].lock();
      }
    };
    module2.exports = ZipFileWorker;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/generate/index.js
var require_generate = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/generate/index.js"(exports) {
    "use strict";
    var compressions = require_compressions();
    var ZipFileWorker = require_ZipFileWorker();
    var getCompression = function(fileCompression, zipCompression) {
      var compressionName = fileCompression || zipCompression;
      var compression = compressions[compressionName];
      if (!compression) {
        throw new Error(compressionName + " is not a valid compression method !");
      }
      return compression;
    };
    exports.generateWorker = function(zip, options, comment) {
      var zipFileWorker = new ZipFileWorker(options.streamFiles, comment, options.platform, options.encodeFileName);
      var entriesCount = 0;
      try {
        zip.forEach(function(relativePath, file) {
          entriesCount++;
          var compression = getCompression(file.options.compression, options.compression);
          var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};
          var dir = file.dir, date = file.date;
          file._compressWorker(compression, compressionOptions).withStreamInfo("file", {
            name: relativePath,
            dir,
            date,
            comment: file.comment || "",
            unixPermissions: file.unixPermissions,
            dosPermissions: file.dosPermissions
          }).pipe(zipFileWorker);
        });
        zipFileWorker.entriesCount = entriesCount;
      } catch (e) {
        zipFileWorker.error(e);
      }
      return zipFileWorker;
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejs/NodejsStreamInputAdapter.js
var require_NodejsStreamInputAdapter = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/nodejs/NodejsStreamInputAdapter.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    function NodejsStreamInputAdapter(filename, stream) {
      GenericWorker.call(this, "Nodejs stream input adapter for " + filename);
      this._upstreamEnded = false;
      this._bindStream(stream);
    }
    utils.inherits(NodejsStreamInputAdapter, GenericWorker);
    NodejsStreamInputAdapter.prototype._bindStream = function(stream) {
      var self2 = this;
      this._stream = stream;
      stream.pause();
      stream.on("data", function(chunk) {
        self2.push({
          data: chunk,
          meta: {
            percent: 0
          }
        });
      }).on("error", function(e) {
        if (self2.isPaused) {
          this.generatedError = e;
        } else {
          self2.error(e);
        }
      }).on("end", function() {
        if (self2.isPaused) {
          self2._upstreamEnded = true;
        } else {
          self2.end();
        }
      });
    };
    NodejsStreamInputAdapter.prototype.pause = function() {
      if (!GenericWorker.prototype.pause.call(this)) {
        return false;
      }
      this._stream.pause();
      return true;
    };
    NodejsStreamInputAdapter.prototype.resume = function() {
      if (!GenericWorker.prototype.resume.call(this)) {
        return false;
      }
      if (this._upstreamEnded) {
        this.end();
      } else {
        this._stream.resume();
      }
      return true;
    };
    module2.exports = NodejsStreamInputAdapter;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/object.js
var require_object = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/object.js"(exports, module2) {
    "use strict";
    var utf8 = require_utf8();
    var utils = require_utils2();
    var GenericWorker = require_GenericWorker();
    var StreamHelper = require_StreamHelper();
    var defaults = require_defaults();
    var CompressedObject = require_compressedObject();
    var ZipObject = require_zipObject();
    var generate = require_generate();
    var nodejsUtils = require_nodejsUtils();
    var NodejsStreamInputAdapter = require_NodejsStreamInputAdapter();
    var fileAdd = function(name, data, originalOptions) {
      var dataType = utils.getTypeOf(data), parent;
      var o = utils.extend(originalOptions || {}, defaults);
      o.date = o.date || new Date();
      if (o.compression !== null) {
        o.compression = o.compression.toUpperCase();
      }
      if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
      }
      if (o.unixPermissions && o.unixPermissions & 16384) {
        o.dir = true;
      }
      if (o.dosPermissions && o.dosPermissions & 16) {
        o.dir = true;
      }
      if (o.dir) {
        name = forceTrailingSlash(name);
      }
      if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
      }
      var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
      if (!originalOptions || typeof originalOptions.binary === "undefined") {
        o.binary = !isUnicodeString;
      }
      var isCompressedEmpty = data instanceof CompressedObject && data.uncompressedSize === 0;
      if (isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
      }
      var zipObjectContent = null;
      if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
      } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        zipObjectContent = new NodejsStreamInputAdapter(name, data);
      } else {
        zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
      }
      var object = new ZipObject(name, zipObjectContent, o);
      this.files[name] = object;
    };
    var parentFolder = function(path) {
      if (path.slice(-1) === "/") {
        path = path.substring(0, path.length - 1);
      }
      var lastSlash = path.lastIndexOf("/");
      return lastSlash > 0 ? path.substring(0, lastSlash) : "";
    };
    var forceTrailingSlash = function(path) {
      if (path.slice(-1) !== "/") {
        path += "/";
      }
      return path;
    };
    var folderAdd = function(name, createFolders) {
      createFolders = typeof createFolders !== "undefined" ? createFolders : defaults.createFolders;
      name = forceTrailingSlash(name);
      if (!this.files[name]) {
        fileAdd.call(this, name, null, {
          dir: true,
          createFolders
        });
      }
      return this.files[name];
    };
    function isRegExp(object) {
      return Object.prototype.toString.call(object) === "[object RegExp]";
    }
    var out = {
      load: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
      },
      forEach: function(cb) {
        var filename, relativePath, file;
        for (filename in this.files) {
          file = this.files[filename];
          relativePath = filename.slice(this.root.length, filename.length);
          if (relativePath && filename.slice(0, this.root.length) === this.root) {
            cb(relativePath, file);
          }
        }
      },
      filter: function(search) {
        var result = [];
        this.forEach(function(relativePath, entry) {
          if (search(relativePath, entry)) {
            result.push(entry);
          }
        });
        return result;
      },
      file: function(name, data, o) {
        if (arguments.length === 1) {
          if (isRegExp(name)) {
            var regexp = name;
            return this.filter(function(relativePath, file) {
              return !file.dir && regexp.test(relativePath);
            });
          } else {
            var obj = this.files[this.root + name];
            if (obj && !obj.dir) {
              return obj;
            } else {
              return null;
            }
          }
        } else {
          name = this.root + name;
          fileAdd.call(this, name, data, o);
        }
        return this;
      },
      folder: function(arg) {
        if (!arg) {
          return this;
        }
        if (isRegExp(arg)) {
          return this.filter(function(relativePath, file) {
            return file.dir && arg.test(relativePath);
          });
        }
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
      },
      remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
          if (name.slice(-1) !== "/") {
            name += "/";
          }
          file = this.files[name];
        }
        if (file && !file.dir) {
          delete this.files[name];
        } else {
          var kids = this.filter(function(relativePath, file2) {
            return file2.name.slice(0, name.length) === name;
          });
          for (var i = 0; i < kids.length; i++) {
            delete this.files[kids[i].name];
          }
        }
        return this;
      },
      generate: function() {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
      },
      generateInternalStream: function(options) {
        var worker, opts = {};
        try {
          opts = utils.extend(options || {}, {
            streamFiles: false,
            compression: "STORE",
            compressionOptions: null,
            type: "",
            platform: "DOS",
            comment: null,
            mimeType: "application/zip",
            encodeFileName: utf8.utf8encode
          });
          opts.type = opts.type.toLowerCase();
          opts.compression = opts.compression.toUpperCase();
          if (opts.type === "binarystring") {
            opts.type = "string";
          }
          if (!opts.type) {
            throw new Error("No output type specified.");
          }
          utils.checkSupport(opts.type);
          if (opts.platform === "darwin" || opts.platform === "freebsd" || opts.platform === "linux" || opts.platform === "sunos") {
            opts.platform = "UNIX";
          }
          if (opts.platform === "win32") {
            opts.platform = "DOS";
          }
          var comment = opts.comment || this.comment || "";
          worker = generate.generateWorker(this, opts, comment);
        } catch (e) {
          worker = new GenericWorker("error");
          worker.error(e);
        }
        return new StreamHelper(worker, opts.type || "string", opts.mimeType);
      },
      generateAsync: function(options, onUpdate) {
        return this.generateInternalStream(options).accumulate(onUpdate);
      },
      generateNodeStream: function(options, onUpdate) {
        options = options || {};
        if (!options.type) {
          options.type = "nodebuffer";
        }
        return this.generateInternalStream(options).toNodejsStream(onUpdate);
      }
    };
    module2.exports = out;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/DataReader.js
var require_DataReader = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/DataReader.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    function DataReader(data) {
      this.data = data;
      this.length = data.length;
      this.index = 0;
      this.zero = 0;
    }
    DataReader.prototype = {
      checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
      },
      checkIndex: function(newIndex) {
        if (this.length < this.zero + newIndex || newIndex < 0) {
          throw new Error("End of data reached (data length = " + this.length + ", asked index = " + newIndex + "). Corrupted zip ?");
        }
      },
      setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
      },
      skip: function(n) {
        this.setIndex(this.index + n);
      },
      byteAt: function() {
      },
      readInt: function(size) {
        var result = 0, i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
          result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
      },
      readString: function(size) {
        return utils.transformTo("string", this.readData(size));
      },
      readData: function() {
      },
      lastIndexOfSignature: function() {
      },
      readAndCheckSignature: function() {
      },
      readDate: function() {
        var dostime = this.readInt(4);
        return new Date(Date.UTC(
          (dostime >> 25 & 127) + 1980,
          (dostime >> 21 & 15) - 1,
          dostime >> 16 & 31,
          dostime >> 11 & 31,
          dostime >> 5 & 63,
          (dostime & 31) << 1
        ));
      }
    };
    module2.exports = DataReader;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/ArrayReader.js
var require_ArrayReader = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/ArrayReader.js"(exports, module2) {
    "use strict";
    var DataReader = require_DataReader();
    var utils = require_utils2();
    function ArrayReader(data) {
      DataReader.call(this, data);
      for (var i = 0; i < this.data.length; i++) {
        data[i] = data[i] & 255;
      }
    }
    utils.inherits(ArrayReader, DataReader);
    ArrayReader.prototype.byteAt = function(i) {
      return this.data[this.zero + i];
    };
    ArrayReader.prototype.lastIndexOfSignature = function(sig) {
      var sig0 = sig.charCodeAt(0), sig1 = sig.charCodeAt(1), sig2 = sig.charCodeAt(2), sig3 = sig.charCodeAt(3);
      for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
          return i - this.zero;
        }
      }
      return -1;
    };
    ArrayReader.prototype.readAndCheckSignature = function(sig) {
      var sig0 = sig.charCodeAt(0), sig1 = sig.charCodeAt(1), sig2 = sig.charCodeAt(2), sig3 = sig.charCodeAt(3), data = this.readData(4);
      return sig0 === data[0] && sig1 === data[1] && sig2 === data[2] && sig3 === data[3];
    };
    ArrayReader.prototype.readData = function(size) {
      this.checkOffset(size);
      if (size === 0) {
        return [];
      }
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module2.exports = ArrayReader;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/StringReader.js
var require_StringReader = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/StringReader.js"(exports, module2) {
    "use strict";
    var DataReader = require_DataReader();
    var utils = require_utils2();
    function StringReader(data) {
      DataReader.call(this, data);
    }
    utils.inherits(StringReader, DataReader);
    StringReader.prototype.byteAt = function(i) {
      return this.data.charCodeAt(this.zero + i);
    };
    StringReader.prototype.lastIndexOfSignature = function(sig) {
      return this.data.lastIndexOf(sig) - this.zero;
    };
    StringReader.prototype.readAndCheckSignature = function(sig) {
      var data = this.readData(4);
      return sig === data;
    };
    StringReader.prototype.readData = function(size) {
      this.checkOffset(size);
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module2.exports = StringReader;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/Uint8ArrayReader.js
var require_Uint8ArrayReader = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/Uint8ArrayReader.js"(exports, module2) {
    "use strict";
    var ArrayReader = require_ArrayReader();
    var utils = require_utils2();
    function Uint8ArrayReader(data) {
      ArrayReader.call(this, data);
    }
    utils.inherits(Uint8ArrayReader, ArrayReader);
    Uint8ArrayReader.prototype.readData = function(size) {
      this.checkOffset(size);
      if (size === 0) {
        return new Uint8Array(0);
      }
      var result = this.data.subarray(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module2.exports = Uint8ArrayReader;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/NodeBufferReader.js
var require_NodeBufferReader = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/NodeBufferReader.js"(exports, module2) {
    "use strict";
    var Uint8ArrayReader = require_Uint8ArrayReader();
    var utils = require_utils2();
    function NodeBufferReader(data) {
      Uint8ArrayReader.call(this, data);
    }
    utils.inherits(NodeBufferReader, Uint8ArrayReader);
    NodeBufferReader.prototype.readData = function(size) {
      this.checkOffset(size);
      var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
      this.index += size;
      return result;
    };
    module2.exports = NodeBufferReader;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/readerFor.js
var require_readerFor = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/reader/readerFor.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var support = require_support();
    var ArrayReader = require_ArrayReader();
    var StringReader = require_StringReader();
    var NodeBufferReader = require_NodeBufferReader();
    var Uint8ArrayReader = require_Uint8ArrayReader();
    module2.exports = function(data) {
      var type = utils.getTypeOf(data);
      utils.checkSupport(type);
      if (type === "string" && !support.uint8array) {
        return new StringReader(data);
      }
      if (type === "nodebuffer") {
        return new NodeBufferReader(data);
      }
      if (support.uint8array) {
        return new Uint8ArrayReader(utils.transformTo("uint8array", data));
      }
      return new ArrayReader(utils.transformTo("array", data));
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipEntry.js
var require_zipEntry = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipEntry.js"(exports, module2) {
    "use strict";
    var readerFor = require_readerFor();
    var utils = require_utils2();
    var CompressedObject = require_compressedObject();
    var crc32fn = require_crc32();
    var utf8 = require_utf8();
    var compressions = require_compressions();
    var support = require_support();
    var MADE_BY_DOS = 0;
    var MADE_BY_UNIX = 3;
    var findCompression = function(compressionMethod) {
      for (var method in compressions) {
        if (!Object.prototype.hasOwnProperty.call(compressions, method)) {
          continue;
        }
        if (compressions[method].magic === compressionMethod) {
          return compressions[method];
        }
      }
      return null;
    };
    function ZipEntry(options, loadOptions) {
      this.options = options;
      this.loadOptions = loadOptions;
    }
    ZipEntry.prototype = {
      isEncrypted: function() {
        return (this.bitFlag & 1) === 1;
      },
      useUTF8: function() {
        return (this.bitFlag & 2048) === 2048;
      },
      readLocalPart: function(reader) {
        var compression, localExtraFieldsLength;
        reader.skip(22);
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2);
        this.fileName = reader.readData(this.fileNameLength);
        reader.skip(localExtraFieldsLength);
        if (this.compressedSize === -1 || this.uncompressedSize === -1) {
          throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");
        }
        compression = findCompression(this.compressionMethod);
        if (compression === null) {
          throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + utils.transformTo("string", this.fileName) + ")");
        }
        this.decompressed = new CompressedObject(this.compressedSize, this.uncompressedSize, this.crc32, compression, reader.readData(this.compressedSize));
      },
      readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        reader.skip(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        var fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);
        if (this.isEncrypted()) {
          throw new Error("Encrypted zip are not supported");
        }
        reader.skip(fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readData(this.fileCommentLength);
      },
      processAttributes: function() {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8;
        this.dir = this.externalFileAttributes & 16 ? true : false;
        if (madeBy === MADE_BY_DOS) {
          this.dosPermissions = this.externalFileAttributes & 63;
        }
        if (madeBy === MADE_BY_UNIX) {
          this.unixPermissions = this.externalFileAttributes >> 16 & 65535;
        }
        if (!this.dir && this.fileNameStr.slice(-1) === "/") {
          this.dir = true;
        }
      },
      parseZIP64ExtraField: function() {
        if (!this.extraFields[1]) {
          return;
        }
        var extraReader = readerFor(this.extraFields[1].value);
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
          this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
          this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
          this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
          this.diskNumberStart = extraReader.readInt(4);
        }
      },
      readExtraFields: function(reader) {
        var end = reader.index + this.extraFieldsLength, extraFieldId, extraFieldLength, extraFieldValue;
        if (!this.extraFields) {
          this.extraFields = {};
        }
        while (reader.index + 4 < end) {
          extraFieldId = reader.readInt(2);
          extraFieldLength = reader.readInt(2);
          extraFieldValue = reader.readData(extraFieldLength);
          this.extraFields[extraFieldId] = {
            id: extraFieldId,
            length: extraFieldLength,
            value: extraFieldValue
          };
        }
        reader.setIndex(end);
      },
      handleUTF8: function() {
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        if (this.useUTF8()) {
          this.fileNameStr = utf8.utf8decode(this.fileName);
          this.fileCommentStr = utf8.utf8decode(this.fileComment);
        } else {
          var upath = this.findExtraFieldUnicodePath();
          if (upath !== null) {
            this.fileNameStr = upath;
          } else {
            var fileNameByteArray = utils.transformTo(decodeParamType, this.fileName);
            this.fileNameStr = this.loadOptions.decodeFileName(fileNameByteArray);
          }
          var ucomment = this.findExtraFieldUnicodeComment();
          if (ucomment !== null) {
            this.fileCommentStr = ucomment;
          } else {
            var commentByteArray = utils.transformTo(decodeParamType, this.fileComment);
            this.fileCommentStr = this.loadOptions.decodeFileName(commentByteArray);
          }
        }
      },
      findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[28789];
        if (upathField) {
          var extraReader = readerFor(upathField.value);
          if (extraReader.readInt(1) !== 1) {
            return null;
          }
          if (crc32fn(this.fileName) !== extraReader.readInt(4)) {
            return null;
          }
          return utf8.utf8decode(extraReader.readData(upathField.length - 5));
        }
        return null;
      },
      findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[25461];
        if (ucommentField) {
          var extraReader = readerFor(ucommentField.value);
          if (extraReader.readInt(1) !== 1) {
            return null;
          }
          if (crc32fn(this.fileComment) !== extraReader.readInt(4)) {
            return null;
          }
          return utf8.utf8decode(extraReader.readData(ucommentField.length - 5));
        }
        return null;
      }
    };
    module2.exports = ZipEntry;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipEntries.js
var require_zipEntries = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/zipEntries.js"(exports, module2) {
    "use strict";
    var readerFor = require_readerFor();
    var utils = require_utils2();
    var sig = require_signature();
    var ZipEntry = require_zipEntry();
    var support = require_support();
    function ZipEntries(loadOptions) {
      this.files = [];
      this.loadOptions = loadOptions;
    }
    ZipEntries.prototype = {
      checkSignature: function(expectedSignature) {
        if (!this.reader.readAndCheckSignature(expectedSignature)) {
          this.reader.index -= 4;
          var signature = this.reader.readString(4);
          throw new Error("Corrupted zip or bug: unexpected signature (" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
      },
      isSignature: function(askedIndex, expectedSignature) {
        var currentIndex = this.reader.index;
        this.reader.setIndex(askedIndex);
        var signature = this.reader.readString(4);
        var result = signature === expectedSignature;
        this.reader.setIndex(currentIndex);
        return result;
      },
      readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);
        this.zipCommentLength = this.reader.readInt(2);
        var zipComment = this.reader.readData(this.zipCommentLength);
        var decodeParamType = support.uint8array ? "uint8array" : "array";
        var decodeContent = utils.transformTo(decodeParamType, zipComment);
        this.zipComment = this.loadOptions.decodeFileName(decodeContent);
      },
      readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.reader.skip(4);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);
        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44, index = 0, extraFieldId, extraFieldLength, extraFieldValue;
        while (index < extraDataSize) {
          extraFieldId = this.reader.readInt(2);
          extraFieldLength = this.reader.readInt(4);
          extraFieldValue = this.reader.readData(extraFieldLength);
          this.zip64ExtensibleData[extraFieldId] = {
            id: extraFieldId,
            length: extraFieldLength,
            value: extraFieldValue
          };
        }
      },
      readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
          throw new Error("Multi-volumes zip are not supported");
        }
      },
      readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
          file = this.files[i];
          this.reader.setIndex(file.localHeaderOffset);
          this.checkSignature(sig.LOCAL_FILE_HEADER);
          file.readLocalPart(this.reader);
          file.handleUTF8();
          file.processAttributes();
        }
      },
      readCentralDir: function() {
        var file;
        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readAndCheckSignature(sig.CENTRAL_FILE_HEADER)) {
          file = new ZipEntry({
            zip64: this.zip64
          }, this.loadOptions);
          file.readCentralPart(this.reader);
          this.files.push(file);
        }
        if (this.centralDirRecords !== this.files.length) {
          if (this.centralDirRecords !== 0 && this.files.length === 0) {
            throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
          } else {
          }
        }
      },
      readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset < 0) {
          var isGarbage = !this.isSignature(0, sig.LOCAL_FILE_HEADER);
          if (isGarbage) {
            throw new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
          } else {
            throw new Error("Corrupted zip: can't find end of central directory");
          }
        }
        this.reader.setIndex(offset);
        var endOfCentralDirOffset = offset;
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
          this.zip64 = true;
          offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
          if (offset < 0) {
            throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
          }
          this.reader.setIndex(offset);
          this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
          this.readBlockZip64EndOfCentralLocator();
          if (!this.isSignature(this.relativeOffsetEndOfZip64CentralDir, sig.ZIP64_CENTRAL_DIRECTORY_END)) {
            this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            if (this.relativeOffsetEndOfZip64CentralDir < 0) {
              throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
            }
          }
          this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
          this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
          this.readBlockZip64EndOfCentral();
        }
        var expectedEndOfCentralDirOffset = this.centralDirOffset + this.centralDirSize;
        if (this.zip64) {
          expectedEndOfCentralDirOffset += 20;
          expectedEndOfCentralDirOffset += 12 + this.zip64EndOfCentralSize;
        }
        var extraBytes = endOfCentralDirOffset - expectedEndOfCentralDirOffset;
        if (extraBytes > 0) {
          if (this.isSignature(endOfCentralDirOffset, sig.CENTRAL_FILE_HEADER)) {
          } else {
            this.reader.zero = extraBytes;
          }
        } else if (extraBytes < 0) {
          throw new Error("Corrupted zip: missing " + Math.abs(extraBytes) + " bytes.");
        }
      },
      prepareReader: function(data) {
        this.reader = readerFor(data);
      },
      load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
      }
    };
    module2.exports = ZipEntries;
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/load.js
var require_load = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/load.js"(exports, module2) {
    "use strict";
    var utils = require_utils2();
    var external = require_external();
    var utf8 = require_utf8();
    var ZipEntries = require_zipEntries();
    var Crc32Probe = require_Crc32Probe();
    var nodejsUtils = require_nodejsUtils();
    function checkEntryCRC32(zipEntry) {
      return new external.Promise(function(resolve, reject) {
        var worker = zipEntry.decompressed.getContentWorker().pipe(new Crc32Probe());
        worker.on("error", function(e) {
          reject(e);
        }).on("end", function() {
          if (worker.streamInfo.crc32 !== zipEntry.decompressed.crc32) {
            reject(new Error("Corrupted zip : CRC32 mismatch"));
          } else {
            resolve();
          }
        }).resume();
      });
    }
    module2.exports = function(data, options) {
      var zip = this;
      options = utils.extend(options || {}, {
        base64: false,
        checkCRC32: false,
        optimizedBinaryString: false,
        createFolders: false,
        decodeFileName: utf8.utf8decode
      });
      if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        return external.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file."));
      }
      return utils.prepareContent("the loaded zip file", data, true, options.optimizedBinaryString, options.base64).then(function(data2) {
        var zipEntries = new ZipEntries(options);
        zipEntries.load(data2);
        return zipEntries;
      }).then(function checkCRC32(zipEntries) {
        var promises = [external.Promise.resolve(zipEntries)];
        var files = zipEntries.files;
        if (options.checkCRC32) {
          for (var i = 0; i < files.length; i++) {
            promises.push(checkEntryCRC32(files[i]));
          }
        }
        return external.Promise.all(promises);
      }).then(function addFiles(results) {
        var zipEntries = results.shift();
        var files = zipEntries.files;
        for (var i = 0; i < files.length; i++) {
          var input = files[i];
          var unsafeName = input.fileNameStr;
          var safeName = utils.resolve(input.fileNameStr);
          zip.file(safeName, input.decompressed, {
            binary: true,
            optimizedBinaryString: true,
            date: input.date,
            dir: input.dir,
            comment: input.fileCommentStr.length ? input.fileCommentStr : null,
            unixPermissions: input.unixPermissions,
            dosPermissions: input.dosPermissions,
            createFolders: options.createFolders
          });
          if (!input.dir) {
            zip.file(safeName).unsafeOriginalName = unsafeName;
          }
        }
        if (zipEntries.zipComment.length) {
          zip.comment = zipEntries.zipComment;
        }
        return zip;
      });
    };
  }
});

// node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/.pnpm/jszip@3.10.1/node_modules/jszip/lib/index.js"(exports, module2) {
    "use strict";
    function JSZip() {
      if (!(this instanceof JSZip)) {
        return new JSZip();
      }
      if (arguments.length) {
        throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
      }
      this.files = /* @__PURE__ */ Object.create(null);
      this.comment = null;
      this.root = "";
      this.clone = function() {
        var newObj = new JSZip();
        for (var i in this) {
          if (typeof this[i] !== "function") {
            newObj[i] = this[i];
          }
        }
        return newObj;
      };
    }
    JSZip.prototype = require_object();
    JSZip.prototype.loadAsync = require_load();
    JSZip.support = require_support();
    JSZip.defaults = require_defaults();
    JSZip.version = "3.10.1";
    JSZip.loadAsync = function(content, options) {
      return new JSZip().loadAsync(content, options);
    };
    JSZip.external = require_external();
    module2.exports = JSZip;
  }
});

// node_modules/.pnpm/mkdirp@0.5.6/node_modules/mkdirp/index.js
var require_mkdirp = __commonJS({
  "node_modules/.pnpm/mkdirp@0.5.6/node_modules/mkdirp/index.js"(exports, module2) {
    var path = require("path");
    var fs = require("fs");
    var _0777 = parseInt("0777", 8);
    module2.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;
    function mkdirP(p, opts, f, made) {
      if (typeof opts === "function") {
        f = opts;
        opts = {};
      } else if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      var mode = opts.mode;
      var xfs = opts.fs || fs;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      var cb = f || function() {
      };
      p = path.resolve(p);
      xfs.mkdir(p, mode, function(er) {
        if (!er) {
          made = made || p;
          return cb(null, made);
        }
        switch (er.code) {
          case "ENOENT":
            if (path.dirname(p) === p)
              return cb(er);
            mkdirP(path.dirname(p), opts, function(er2, made2) {
              if (er2)
                cb(er2, made2);
              else
                mkdirP(p, opts, cb, made2);
            });
            break;
          default:
            xfs.stat(p, function(er2, stat) {
              if (er2 || !stat.isDirectory())
                cb(er, made);
              else
                cb(null, made);
            });
            break;
        }
      });
    }
    mkdirP.sync = function sync(p, opts, made) {
      if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      var mode = opts.mode;
      var xfs = opts.fs || fs;
      if (mode === void 0) {
        mode = _0777;
      }
      if (!made)
        made = null;
      p = path.resolve(p);
      try {
        xfs.mkdirSync(p, mode);
        made = made || p;
      } catch (err0) {
        switch (err0.code) {
          case "ENOENT":
            made = sync(path.dirname(p), opts, made);
            sync(p, opts, made);
            break;
          default:
            var stat;
            try {
              stat = xfs.statSync(p);
            } catch (err1) {
              throw err0;
            }
            if (!stat.isDirectory())
              throw err0;
            break;
        }
      }
      return made;
    };
  }
});

// node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/yaku.js
var require_yaku = __commonJS({
  "node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/yaku.js"(exports, module2) {
    (function() {
      "use strict";
      var $undefined, $null = null, root = typeof window === "object" ? window : global, isLongStackTrace = false, process2 = root.process, Arr = Array, Err = Error, $rejected = 0, $resolved = 1, $pending = 2, $Symbol = "Symbol", $iterator = "iterator", $species = "species", $speciesKey = $Symbol + "(" + $species + ")", $return = "return", $unhandled = "_uh", $promiseTrace = "_pt", $settlerTrace = "_st", $invalidThis = "Invalid this", $invalidArgument = "Invalid argument", $fromPrevious = "\nFrom previous ", $promiseCircularChain = "Chaining cycle detected for promise", $unhandledRejectionMsg = "Uncaught (in promise)", $rejectionHandled = "rejectionHandled", $unhandledRejection = "unhandledRejection", $tryCatchFn, $tryCatchThis, $tryErr = { e: $null }, $noop = function() {
      }, $cleanStackReg = /^.+\/node_modules\/yaku\/.+\n?/mg;
      var Yaku = module2.exports = function Promise2(executor) {
        var self2 = this, err;
        if (!isObject(self2) || self2._s !== $undefined)
          throw genTypeError($invalidThis);
        self2._s = $pending;
        if (isLongStackTrace)
          self2[$promiseTrace] = genTraceInfo();
        if (executor !== $noop) {
          if (!isFunction(executor))
            throw genTypeError($invalidArgument);
          err = genTryCatcher(executor)(
            genSettler(self2, $resolved),
            genSettler(self2, $rejected)
          );
          if (err === $tryErr)
            settlePromise(self2, $rejected, err.e);
        }
      };
      Yaku["default"] = Yaku;
      extendPrototype(Yaku, {
        then: function then(onFulfilled, onRejected) {
          if (this._s === void 0)
            throw genTypeError();
          return addHandler(
            this,
            newCapablePromise(Yaku.speciesConstructor(this, Yaku)),
            onFulfilled,
            onRejected
          );
        },
        "catch": function(onRejected) {
          return this.then($undefined, onRejected);
        },
        _pCount: 0,
        _pre: $null,
        _Yaku: 1
      });
      Yaku.resolve = function resolve(val) {
        return isYaku(val) ? val : settleWithX(newCapablePromise(this), val);
      };
      Yaku.reject = function reject(reason) {
        return settlePromise(newCapablePromise(this), $rejected, reason);
      };
      Yaku.race = function race(iterable) {
        var self2 = this, p = newCapablePromise(self2), resolve = function(val) {
          settlePromise(p, $resolved, val);
        }, reject = function(val) {
          settlePromise(p, $rejected, val);
        }, ret = genTryCatcher(each)(iterable, function(v) {
          self2.resolve(v).then(resolve, reject);
        });
        if (ret === $tryErr)
          return self2.reject(ret.e);
        return p;
      };
      Yaku.all = function all(iterable) {
        var self2 = this, p1 = newCapablePromise(self2), res = [], ret;
        function reject(reason) {
          settlePromise(p1, $rejected, reason);
        }
        ret = genTryCatcher(each)(iterable, function(item, i) {
          self2.resolve(item).then(function(value) {
            res[i] = value;
            if (!--ret)
              settlePromise(p1, $resolved, res);
          }, reject);
        });
        if (ret === $tryErr)
          return self2.reject(ret.e);
        if (!ret)
          settlePromise(p1, $resolved, []);
        return p1;
      };
      Yaku.Symbol = root[$Symbol] || {};
      genTryCatcher(function() {
        Object.defineProperty(Yaku, getSpecies(), {
          get: function() {
            return this;
          }
        });
      })();
      Yaku.speciesConstructor = function(O, D) {
        var C = O.constructor;
        return C ? C[getSpecies()] || D : D;
      };
      Yaku.unhandledRejection = function(reason, p) {
        try {
          root.console.error(
            $unhandledRejectionMsg,
            isLongStackTrace ? p.longStack : genStackInfo(reason, p)
          );
        } catch (e) {
        }
      };
      Yaku.rejectionHandled = $noop;
      Yaku.enableLongStackTrace = function() {
        isLongStackTrace = true;
      };
      Yaku.nextTick = process2 ? process2.nextTick : function(fn) {
        setTimeout(fn);
      };
      Yaku._Yaku = 1;
      function getSpecies() {
        return Yaku[$Symbol][$species] || $speciesKey;
      }
      function extendPrototype(src, target) {
        for (var k in target) {
          src.prototype[k] = target[k];
        }
        return src;
      }
      function isObject(obj) {
        return obj && typeof obj === "object";
      }
      function isFunction(obj) {
        return typeof obj === "function";
      }
      function isInstanceOf(a, b) {
        return a instanceof b;
      }
      function isError(obj) {
        return isInstanceOf(obj, Err);
      }
      function ensureType(obj, fn, msg) {
        if (!fn(obj))
          throw genTypeError(msg);
      }
      function tryCatcher() {
        try {
          return $tryCatchFn.apply($tryCatchThis, arguments);
        } catch (e) {
          $tryErr.e = e;
          return $tryErr;
        }
      }
      function genTryCatcher(fn, self2) {
        $tryCatchFn = fn;
        $tryCatchThis = self2;
        return tryCatcher;
      }
      function genScheduler(initQueueSize, fn) {
        var fnQueue = Arr(initQueueSize), fnQueueLen = 0;
        function flush() {
          var i = 0;
          while (i < fnQueueLen) {
            fn(fnQueue[i], fnQueue[i + 1]);
            fnQueue[i++] = $undefined;
            fnQueue[i++] = $undefined;
          }
          fnQueueLen = 0;
          if (fnQueue.length > initQueueSize)
            fnQueue.length = initQueueSize;
        }
        return function(v, arg) {
          fnQueue[fnQueueLen++] = v;
          fnQueue[fnQueueLen++] = arg;
          if (fnQueueLen === 2)
            Yaku.nextTick(flush);
        };
      }
      function each(iterable, fn) {
        var len, i = 0, iter, item, ret;
        if (!iterable)
          throw genTypeError($invalidArgument);
        var gen = iterable[Yaku[$Symbol][$iterator]];
        if (isFunction(gen))
          iter = gen.call(iterable);
        else if (isFunction(iterable.next)) {
          iter = iterable;
        } else if (isInstanceOf(iterable, Arr)) {
          len = iterable.length;
          while (i < len) {
            fn(iterable[i], i++);
          }
          return i;
        } else
          throw genTypeError($invalidArgument);
        while (!(item = iter.next()).done) {
          ret = genTryCatcher(fn)(item.value, i++);
          if (ret === $tryErr) {
            isFunction(iter[$return]) && iter[$return]();
            throw ret.e;
          }
        }
        return i;
      }
      function genTypeError(msg) {
        return new TypeError(msg);
      }
      function genTraceInfo(noTitle) {
        return (noTitle ? "" : $fromPrevious) + new Err().stack;
      }
      var scheduleHandler = genScheduler(999, function(p1, p2) {
        var x, handler;
        handler = p1._s ? p2._onFulfilled : p2._onRejected;
        if (handler === $undefined) {
          settlePromise(p2, p1._s, p1._v);
          return;
        }
        x = genTryCatcher(callHanler)(handler, p1._v);
        if (x === $tryErr) {
          settlePromise(p2, $rejected, x.e);
          return;
        }
        settleWithX(p2, x);
      });
      var scheduleUnhandledRejection = genScheduler(9, function(p) {
        if (!hashOnRejected(p)) {
          p[$unhandled] = 1;
          emitEvent($unhandledRejection, p);
        }
      });
      function emitEvent(name, p) {
        var browserEventName = "on" + name.toLowerCase(), browserHandler = root[browserEventName];
        if (process2 && process2.listeners(name).length)
          name === $unhandledRejection ? process2.emit(name, p._v, p) : process2.emit(name, p);
        else if (browserHandler)
          browserHandler({ reason: p._v, promise: p });
        else
          Yaku[name](p._v, p);
      }
      function isYaku(val) {
        return val && val._Yaku;
      }
      function newCapablePromise(Constructor) {
        if (isYaku(Constructor))
          return new Constructor($noop);
        var p, r, j;
        p = new Constructor(function(resolve, reject) {
          if (p)
            throw genTypeError();
          r = resolve;
          j = reject;
        });
        ensureType(r, isFunction);
        ensureType(j, isFunction);
        return p;
      }
      function genSettler(self2, state) {
        return function(value) {
          if (isLongStackTrace)
            self2[$settlerTrace] = genTraceInfo(true);
          if (state === $resolved)
            settleWithX(self2, value);
          else
            settlePromise(self2, state, value);
        };
      }
      function addHandler(p1, p2, onFulfilled, onRejected) {
        if (isFunction(onFulfilled))
          p2._onFulfilled = onFulfilled;
        if (isFunction(onRejected)) {
          if (p1[$unhandled])
            emitEvent($rejectionHandled, p1);
          p2._onRejected = onRejected;
        }
        if (isLongStackTrace)
          p2._pre = p1;
        p1[p1._pCount++] = p2;
        if (p1._s !== $pending)
          scheduleHandler(p1, p2);
        return p2;
      }
      function hashOnRejected(node) {
        if (node._umark)
          return true;
        else
          node._umark = true;
        var i = 0, len = node._pCount, child;
        while (i < len) {
          child = node[i++];
          if (child._onRejected || hashOnRejected(child))
            return true;
        }
      }
      function genStackInfo(reason, p) {
        var stackInfo = [];
        function push(trace) {
          return stackInfo.push(trace.replace(/^\s+|\s+$/g, ""));
        }
        if (isLongStackTrace) {
          if (p[$settlerTrace])
            push(p[$settlerTrace]);
          (function iter(node) {
            if (node && $promiseTrace in node) {
              iter(node._next);
              push(node[$promiseTrace] + "");
              iter(node._pre);
            }
          })(p);
        }
        return (reason && reason.stack ? reason.stack : reason) + ("\n" + stackInfo.join("\n")).replace($cleanStackReg, "");
      }
      function callHanler(handler, value) {
        return handler(value);
      }
      function settlePromise(p, state, value) {
        var i = 0, len = p._pCount;
        if (p._s === $pending) {
          p._s = state;
          p._v = value;
          if (state === $rejected) {
            if (isLongStackTrace && isError(value)) {
              value.longStack = genStackInfo(value, p);
            }
            scheduleUnhandledRejection(p);
          }
          while (i < len) {
            scheduleHandler(p, p[i++]);
          }
        }
        return p;
      }
      function settleWithX(p, x) {
        if (x === p && x) {
          settlePromise(p, $rejected, genTypeError($promiseCircularChain));
          return p;
        }
        if (x !== $null && (isFunction(x) || isObject(x))) {
          var xthen = genTryCatcher(getThen)(x);
          if (xthen === $tryErr) {
            settlePromise(p, $rejected, xthen.e);
            return p;
          }
          if (isFunction(xthen)) {
            if (isLongStackTrace && isYaku(x))
              p._next = x;
            if (isYaku(x))
              settleXthen(p, x, xthen);
            else
              Yaku.nextTick(function() {
                settleXthen(p, x, xthen);
              });
          } else
            settlePromise(p, $resolved, x);
        } else
          settlePromise(p, $resolved, x);
        return p;
      }
      function getThen(x) {
        return x.then;
      }
      function settleXthen(p, x, xthen) {
        var err = genTryCatcher(xthen, x)(function(y) {
          x && (x = $null, settleWithX(p, y));
        }, function(r) {
          x && (x = $null, settlePromise(p, $rejected, r));
        });
        if (err === $tryErr && x) {
          settlePromise(p, $rejected, err.e);
          x = $null;
        }
      }
    })();
  }
});

// node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/_.js
var require__ = __commonJS({
  "node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/_.js"(exports, module2) {
    var Promise2 = require_yaku();
    module2.exports = {
      extendPrototype: function(src, target) {
        for (var k in target) {
          src.prototype[k] = target[k];
        }
        return src;
      },
      isFunction: function(obj) {
        return typeof obj === "function";
      },
      isNumber: function(obj) {
        return typeof obj === "number";
      },
      Promise: Promise2,
      slice: [].slice
    };
  }
});

// node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/promisify.js
var require_promisify = __commonJS({
  "node_modules/.pnpm/yaku@0.16.7/node_modules/yaku/lib/promisify.js"(exports, module2) {
    var _ = require__();
    var isFn = _.isFunction;
    module2.exports = function(fn, self2) {
      return function(a, b, c, d, e) {
        var len = arguments.length, args, promise, resolve, reject;
        promise = new _.Promise(function(r, rj) {
          resolve = r;
          reject = rj;
        });
        function cb(err, val) {
          err == null ? resolve(val) : reject(err);
        }
        switch (len) {
          case 0:
            fn.call(self2, cb);
            break;
          case 1:
            isFn(a) ? fn.call(self2, a) : fn.call(self2, a, cb);
            break;
          case 2:
            isFn(b) ? fn.call(self2, a, b) : fn.call(self2, a, b, cb);
            break;
          case 3:
            isFn(c) ? fn.call(self2, a, b, c) : fn.call(self2, a, b, c, cb);
            break;
          case 4:
            isFn(d) ? fn.call(self2, a, b, c, d) : fn.call(self2, a, b, c, d, cb);
            break;
          case 5:
            isFn(e) ? fn.call(self2, a, b, c, d, e) : fn.call(self2, a, b, c, d, e, cb);
            break;
          default:
            args = new Array(len);
            for (var i = 0; i < len; i++) {
              args[i] = arguments[i];
            }
            if (isFn(args[len - 1])) {
              return fn.apply(self2, args);
            }
            args[i] = cb;
            fn.apply(self2, args);
        }
        return promise;
      };
    };
  }
});

// node_modules/.pnpm/unzip-crx-3@0.2.0/node_modules/unzip-crx-3/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/unzip-crx-3@0.2.0/node_modules/unzip-crx-3/dist/index.js"(exports, module2) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var jszip = require_lib3();
    var mkdirp = require_mkdirp();
    var promisify2 = require_promisify();
    var writeFile2 = promisify2(fs.writeFile);
    var readFile2 = promisify2(fs.readFile);
    var mkdir = promisify2(mkdirp);
    function crxToZip(buf) {
      function calcLength(a, b, c, d) {
        var length = 0;
        length += a;
        length += b << 8;
        length += c << 16;
        length += d << 24;
        return length;
      }
      if (buf[0] === 80 && buf[1] === 75 && buf[2] === 3 && buf[3] === 4) {
        return buf;
      }
      if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
        throw new Error("Invalid header: Does not start with Cr24");
      }
      var isV3 = buf[4] === 3;
      var isV2 = buf[4] === 2;
      if (!isV2 && !isV3 || buf[5] || buf[6] || buf[7]) {
        throw new Error("Unexpected crx format version number.");
      }
      if (isV2) {
        var publicKeyLength = calcLength(buf[8], buf[9], buf[10], buf[11]);
        var signatureLength = calcLength(buf[12], buf[13], buf[14], buf[15]);
        var _zipStartOffset = 16 + publicKeyLength + signatureLength;
        return buf.slice(_zipStartOffset, buf.length);
      }
      var headerSize = calcLength(buf[8], buf[9], buf[10], buf[11]);
      var zipStartOffset = 12 + headerSize;
      return buf.slice(zipStartOffset, buf.length);
    }
    function unzip(crxFilePath, destination) {
      var filePath = path.resolve(crxFilePath);
      var extname = path.extname(crxFilePath);
      var basename = path.basename(crxFilePath, extname);
      var dirname = path.dirname(crxFilePath);
      destination = destination || path.resolve(dirname, basename);
      return readFile2(filePath).then(function(buf) {
        return jszip.loadAsync(crxToZip(buf));
      }).then(function(zip) {
        var zipFileKeys = Object.keys(zip.files);
        return Promise.all(zipFileKeys.map(function(filename) {
          var isFile = !zip.files[filename].dir;
          var fullPath = path.join(destination, filename);
          var directory = isFile && path.dirname(fullPath) || fullPath;
          var content = zip.files[filename].async("nodebuffer");
          return mkdir(directory).then(function() {
            return isFile ? content : false;
          }).then(function(data) {
            return data ? writeFile2(fullPath, data) : true;
          });
        }));
      });
    }
    module2.exports = unzip;
  }
});

// node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/downloadChromeExtension.js
var require_downloadChromeExtension = __commonJS({
  "node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/downloadChromeExtension.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs = require("fs");
    var path = require("path");
    var rimraf = require_rimraf();
    var utils_1 = require_utils();
    var unzip = require_dist();
    var downloadChromeExtension = (chromeStoreID, forceDownload, attempts = 5) => {
      const extensionsStore = utils_1.getPath();
      if (!fs.existsSync(extensionsStore)) {
        fs.mkdirSync(extensionsStore, { recursive: true });
      }
      const extensionFolder = path.resolve(`${extensionsStore}/${chromeStoreID}`);
      return new Promise((resolve, reject) => {
        if (!fs.existsSync(extensionFolder) || forceDownload) {
          if (fs.existsSync(extensionFolder)) {
            rimraf.sync(extensionFolder);
          }
          const fileURL = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&x=id%3D${chromeStoreID}%26uc&prodversion=32`;
          const filePath = path.resolve(`${extensionFolder}.crx`);
          utils_1.downloadFile(fileURL, filePath).then(() => {
            unzip(filePath, extensionFolder).then(() => {
              utils_1.changePermissions(extensionFolder, 755);
              resolve(extensionFolder);
            }).catch((err) => {
              if (!fs.existsSync(path.resolve(extensionFolder, "manifest.json"))) {
                return reject(err);
              }
            });
          }).catch((err) => {
            console.log(`Failed to fetch extension, trying ${attempts - 1} more times`);
            if (attempts <= 1) {
              return reject(err);
            }
            setTimeout(() => {
              downloadChromeExtension(chromeStoreID, forceDownload, attempts - 1).then(resolve).catch(reject);
            }, 200);
          });
        } else {
          resolve(extensionFolder);
        }
      });
    };
    exports.default = downloadChromeExtension;
  }
});

// node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/.pnpm/electron-devtools-installer@3.2.0/node_modules/electron-devtools-installer/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MOBX_DEVTOOLS = exports.APOLLO_DEVELOPER_TOOLS = exports.CYCLEJS_DEVTOOL = exports.REDUX_DEVTOOLS = exports.VUEJS3_DEVTOOLS = exports.VUEJS_DEVTOOLS = exports.ANGULARJS_BATARANG = exports.JQUERY_DEBUGGER = exports.BACKBONE_DEBUGGER = exports.REACT_DEVELOPER_TOOLS = exports.EMBER_INSPECTOR = void 0;
    var electron_1 = require("electron");
    var fs = require("fs");
    var path = require("path");
    var semver = require_semver2();
    var downloadChromeExtension_1 = require_downloadChromeExtension();
    var utils_1 = require_utils();
    var IDMap = {};
    var getIDMapPath = () => path.resolve(utils_1.getPath(), "IDMap.json");
    if (fs.existsSync(getIDMapPath())) {
      try {
        IDMap = JSON.parse(fs.readFileSync(getIDMapPath(), "utf8"));
      } catch (err) {
        console.error("electron-devtools-installer: Invalid JSON present in the IDMap file");
      }
    }
    var install = (extensionReference, options = {}) => {
      if (typeof options === "boolean") {
        options = { forceDownload: options };
      }
      const { forceDownload, loadExtensionOptions } = options;
      if (process.type !== "browser") {
        return Promise.reject(new Error("electron-devtools-installer can only be used from the main process"));
      }
      if (Array.isArray(extensionReference)) {
        return extensionReference.reduce((accum, extension) => accum.then(() => install(extension, options)), Promise.resolve(""));
      }
      let chromeStoreID;
      if (typeof extensionReference === "object" && extensionReference.id) {
        chromeStoreID = extensionReference.id;
        const electronVersion = process.versions.electron.split("-")[0];
        if (!semver.satisfies(electronVersion, extensionReference.electron)) {
          return Promise.reject(new Error(`Version of Electron: ${electronVersion} does not match required range ${extensionReference.electron} for extension ${chromeStoreID}`));
        }
      } else if (typeof extensionReference === "string") {
        chromeStoreID = extensionReference;
      } else {
        return Promise.reject(new Error(`Invalid extensionReference passed in: "${extensionReference}"`));
      }
      const extensionName = IDMap[chromeStoreID];
      let extensionInstalled;
      if (electron_1.session.defaultSession.getExtension) {
        extensionInstalled = !!extensionName && electron_1.session.defaultSession.getAllExtensions().find((e) => e.name === extensionName);
      } else {
        extensionInstalled = !!extensionName && electron_1.BrowserWindow.getDevToolsExtensions && electron_1.BrowserWindow.getDevToolsExtensions().hasOwnProperty(extensionName);
      }
      if (!forceDownload && extensionInstalled) {
        return Promise.resolve(IDMap[chromeStoreID]);
      }
      return downloadChromeExtension_1.default(chromeStoreID, forceDownload || false).then((extensionFolder) => {
        if (extensionInstalled) {
          if (electron_1.session.defaultSession.removeExtension) {
            const extensionId = electron_1.session.defaultSession.getAllExtensions().find((e) => e.name).id;
            electron_1.session.defaultSession.removeExtension(extensionId);
          } else {
            electron_1.BrowserWindow.removeDevToolsExtension(extensionName);
          }
        }
        if (electron_1.session.defaultSession.loadExtension) {
          return electron_1.session.defaultSession.loadExtension(extensionFolder, loadExtensionOptions).then((ext) => {
            return Promise.resolve(ext.name);
          });
        }
        const name = electron_1.BrowserWindow.addDevToolsExtension(extensionFolder);
        fs.writeFileSync(getIDMapPath(), JSON.stringify(Object.assign(IDMap, {
          [chromeStoreID]: name
        })));
        return Promise.resolve(name);
      });
    };
    exports.default = install;
    exports.EMBER_INSPECTOR = {
      id: "bmdblncegkenkacieihfhpjfppoconhi",
      electron: ">=1.2.1"
    };
    exports.REACT_DEVELOPER_TOOLS = {
      id: "fmkadmapgofadopljbjfkapdkoienihi",
      electron: ">=1.2.1"
    };
    exports.BACKBONE_DEBUGGER = {
      id: "bhljhndlimiafopmmhjlgfpnnchjjbhd",
      electron: ">=1.2.1"
    };
    exports.JQUERY_DEBUGGER = {
      id: "dbhhnnnpaeobfddmlalhnehgclcmjimi",
      electron: ">=1.2.1"
    };
    exports.ANGULARJS_BATARANG = {
      id: "ighdmehidhipcmcojjgiloacoafjmpfk",
      electron: ">=1.2.1"
    };
    exports.VUEJS_DEVTOOLS = {
      id: "nhdogjmejiglipccpnnnanhbledajbpd",
      electron: ">=1.2.1"
    };
    exports.VUEJS3_DEVTOOLS = {
      id: "ljjemllljcmogpfapbkkighbhhppjdbg",
      electron: ">=1.2.1"
    };
    exports.REDUX_DEVTOOLS = {
      id: "lmhkpmbekcpmknklioeibfkpmmfibljd",
      electron: ">=1.2.1"
    };
    exports.CYCLEJS_DEVTOOL = {
      id: "dfgplfmhhmdekalbpejekgfegkonjpfp",
      electron: ">=1.2.1"
    };
    exports.APOLLO_DEVELOPER_TOOLS = {
      id: "jdkknkkbebbapilgoeccciglkfbmbnfm",
      electron: ">=1.2.1"
    };
    exports.MOBX_DEVTOOLS = {
      id: "pfgnfdagidkfgccljigdamigbcnndkod",
      electron: ">=1.2.1"
    };
  }
});

// src/patcher.ts
var import_electron3 = __toESM(require("electron"));
var import_electron_devtools_installer = __toESM(require_dist2());
var import_path3 = require("path");

// src/ipcMain/index.ts
var import_electron2 = require("electron");
var import_fs2 = require("fs");
var import_promises = require("fs/promises");
var import_path2 = require("path");

// src/utils/debounce.ts
function debounce(func, delay = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// src/utils/IpcEvents.ts
function strEnum(obj) {
  const o = {};
  for (const key in obj) {
    o[key] = obj[key];
    o[obj[key]] = key;
  }
  return Object.freeze(o);
}
var IpcEvents_default = strEnum({
  QUICK_CSS_UPDATE: "VencordQuickCssUpdate",
  GET_QUICK_CSS: "VencordGetQuickCss",
  GET_SETTINGS_DIR: "VencordGetSettingsDir",
  GET_SETTINGS: "VencordGetSettings",
  SET_SETTINGS: "VencordSetSettings",
  OPEN_EXTERNAL: "VencordOpenExternal",
  OPEN_QUICKCSS: "VencordOpenQuickCss",
  GET_UPDATES: "VencordGetUpdates",
  GET_REPO: "VencordGetRepo",
  GET_HASHES: "VencordGetHashes",
  UPDATE: "VencordUpdate",
  BUILD: "VencordBuild",
  GET_DESKTOP_CAPTURE_SOURCES: "VencordGetDesktopCaptureSources"
});

// src/ipcMain/updater.ts
var import_electron = require("electron");
var import_util = require("util");
var import_child_process = require("child_process");
var import_path = require("path");
var import_fs = require("fs");
var import_crypto = require("crypto");
var VENCORD_SRC_DIR = (0, import_path.join)(__dirname, "..");
var execFile = (0, import_util.promisify)(import_child_process.execFile);
function git(...args) {
  return execFile("git", args, {
    cwd: VENCORD_SRC_DIR
  });
}
async function calculateHashes() {
  const hashes = {};
  await Promise.all(
    ["patcher.js", "preload.js", "renderer.js"].map((file) => new Promise((r) => {
      const fis = (0, import_fs.createReadStream)((0, import_path.join)(__dirname, file));
      const hash = (0, import_crypto.createHash)("sha1", { encoding: "hex" });
      fis.once("end", () => {
        hash.end();
        hashes[file] = hash.read();
        r();
      });
      fis.pipe(hash);
    }))
  );
  return hashes;
}
function serializeErrors(func) {
  return async function() {
    try {
      return {
        ok: true,
        value: await func(...arguments)
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? {
          ...e
        } : e
      };
    }
  };
}
async function getRepo() {
  const res = await git("remote", "get-url", "origin");
  return res.stdout.trim().replace(/git@(.+):/, "https://$1/").replace(/\.git$/, "");
}
async function calculateGitChanges() {
  await git("fetch");
  const res = await git("log", "HEAD...origin/main", "--pretty=format:%an/%h/%s");
  const commits = res.stdout.trim();
  return commits ? commits.split("\n").map((line) => {
    const [author, hash, ...rest] = line.split("/");
    return {
      hash,
      author,
      message: rest.join("/")
    };
  }) : [];
}
async function pull() {
  const res = await git("pull");
  return res.stdout.includes("Fast-forward");
}
async function build() {
  const res = await execFile("node", ["build.mjs"], {
    cwd: VENCORD_SRC_DIR
  });
  return !res.stderr.includes("Build failed");
}
import_electron.ipcMain.handle(IpcEvents_default.GET_HASHES, serializeErrors(calculateHashes));
import_electron.ipcMain.handle(IpcEvents_default.GET_REPO, serializeErrors(getRepo));
import_electron.ipcMain.handle(IpcEvents_default.GET_UPDATES, serializeErrors(calculateGitChanges));
import_electron.ipcMain.handle(IpcEvents_default.UPDATE, serializeErrors(pull));
import_electron.ipcMain.handle(IpcEvents_default.BUILD, serializeErrors(build));

// src/ipcMain/index.ts
var DATA_DIR = (0, import_path2.join)(import_electron2.app.getPath("userData"), "..", "Vencord");
var SETTINGS_DIR = (0, import_path2.join)(DATA_DIR, "settings");
var QUICKCSS_PATH = (0, import_path2.join)(SETTINGS_DIR, "quickCss.css");
var SETTINGS_FILE = (0, import_path2.join)(SETTINGS_DIR, "settings.json");
var ALLOWED_PROTOCOLS = [
  "https:",
  "http:",
  "steam:",
  "spotify:"
];
(0, import_fs2.mkdirSync)(SETTINGS_DIR, { recursive: true });
function readCss() {
  return (0, import_promises.readFile)(QUICKCSS_PATH, "utf-8").catch(() => "");
}
function readSettings() {
  try {
    return (0, import_fs2.readFileSync)(SETTINGS_FILE, "utf-8");
  } catch {
    return "{}";
  }
}
import_electron2.ipcMain.handle(IpcEvents_default.GET_DESKTOP_CAPTURE_SOURCES, (_, opts) => import_electron2.desktopCapturer.getSources(opts));
import_electron2.ipcMain.handle(IpcEvents_default.OPEN_QUICKCSS, () => import_electron2.shell.openPath(QUICKCSS_PATH));
import_electron2.ipcMain.handle(IpcEvents_default.OPEN_EXTERNAL, (_, url) => {
  try {
    var { protocol } = new URL(url);
  } catch {
    throw "Malformed URL";
  }
  if (!ALLOWED_PROTOCOLS.includes(protocol))
    throw "Disallowed protocol.";
  import_electron2.shell.openExternal(url);
});
import_electron2.ipcMain.handle(IpcEvents_default.GET_QUICK_CSS, () => readCss());
import_electron2.ipcMain.handle(IpcEvents_default.GET_SETTINGS_DIR, () => SETTINGS_DIR);
import_electron2.ipcMain.on(IpcEvents_default.GET_SETTINGS, (e) => e.returnValue = readSettings());
var settingsWriteQueue = Promise.resolve();
import_electron2.ipcMain.handle(IpcEvents_default.SET_SETTINGS, (_, s) => {
  settingsWriteQueue = settingsWriteQueue.then(() => (0, import_promises.writeFile)(SETTINGS_FILE, s));
});
function initIpc(mainWindow) {
  (0, import_promises.open)(QUICKCSS_PATH, "a+").then((fd) => {
    fd.close();
    (0, import_fs2.watch)(QUICKCSS_PATH, debounce(async () => {
      mainWindow.webContents.postMessage(IpcEvents_default.QUICK_CSS_UPDATE, await readCss());
    }, 50));
  });
}

// src/patcher.ts
console.log("[Vencord] Starting up...");
var BrowserWindow2 = class extends import_electron3.default.BrowserWindow {
  constructor(options) {
    if (options?.webPreferences?.preload && options.title) {
      const original = options.webPreferences.preload;
      options.webPreferences.preload = (0, import_path3.join)(__dirname, "preload.js");
      options.webPreferences.sandbox = false;
      process.env.DISCORD_PRELOAD = original;
      super(options);
      initIpc(this);
    } else
      super(options);
  }
};
Object.assign(BrowserWindow2, import_electron3.default.BrowserWindow);
Object.defineProperty(BrowserWindow2, "name", { value: "BrowserWindow", configurable: true });
var electronPath = require.resolve("electron");
delete require.cache[electronPath].exports;
require.cache[electronPath].exports = {
  ...import_electron3.default,
  BrowserWindow: BrowserWindow2
};
Object.defineProperty(global, "appSettings", {
  set: (v) => {
    v.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
    delete global.appSettings;
    global.appSettings = v;
  },
  configurable: true
});
process.env.DATA_DIR = (0, import_path3.join)(import_electron3.app.getPath("userData"), "..", "Vencord");
import_electron3.default.app.whenReady().then(() => {
  (0, import_electron_devtools_installer.default)(import_electron_devtools_installer.REACT_DEVELOPER_TOOLS).then(() => console.info("Installed React DevTools")).catch((err) => console.error("Failed to install React DevTools", err));
  import_electron3.default.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, cb) => {
    if (responseHeaders) {
      delete responseHeaders["content-security-policy-report-only"];
      delete responseHeaders["content-security-policy"];
      if (url.endsWith(".css"))
        responseHeaders["content-type"] = ["text/css"];
    }
    cb({ cancel: false, responseHeaders });
  });
});
//# sourceMappingURL=patcher.js.map
