const addAndFade_sh_vert = `
varying vec2 vUv;
    
void main() {
    vUv = uv;
    gl_Position = vec4( position, 1.0 );    
}
`;

const addAndFade_sh_frag = `
varying vec2 vUv;

uniform sampler2D buffer;
uniform vec2 res;
uniform float time;
uniform float is_mousedown;
uniform float mouse[100];
uniform float brush_size;
uniform float is_pencil;

void main() {
    vec2 st = vUv;

    float step = 0.001;

      // 1, 2, 3, 4, 5, 6, 7, 8 -> 현재 픽셀 주변 8개의 픽셀을 참조한다.
      /*
      |1||2||3|
      |4|| ||5|
      |6||7||8|
      */

    vec2 tc = st;
      
    vec2 tc_1 = st + vec2(-1.,1.) * step;
    vec2 tc_2 = st + vec2(0.,1.) * step;
    vec2 tc_3 = st + vec2(1.,1.) * step;
      
    vec2 tc_4 = st + vec2(-1.,0.) * step;
    vec2 tc_5 = st + vec2(1.,0.) * step;
      
    vec2 tc_6 = st + vec2(-1.,-1.) * step;
    vec2 tc_7 = st + vec2(0.,-1.) * step;
    vec2 tc_8 = st + vec2(1.,-1.) * step;
      
    vec4 samp = texture2D(buffer,tc);
      
    vec4 samp_1 = texture2D(buffer,tc_1);
    vec4 samp_2 = texture2D(buffer,tc_2);
      
    vec4 samp_3 = texture2D(buffer,tc_3);
    vec4 samp_4 = texture2D(buffer,tc_4);
    vec4 samp_5 = texture2D(buffer,tc_5);
      
    vec4 samp_6 = texture2D(buffer,tc_6);
    vec4 samp_7 = texture2D(buffer,tc_7);
    vec4 samp_8 = texture2D(buffer,tc_8);

    if(is_mousedown == 1.0){
        // 주변 8개의 픽셀의 평균값을 구한다. 마지막에 곱해진 값이 커지면 경계가 명확한 덩어리가 생기고, 작아지면 경계가 흐려지고, 흐려지는 속도가 줄어든다.
        
        for(int i=0; i<100; i+=2){
            if(mouse[i] != 0.0 && mouse[i+1] != 0.0){
                
                if(is_pencil == 0.0){
                    
                    if(distance(st, vec2(mouse[i],mouse[i+1])) < brush_size * 10.0){
                        samp.x -= 1.0;
                    }
                }else if(is_pencil == 1.0){
                    if(distance(st, vec2(mouse[i],mouse[i+1])) < brush_size){
                        samp.x += 1.0;
                    }
                }else if(is_pencil == 2.0){
                    //smudger
                    float i_float = float(i);
                    
                    if(distance(st, vec2(mouse[i],mouse[i+1])) < brush_size * 10.0){
                        samp.x = (
                            samp_1.x + samp_2.x + samp_3.x + samp_4.x + 
                            samp_5.x + samp_6.x + samp_7.x + samp_8.x
                        ) * 0.125 * 1.0;
                    }
                }
            }
        }
        
    }
      //samp.x += 0.1 * (noise(vec3(st * 5.0, time * 0.01)) * 2.0 - 1.0);
      //samp.x += 0.1;
        
    gl_FragColor = vec4(samp.xyz,1.0); 
}
`;

export { addAndFade_sh_vert, addAndFade_sh_frag };