class AntonioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = Math.max(128, Math.round(sampleRate * 0.02));
    this.buf = new Float32Array(this.frameSize);
    this.pos = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    let i = 0;
    while (i < ch.length) {
      const take = Math.min(ch.length - i, this.frameSize - this.pos);
      this.buf.set(ch.subarray(i, i + take), this.pos);
      this.pos += take;
      i += take;
      if (this.pos >= this.frameSize) {
        const out = this.buf.slice();
        this.port.postMessage(out.buffer, [out.buffer]);
        this.buf = new Float32Array(this.frameSize);
        this.pos = 0;
      }
    }
    return true;
  }
}
registerProcessor('antonio-capture', AntonioCaptureProcessor);
