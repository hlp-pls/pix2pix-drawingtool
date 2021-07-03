const interpolate_sh_vert = `
varying vec2 vUv;
    
void main() {
    vUv = uv;
    gl_Position = vec4( position, 1.0 );    
}
`;

const interpolate_sh_frag = `
varying vec2 vUv;

uniform sampler2D buffer;
uniform sampler2D FROM;
uniform sampler2D TO;
uniform float inter_fin;
uniform vec2 res;
uniform float time;
uniform float is_mousedown;
uniform float mouse[100];
uniform float brush_size;

void main() {
    vec2 st = vUv;

    float step = 0.001;

    vec2 tc = st;

    vec4 FROM_samp = texture2D(FROM,tc);
    vec4 TO_samp = texture2D(TO,tc);

    // 1, 2, 3, 4, 5, 6, 7, 8 -> 현재 픽셀 주변 8개의 픽셀을 참조한다.
    /*
        |1||2||3|
        |4|| ||5|
        |6||7||8|
    */
      
    vec2 tc_1 = st + vec2(-1.,1.) * step;
    vec2 tc_2 = st + vec2(0.,1.) * step;
    vec2 tc_3 = st + vec2(1.,1.) * step;
      
    vec2 tc_4 = st + vec2(-1.,0.) * step;
    vec2 tc_5 = st + vec2(1.,0.) * step;
      
    vec2 tc_6 = st + vec2(-1.,-1.) * step;
    vec2 tc_7 = st + vec2(0.,-1.) * step;
    vec2 tc_8 = st + vec2(1.,-1.) * step;
      
    vec4 samp = texture2D(buffer,tc);

    //--> 8 direction check
    vec4 samp_1 = texture2D(buffer,tc_1);
    vec4 samp_2 = texture2D(buffer,tc_2);
    vec4 samp_3 = texture2D(buffer,tc_3);
    vec4 samp_4 = texture2D(buffer,tc_4);
    vec4 samp_5 = texture2D(buffer,tc_5);
    vec4 samp_6 = texture2D(buffer,tc_6);
    vec4 samp_7 = texture2D(buffer,tc_7);
    vec4 samp_8 = texture2D(buffer,tc_8);

    //--> 8 direction check
    vec4 TO_samp_1 = texture2D(TO,tc_1);
    vec4 TO_samp_2 = texture2D(TO,tc_2);
    vec4 TO_samp_3 = texture2D(TO,tc_3);
    vec4 TO_samp_4 = texture2D(TO,tc_4);
    vec4 TO_samp_5 = texture2D(TO,tc_5);
    vec4 TO_samp_6 = texture2D(TO,tc_6);
    vec4 TO_samp_7 = texture2D(TO,tc_7);
    vec4 TO_samp_8 = texture2D(TO,tc_8);

    vec3 to = TO_samp.xyz - samp.xyz;

    //--> 8 direction check
    vec3 to_1 = TO_samp_1.xyz - samp_1.xyz;
    vec3 to_2 = TO_samp_2.xyz - samp_2.xyz;
    vec3 to_3 = TO_samp_3.xyz - samp_3.xyz;
    vec3 to_4 = TO_samp_4.xyz - samp_4.xyz;
    vec3 to_5 = TO_samp_5.xyz - samp_5.xyz;
    vec3 to_6 = TO_samp_6.xyz - samp_6.xyz;
    vec3 to_7 = TO_samp_7.xyz - samp_7.xyz;
    vec3 to_8 = TO_samp_8.xyz - samp_8.xyz;

    vec3 norm_24 = normalize(cross(vec3(tc_2-tc, to_2.z-to.z), vec3(tc_4-tc,to_4.z-to.z)));
    vec3 norm_57 = normalize(cross(vec3(tc_5-tc, to_5.z-to.z), vec3(tc_7-tc,to_7.z-to.z)));
    vec3 norm_13 = normalize(cross(vec3(tc_1-tc, to_1.z-to.z), vec3(tc_3-tc,to_3.z-to.z)));
    vec3 norm_68 = normalize(cross(vec3(tc_6-tc, to_6.z-to.z), vec3(tc_8-tc,to_8.z-to.z)));

    //average of normals
    vec3 norm_avrg = (norm_57 + norm_24 + norm_13 + norm_68) * 0.25;
    vec2 step_dir = norm_avrg.xy * step;

    vec4 new_samp = texture2D(buffer,tc + step_dir);

    if(time <= 10.0){
        gl_FragColor = vec4(FROM_samp.xyz,1.0); 
    }else{
        float inter = time / inter_fin;
        //new_samp += (TO_samp - new_samp) * 0.002;//
        new_samp = TO_samp * inter + new_samp * (1.0 - inter);
        gl_FragColor = vec4(new_samp.xyz,1.0);
    }

     
}
`;

export { interpolate_sh_vert, interpolate_sh_frag };