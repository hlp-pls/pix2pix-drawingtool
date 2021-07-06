
const copier_sh_vert = `
varying vec2 vUv;
    
void main() {
    vUv = uv;
    gl_Position = vec4( position, 1.0 );    
}
`;

const copier_sh_frag = `
varying vec2 vUv;

uniform sampler2D buffer;
       
void main() {
  vec2 st = vUv;
  
  vec3 samp = texture2D(buffer,st).xyz;
  
  gl_FragColor = vec4(vec3(1.0 - samp.x),1.0);
}
`;

export {copier_sh_vert , copier_sh_frag};