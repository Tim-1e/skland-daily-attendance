
import { createFetch } from 'ofetch'
import { ProxyAgent } from 'proxy-agent'
import type { AttendanceResponse, BindingResponse, CredResponse, GetAttendanceResponse, SklandBoard } from '../types'
import { command_header, onSignatureRequest } from '../utils'
import { SKLAND_BOARD_IDS } from '../constant'

const fetch = createFetch({
  defaults: {
    baseURL: 'https://zonai.skland.com',
    onRequest: onSignatureRequest,
    // @ts-expect-error ignore
    agent: new ProxyAgent(),
  },
})

/**
 * grant_code 获得森空岛用户的 token 等信息
 * @param grant_code 从 OAuth 接口获取的 grant_code
 */
export async function signIn(grant_code: string) {
  const data = await fetch<CredResponse>(
    '/api/v1/user/auth/generate_cred_by_code',
    {
      method: 'POST',
      headers: command_header,
      body: {
        code: grant_code,
        kind: 1,
      },
      onRequestError(ctx) {
        throw new Error(`登录获取 cred 错误:${ctx.error.message}`)
      },
    },
  )

  return data.data
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 通过登录凭证和森空岛用户的 token 获取角色绑定列表
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function getBinding(cred: string, token: string) {

  let attempts = 0;
  const maxAttempts = 5;
  const delay = 10000; // 每次重试之间的延迟时间（毫秒）

  const data = await fetch<BindingResponse>(
    '/api/v1/game/player/binding',
    {
      headers: { token, cred },
      onRequestError(ctx) {
        throw new Error(`获取绑定角色错误:${ctx.error.message}`)
      },
    },
  )

  while (attempts < maxAttempts) {
    try {
      console.log(`尝试获取URL: ${url.toString()}`);
      const response = await fetch(BINDING_URL, {
        headers: Object.assign(headers, { sign, cred }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`请求失败，状态码: ${response.status}, 返回内容: ${text}`);
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`重试第 ${attempts} 次...`);
          await sleep(delay); // 延迟再重试
        }
        continue;
      }

      try {
        const data = await response.json() as BindingResponse;
        if (data.code !== 0) {
          throw new Error(`获取绑定角色错误:${data.message}`);
        }
        return data.data;
      } catch (error) {
        const text = await response.text();
        console.error(`解析响应数据错误: ${error.message}, 返回内容: ${text}`);
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`重试第 ${attempts} 次...`);
          await sleep(delay); // 延迟再重试
        }
      }
    } catch (error) {
      console.error(`请求出错: ${error.message}`);
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`重试第 ${attempts} 次...`);
        await sleep(delay); // 延迟再重试
      }
    }
  }

  throw new Error(`请求失败超过 ${maxAttempts} 次，无法获取绑定角色`);
}

export async function getScoreIsCheckIn(cred: string, token: string) {
  const data = await fetch<{ code: number, message: string, data: { list: { gameId: number, checked: 1 | 0 }[] } }>(
    '/api/v1/score/ischeckin',
    {
      headers: Object.assign({ token, cred }, command_header),
      query: {
        gameIds: SKLAND_BOARD_IDS
      }
    },
  )
  return data
}

/**
 * 登岛检票
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function checkIn(cred: string, token: string, id: SklandBoard) {

  const data = await fetch<{ code: number, message: string, timestamp: string }>(
    '/api/v1/score/checkin',
    {
      method: 'POST',
      headers: Object.assign({ token, cred }, command_header),
      body: { gameId: id.toString() },
    },
  )
  return data
}

/**
 * 明日方舟每日签到
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function attendance(cred: string, token: string, body: { uid: string, gameId: string }) {

  const record = await fetch<GetAttendanceResponse>(
    '/api/v1/game/attendance',
    {
      headers: Object.assign({ token, cred }, command_header),
      query: body,
    },
  )


  const todayAttended = record.data.records.find((i) => {
    const today = new Date().setHours(0, 0, 0, 0)
    return new Date(Number(i.ts) * 1000).setHours(0, 0, 0, 0) === today
  })
  if (todayAttended) {
    // 今天已经签到过了
    return false
  }
  else {
    const data = await fetch<AttendanceResponse>(
      '/api/v1/game/attendance',
      {
        method: 'POST',
        headers: Object.assign({ token, cred }, command_header),
        body,
      },
    )
    return data
  }
}
