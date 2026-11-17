/**
 * Client-side PCM audio utilities for Gemini Live API:
 * - Downsamples microphone Float32 PCM (44.1kHz / 48kHz / 16kHz) -> 16kHz 16-bit LE PCM Int16 & Base64
 * - Encodes 16kHz Int16 PCM chunks into a standard WAV Base64 payload (used in serverless HTTP live fallback)
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
): { base64: string; int16: Int16Array; rms: number } {
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

  const int16 = new Int16Array(resampled.length);
  const pcmBuffer = new ArrayBuffer(resampled.length * 2);
  const view = new DataView(pcmBuffer);
  for (let i = 0; i < resampled.length; i++) {
    const clamped = Math.max(-1, Math.min(1, resampled[i]));
    const val = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
    int16[i] = val;
    view.setInt16(i * 2, val, true);
  }

  return {
    base64: uint8ToBase64(new Uint8Array(pcmBuffer)),
    int16,
    rms,
  };
}

export function encode16kInt16ChunksToWavBase64(chunks: Int16Array[]): string {
  let totalSamples = 0;
  for (const c of chunks) totalSamples += c.length;
  if (totalSamples === 0) return '';

  const sampleRate = 16000;
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }

  return uint8ToBase64(new Uint8Array(buffer));
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
