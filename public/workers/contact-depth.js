import { depthToLEDs } from './depth-map.mjs';

// Camera pixels stay in this worker. Only model/runtime assets are fetched.
let estimator;
let RawImage;
let busy = false;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      const runtime = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
      RawImage = runtime.RawImage;
      runtime.env.allowLocalModels = false;
      runtime.env.backends.onnx.wasm.numThreads = 1;
      estimator = await runtime.pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
        device: 'wasm', dtype: 'q8',
        progress_callback: (event) => {
          if (event.status === 'progress' && typeof event.progress === 'number') {
            self.postMessage({ type: 'loading', progress: Math.round(event.progress) });
          }
        },
      });
      // Depth Anything uses 14-pixel patches; avoid upscaling the small camera frame to 518px.
      const imageProcessor = estimator.processor.image_processor;
      if (imageProcessor) imageProcessor.size = { width: 252, height: 252 };
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'frame' && estimator && !busy) {
      busy = true;
      const frame = new RawImage(new Uint8ClampedArray(data.pixels), data.width, data.height, 4);
      const { depth } = await estimator(frame);
      const values = depthToLEDs(depth);
      self.postMessage({ type: 'depth', values }, [values.buffer]);
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error?.message || error), stage: estimator ? 'inference' : 'model loading' });
  } finally {
    busy = false;
  }
};
