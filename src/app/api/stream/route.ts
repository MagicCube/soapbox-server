import { type NextRequest } from "next/server";

import { type AudioFormat } from "~/core/audio";
import { CosyVoiceService } from "~/core/cosy-voice";

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ??
    "pcm") as AudioFormat;
  const cosyVoiceService = new CosyVoiceService({
    format,
  });
  await cosyVoiceService.open();
  await cosyVoiceService.startSynthesis();
  cosyVoiceService.speak("你知道AI是什么吗？");
  cosyVoiceService.speak(
    "AI 就像一个超级聪明的机器人大脑，它能听懂和说很多很多的话。",
  );
  // cosyVoiceService.speak("举一个例子，AI 可以回答你任何问题，");
  // cosyVoiceService.speak("还能够为你画图，");
  // cosyVoiceService.speak("甚至为你写代码。");
  // cosyVoiceService.speak("未来还能替代人类，驾驶汽车，从事繁重的工作。");
  void cosyVoiceService.stopSynthesis();

  return new Response(cosyVoiceService.audioStream, {
    headers: {
      "Content-Type": `audio/${format}`,
    },
  });
}
