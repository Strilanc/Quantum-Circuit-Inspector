import CircuitDefinition from "src/circuit/CircuitDefinition.js"
import Complex from "src/math/Complex.js"
import Config from "src/Config.js"
import Format from "src/base/Format.js"
import Gate from "src/circuit/Gate.js"
import MathPainter from "src/draw/MathPainter.js"
import Matrix from "src/math/Matrix.js"
import Painter from "src/draw/Painter.js"
import Point from "src/math/Point.js"
import Rect from "src/math/Rect.js"
import Serializer from "src/circuit/Serializer.js"
import { textEditObservable } from "src/browser/EventUtil.js"
import { Observable, ObservableSource } from "src/base/Obs.js"

/**
 * @param {!Revision} revision
 */
function initForge(revision) {
    const obsShow = new ObservableSource();
    const obsHide = new ObservableSource();
    const txtName = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-name');
    /** @type {!String} */
    let latestInspectorText;
    revision.latestActiveCommit().subscribe(e => { latestInspectorText = e; });

    // Show/hide exports overlay.
    (() => {
        const forgeButton = /** @type {!HTMLButtonElement} */ document.getElementById('gate-forge-button');
        const forgeOverlay = /** @type {!HTMLDivElement} */ document.getElementById('gate-forge-overlay');
        const forgeDiv = /** @type {HTMLDivElement} */ document.getElementById('gate-forge-div');
        forgeButton.addEventListener('click', () => {
            forgeDiv.style.display = 'block';
            txtName.value = '';
            obsShow.send(undefined);
        });
        obsHide.observable().subscribe(() => {
            forgeDiv.style.display = 'none';
        });
        forgeOverlay.addEventListener('click', () => {
            obsHide.send(undefined);
        });
        document.addEventListener('keydown', e => {
            const ESC_KEY = 27;
            if (e.keyCode === ESC_KEY) {
                obsHide.send(undefined);
            }
        });
    })();

    function computeAndPaintOp(canvas, opGetter) {
        let painter = new Painter(canvas);
        painter.clear();
        let d = Math.min((canvas.width - 5)/2, canvas.height);
        let rect1 = new Rect(0, 0, d, d);
        let rect2 = new Rect(d + 5, 0, d, d);
        try {
            let op = opGetter();
            MathPainter.paintMatrix(
                painter,
                op,
                rect1,
                Config.OPERATION_FORE_COLOR,
                'black',
                undefined,
                Config.OPERATION_BACK_COLOR,
                undefined,
                'transparent');
            if (op.width() === 2 && op.isUnitary(0.009)) {
                MathPainter.paintBlochSphereRotation(painter, op, rect2);
            }
        } catch (ex) {
            painter.printParagraph(
                ex+"",
                new Rect(0, 0, canvas.width, canvas.height),
                new Point(0, 0),
                'red',
                24);
        }
    }

    function createCustomGateAndClose(gate) {
        let c = Serializer.fromJson(CircuitDefinition, JSON.parse(latestInspectorText));
        revision.commit(JSON.stringify(Serializer.toJson(c.withCustomGate(gate)), null, 0));
        obsHide.send(undefined);
    }

    (() => {
        const rotationCanvas = /** @type {!HTMLCanvasElement} */ document.getElementById('gate-forge-rotation-canvas');
        const rotationButton = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-rotation-button');
        const txtYaw = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-rotation-yaw');
        const txtPitch = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-rotation-pitch');
        const txtRoll = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-rotation-roll');
        const txtPhase = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-rotation-phase');

        function parseRotation() {
            let f = e => e.value === '' ? 0 : parseFloat(e.value) * Math.PI / 180;
            let yaw = f(txtYaw);
            let roll = f(txtRoll);
            let pitch = f(txtPitch);
            let phase = f(txtPhase);
            let op = Matrix.identity(2).times(Complex.polar(1, phase));
            op = Matrix.PAULI_Y.liftApply(e => e.times(Complex.I).times(-roll/2).exp()).times(op);
            op = Matrix.PAULI_X.liftApply(e => e.times(Complex.I).times(-pitch/2).exp()).times(op);
            op = Matrix.PAULI_Z.liftApply(e => e.times(Complex.I).times(-yaw/2).exp()).times(op);
            return op;
        }

        let redraw = () => computeAndPaintOp(rotationCanvas, parseRotation);
        Observable.of(obsShow.observable(), ...[txtPhase, txtPitch, txtRoll, txtYaw].map(textEditObservable)).
            flatten().
            subscribe(redraw);

        rotationButton.addEventListener('click', () => {
            let gate = Gate.fromKnownMatrix(txtName.value, parseRotation(), 'Custom Rotation Gate', '').
                withSerializedId('~~' + Math.floor(Math.random()*(1 << 20)).toString(32));
            createCustomGateAndClose(gate);
        });
    })();

    (() => {
        const matrixCanvas = /** @type {!HTMLCanvasElement} */ document.getElementById('gate-forge-matrix-canvas');
        const txtMatrix = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-matrix');
        const chkFix = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-matrix-fix');
        const matrixButton = /** @type {!HTMLInputElement} */ document.getElementById('gate-forge-matrix-button');

        function parseMatrix_noCorrection() {
            let s = txtMatrix.value;
            if (s === '') {
                s = txtMatrix.placeholder;
            }

            // If brackets are present, use the normal parse method that enforces grouping.
            if (s.match(/[\{}\[\]]/)) {
                return Matrix.parse(s.split(/[\{\[]/).join('{').split(/[}\]]/).join('}'));
            }

            // Newlines introduce a break if one isn't already present at that location and we aren't at the end.
            s = s.split(/,?\s*\n\s*(?!$)/).join(',');
            s = s.split(/\s/).join('');
            // Ignore trailing comma.
            if (s.endsWith(',')) {
                s = s.substring(0, s.length - 1);
            }

            let parts = s.split(',').map(e => e === '' ? 0 : Complex.parse(e));

            // Pad with zeroes up to next size that makes sense.
            let n = Math.max(4, 1 << (2*Math.max(1, Math.floor(Math.log2(Math.sqrt(parts.length))))));
            if (n < parts.length) {
                n <<= 2;
            }
            if (n > (1<<8)) {
                throw Error("Max custom matrix operation size is 4 qubits.")
            }
            //noinspection JSCheckFunctionSignatures
            return Matrix.square(...parts, ...new Array(n - parts.length).fill(0));
        }

        function parseMatrix() {
            let op = parseMatrix_noCorrection();
            if (chkFix.checked) {
                op = op.closestUnitary(0.0001);
                op = Matrix.parse(op.toString(new Format(true, 0.00000001, undefined, ",")));
            }
            return op;
        }

        let redraw = () => computeAndPaintOp(matrixCanvas, parseMatrix);

        Observable.of(obsShow.observable(), textEditObservable(txtMatrix), Observable.elementEvent(chkFix, 'change')).
            flatten().
            throttleLatest(100).
            subscribe(redraw);

        matrixButton.addEventListener('click', () => {
            let mat = parseMatrix();
            let name = txtName.value.trim();
            let h = Math.round(Math.log2(mat.height()));
            let gate = Gate.fromKnownMatrix(name, mat, 'Custom Matrix Gate', '').
                withSerializedId('~~' + Math.floor(Math.random()*(1 << 20)).toString(32)).
                withHeight(h).
                withWidth(name === '' ? h : 1);
            createCustomGateAndClose(gate);
        });
    })();
}

export { initForge }