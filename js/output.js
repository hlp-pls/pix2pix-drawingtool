//this script file 
//1. loads input image to model 
//2. and draws output image to canvas

console.log(tf);
alert('Model loading! Please wait.');

var outputCanvas, outputCtx;
const edges2cat = pix2pix('./models/edges2cats_AtoB.pict', modelLoaded);
var fromto_count = 0;

function modelLoaded() {
    console.log('pix2pix checkpoint loaded');
    alert('Model loaded!');
    console.log(edges2cat);
    init();
}

function init() {
    outputCanvas = document.createElement('canvas');
    outputCanvas.width = 512;
    outputCanvas.height = 512;
    outputCanvas.classList.add('canvasR');
    outputCanvas.id = 'output_canvas';

    outputCtx = outputCanvas.getContext('2d');

    clearCanvas();

    document.getElementById('transfer').addEventListener('click',transfer);

    document.getElementById('canvas_container').appendChild(outputCanvas);
}

async function transfer() {
    outputCanvas.style.display = "block";
    document.getElementById('three_interpolation').style.display = "none";
    // Select canvas DOM element
    const input_canvas = document.getElementById('input_canvas');
    //--> before putting the canvas to pix2pix, resize the canvas to a correct size
    //input_canvas.width = 256;
    //input_canvas.height = 256;
    //--> resizing gets rid of tfjs error

    //--> resizing canvas size makes the input image tainted, and thus leads to incorrect outputs
    //

    let result_dom;

    //console.log(input_canvas);
    // Apply pix2pix transformation
    await edges2cat.transfer(input_canvas, result => {
    	console.log("transfer check");

        //document.getElementById('message').innerHTML = "TRANSFER COMPLETE";
        result_dom = result;
        
        //console.log(result);
        clearCanvas();
        
        result.onload = function(){
            outputCtx.drawImage(result, 0, 0, 512, 512);
        };
    });

    //input_canvas.width = 512;
    //input_canvas.height = 512;
    {   
        const input_url = input_canvas.toDataURL(1, 'image/png');
        result_dom.setAttribute('sketch_data', input_url);
        document.getElementById('img_container').appendChild(result_dom);
        result_dom.addEventListener('click', function(){
            
            get_clicked_Sketch(this);

            result_dom.style.borderRadius = '15px';
            result_dom.classList.add('clicked_img');
            result_dom.classList.add('generated_imgs');
            let fromto_imgs = document.getElementById('fromto_img_container').getElementsByTagName('img');

            if(fromto_count == 0){
                fromto_imgs[0].src = result_dom.src;
            }else if(fromto_count == 1){
                fromto_imgs[1].src = result_dom.src;
            }else if(fromto_count == 2){
                fromto_imgs[0].src = result_dom.src;
                fromto_count = 0;
            }

            fromto_count++;

            let clicked_imgs = document.getElementsByClassName('clicked_img');
            for(let i=0; i<clicked_imgs.length; i++){
                if(clicked_imgs[i] != this){ 
                    clicked_imgs[i].style.borderRadius = '4px';
                    clicked_imgs[i].classList.remove('clicked_img');
                }
            }
        })
        
    }
}

function clearCanvas() {
    outputCtx.fillStyle = "white";
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
}