import {assertThat} from "test/TestUtil.js"
import {CircuitEvalArgs} from "src/circuit/CircuitEvalArgs.js"
import {CircuitShaders} from "src/circuit/CircuitShaders.js"
import {Complex} from "src/math/Complex.js"
import {Controls} from "src/circuit/Controls.js"
import {Shaders} from "src/webgl/Shaders.js"
import {Matrix} from "src/math/Matrix.js"
import {WglTexture} from "src/webgl/WglTexture.js"
import {KetTextureUtil} from "src/circuit/KetTextureUtil.js"
import {workingShaderCoder} from "src/webgl/ShaderCoders.js"

// Turn this on to make it easier to debug why a randomized test is failing.
const USE_SIMPLE_VALUES = false;
if (USE_SIMPLE_VALUES) {
    console.warn("Using simplified random values for circuit operation testing.")
}

/**
 * @param {function(!CircuitEvalArgs) : !WglConfiguredShader} shaderFunc
 * @param {!Matrix} matrix
 * @param {!int=} repeats
 */
function assertThatRandomTestOfCircuitOperationShaderActsLikeMatrix(shaderFunc, matrix, repeats=5) {
    assertThatRandomTestOfCircuitOperationActsLikeMatrix(args => {
        let r = new WglTexture(args.stateTexture.width, args.stateTexture.height, args.stateTexture.pixelType);
        shaderFunc(args).renderTo(r);
        return r;
    }, matrix, repeats);
}

/**
 * @param {function(!CircuitEvalArgs) : !WglTexture} operation
 * @param {!Matrix} matrix
 * @param {!int=} repeats
 */
function assertThatRandomTestOfCircuitOperationActsLikeMatrix(operation, matrix, repeats=5) {
    for (let i = 0; i < repeats; i++) {
        assertThatRandomTestOfCircuitOperationActsLikeMatrix_single(operation, matrix);
    }
}

/**
 * @param {function(!CircuitEvalArgs) : !WglTexture} operation
 * @param {!Matrix} matrix
 */
function assertThatRandomTestOfCircuitOperationActsLikeMatrix_single(operation, matrix) {
    let qubitSpan = Math.round(Math.log2(matrix.height()));
    let extraWires = Math.floor(Math.random()*5);
    let time = Math.random();
    let qubitIndex = Math.floor(Math.random() * extraWires);
    if (USE_SIMPLE_VALUES) {
        extraWires = 0;
        time = 0;
        qubitIndex = 0;
    }
    let wireCount = qubitSpan + extraWires;
    let [w, h] = [1 << Math.ceil(wireCount/2), 1 << Math.floor(wireCount/2)];
    let controls = Controls.NONE;
    for (let i = 0; i < extraWires; i++) {
        if (Math.random() < 0.5) {
            controls = controls.and(Controls.bit(i + (i < qubitIndex ? 0 : qubitSpan), Math.random() < 0.5));
        }
    }

    let ampCount = 1 << wireCount;
    let inVec = Matrix.generate(1, ampCount, () => USE_SIMPLE_VALUES ?
        (Math.random() < 0.5 ? 1 : 0) :
        new Complex(Math.random()*10 - 5, Math.random()*10 - 5));

    let textureIn = Shaders.vec2Data(inVec.rawBuffer()).toVec2Texture(wireCount);
    let controlsTexture = CircuitShaders.controlMask(controls).toByteTexture(w, h);
    let args = new CircuitEvalArgs(
        time,
        qubitIndex,
        wireCount,
        controls,
        controlsTexture,
        textureIn,
        new Map());
    let textureOut = operation(args);

    let outData = workingShaderCoder.unpackVec2Data(textureOut.readPixels());
    let outVec = new Matrix(1, ampCount, outData);

    let expectedOutVec = matrix.applyToStateVectorAtQubitWithControls(inVec, qubitIndex, controls);

    assertThat(outVec).withInfo({matrix, inVec, args}).isApproximatelyEqualTo(expectedOutVec, 0.005);
    textureOut.ensureDeinitialized();
    textureIn.ensureDeinitialized();
    controlsTexture.ensureDeinitialized();
}

export {
    assertThatRandomTestOfCircuitOperationActsLikeMatrix,
    assertThatRandomTestOfCircuitOperationShaderActsLikeMatrix
}
