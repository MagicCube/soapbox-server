import WebSocket from "ws";

import {
  AudioStream,
  type AudioFormat,
  type AudioSampleRate,
} from "~/core/audio";
import { sleep } from "~/core/utils/timer";
import { generateUUID } from "~/core/utils/uuid";
import { env } from "~/env";

import { type CosyVoiceCommand } from "./commands";
import { type CosyVoiceName } from "./types";

const NAMESPACE = "FlowingSpeechSynthesizer";
const WS_ENTRY_POINT = "wss://nls-gateway-cn-beijing.aliyuncs.com/ws/v1";

export interface CosyVoiceServiceConfig {
  format: AudioFormat;
  /**
   * 16kHz 是默认值
   */
  sampleRate: AudioSampleRate;

  /**
   * 音量，取值范围：0～100。默认值：50。
   */
  volume: number;

  /**
   * 语速，取值范围：-500～500，默认值：0。
   * [-500,0,500]对应的语速倍速区间为 [0.5,1.0,2.0]。
   */
  speechRate: number;

  /**
   * 语调，取值范围：-500～500，默认值：0。
   */
  pitchRate: number;

  voice: CosyVoiceName;
}

const DEFAULT_CONFIG: CosyVoiceServiceConfig = {
  format: "pcm",
  voice: "zhiyan_emo",
  sampleRate: 8000,
  volume: 50,
  speechRate: 0,
  pitchRate: 0,
};

export type CosyVoiceServiceState =
  | "closed"
  | "connecting"
  | "connected"
  | "synthesis-started"
  | "synthesis-completed";

export class CosyVoiceService {
  private _ws: WebSocket | null = null;

  readonly config: CosyVoiceServiceConfig;

  private _state: CosyVoiceServiceState = "closed";

  private _audioStream: AudioStream | null = null;

  constructor(config: Partial<CosyVoiceServiceConfig> = {}) {
    this.config = Object.assign(
      DEFAULT_CONFIG,
      config,
    ) as CosyVoiceServiceConfig;
  }

  get state(): CosyVoiceServiceState {
    return this._state;
  }

  get audioStream() {
    if (!this._audioStream) {
      throw new Error("Audio stream is not available");
    }
    return this._audioStream;
  }

  protected get ws(): WebSocket {
    if (!this._ws) {
      throw new Error("WebSocket is not connected");
    }
    return this._ws;
  }

  private _taskId: string | null = null;
  get taskId(): string {
    if (!this._taskId) {
      throw new Error("Synthesis task has not been started yet");
    }
    return this._taskId;
  }

  async open() {
    const accessToken = await this.getAccessToken();
    this._ws = new WebSocket(WS_ENTRY_POINT, {
      headers: {
        "X-NLS-Token": `${accessToken}`,
      },
    });
    this._state = "connecting";
    return new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        this.ws.off("open", handleOpen);
        this.ws.off("error", handleError);
        this.ws.on("message", this.handleMessage);
        this.ws.on("error", this.handleMessage);
        this._state = "connected";
        this.ping();
        resolve();
      };
      const handleError = (error: Error) => {
        console.error(
          `CosyVoiceService failed to connect to ${WS_ENTRY_POINT}`,
          error,
        );
        this.ws.off("open", handleOpen);
        this.ws.off("error", handleError);
        this._ws = null;
        this._state = "closed";
        reject(error);
      };
      this._ws!.on("open", handleOpen);
      this._ws!.on("error", handleError);
    });
  }

  close() {
    if (this._ws) {
      this._ws.off("message", this.handleMessage);
      this._ws.off("error", this.handleError);
      this._ws.close();
      this._ws = null;
    }
    this._audioStream = null;
    this._state = "closed";
  }

  async startSynthesis() {
    this._taskId = generateUUID();
    this.sendCommand({
      name: "StartSynthesis",
      payload: {
        voice: this.config.voice,
        format: this.config.format,
        sample_rate: this.config.sampleRate,
        volume: this.config.volume,
        speech_rate: this.config.speechRate,
        pitch_rate: this.config.pitchRate,
      },
    });
    await this.waitUntil("synthesis-started");
    this._audioStream = new AudioStream();
  }

  async stopSynthesis() {
    this.sendCommand({
      name: "StopSynthesis",
    });
    await this.waitUntilSynthesisCompleted();
  }

  speak(text: string) {
    this.sendCommand({
      name: "RunSynthesis",
      payload: {
        text,
      },
    });
  }

  async waitUntilSynthesisCompleted(timeout = 5 * 1000) {
    await this.waitUntil("synthesis-completed", timeout);
  }

  protected async getAccessToken(): Promise<string> {
    return env.ALIYUN_NLS_ACCESS_TOKEN;
  }

  protected async waitUntil(state: CosyVoiceServiceState, timeout = 5 * 1000) {
    let elapsed = 0;
    while (this.state !== state) {
      await sleep(50);
      elapsed += 50;
      if (elapsed > timeout) {
        throw new Error(`Failed to wait for ${state} state`);
      }
    }
  }

  protected sendCommand(command: CosyVoiceCommand) {
    this.ws.send(
      JSON.stringify({
        header: {
          name: command.name,
          task_id: this.taskId,
          message_id: generateUUID(),
          namespace: NAMESPACE,
          appkey: env.ALIYUN_NLS_APP_KEY,
        },
        payload: command.payload,
      }),
    );
  }

  protected ping() {
    const canPing =
      this._ws &&
      this._ws.readyState === WebSocket.OPEN &&
      this.state !== "closed" &&
      this.state !== "connecting";
    if (canPing) {
      this.ws.ping();
      setTimeout(() => {
        this.ping();
      }, 5000);
    }
  }

  protected handleMessage = (message: WebSocket.Data) => {
    if (message instanceof Buffer) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      if (message.at(0) === 123 && message.at(message.length - 1) === 125) {
        // json
        this.handleJsonMessage(message);
      } else {
        // audio
        this.handleAudioMessage(message);
      }
    } else {
      console.error("CosyVoiceService received non-buffer message");
    }
  };

  protected handleJsonMessage = (message: Buffer) => {
    const jsonString = message.toString();
    const json = JSON.parse(jsonString);
    const name = json.header.name;
    switch (name) {
      case "SynthesisStarted":
        this._state = "synthesis-started";
        break;
      case "SynthesisCompleted":
        this._state = "synthesis-completed";
        this.audioStream.close();
        break;
      case "SentenceBegin":
      case "SentenceSynthesis":
      case "SentenceEnd":
        break;
      case "TaskFailed":
        console.error("CosyVoiceService task failed:", json);
        break;
      default:
        console.info("CosyVoiceService received unknown JSON message:", json);
    }
  };

  protected handleAudioMessage = (message: Buffer) => {
    this.audioStream.write(message);
  };

  protected handleError = (error: WebSocket.ErrorEvent) => {
    console.error("CosyVoiceService WebSocket error:", error);
  };
}
