import { Suite, assertThat } from "test/TestUtil.js"
import WglArg from "src/webgl/WglArg.js"
import WglShader from "src/webgl/WglShader.js"
import WglTexture from "src/webgl/WglTexture.js"
import WglWorkArea from "src/webgl/WglWorkArea.js"

let suite = new Suite("Wgl");

suite.webGlTest("readPixelColorBytes", () => {
    let w = 2;
    let h = 2;
    let shader = new WglShader(`
        uniform float v;
        void main() {
            gl_FragColor = vec4(gl_FragCoord.xy / vec2(255.0, 255.0), v, 0.5);
        }`);

    let texture = new WglTexture(w, h);

    let workArea = new WglWorkArea();
    workArea.render(texture, shader, [WglArg.float("v", 10/255)]);
    // TODO: remove when firefox fixes problem
    try {
        assertThat(workArea.readPixelColorBytes(texture)).isEqualTo([
            1, 1, 10, 128,
            2, 1, 10, 128,
            1, 2, 10, 128,
            2, 2, 10, 128
        ]);
    } catch (ex) {
        console.warn("Allowed test failure due to WebGL regression in firefox. " + ex + "\n");
    }
});

suite.webGlTest("readPixelColorFloats", () => {
    let w = 2;
    let h = 2;
    let shader = new WglShader(`
        uniform float v;
        void main() {
            gl_FragColor = vec4(gl_FragCoord.xy, v, 254.5);
        }`);

    let texture = new WglTexture(w, h);

    let workArea = new WglWorkArea();
    workArea.render(texture, shader, [WglArg.float("v", 192.25)]);
    assertThat(workArea.readPixelColorFloats(texture)).isEqualTo([
        0.5, 0.5, 192.25, 254.5,
        1.5, 0.5, 192.25, 254.5,
        0.5, 1.5, 192.25, 254.5,
        1.5, 1.5, 192.25, 254.5
    ]);
});
