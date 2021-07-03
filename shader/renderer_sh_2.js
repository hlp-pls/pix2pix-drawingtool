
const renderer_sh_vert = `
varying vec2 vUv;
    
void main() {
    vUv = uv;
    gl_Position = vec4( position, 1.0 );    
}
`;

const renderer_sh_frag = `
varying vec2 vUv;

uniform sampler2D buffer;
uniform vec2 res;
uniform float time;
         
void main() {
  vec2 st = vUv;
  
  vec3 samp = texture2D(buffer,st).xyz;
  
  gl_FragColor = vec4(samp,1.0);
}
`;

export {renderer_sh_vert , renderer_sh_frag};