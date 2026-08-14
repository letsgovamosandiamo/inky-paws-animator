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

  class GifEncoder {
    constructor(width, height, delay, options = {}) {
      this.width = width;
      this.height = height;
      this.delay = delay;
      this.transparent = options.transparent !== false;
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

    addFrame(rgba, delay = this.delay) {
      if (!rgba || rgba.length !== this.width * this.height * 4) {
        throw new Error(`Invalid GIF frame buffer: expected ${this.width * this.height * 4} RGBA bytes.`);
      }
      const indexed = new Uint8Array(this.width * this.height);
      for (let pixel = 0, offset = 0; pixel < indexed.length; pixel++, offset += 4) {
        if (this.transparent && rgba[offset + 3] < 64) {
          indexed[pixel] = 0;
          continue;
        }
        const paletteIndex = ((rgba[offset] >> 5) << 5) | ((rgba[offset + 1] >> 5) << 2) | (rgba[offset + 2] >> 6);
        indexed[pixel] = paletteIndex || 1;
      }
      const out = this.out;
      out.byte(0x21);
      out.byte(0xf9);
      out.byte(4);
      out.byte(this.transparent ? 9 : 8);
      out.short(Math.max(1, delay));
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

  function lzw(data) {
    const clear = 256, end = 257, output = [];
    let current = 0, bits = 0, next = 258, dictionary = new Map();
    const write = (code) => {
      current |= code << bits;
      bits += 9;
      while (bits >= 8) {
        output.push(current & 255);
        current >>>= 8;
        bits -= 8;
      }
    };
    write(clear);
    if (!data.length) {
      write(end);
      if (bits) output.push(current & 255);
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
      if (next < 510) dictionary.set(key, next++);
      else { write(clear); dictionary = new Map(); next = 258; }
      prefix = suffix;
    }
    write(prefix);
    write(end);
    if (bits) output.push(current & 255);
    return output;
  }

  root.ByteWriter = ByteWriter;
  root.GifEncoder = GifEncoder;
})(globalThis);
