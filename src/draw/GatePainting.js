import {Config} from "src/Config.js"
import {GateDrawParams} from "src/draw/GateDrawParams.js"
import {MathPainter} from "src/draw/MathPainter.js"
import {Point} from "src/math/Point.js"
import {Rect} from "src/math/Rect.js"
import {Util} from "src/base/Util.js"

/**
 * A described and possibly time-varying quantum operation.
 */
class GatePainting {}

GatePainting.paintOutline = args => {
    if (args.isInToolbox) {
        let r = args.rect.shiftedBy(0.5, 0.5);
        args.painter.strokeLine(r.topRight(), r.bottomRight());
        args.painter.strokeLine(r.bottomLeft(), r.bottomRight());
    }
    args.painter.strokeRect(args.rect, 'black');
};

GatePainting.paintBackground =
    (args, toolboxFillColor = Config.GATE_FILL_COLOR, normalFillColor = Config.GATE_FILL_COLOR) => {
        let backColor = args.isInToolbox ? toolboxFillColor : normalFillColor;
        if (args.isHighlighted) {
            backColor = Config.HIGHLIGHTED_GATE_FILL_COLOR;
        }
        args.painter.fillRect(args.rect, backColor);
    };

/**
 * @param {!GateDrawParams} args
 */
GatePainting.LABEL_DRAWER = args => {
    if (args.positionInCircuit === undefined || args.isHighlighted) {
        GatePainting.DEFAULT_DRAWER(args);
        return;
    }

    let cut = Math.max(0, args.rect.h - Config.GATE_RADIUS*2)/2;
    args.painter.fillRect(args.rect.skipTop(cut).skipBottom(cut), Config.GATE_FILL_COLOR);

    GatePainting.paintGateSymbol(args);
};

/**
 * @param {!string=} toolboxFillColor
 * @param {!string=} normalFillColor
 * @constructor
 */
GatePainting.MAKE_HIGHLIGHTED_DRAWER =
    (toolboxFillColor = Config.GATE_FILL_COLOR, normalFillColor = Config.GATE_FILL_COLOR) => args => {
        GatePainting.paintBackground(args, toolboxFillColor, normalFillColor);
        GatePainting.paintOutline(args);
        GatePainting.paintResizeTab(args);
        GatePainting.paintGateSymbol(args);
    };

/**
 * @param {!GateDrawParams} args
 */
GatePainting.DEFAULT_DRAWER = GatePainting.MAKE_HIGHLIGHTED_DRAWER();

/**
 * @param {!Rect} gateRect
 * @returns {!Rect}
 */
GatePainting.rectForResizeTab = gateRect => {
    let overlap = Math.min(Config.GATE_RADIUS, gateRect.h/4);
    return new Rect(gateRect.x, gateRect.bottom() - overlap, gateRect.w, Config.GATE_RADIUS * 2);
};

/**
 * @param {!GateDrawParams} args
 */
GatePainting.paintResizeTab = args => {
    if (!args.isResizeShowing || !args.gate.canChangeInSize()) {
        return;
    }

    let d = Config.GATE_RADIUS;
    let rect = GatePainting.rectForResizeTab(args.rect);
    let trimRect = rect.skipLeft(2).skipRight(2);
    let {x: cx, y: cy} = trimRect.center();
    let backColor = args.isResizeHighlighted ? Config.HIGHLIGHTED_GATE_FILL_COLOR : Config.GATE_FILL_COLOR;
    let foreColor = args.isResizeHighlighted ? '#222' : 'gray';
    args.painter.ctx.save();
    args.painter.ctx.globalAlpha *= args.isResizeHighlighted ? 1 : 0.7;
    args.painter.fillRect(trimRect, backColor);
    args.painter.strokeRect(trimRect, 'gray');
    args.painter.ctx.restore();
    args.painter.print('resize', cx, cy, 'center', 'middle', foreColor, 'monospace', trimRect.w - 4, trimRect.h - 4);
    args.painter.trace(tracer => {
        let arrowDirs = [
            args.gate.canIncreaseInSize() ? +1 : -1,
            args.gate.canDecreaseInSize() ? -1 : +1
        ];
        let arrowOffsets = [+1, -1];
        for (let sx of [-1, +1]) {
            for (let k = 0; k < 2; k++) {
                let by = cy + d*arrowOffsets[k]*5/8;
                let y1 = by + d*arrowDirs[k]/8;
                let y2 = by - d*arrowDirs[k]/8;
                tracer.line(cx, y1, cx + d*sx*0.3, y2);
            }
        }
    }).thenStroke(foreColor);
};

/**
 * @param {!GateDrawParams} args
 */
GatePainting.paintGateSymbol = args => {
    let painter = args.painter;
    let symbol = args.gate.symbol;
    let rect = args.rect;
    const font = '16px sans-serif';
    rect = rect.paddedBy(-2);

    let parts = symbol.split("^");
    if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
        painter.print(
            symbol,
            rect.x + rect.w/2,
            rect.y + rect.h/2,
            'center',
            'middle',
            'black',
            font,
            rect.w,
            rect.h);
        return;
    }

    let [baseText, expText] = parts;
    painter.ctx.font = font;
    let baseWidth = painter.ctx.measureText(baseText).width;
    let expWidth = painter.ctx.measureText(expText).width;
    let scaleDown = Math.min(rect.w, baseWidth + expWidth) / (baseWidth + expWidth);
    let divider = rect.w/2 + (baseWidth - expWidth)*scaleDown/2;
    painter.print(
        baseText,
        rect.x + divider,
        rect.y + rect.h/2,
        'right',
        'hanging',
        'black',
        font,
        divider,
        rect.h);
    painter.print(
        expText,
        rect.x + divider,
        rect.y + rect.h/2,
        'left',
        'alphabetic',
        'black',
        font,
        rect.w - divider,
        rect.h);
};

GatePainting.SECTIONED_DRAWER_MAKER = (labels, dividers) => args => {
    if (args.isInToolbox) {
        GatePainting.DEFAULT_DRAWER(args);
        return;
    }

    let backColor = args.isHighlighted ? Config.HIGHLIGHTED_GATE_FILL_COLOR : Config.GATE_FILL_COLOR;
    const font = '16px sans-serif';
    args.painter.fillRect(args.rect, backColor);
    let p = 0;
    for (let i = 0; i < labels.length; i++) {
        let p2;
        if (i < labels.length - 1) {
            p2 = p + dividers[i];
            let cy = args.rect.y + args.rect.h*p2;
            args.painter.strokeLine(new Point(args.rect.x, cy), new Point(args.rect.right(), cy), '#BBB');
        } else {
            p2 = 1;
        }
        args.painter.print(
            labels[i],
            args.rect.x + args.rect.w/2,
            args.rect.y + args.rect.h*(p + p2)/2,
            'center',
            'middle',
            'black',
            font,
            args.rect.w-2,
            args.rect.h*(p2-p));
        p = p2;
    }
    args.painter.strokeRect(args.rect);
    GatePainting.paintResizeTab(args);
};

const DISPLAY_GATE_DEFAULT_DRAWER = GatePainting.MAKE_HIGHLIGHTED_DRAWER(Config.DISPLAY_GATE_IN_TOOLBOX_FILL_COLOR);

GatePainting.makeDisplayDrawer = statePainter => args => {
    if (args.positionInCircuit === undefined) {
        DISPLAY_GATE_DEFAULT_DRAWER(args);
        return;
    }

    GatePainting.paintResizeTab(args);

    statePainter(args);

    if (args.isHighlighted) {
        args.painter.strokeRect(args.rect, 'black', 1.5);
    }

    args.painter.ctx.save();
    args.painter.ctx.globalAlpha *= 0.25;
    GatePainting.paintResizeTab(args);
    args.painter.ctx.restore();
};

/**
 * @param {!GateDrawParams} args
 */
GatePainting.MATRIX_DRAWER = args => {
    let m = args.gate.knownMatrixAt(args.stats.time);
    if (m === undefined) {
        GatePainting.DEFAULT_DRAWER(args);
        return;
    }

    args.painter.fillRect(args.rect, args.isHighlighted ? Config.HIGHLIGHTED_GATE_FILL_COLOR : Config.GATE_FILL_COLOR);
    MathPainter.paintMatrix(
        args.painter,
        m,
        args.rect,
        Config.OPERATION_FORE_COLOR,
        'black',
        undefined,
        Config.OPERATION_BACK_COLOR,
        undefined,
        'transparent');
    if (args.isHighlighted) {
        args.painter.ctx.save();
        args.painter.ctx.globalAlpha *= 0.9;
        args.painter.fillRect(args.rect, Config.HIGHLIGHTED_GATE_FILL_COLOR);
        args.painter.ctx.restore();
    }
    GatePainting.paintOutline(args);
};

/**
 * @param {!number=} xScale
 * @param {!number=} yScale
 * @param {!number=} tScale
 * @returns {!function(!GateDrawParams) : *}
 */
GatePainting.makeCycleDrawer = (xScale=1, yScale=1, tScale=1) => args => {
    GatePainting.MAKE_HIGHLIGHTED_DRAWER(Config.TIME_DEPENDENT_HIGHLIGHT_COLOR)(args);

    if (args.isInToolbox && !args.isHighlighted) {
        return;
    }
    let τ = 2 * Math.PI;
    let t = Util.properMod(-args.stats.time * τ * tScale, τ);
    let c = args.rect.center();
    let r = 0.4 * args.rect.w;

    args.painter.ctx.save();

    args.painter.ctx.translate(c.x, c.y);
    args.painter.ctx.scale(xScale, yScale);
    args.painter.ctx.strokeStyle = 'black';
    args.painter.ctx.fillStyle = 'yellow';
    args.painter.ctx.globalAlpha *= 0.4;

    args.painter.ctx.beginPath();
    args.painter.ctx.moveTo(0, 0);
    args.painter.ctx.lineTo(0, r);
    args.painter.ctx.arc(0, 0, r, τ/4, τ/4 + t, true);
    args.painter.ctx.lineTo(0, 0);
    args.painter.ctx.closePath();
    args.painter.ctx.stroke();
    args.painter.ctx.fill();

    args.painter.ctx.restore();
};

/**
 * @param {!GateDrawParams} args
 */
GatePainting.MATRIX_SYMBOL_DRAWER_EXCEPT_IN_TOOLBOX = args => {
    if (args.isInToolbox) {
        GatePainting.DEFAULT_DRAWER(args);
        return;
    }
    GatePainting.MATRIX_DRAWER(args);
};

/**
 * @param {!GateDrawParams} args
 * @param {!int} offset
 * @returns {!number}
 */
function _wireY(args, offset) {
    return args.rect.center().y + (offset - args.gate.height/2 + 0.5) * Config.WIRE_SPACING;
}

/**
 * @param {!GateDrawParams} args
 */
function _eraseWiresForPermutation(args) {
    for (let i = 0; i < args.gate.height; i++) {
        let y = _wireY(args, i);
        let p = new Point(args.rect.x, y);
        let c = new Point(args.rect.x + Config.GATE_RADIUS, y);
        let q = new Point(args.rect.right(), y);
        let pt = new Point(args.positionInCircuit.col, args.positionInCircuit.row + i);
        let isMeasured1 = args.stats.circuitDefinition.locIsMeasured(pt);
        let isMeasured2 = args.stats.circuitDefinition.locIsMeasured(pt.offsetBy(1, 0));

        for (let dy of isMeasured1 ? [-1, +1] : [0]) {
            args.painter.strokeLine(p.offsetBy(0, dy), c.offsetBy(0, dy), 'white');
        }
        for (let dy of isMeasured2 ? [-1, +1] : [0]) {
            args.painter.strokeLine(c.offsetBy(0, dy), q.offsetBy(0, dy), 'white');
        }
    }
}

/**
 * @param {!GateDrawParams} args
 * @returns {!boolean}
 */
function _useFallbackDrawerInsteadOfPermutation(args) {
    return args.isHighlighted ||
        args.isResizeHighlighted ||
        args.positionInCircuit === undefined ||
        args.stats.circuitDefinition.colHasControls(args.positionInCircuit.col);
}

/**
 * Draws the gate as a re-arrangement of wires.
 * @param {!GateDrawParams} args
 */
GatePainting.PERMUTATION_DRAWER = args => {
    if (_useFallbackDrawerInsteadOfPermutation(args)) {
        GatePainting.DEFAULT_DRAWER(args);
        return;
    }

    _eraseWiresForPermutation(args);

    // Draw wires.
    for (let i = 0; i < args.gate.height; i++) {
        let j = args.gate.knownBitPermutationFunc(i);

        let pt = new Point(args.positionInCircuit.col, args.positionInCircuit.row + i);
        let isMeasured = args.stats.circuitDefinition.locIsMeasured(pt);
        let y1 = _wireY(args, i);
        let y2 = _wireY(args, j);
        let x1 = args.rect.x;
        let x2 = args.rect.right();
        args.painter.ctx.beginPath();
        args.painter.ctx.strokeStyle = 'black';
        for (let [dx, dy] of isMeasured ? [[j > i ? +1 : -1, -1], [0, +1]] : [[0, 0]]) {
            args.painter.ctx.moveTo(Math.min(x1, x1 + dx), y1 + dy);
            args.painter.ctx.lineTo(x1 + dx, y1 + dy);
            args.painter.ctx.lineTo(x2 + dx, y2 + dy);
            args.painter.ctx.lineTo(Math.max(x2, x2 + dx), y2 + dy);
        }
        args.painter.ctx.stroke();
    }
};

export {GatePainting}
