import { BINDING_URL, CRED_CODE_URL, SKLAND_ATTENDANCE_URL, SKLAND_CHECKIN_URL } from '../constant'
import type { AttendanceResponse, BindingResponse, CredResponse, SklandBoard } from '../types'
import { command_header, generateSignature } from '../utils'

/**
 * grant_code 获得森空岛用户的 token 等信息
 * @param grant_code 从 OAuth 接口获取的 grant_code
 */
export async function signIn(grant_code: string) {
  const response = await fetch(CRED_CODE_URL, {
    method: 'POST',
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
    }, command_header),
    body: JSON.stringify({
      code: grant_code,
      kind: 1,
    }),
  })
  const data = await response.json() as CredResponse

  if (data.code !== 0)
    throw new Error(`登录获取 cred 错误:${data.message}`)

  return data.data
}
/**
 * 通过登录凭证和森空岛用户的 token 获取角色绑定列表
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function getBinding(cred: string, token: string) {
  const url = new URL(BINDING_URL);
  const [sign, headers] = generateSignature(token, url);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(BINDING_URL, {
        headers: Object.assign(headers, { sign, cred }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`请求失败，状态码: ${response.status}, 返回内容: ${text}`);
        attempts++;
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
      }
    } catch (error) {
      console.error(`请求出错: ${error.message}`);
      attempts++;
    }

    if (attempts < maxAttempts) {
      console.log(`重试第 ${attempts} 次...`);
    }
  }

  throw new Error(`请求失败超过 ${maxAttempts} 次，无法获取绑定角色`);
}
/**
 * 登岛检票
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function checkIn(cred: string, token: string, id: SklandBoard) {
  const url = new URL(SKLAND_CHECKIN_URL)
  const body = { gameId: id.toString() }
  const [sign, cryptoHeaders] = generateSignature(token, url, body)
  const headers = Object.assign(cryptoHeaders, { sign, cred, 'Content-Type': 'application/json;charset=utf-8' }, command_header)
  const response = await fetch(
    url,
    { method: 'POST', headers, body: JSON.stringify(body) },
  )
  const data = await response.json() as { code: number, message: string, timestamp: string }
  return data
}
/**
 * 明日方舟每日签到
 * @param cred 鹰角网络通行证账号的登录凭证
 * @param token 森空岛用户的 token
 */
export async function attendance(cred: string, token: string, body: { uid: string, gameId: string }) {
  const url = new URL(SKLAND_ATTENDANCE_URL)
  const [sign, cryptoHeaders] = generateSignature(token, url, body)
  const headers = Object.assign(cryptoHeaders, { sign, cred, 'Content-Type': 'application/json;charset=utf-8' }, command_header)

  const response = await fetch(
    SKLAND_ATTENDANCE_URL,
    { method: 'POST', headers, body: JSON.stringify(body) },
  )
  const data = await response.json() as AttendanceResponse

  return data
}
