// this script draws input to canvas

import * as THREE from './libs/three.module.js';
import { renderer_sh_vert, renderer_sh_frag } from './../shader/renderer_sh_2.js';
import { interpolate_sh_vert, interpolate_sh_frag } from './../shader/interpolate_sh.js';

let renderer, camera, scene;
let quad;

let pixel_density = 2;

let pingpongbuffer = [],
    pingpongbuffer_scene, pingpongbuffer_camera;

let pingpongbuffer_shader_material, renderer_shader_material;

let time = 0;
let inter_fin = 200.0;
let width = 512,
    height = 512;
let mouse = { x: 0, y: 0 };
let prev_mouse = { x: 0, y: 0 };
let mouse_pos = [];
let mouse_detail = 100;

let is_mousedown = 0.0;
let brush_size = 0.001;
let tar_brush_size = 0.0025;

let is_initiated = false;
let is_playing_initiated = false;
let is_playing = false;
let is_animating = false;

let curr_index = 0;

let image_loader;

document.getElementById('interpolation').addEventListener('click', function(){
    if(document.getElementById('from_img').src && document.getElementById('to_img').src){
        if(!is_initiated) init();
        setTargetImage(document.getElementById('from_img').src, document.getElementById('to_img').src);
        document.getElementById('output_canvas').style.display = "none";
        document.getElementById('three_interpolation').style.display = "block";
    }else{
        alert("Origin or destination image empty!");
    }
});

document.getElementById('play').addEventListener('click', function(){
    console.log(document.getElementById('img_container').getElementsByTagName('img').length);
    if(this.innerHTML != "PAUSE"){
        if(document.getElementById('img_container').getElementsByTagName('img').length > 2){
            if(!is_initiated) init();
            is_playing = true;
            if(!is_playing_initiated){ 
                toggleTargetImage();
            }else{
                is_animating = true;
                animate();
            }
            document.getElementById('output_canvas').style.display = "none";
            document.getElementById('three_interpolation').style.display = "block";
            this.innerHTML = "PAUSE";
        }else{
            alert("Generate more images to play!");
        }
    }else{
        is_playing = false;
        is_animating = false;
        this.innerHTML = "PLAY";
    }
});

function init() {

    is_initiated = true;
    const container = document.getElementById('three_interpolation');

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(width, height, pixel_density);

    container.appendChild(renderer.domElement);

    renderer.domElement.classList.add('canvasR');

    pingpongbuffer[0] = new THREE.WebGLRenderTarget(width * pixel_density, height * pixel_density);
    pingpongbuffer[1] = new THREE.WebGLRenderTarget(width * pixel_density, height * pixel_density);
    pingpongbuffer[0].texture.type = THREE.FloatType;
    pingpongbuffer[1].texture.type = THREE.FloatType;

    renderer_shader_material = new THREE.ShaderMaterial({
        vertexShader: renderer_sh_vert,
        fragmentShader: renderer_sh_frag,
        uniforms: {
            res: {
                value: [
                    window.innerWidth * pixel_density,
                    window.innerHeight * pixel_density
                ]
            },
            buffer: { value: pingpongbuffer[1].texture },
            time: { value: time }
        }
    });

    pingpongbuffer_shader_material = new THREE.ShaderMaterial({
        vertexShader: interpolate_sh_vert,
        fragmentShader: interpolate_sh_frag,
        uniforms: {
            res: {
                value: [
                    window.innerWidth * pixel_density,
                    window.innerHeight * pixel_density
                ]
            },
            buffer: { value: pingpongbuffer[1].texture },
            FROM: { value: null },
            TO: { value: null },
            inter_fin: { value: inter_fin },
            time: { value: time },
            mouse: {
                value: [
                    mouse_detail
                ]
            },
            is_mousedown: { value: 0 },
            brush_size: { value: brush_size }
        }
    });

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    pingpongbuffer_scene = new THREE.Scene();
    pingpongbuffer_camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quad_geometry = new THREE.PlaneBufferGeometry(2, 2, 1, 1);

    quad = new THREE.Mesh(quad_geometry, renderer_shader_material);
    scene.add(quad);

    quad = new THREE.Mesh(quad_geometry, pingpongbuffer_shader_material);
    pingpongbuffer_scene.add(quad);

    image_loader = new THREE.TextureLoader();

    //animate();

    //window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', onDragEnd);
}

function setTargetImage(from_src, to_src){
    time = 0;
    let load_count = 0;
    image_loader.load(from_src, function(txtr){
        pingpongbuffer_shader_material.uniforms.FROM.value = txtr;
        load_count++;
        if(load_count == 2 && !is_animating){
            is_animating = true;
            animate();
        }
    });
    image_loader.load(to_src, function(txtr){
        pingpongbuffer_shader_material.uniforms.TO.value = txtr;
        load_count++;
        if(load_count == 2 && !is_animating){
            is_animating = true;
            animate();
        }
    });
}

function toggleTargetImage(){
    //console.log(curr_index);

    let generated_imgs = document.getElementById('img_container').getElementsByTagName('img');
    
    let tar_index = (curr_index == generated_imgs.length - 1)? 0 : curr_index + 1;
    setTargetImage(generated_imgs[curr_index].src, generated_imgs[tar_index].src);

    generated_imgs[tar_index].style.borderRadius = '15px';
    for(let i=0; i<generated_imgs.length; i++){
        if(i != tar_index && i != curr_index) 
        generated_imgs[i].style.borderRadius = '4px';
    }
    
    curr_index++;

    if(curr_index == generated_imgs.length){
        curr_index = 0;
    }
}

function onDragStart(e) {
    is_mousedown = 1.0;
    const el_box = renderer.domElement.getBoundingClientRect();
    mouse.x = (e.clientX - el_box.left) / width;
    mouse.y = 1.0 - (e.clientY - el_box.top) / height;
    
}

function onDragging(e) {
    const el_box = renderer.domElement.getBoundingClientRect();

    if (is_mousedown == 1.0) {
        brush_size += (tar_brush_size - brush_size) * 0.1;

        mouse.x = (e.clientX - el_box.left) / width;
        mouse.y = 1.0 - (e.clientY - el_box.top) / height;
    }
}

function onDragEnd() {
    is_mousedown = 0.0;
}

/*
function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight, pixel_density);
    pingpongbuffer[0].setSize(window.innerWidth * pixel_density, window.innerHeight * pixel_density);
    pingpongbuffer[1].setSize(window.innerWidth * pixel_density, window.innerHeight * pixel_density);
}*/

function animate() {
    if(is_animating){
        requestAnimationFrame(animate);
    }

    update();
    render();
}

function update() {

    if(is_playing){
        is_playing_initiated = true;
    }
    
    if (is_mousedown) {
        for(let i=0; i<mouse_detail; i+=2){
            let inter = i / (mouse_detail - 2);
            mouse_pos[i] = mouse.x * (inter) + prev_mouse.x * (1-inter);
            mouse_pos[i+1] = mouse.y * (inter) + prev_mouse.y * (1-inter);
        }

        prev_mouse.x = mouse.x;
        prev_mouse.y = mouse.y;

        //console.log(prev_mouse.x, mouse.x);
    } else {
        brush_size += (0.0 - brush_size) * 0.1;
    }

    if(time < inter_fin){
        time++;
        //console.log(time);
    }else{
        is_animating = false;
        if(is_playing){
            //console.log("play toggle!");
            toggleTargetImage();
        }
    }
}

function render() {
    let ind_0 = time % 2;
    let ind_1 = (ind_0 == 0) ? 1 : 0;

    pingpongbuffer_shader_material.uniforms.buffer.value = pingpongbuffer[ind_0].texture;
    pingpongbuffer_shader_material.uniforms.time.value = time;
    pingpongbuffer_shader_material.uniforms.res.value = [
        window.innerWidth * pixel_density,
        window.innerHeight * pixel_density
    ];

    pingpongbuffer_shader_material.uniforms.is_mousedown.value = is_mousedown;
    if (mouse_pos.length > 0) {
        pingpongbuffer_shader_material.uniforms.mouse.value = mouse_pos;
    }
    pingpongbuffer_shader_material.uniforms.brush_size.value = brush_size;

    renderer.setRenderTarget(pingpongbuffer[ind_1]);
    renderer.render(pingpongbuffer_scene, pingpongbuffer_camera);

    renderer_shader_material.uniforms.buffer.value = pingpongbuffer[ind_0].texture;
    renderer_shader_material.uniforms.time.value = time;
    renderer_shader_material.uniforms.res.value = [
        window.innerWidth * pixel_density,
        window.innerHeight * pixel_density
    ];

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
}