import {
  type AudioFormat,
  type AudioSampleRate,
  type CosyVoiceName,
} from "./types";

interface GenericCosyVoiceCommand<
  T extends string,
  P extends Record<string, boolean | number | string> | undefined = undefined,
> {
  name: T;
  payload?: P;
}

export type StartSynthesisCommand = GenericCosyVoiceCommand<
  "StartSynthesis",
  {
    voice: CosyVoiceName;
    format: AudioFormat;
    sample_rate: AudioSampleRate;
    volume: number;
    speech_rate: number;
    pitch_rate: number;
  }
>;

export type RunSynthesisCommand = GenericCosyVoiceCommand<
  "RunSynthesis",
  {
    text: string;
  }
>;

export type StopSynthesisCommand = GenericCosyVoiceCommand<"StopSynthesis">;

export type CosyVoiceCommand =
  | StartSynthesisCommand
  | StopSynthesisCommand
  | RunSynthesisCommand;

export type TextToSpeechCommandName = CosyVoiceCommand["name"];
