import {Suite, assertThat, assertThrows} from "test/TestUtil.js"
import {CircuitEvalArgs} from "src/circuit/CircuitEvalArgs.js"
import {CircuitShaders} from "src/circuit/CircuitShaders.js"
import {universalNot} from "src/gates/Impossible_UniversalNotGate.js"

import {Controls} from "src/circuit/Controls.js"
import {Shaders} from "src/webgl/Shaders.js"

let suite = new Suite("GateShaders");

suite.webGlTest('universalNot', () => {
    let input = Shaders.vec2Data(new Float32Array([
        1,2, 3,4,
        5,6, 7,8
    ])).toVec2Texture(2);
    let assertAbout = (index, control) => assertThat(universalNot(new CircuitEvalArgs(
            0,
            index,
            2,
            control,
            CircuitShaders.controlMask(control).toBoolTexture(2),
            input,
            new Map())).readVec2Outputs(2));
    assertAbout(0, Controls.NONE).isEqualTo(new Float32Array([
        3,-4, -1,2,
        7,-8, -5,6
    ]));
    assertAbout(1, Controls.NONE).isEqualTo(new Float32Array([
        5,-6, 7,-8,
        -1,2, -3,4
    ]));
    assertAbout(0, Controls.bit(1, true)).isEqualTo(new Float32Array([
        1,2,  3,4,
        7,-8, -5,6
    ]));
});
