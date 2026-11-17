/**
 * Client-side PCM audio utilities for Gemini Live API:
 * - Downsamples microphone Float32 PCM (44.1kHz / 48kHz / 16kHz) -> 16kHz 16-bit LE PCM Base64
 * - Decodes 24kHz 16-bit LE PCM Base64 from Gemini Live -> Float32Array + RMS volume level
 */

export function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function downsampleTo16kPcmBase64(
  input: Float32Array,
  inputSampleRate: number
): { base64: string; rms: number } {
  const targetRate = 16000;

  let sumSq = 0;
  for (let i = 0; i < input.length; i++) {
    const s = input[i];
    sumSq += s * s;
  }
  const rms = input.length > 0 ? Math.sqrt(sumSq / input.length) : 0;

  let resampled: Float32Array;
  if (!inputSampleRate || Math.abs(inputSampleRate - targetRate) < 10) {
    resampled = input;
  } else {
    const ratio = inputSampleRate / targetRate;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    resampled = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const frac = pos - index;
      const s0 = input[index] ?? 0;
      const s1 = input[Math.min(index + 1, input.length - 1)] ?? s0;
      resampled[i] = s0 + (s1 - s0) * frac;
    }
  }

  const pcmBuffer = new ArrayBuffer(resampled.length * 2);
  const view = new DataView(pcmBuffer);
  for (let i = 0; i < resampled.length; i++) {
    const clamped = Math.max(-1, Math.min(1, resampled[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, int16, true);
  }

  return {
    base64: uint8ToBase64(new Uint8Array(pcmBuffer)),
    rms,
  };
}

export function decode24kPcmToFloat32(base64: string): {
  float32: Float32Array;
  rms: number;
} {
  const bytes = base64ToUint8(base64);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let sumSq = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sample = view.getInt16(i * 2, true) / 32768;
    float32[i] = sample;
    sumSq += sample * sample;
  }

  const rms = sampleCount > 0 ? Math.sqrt(sumSq / sampleCount) : 0;
  return { float32, rms };
}
