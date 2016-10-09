import {Suite, assertThat, assertThrows, assertTrue, assertFalse} from "test/TestUtil.js"
import {Gates} from "src/gates/AllGates.js"

import {CircuitEvalArgs} from "src/circuit/CircuitEvalArgs.js"
import {CircuitShaders} from "src/circuit/CircuitShaders.js"
import {KetTextureUtil} from "src/circuit/KetTextureUtil.js"
import {Controls} from "src/circuit/Controls.js"
import {Matrix} from "src/math/Matrix.js"
import {seq, Seq} from "src/base/Seq.js"
import {workingShaderCoder} from "src/webgl/ShaderCoders.js"

let suite = new Suite("AllGates");

/**
 * @param {!Gate} gate
 * @param {!number} time
 * @returns {undefined|!Matrix}
 */
let reconstructMatrixFromGateShaders = (gate, time) => {
    if (gate.customShaders === undefined) {
        return undefined;
    }

    let bit = 0;
    let numQubits = gate.height;
    let n = 1 << numQubits;
    let input = KetTextureUtil.allocVec2Tex(numQubits);
    let control = KetTextureUtil.control(numQubits, Controls.NONE);
    let cols = [];
    for (let i = 0; i < n; i++) {
        CircuitShaders.classicalState(i).renderTo(input);
        let output = KetTextureUtil.aggregateReusingIntermediates(
            input,
            gate.customShaders.map(f => (inTex, conTex, t) => f(inTex, conTex, bit, t)),
            (accTex, shaderFunc) => KetTextureUtil.applyCustomShader(shaderFunc, new CircuitEvalArgs(
                time,
                bit,
                numQubits,
                Controls.NONE,
                control,
                accTex,
                new Map())));
        let buf = workingShaderCoder.unpackVec2Data(output.readPixels());
        let col = new Matrix(1, 1 << numQubits, buf);
        KetTextureUtil.doneWithTexture(output);
        cols.push(col);
    }
    let raw = seq(cols).flatMap(e => e.rawBuffer()).toFloat32Array();
    let flipped = new Matrix(n, n, raw);
    return flipped.transpose();
};

suite.webGlTest("shaderMatchesMatrix", () => {
    let time = 6/7;
    for (let gate of Gates.KnownToSerializer) {
        if (gate.height > 4) {
            continue;
        }

        let matrix = gate.knownMatrixAt(time);
        if (matrix === undefined) {
            continue;
        }

        let reconstructed = reconstructMatrixFromGateShaders(gate, time);
        if (reconstructed === undefined) {
            continue;
        }

        assertThat(reconstructed).withInfo({gate, time}).isApproximatelyEqualTo(matrix, 0.0001);
    }
});
