"use client";

import { Button } from "@arco-design/web-react";
import PCMPlayer from "pcm-player";

export default function Main() {
  const handlePlay = async () => {
    const player = new PCMPlayer({
      channels: 1,
      sampleRate: 16000,
      flushTime: 1000,
      fftSize: 1024,
      inputCodec: "Int16",
    });

    const res = await fetch("/api/stream");
    if (res.status === 200) {
      console.info("Response started");
      const reader = res.body?.getReader();
      if (reader) {
        let buffer: number | null = null;
        while (true) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          try {
            let value = result.value;
            if (buffer) {
              // 如果 buffer 不为空，则将 buffer 和 result.value 合并
              value = new Uint8Array([buffer, ...value]);
              buffer = null;
            }
            // 如果 result.value.length 为奇数
            if (value.length % 2 === 1) {
              // 则将最后一个字节放入 buffer 里
              buffer = value[value.length - 1]!;
              // 截断 result.value 的最后一个字节
              value = value.slice(0, -1);
            }
            player.feed(value);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <Button onClick={handlePlay}>Play</Button>
    </main>
  );
}
