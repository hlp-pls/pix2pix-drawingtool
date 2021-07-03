// this script draws input to canvas

import * as THREE from './libs/three.module.js';
import { renderer_sh_vert, renderer_sh_frag } from './../shader/renderer_sh.js';
import { addAndFade_sh_vert, addAndFade_sh_frag } from './../shader/addAndFade_sh.js';

let renderer, camera, scene;
let quad;

let pixel_density = 4;

let pingpongbuffer = [],
    pingpongbuffer_scene, pingpongbuffer_camera;

let pingpongbuffer_shader_material, renderer_shader_material;

let time = 0;
let width = 256,
    height = 256;
let mouse = { x: 0, y: 0 };
let prev_mouse = { x: 0, y: 0 };
let mouse_pos = [];
let mouse_detail = 100;

let is_mousedown = 0.0;
let brush_size = 0.001;
let tar_brush_size = 0.0025;
let is_pencil = 1.0;

init();

function init() {

    const container = document.getElementById('three_container');

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(width, height, pixel_density);

    container.appendChild(renderer.domElement);

    renderer.domElement.classList.add('canvasL');
    renderer.domElement.id = "input_canvas";

    pingpongbuffer[0] = new THREE.WebGLRenderTarget(width * pixel_density, height * pixel_density);
    pingpongbuffer[1] = new THREE.WebGLRenderTarget(width * pixel_density, height * pixel_density);
    //pingpongbuffer[0].texture.type = THREE.FloatType;
    //pingpongbuffer[1].texture.type = THREE.FloatType;

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
        vertexShader: addAndFade_sh_vert,
        fragmentShader: addAndFade_sh_frag,
        uniforms: {
            res: {
                value: [
                    window.innerWidth * pixel_density,
                    window.innerHeight * pixel_density
                ]
            },
            buffer: { value: pingpongbuffer[1].texture },
            time: { value: time },
            mouse: {
                value: [
                    mouse_detail
                ]
            },
            is_mousedown: { value: 0 },
            brush_size: { value: brush_size },
            is_pencil: {value: is_pencil}
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

    animate();

    //window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', onDragEnd);

    document.getElementById('eraser').addEventListener('click', Eraser);
    document.getElementById('pencil').addEventListener('click', Pencil);
    document.getElementById('smudge').addEventListener('click', Smudge);

    document.getElementById('pencil').classList.add('active');
}

function Smudge(){
    if(is_pencil != 2.0){
        console.log('smudge');
        is_pencil = 2.0;
        pingpongbuffer_shader_material.uniforms.is_pencil.value = is_pencil;
        document.getElementById('eraser').classList.remove('active');
        document.getElementById('pencil').classList.remove('active');
        document.getElementById('smudge').classList.add('active');
    }
}

function Eraser(){
    if(is_pencil != 0.0){
        console.log('eraser');
        is_pencil = 0.0;
        pingpongbuffer_shader_material.uniforms.is_pencil.value = is_pencil;
        document.getElementById('eraser').classList.add('active');
        document.getElementById('pencil').classList.remove('active');
        document.getElementById('smudge').classList.remove('active');
    }
}

function Pencil(){
    if(is_pencil != 1.0){
        console.log('pencil');
        is_pencil = 1.0;
        pingpongbuffer_shader_material.uniforms.is_pencil.value = is_pencil;
        document.getElementById('eraser').classList.remove('active');
        document.getElementById('pencil').classList.add('active');
        document.getElementById('smudge').classList.remove('active');
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
    requestAnimationFrame(animate);

    update();
    render();
}

function update() {
    time++;
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