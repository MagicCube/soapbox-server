import RPCClient from "@alicloud/pop-core";

import { env } from "~/env";

interface AccessToken {
  tokenID: string;
  expiredTime: number;
}

export class AccessTokenService {
  private _client: RPCClient;

  private _token?: AccessToken;

  constructor() {
    this._client = new RPCClient({
      accessKeyId: env.ALIYUN_AK_ID,
      accessKeySecret: env.ALIYUN_AK_SECRET,
      endpoint: "http://nls-meta.cn-shanghai.aliyuncs.com",
      apiVersion: "2019-02-28",
    });
  }

  async getToken() {
    this._loadToken();
    if (!this._token || this._token.expiredTime < Date.now()) {
      await this.renew();
    }
    return this._token!.tokenID;
  }

  async renew() {
    const {
      Token: { Id, ExpireTime },
    } = await this._client.request<{
      Token: { Id: string; ExpireTime: number };
    }>("CreateToken", {});
    this._token = {
      tokenID: Id,
      expiredTime: ExpireTime * 1000,
    };
    console.info(this._token);
    this._saveToken();
  }

  private _saveToken() {
    // TODO: save token to KV store
  }

  private _loadToken() {
    // TODO: load token from KV store
  }
}

export const accessTokenService = new AccessTokenService();
