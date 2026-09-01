/**
 * The matrix's content buffer.
 *
 * One low-resolution greyscale field that the shader samples per cell. The
 * scene owns the pixels; sections write into them. Keeping this outside React
 * is deliberate — doctrine rule 4 says the render loop reads the DOM and this
 * buffer, never component state.
 */

export const DATA_W = 128;
export const DATA_H = 72;

export interface MatrixState {
  /** DATA_W * DATA_H greyscale cells, 0–255. */
  pixels: Uint8Array;
  /** Set when pixels change, cleared once the GPU has the new texture. */
  dirty: boolean;
  /** Global intensity, 0–1. Sections fade the field in and out with this. */
  amp: number;
  /** While true the calibration sequence owns the field; the score stands off. */
  locked: boolean;
}

export const matrix: MatrixState = {
  pixels: new Uint8Array(DATA_W * DATA_H),
  dirty: true,
  amp: 1,
  locked: false,
};
