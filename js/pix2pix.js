//from the link below
//not written by chgnhyk
//https://github.com/yining1023/pix2pix_tensorflowjs/blob/2eb2e726e33d3aeda441ac1bb6d01a3289275029/pix2pix.js

const fetchWeights = (urlPath) => {
  return new Promise((resolve, reject) => {
    const weightsCache = {};
    if (urlPath in weightsCache) {
      resolve(weightsCache[urlPath]);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('GET', urlPath, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new Error('missing model'));
        return;
      }
      const buf = xhr.response;
      if (!buf) {
        reject(new Error('invalid arraybuffer'));
        return;
      }

      const parts = [];
      let offset = 0;
      while (offset < buf.byteLength) {
        const b = new Uint8Array(buf.slice(offset, offset + 4));
        offset += 4;
        const len = (b[0] << 24) + (b[1] << 16) + (b[2] << 8) + b[3]; // eslint-disable-line no-bitwise
        parts.push(buf.slice(offset, offset + len));
        offset += len;
      }

      const shapes = JSON.parse((new TextDecoder('utf8')).decode(parts[0]));
      const index = new Float32Array(parts[1]);
      const encoded = new Uint8Array(parts[2]);

      // decode using index
      const arr = new Float32Array(encoded.length);
      for (let i = 0; i < arr.length; i += 1) {
        arr[i] = index[encoded[i]];
      }

      const weights = {};
      offset = 0;
      for (let i = 0; i < shapes.length; i += 1) {
        const { shape } = shapes[i];
        const size = shape.reduce((total, num) => total * num);
        const values = arr.slice(offset, offset + size);
        const tfarr = tf.tensor1d(values, 'float32');
        weights[shapes[i].name] = tfarr.reshape(shape);
        offset += size;
      }
      weightsCache[urlPath] = weights;
      resolve(weights);
    };
    xhr.send(null);
  });
}

// Converts a tf to DOM img element
const array3DToImage = (tensor) => {
  const [imgWidth, imgHeight] = tensor.shape;
  const data = tensor.dataSync();
  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < imgWidth * imgHeight; i += 1) {
    const j = i * 4;
    const k = i * 3;
    imageData.data[j + 0] = Math.floor(256 * data[k + 0]);
    imageData.data[j + 1] = Math.floor(256 * data[k + 1]);
    imageData.data[j + 2] = Math.floor(256 * data[k + 2]);
    imageData.data[j + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  // Create img HTML element from canvas
  const dataUrl = canvas.toDataURL();
  const outputImg = document.createElement('img');
  outputImg.src = dataUrl;
  outputImg.style.width = imgWidth;
  outputImg.style.height = imgHeight;
  return outputImg;
};

class Pix2pix {
    constructor(model, callback) {
        this.ready = false;

        this.loadCheckpoints(model).then(() => {
            this.ready = true;
            if (callback) {
                callback();
            }
        });
    }

    async loadCheckpoints(path) {
        this.weights = await fetchWeights(path);
    }

    async transfer(inputElement, callback = () => {}) {
        const input = tf.browser.fromPixels(inputElement);
        const inputData = input.dataSync();
        const floatInput = tf.tensor3d(inputData, input.shape, 'float32');
        const normalizedInput = tf.div(floatInput, tf.scalar(255));

        function preprocess(inputPreproc) {
            return tf.sub(tf.mul(inputPreproc, tf.scalar(2)), tf.scalar(1));
        }

        function deprocess(inputDeproc) {
            return tf.div(tf.add(inputDeproc, tf.scalar(1)), tf.scalar(2));
        }

        function batchnorm(inputBat, scale, offset) {
            const moments = tf.moments(inputBat, [0, 1]);
            const varianceEpsilon = 1e-5;
            return tf.batchNorm(inputBat, moments.mean, moments.variance, offset, scale, varianceEpsilon);
        }

        function conv2d(inputCon, filterCon) {
            return tf.conv2d(inputCon, filterCon, [2, 2], 'same');
        }

        function deconv2d(inputDeconv, filterDeconv, biasDecon) {
            const convolved = tf.conv2dTranspose(inputDeconv, filterDeconv, [inputDeconv.shape[0] * 2, inputDeconv.shape[1] * 2, filterDeconv.shape[2]], [2, 2], 'same');
            const biased = tf.add(convolved, biasDecon);
            return biased;
        }

        const result = tf.tidy(() => {
            const preprocessedInput = preprocess(normalizedInput);
            const layers = [];
            let filter = this.weights['generator/encoder_1/conv2d/kernel'];
            let bias = this.weights['generator/encoder_1/conv2d/bias'];
            let convolved = conv2d(preprocessedInput, filter, bias);
            layers.push(convolved);

            for (let i = 2; i <= 8; i += 1) {
                const scope = `generator/encoder_${i.toString()}`;
                filter = this.weights[`${scope}/conv2d/kernel`];
                const bias2 = this.weights[`${scope}/conv2d/bias`];
                const layerInput = layers[layers.length - 1];
                const rectified = tf.leakyRelu(layerInput, 0.2);
                convolved = conv2d(rectified, filter, bias2);
                const scale = this.weights[`${scope}/batch_normalization/gamma`];
                const offset = this.weights[`${scope}/batch_normalization/beta`];
                const normalized = batchnorm(convolved, scale, offset);
                layers.push(normalized);
            }

            for (let i = 8; i >= 2; i -= 1) {
                let layerInput;
                if (i === 8) {
                    layerInput = layers[layers.length - 1];
                } else {
                    const skipLayer = i - 1;
                    layerInput = tf.concat([layers[layers.length - 1], layers[skipLayer]], 2);
                }
                const rectified = tf.relu(layerInput);
                const scope = `generator/decoder_${i.toString()}`;
                filter = this.weights[`${scope}/conv2d_transpose/kernel`];
                bias = this.weights[`${scope}/conv2d_transpose/bias`];
                convolved = deconv2d(rectified, filter, bias);
                const scale = this.weights[`${scope}/batch_normalization/gamma`];
                const offset = this.weights[`${scope}/batch_normalization/beta`];
                const normalized = batchnorm(convolved, scale, offset);
                layers.push(normalized);
            }

            const layerInput = tf.concat([layers[layers.length - 1], layers[0]], 2);
            let rectified2 = tf.relu(layerInput);
            filter = this.weights['generator/decoder_1/conv2d_transpose/kernel'];
            const bias3 = this.weights['generator/decoder_1/conv2d_transpose/bias'];
            convolved = deconv2d(rectified2, filter, bias3);
            rectified2 = tf.tanh(convolved);
            layers.push(rectified2);

            const output = layers[layers.length - 1];
            const deprocessedOutput = deprocess(output);
            return deprocessedOutput;
        });

        await tf.nextFrame();
        callback(array3DToImage(result));
    }
}

const pix2pix = (model, callback = () => {}) => new Pix2pix(model, callback);