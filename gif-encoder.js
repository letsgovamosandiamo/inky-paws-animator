(function (root) {
  "use strict";

  class ByteWriter {
    constructor() { this.bytes = []; }
    byte(value) { this.bytes.push(value & 255); }
    short(value) { this.byte(value); this.byte(value >> 8); }
    text(value) { for (let i = 0; i < value.length; i++) this.byte(value.charCodeAt(i)); }
    block(data) {
      for (let offset = 0; offset < data.length; offset += 255) {
        const length = Math.min(255, data.length - offset);
        this.byte(length);
        for (let i = 0; i < length; i++) this.byte(data[offset + i]);
      }
      this.byte(0);
    }
  }

  function lzw(data) {
    const clear = 256, end = 257, output = [];
    let current = 0, bitCount = 0, nextCode = 258, dictionary = new Map();
    const write = (code) => {
      current |= code << bitCount;
      bitCount += 9;
      while (bitCount >= 8) {
        output.push(current & 255);
        current >>>= 8;
        bitCount -= 8;
      }
    };

    write(clear);
    if (!data.length) {
      write(end);
      if (bitCount) output.push(current & 255);
      return output;
    }

    let prefix = data[0];
    for (let i = 1; i < data.length; i++) {
      const suffix = data[i], key = `${prefix},${suffix}`;
      if (dictionary.has(key)) {
        prefix = dictionary.get(key);
        continue;
      }
      write(prefix);
      if (nextCode < 510) dictionary.set(key, nextCode++);
      else { write(clear); dictionary = new Map(); nextCode = 258; }
      prefix = suffix;
    }
    write(prefix);
    write(end);
    if (bitCount) output.push(current & 255);
    return output;
  }

  class GifEncoder {
    constructor(width, height, options = {}) {
      this.width = width;
      this.height = height;
      this.fps = options.fps || 15;
      this.transparent = options.transparent !== false;
      this.frameIndex = 0;
      this.out = new ByteWriter();

      const out = this.out;
      out.text("GIF89a");
      out.short(width);
      out.short(height);
      out.byte(0xf7);
      out.byte(0);
      out.byte(0);
      for (let index = 0; index < 256; index++) {
        out.byte((index >> 5) * 255 / 7);
        out.byte(((index >> 2) & 7) * 255 / 7);
        out.byte((index & 3) * 255 / 3);
      }
      if (options.loop !== false) {
        out.byte(0x21);
        out.byte(0xff);
        out.byte(11);
        out.text("NETSCAPE2.0");
        out.byte(3);
        out.byte(1);
        out.short(0);
        out.byte(0);
      }
    }

    addFrame(imageData) {
      if (!imageData || !imageData.data || imageData.data.length !== this.width * this.height * 4) {
        throw new Error(`Invalid GIF frame buffer: expected ${this.width * this.height * 4} RGBA bytes.`);
      }
      if (imageData.width !== this.width || imageData.height !== this.height) {
        throw new Error(`Invalid GIF frame dimensions: expected ${this.width} × ${this.height}.`);
      }

      const rgba = imageData.data, indexed = new Uint8Array(this.width * this.height);
      for (let pixel = 0, offset = 0; pixel < indexed.length; pixel++, offset += 4) {
        if (this.transparent && rgba[offset + 3] < 64) {
          indexed[pixel] = 0;
          continue;
        }
        const paletteIndex = ((rgba[offset] >> 5) << 5) | ((rgba[offset + 1] >> 5) << 2) | (rgba[offset + 2] >> 6);
        indexed[pixel] = paletteIndex || 1;
      }

      const delay = Math.max(1,
        Math.round((this.frameIndex + 1) * 100 / this.fps) - Math.round(this.frameIndex * 100 / this.fps));
      this.frameIndex++;

      const out = this.out;
      out.byte(0x21);
      out.byte(0xf9);
      out.byte(4);
      out.byte(this.transparent ? 9 : 8);
      out.short(delay);
      out.byte(0);
      out.byte(0);
      out.byte(0x2c);
      out.short(0);
      out.short(0);
      out.short(this.width);
      out.short(this.height);
      out.byte(0);
      out.byte(8);
      out.block(lzw(indexed));
    }

    finish() {
      this.out.byte(0x3b);
      return new Blob([new Uint8Array(this.out.bytes)], { type: "image/gif" });
    }
  }

  root.ByteWriter = ByteWriter;
  root.GifEncoder = GifEncoder;
  root.gifLzw = lzw;
})(globalThis);
