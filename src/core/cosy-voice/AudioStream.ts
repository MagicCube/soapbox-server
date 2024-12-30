export class AudioStream extends ReadableStream<Buffer> {
  private _source: AudioStreamSource;

  constructor() {
    const source = new AudioStreamSource();
    super(source);
    this._source = source;
  }

  write(data: Buffer) {
    this._source.write(data);
  }

  close() {
    this._source.close();
  }
}

export class AudioStreamSource implements UnderlyingDefaultSource {
  private _controller: ReadableStreamDefaultController | null = null;

  async pull(controller: ReadableStreamDefaultController) {
    this._controller = controller;
  }

  write(data: Buffer) {
    if (!this._controller) {
      throw new Error("Controller not initialized");
    }
    this._controller.enqueue(data);
    console.info("Write data", data.length);
  }

  close() {
    if (!this._controller) {
      throw new Error("Controller not initialized");
    }
    this._controller.close();
  }
}
