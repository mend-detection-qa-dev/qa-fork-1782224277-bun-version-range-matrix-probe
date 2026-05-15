// bun-version-range-matrix-probe — minimal stub
// Exercises all seven semver version-constraint operators (C1–C7) in one package.json.
// The real assertions live in expected-tree.json; this file only makes the project valid.

import _ from "lodash";
import isOdd from "is-odd";
import leftPad from "left-pad";
import isEven from "is-even";
import { pad } from "tslib";
import ms from "ms";
import { z } from "zod";

// Trivial usage so tree-shakers cannot drop the imports.
const _version = _.VERSION;          // C1 caret ^4.17.0  → lodash@4.18.1
const _odd = isOdd(3);               // C2 tilde ~3.0.0   → is-odd@3.0.1
const _pad = leftPad("x", 4);       // C3 exact 1.3.0    → left-pad@1.3.0
const _even = isEven(4);             // C4 wildcard *     → is-even@1.0.0
const _ms = ms("2 days");            // C6 OR ^2.0.0||^3  → ms@2.1.3
const _schema = z.string();          // C7 pre-release ^4.0.0-beta.1 → zod@4.0.0-beta.1

export { _version, _odd, _pad, _even, _ms, _schema };