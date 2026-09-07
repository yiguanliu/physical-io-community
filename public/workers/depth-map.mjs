/** Resample relative inverse depth into a mirrored, aspect-preserving LED grid. */
export function depthToLEDs({ data, width, height, channels = 1 }, columns = 43, rows = 49) {
  if (!width || !height || data.length < width * height * channels) throw new Error('Invalid depth image');
  const result = new Float32Array(columns * rows);
  const aspect = columns / rows;
  const cropWidth = Math.min(width, height * aspect);
  const cropHeight = Math.min(height, width / aspect);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const sx = Math.min(width - 1, Math.floor((width - cropWidth) / 2 + (1 - (x + .5) / columns) * cropWidth));
      const sy = Math.min(height - 1, Math.floor((height - cropHeight) / 2 + (y + .5) / rows * cropHeight));
      const near = Math.max(0, Math.min(1, data[(sy * width + sx) * channels] / 255));
      result[y * columns + x] = Math.pow(near, 1.7);
    }
  }
  return result;
}
