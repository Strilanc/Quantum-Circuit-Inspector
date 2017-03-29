import {Config} from "src/Config.js"
import {Gate} from "src/circuit/Gate.js"
import {GatePainting} from "src/draw/GatePainting.js"
import {Matrix} from "src/math/Matrix.js"
import {Point} from "src/math/Point.js"

import {makeOffsetMatrix, incrementShaderFunc} from "src/gates/ArithmeticGates.js"
import {makeCycleBitsMatrix, cycleBits} from "src/gates/CycleBitsGates.js"

let CountingGates = {};

const staircaseCurve = steps => {
    steps = Math.min(128, steps);
    let curve = [];
    for (let i = 0; i < steps; i++) {
        let x = i/steps;
        let y = i/(steps-1);
        if (steps < 128) {
            curve.push(new Point(x, y));
        }
        curve.push(new Point(x + 1 / steps, y));
    }
    return curve;
};

let STAIRCASE_DRAWER = (timeOffset, steps, flip=false) => args => {
    GatePainting.MAKE_HIGHLIGHTED_DRAWER(Config.TIME_DEPENDENT_HIGHLIGHT_COLOR)(args);

    if (args.isInToolbox && !args.isHighlighted) {
        return;
    }

    let t = (args.stats.time + timeOffset) % 1;
    let yOn = args.rect.y + 3;
    let yNeutral = args.rect.bottom();
    let yOff = args.rect.bottom() - 3;
    if (!flip) {
        [yOn, yOff] = [yOff, yOn];
        yNeutral = args.rect.y;
    }
    let xi = args.rect.x;
    let xf = args.rect.right();

    let xt = p => Math.min(Math.max(xi + (xf - xi)*p, xi), xf);
    let yt = p => yOff + (yOn - yOff)*p;
    let curve = [];
    curve.push(new Point(xi, yNeutral));
    curve.push(...staircaseCurve(steps).map(p => new Point(xt(p.x - t), yt(p.y))));
    curve.push(...staircaseCurve(steps).map(p => new Point(xt(p.x + 1 - t), yt(p.y))));
    curve.push(new Point(xf, yNeutral));

    args.painter.ctx.save();
    args.painter.ctx.globalAlpha *= 0.3;
    args.painter.fillPolygon(curve, 'yellow');
    for (let i = 1; i < curve.length - 2; i++) {
        args.painter.strokeLine(curve[i], curve[i+1], 'black');
    }
    if (steps === 2 && t < 0.5) {
        args.painter.fillRect(args.rect, 'white');
        args.painter.fillRect(args.rect, 'white');
        args.painter.fillRect(args.rect, 'white');
    }
    args.painter.ctx.restore();
};

const COUNTING_MATRIX_MAKER = span => t => makeOffsetMatrix(Math.floor(t*(1<<span)), span);
const UNCOUNTING_MATRIX_MAKER = span => t => makeOffsetMatrix(-Math.floor(t*(1<<span)), span);
const LEFT_SHIFTING_MATRIX_MAKER = span => t => makeCycleBitsMatrix(Math.floor(t*span), span);
const RIGHT_SHIFTING_MATRIX_MAKER = span => t => makeCycleBitsMatrix(-Math.floor(t*span), span);

CountingGates.ClockPulseGate = Gate.fromVaryingMatrix(
    "X^⌈t⌉",
    t => (t % 1) < 0.5 ? Matrix.identity(2) : Matrix.PAULI_X,
    "Clock Pulse Gate",
    "Xors a square wave into the target wire.").
    markedAsOnlyPermutingAndPhasing().
    withCustomDrawer(STAIRCASE_DRAWER(0, 2)).
    withStableDuration(0.5);

CountingGates.QuarterPhaseClockPulseGate = Gate.fromVaryingMatrix(
    "X^⌈t-¼⌉",
    t => ((t+0.75) % 1) < 0.5 ? Matrix.identity(2) : Matrix.PAULI_X,
    "Clock Pulse Gate (Quarter Phase)",
    "Xors a quarter-phased square wave into the target wire.").
    markedAsOnlyPermutingAndPhasing().
    withCustomDrawer(STAIRCASE_DRAWER(0.75, 2)).
    withStableDuration(0.25);

CountingGates.CountingFamily = Gate.generateFamily(1, 16, span => Gate.withoutKnownMatrix(
    "+⌈t⌉",
    "Counting Gate",
    "Adds an increasing little-endian count into a block of qubits.").
    markedAsOnlyPermutingAndPhasing().
    withKnownMatrixFunc(span >= 4 ? undefined : COUNTING_MATRIX_MAKER(span)).
    withSerializedId("Counting" + span).
    withCustomDrawer(STAIRCASE_DRAWER(0, 1 << span)).
    withHeight(span).
    withStableDuration(1.0 / (1<<span)).
    withCustomShader(ctx => incrementShaderFunc(ctx, span, Math.floor(ctx.time*(1<<span)))));

CountingGates.UncountingFamily = Gate.generateFamily(1, 16, span => Gate.withoutKnownMatrix(
    "-⌈t⌉",
    "Down Counting Gate",
    "Subtracts an increasing little-endian count from a block of qubits.").
    markedAsOnlyPermutingAndPhasing().
    withKnownMatrixFunc(span >= 4 ? undefined : UNCOUNTING_MATRIX_MAKER(span)).
    withSerializedId("Uncounting" + span).
    withCustomDrawer(STAIRCASE_DRAWER(0, 1 << span, true)).
    withHeight(span).
    withStableDuration(1.0 / (1<<span)).
    withCustomShader(ctx => incrementShaderFunc(ctx, span, -Math.floor(ctx.time*(1<<span)))));

CountingGates.RightShiftRotatingFamily = Gate.generateFamily(2, 16, span => Gate.withoutKnownMatrix(
    "↟⌈t⌉",
    "Right-Shift Cycling Gate",
    "Right-rotates a block of bits by more and more.").
    markedAsOnlyPermutingAndPhasing().
    withKnownMatrixFunc(span >= 4 ? undefined : RIGHT_SHIFTING_MATRIX_MAKER(span)).
    withSerializedId(">>t" + span).
    withCustomDrawer(STAIRCASE_DRAWER(0, span, true)).
    withHeight(span).
    withStableDuration(1.0 / span).
    withCustomShader(ctx => cycleBits(ctx, span, -Math.floor(ctx.time*span))));

CountingGates.LeftShiftRotatingFamily = Gate.generateFamily(2, 16, span => Gate.withoutKnownMatrix(
    "↡⌈t⌉",
    "Left-Shift Cycling Gate",
    "Left-rotates a block of bits by more and more.").
    markedAsOnlyPermutingAndPhasing().
    withKnownMatrixFunc(span >= 4 ? undefined : LEFT_SHIFTING_MATRIX_MAKER(span)).
    withSerializedId("<<t" + span).
    withCustomDrawer(STAIRCASE_DRAWER(0, span)).
    withHeight(span).
    withStableDuration(1.0 / span).
    withCustomShader(ctx => cycleBits(ctx, span, Math.floor(ctx.time*span))));

CountingGates.all = [
    CountingGates.ClockPulseGate,
    CountingGates.QuarterPhaseClockPulseGate,
    ...CountingGates.CountingFamily.all,
    ...CountingGates.UncountingFamily.all,
    ...CountingGates.RightShiftRotatingFamily.all,
    ...CountingGates.LeftShiftRotatingFamily.all
];

export {CountingGates}
