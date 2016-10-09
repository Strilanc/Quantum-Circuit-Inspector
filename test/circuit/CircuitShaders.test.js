import {Suite, assertThat, assertThrows} from "test/TestUtil.js"
import {assertThatRandomTestOfCircuitOperationShaderActsLikeMatrix} from "test/CircuitOperationTestUtil.js"
import {CircuitShaders} from "src/circuit/CircuitShaders.js"

import {Complex} from "src/math/Complex.js"
import {Controls} from "src/circuit/Controls.js"
import {Seq} from "src/base/Seq.js"
import {Shaders} from "src/webgl/Shaders.js"
import {Matrix} from "src/math/Matrix.js"
import {WglShader} from "src/webgl/WglShader.js"
import {WglTexture} from "src/webgl/WglTexture.js"
import {KetTextureUtil} from "src/circuit/KetTextureUtil.js"
import {workingShaderCoder, makePseudoShaderWithInputsAndOutputAndCode} from "src/webgl/ShaderCoders.js"

let suite = new Suite("CircuitShaders");

function readAmps(bitCount, shader) {
    return new Matrix(1, 1 << bitCount, workingShaderCoder.readVec2Data(shader, bitCount));
}

suite.webGlTest("classicalState", () => {
    assertThat(readAmps(2, CircuitShaders.classicalState(0))).isEqualTo(Matrix.col(1, 0, 0, 0));
    assertThat(readAmps(2, CircuitShaders.classicalState(1))).isEqualTo(Matrix.col(0, 1, 0, 0));
    assertThat(readAmps(2, CircuitShaders.classicalState(2))).isEqualTo(Matrix.col(0, 0, 1, 0));
    assertThat(readAmps(2, CircuitShaders.classicalState(3))).isEqualTo(Matrix.col(0, 0, 0, 1));

    assertThat(readAmps(3, CircuitShaders.classicalState(0))).isEqualTo(Matrix.col(1, 0, 0, 0, 0, 0, 0, 0));
    assertThat(readAmps(3, CircuitShaders.classicalState(5))).isEqualTo(Matrix.col(0, 0, 0, 0, 0, 1, 0, 0));
});

suite.webGlTest("linearOverlay", () => {
    let fore = Shaders.vec4Data(new Float32Array(Seq.range(2*2*4).map(e => e + 900).toArray())).toVec4Texture(2);
    let back = Shaders.vec4Data(new Float32Array(Seq.range(4*4*4).map(e => -e).toArray())).toVec4Texture(4);

    assertThat(CircuitShaders.linearOverlay(0, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915,
        -16, -17, -18, -19, -20, -21, -22, -23, -24, -25, -26, -27, -28, -29, -30, -31,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        -48, -49, -50, -51, -52, -53, -54, -55, -56, -57, -58, -59, -60, -61, -62, -63
    ]));

    assertThat(CircuitShaders.linearOverlay(1, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        -0,  -1,  -2,  -3,  900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911,
        912, 913, 914, 915, -20, -21, -22, -23, -24, -25, -26, -27, -28, -29, -30, -31,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        -48, -49, -50, -51, -52, -53, -54, -55, -56, -57, -58, -59, -60, -61, -62, -63
    ]));

    assertThat(CircuitShaders.linearOverlay(2, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        -0,  -1,  -2,  -3,  -4,  -5,  -6,  -7,  900, 901, 902, 903, 904, 905, 906, 907,
        908, 909, 910, 911, 912, 913, 914, 915, -24, -25, -26, -27, -28, -29, -30, -31,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        -48, -49, -50, -51, -52, -53, -54, -55, -56, -57, -58, -59, -60, -61, -62, -63
    ]));

    assertThat(CircuitShaders.linearOverlay(4, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        -0,   -1,  -2,  -3,  -4,  -5,  -6,  -7,  -8,  -9, -10, -11, -12, -13, -14, -15,
        900, 901, 902, 903, 904, 905, 906, 907,  908, 909, 910, 911, 912, 913, 914, 915,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        -48, -49, -50, -51, -52, -53, -54, -55, -56, -57, -58, -59, -60, -61, -62, -63
    ]));

    assertThat(CircuitShaders.linearOverlay(12, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        -0,   -1,  -2,  -3,  -4,  -5,  -6,  -7,  -8,  -9, -10, -11, -12, -13, -14, -15,
        -16, -17, -18, -19, -20, -21, -22, -23, -24, -25, -26, -27, -28, -29, -30, -31,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        900, 901, 902, 903, 904, 905, 906, 907,  908, 909, 910, 911, 912, 913, 914, 915
    ]));

    assertThat(CircuitShaders.linearOverlay(13, fore, back).readVec4Outputs(4)).isEqualTo(new Float32Array([
        -0,   -1,  -2,  -3,  -4,  -5,  -6,  -7,  -8,  -9, -10, -11, -12, -13, -14, -15,
        -16, -17, -18, -19, -20, -21, -22, -23, -24, -25, -26, -27, -28, -29, -30, -31,
        -32, -33, -34, -35, -36, -37, -38, -39, -40, -41, -42, -43, -44, -45, -46, -47,
        -48, -49, -50, -51, 900, 901, 902, 903, 904, 905, 906, 907,  908, 909, 910, 911
    ]));
});

suite.webGlTest("controlMask", () => {
    assertThat(CircuitShaders.controlMask(new Controls(0x3, 0x1)).readFloatOutputs(2, 2)).isEqualTo(new Float32Array([
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]));

    assertThat(CircuitShaders.controlMask(new Controls(0x3, 0x1)).readFloatOutputs(2, 2)).isEqualTo(new Float32Array([
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]));

    assertThat(CircuitShaders.controlMask(new Controls(0x3, 0x0)).readFloatOutputs(2, 2)).isEqualTo(new Float32Array([
        1, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]));

    assertThat(CircuitShaders.controlMask(new Controls(0x1, 0x0)).readFloatOutputs(2, 2)).isEqualTo(new Float32Array([
        1, 0, 0, 0,
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0
    ]));

    assertThat(CircuitShaders.controlMask(new Controls(0x5, 0x4)).readFloatOutputs(4, 2)).isEqualTo(new Float32Array([
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0
    ]));

    assertThat(CircuitShaders.controlMask(new Controls(0x1, 0x0)).readByteOutputs(2, 2)).isEqualTo(new Uint8Array([
        255, 0, 0, 0,
        0, 0, 0, 0,
        255, 0, 0, 0,
        0, 0, 0, 0
    ]));
});

suite.webGlTest("controlMask_largeReference", () => {
    let w = 1 << 5;
    let h = 1 << 8;
    let mask = new Controls(0b10111010101010111, 0b10011000001010001);
    let expected = new Float32Array(Seq.range(w * h).
        map(i => mask.allowsState(i) ? 1 : 0).
        flatMap(e => [e, 0, 0, 0]).
        toArray());
    assertThat(CircuitShaders.controlMask(mask).readFloatOutputs(w, h)).isEqualTo(expected);
});

suite.webGlTest("controlSelect_simple", () => {
    let coords = makePseudoShaderWithInputsAndOutputAndCode([], workingShaderCoder.vec2Output, `
        vec2 outputFor(float k) {
            return vec2(mod(k, 4.0), floor(k/4.0));
        }
    `)().toVec2Texture(4);

    assertThat(CircuitShaders.controlSelect(Controls.NONE, coords).readVec2Outputs(4)).
        isEqualTo(new Float32Array([
            0,0, 1,0, 2,0, 3,0,
            0,1, 1,1, 2,1, 3,1,
            0,2, 1,2, 2,2, 3,2,
            0,3, 1,3, 2,3, 3,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(0, false), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,0, 2,0,
            0,1, 2,1,
            0,2, 2,2,
            0,3, 2,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(0, true), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            1,0, 3,0,
            1,1, 3,1,
            1,2, 3,2,
            1,3, 3,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(1, false), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,0, 1,0,
            0,1, 1,1,
            0,2, 1,2,
            0,3, 1,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(1, true), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            2,0, 3,0,
            2,1, 3,1,
            2,2, 3,2,
            2,3, 3,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(2, false), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,0, 1,0, 2,0, 3,0,
            0,2, 1,2, 2,2, 3,2
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(2, true), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,1, 1,1, 2,1, 3,1,
            0,3, 1,3, 2,3, 3,3
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(3, false), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,0, 1,0, 2,0, 3,0,
            0,1, 1,1, 2,1, 3,1
        ]));
    assertThat(CircuitShaders.controlSelect(Controls.bit(3, true), coords).readVec2Outputs(3)).
        isEqualTo(new Float32Array([
            0,2, 1,2, 2,2, 3,2,
            0,3, 1,3, 2,3, 3,3
        ]));
});

suite.webGlTest("controlSelect_multiple", () => {
    let coords = makePseudoShaderWithInputsAndOutputAndCode([], workingShaderCoder.vec2Output, `
        vec2 outputFor(float k) {
            return vec2(mod(k, 4.0), floor(k/4.0));
        }
    `)().toVec2Texture(4);

    assertThat(CircuitShaders.controlSelect(new Controls(0x3, 0x3), coords).readVec2Outputs(2)).
        isEqualTo(new Float32Array([
            3,0,
            3,1,
            3,2,
            3,3
        ]));
    assertThat(CircuitShaders.controlSelect(new Controls(0x3, 0x2), coords).readVec2Outputs(2)).
        isEqualTo(new Float32Array([
            2,0,
            2,1,
            2,2,
            2,3
        ]));
    assertThat(CircuitShaders.controlSelect(new Controls(0xC, 0xC), coords).readVec2Outputs(2)).
        isEqualTo(new Float32Array([
            0,3,
            1,3,
            2,3,
            3,3
        ]));
    assertThat(CircuitShaders.controlSelect(new Controls(0xF, 0x3), coords).readVec2Outputs(0)).
        isEqualTo(new Float32Array([
            3,0
        ]));
});

suite.webGlTest("qubitDensities", () => {
    let s = Math.sqrt(0.5);
    let q = 0.25;
    let h = 0.5;
    let _ = 0;

    let assertAmpsToDensities = (amps, dens) => {
        let tex = Shaders.vec2Data(new Float32Array(amps)).toVec2Texture(1);
        assertThat(CircuitShaders.qubitDensities(tex).readVec4Outputs(0)).
            isApproximatelyEqualTo(new Float32Array(dens));
        tex.ensureDeinitialized();
    };
    assertAmpsToDensities(
        [1,_, _,_],
        [1,0,0,0]);
    assertAmpsToDensities(
        [_,1, _,_],
        [1,0,0,0]);
    assertAmpsToDensities(
        [_,_, 1,_],
        [0,0,0,1]);
    assertAmpsToDensities(
        [_,_, _,1],
        [0,0,0,1]);
    assertAmpsToDensities(
        [s,_, s,_],
        [h,h,0,h]);
    assertAmpsToDensities(
        [s,_, _,s],
        [h,0,h,h]);
    assertAmpsToDensities(
        [_,s, s,_],
        [h,0,-h,h]);
    assertAmpsToDensities(
        [_,s, -s,_],
        [h,0,h,h]);
    assertAmpsToDensities(
        [0.4,_, _,0.6],
        [0.16,0,0.24,0.36]);

    let allQubitsZero = Shaders.vec2Data(new Float32Array([
        1,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_
    ])).toVec2Texture(4);
    assertThat(CircuitShaders.qubitDensities(allQubitsZero).readVec4Outputs(5)).isEqualTo(new Float32Array([
        1,_,_,_, 1,_,_,_, 1,_,_,_, 1,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
    ]));

    let ent = Shaders.vec2Data(new Float32Array([
        s,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_,
        _,_, _,_, _,_, s,_
    ])).toVec2Texture(4);
    assertThat(CircuitShaders.qubitDensities(ent).readVec4Outputs(5)).isApproximatelyEqualTo(new Float32Array([
        h,_,_,_, h,_,_,_, h,_,_,_, h,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,h, _,_,_,h, _,_,_,h, _,_,_,h
    ]));
    assertThat(CircuitShaders.qubitDensities(ent, 3).readVec4Outputs(4)).isApproximatelyEqualTo(new Float32Array([
        h,_,_,_, h,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_,
        _,_,_,h, _,_,_,h
    ]));

    // 0, 0+1, 0+i1, 1
    let mix = Shaders.vec2Data(new Float32Array([
        _,_, _,_, _,_, _,_,
        _,_, _,_, _,_, _,_,
        h,_, _,_, h,_, _,_,
        _,h, _,_, _,h, _,_
    ])).toVec2Texture(4);
    assertThat(CircuitShaders.qubitDensities(mix).readVec4Outputs(5)).isApproximatelyEqualTo(new Float32Array([
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,q,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,q,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        q,_,_,_, q,q,_,q, q,_,q,q, _,_,_,q,
        q,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        q,_,_,_, q,q,_,q, q,_,q,q, _,_,_,q,
        q,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
    ]));
    assertThat(CircuitShaders.qubitDensities(mix, 12).readVec4Outputs(4)).isApproximatelyEqualTo(new Float32Array([
        _,_,_,_, _,_,_,q,
        _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,q,
        _,_,_,_, _,_,_,_,
        q,_,q,q, _,_,_,q,
        _,_,_,_, _,_,_,_,
        q,_,q,q, _,_,_,q,
        _,_,_,_, _,_,_,_
    ]));
    assertThat(CircuitShaders.qubitDensities(mix, 13).readVec4Outputs(5)).isApproximatelyEqualTo(new Float32Array([
        _,_,_,_, _,_,_,_, _,_,_,q, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,q, _,_,_,_,
        _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        q,_,_,_, q,_,q,q, _,_,_,q, _,_,_,_,
        q,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
        q,_,_,_, q,_,q,q, _,_,_,q, _,_,_,_,
        q,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
    ]));
});

suite.webGlTest("swap", () => {
    assertThatRandomTestOfCircuitOperationShaderActsLikeMatrix(
        args => CircuitShaders.swap(args, args.row + 1),
        Matrix.square(
            1,0,0,0,
            0,0,1,0,
            0,1,0,0,
            0,0,0,1));

    assertThatRandomTestOfCircuitOperationShaderActsLikeMatrix(
        args => CircuitShaders.swap(args, args.row + 2),
        Matrix.square(
            1,0,0,0,0,0,0,0,
            0,0,0,0,1,0,0,0,
            0,0,1,0,0,0,0,0,
            0,0,0,0,0,0,1,0,
            0,1,0,0,0,0,0,0,
            0,0,0,0,0,1,0,0,
            0,0,0,1,0,0,0,0,
            0,0,0,0,0,0,0,1));
});
