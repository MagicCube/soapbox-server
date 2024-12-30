import { type NextRequest } from "next/server";

import { type AudioFormat, CosyVoiceService } from "~/core/cosy-voice";

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ??
    "wav") as AudioFormat;
  const cosyVoiceService = new CosyVoiceService({
    format,
  });
  await cosyVoiceService.open();
  await cosyVoiceService.startSynthesis();
  cosyVoiceService.speak("你知道AI是什么吗？");
  cosyVoiceService.speak(
    "AI 就像一个超级聪明的机器人大脑，它能听懂和说很多很多的话。",
  );
  void cosyVoiceService.stopSynthesis();

  return new Response(cosyVoiceService.audioStream, {
    headers: {
      "Content-Type": `application/octet-stream`,
    },
  });
}
