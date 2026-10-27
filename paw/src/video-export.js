import { Muxer, ArrayBufferTarget } from "./vendor/mp4-muxer.mjs";
// Explicit frame timestamps make a 12-second clip independent of live GPU frame rate.
export async function exportVideo(
  scene,
  {
    seconds,
    width,
    height,
    background,
    onProgress = () => {},
    cancelled = () => false,
  },
) {
  const fps = 30,
    count = Math.round(Math.max(1, Math.min(12, seconds)) * fps);
  const config = {
    codec: "avc1.420028",
    width,
    height,
    bitrate: 12000000,
    framerate: fps,
    avc: { format: "avc" },
    latencyMode: "realtime",
  };
  if (
    !globalThis.VideoEncoder ||
    !(await VideoEncoder.isConfigSupported(config)).supported
  )
    return null;
  const target = new ArrayBufferTarget(),
    muxer = new Muxer({
      target,
      video: { codec: "avc", width, height, frameRate: fps },
      fastStart: "in-memory",
      firstTimestampBehavior: "strict",
    });
  let failure = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (e) {
        failure = e;
      }
    },
    error: (e) => (failure = e),
  });
  try {
    encoder.configure(config);
    scene.setBackground(background === "transparent" ? "#eae6f0" : background);
    scene.setCaptureSize(width, height);
    for (let i = 0; i < count; i++) {
      if (cancelled()) return { cancelled: true };
      if (failure) throw failure;
      scene.renderFrame(i / fps);
      const frame = new VideoFrame(scene.canvas, {
        timestamp: Math.round((i * 1000000) / fps),
        duration: Math.round(1000000 / fps),
      });
      encoder.encode(frame, { keyFrame: i % 60 === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 5) await encoder.flush();
      onProgress((i + 1) / count);
      if (i % 3 === 0) await new Promise(requestAnimationFrame);
    }
    await encoder.flush();
    if (failure) throw failure;
    muxer.finalize();
    return {
      blob: new Blob([target.buffer], { type: "video/mp4" }),
      kind: "mp4",
      frames: count,
      seconds: count / fps,
    };
  } finally {
    if (encoder.state !== "closed") encoder.close();
    scene.renderFrame(null);
    scene.setCaptureSize();
  }
}
