import { describe, it, expect, vi } from 'vitest'
import { withOAuthRefresh } from './oauth-refresh'

function mockTokenResponse(accessToken: string, refreshToken?: string) {
  return new Response(JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
  }), { status: 200, headers: { 'content-type': 'application/json' } })
}

describe('withOAuthRefresh', () => {
  it('passes through non-401 responses unchanged', async () => {
    const baseFetch = vi.fn().mockResolvedValue(
      new Response('ok', { status: 200 })
    )
    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt_old',
    }, baseFetch)

    const response = await fetch('https://api.example.com/data')
    expect(response.status).toBe(200)
    expect(baseFetch).toHaveBeenCalledTimes(1)
  })

  it('refreshes token and retries on 401', async () => {
    const baseFetch = vi.fn()
      // First call: 401
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      // Token refresh call
      .mockResolvedValueOnce(mockTokenResponse('new_access_token'))
      // Retry with new token
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt_valid',
      clientId: 'my-client',
    }, baseFetch)

    const response = await fetch('https://api.example.com/data', {
      headers: { Authorization: 'Bearer old_token' },
    })

    expect(response.status).toBe(200)
    expect(baseFetch).toHaveBeenCalledTimes(3)

    // Verify token endpoint was called correctly
    const tokenCall = baseFetch.mock.calls[1]
    expect(tokenCall[0]).toBe('https://auth.example.com/token')
    expect(tokenCall[1].method).toBe('POST')
    const tokenBody = tokenCall[1].body
    expect(tokenBody).toContain('grant_type=refresh_token')
    expect(tokenBody).toContain('refresh_token=rt_valid')
    expect(tokenBody).toContain('client_id=my-client')

    // Verify retry uses new token
    const retryCall = baseFetch.mock.calls[2]
    const retryHeaders = retryCall[1].headers
    expect(retryHeaders['Authorization'] ?? retryHeaders['authorization']).toBe('Bearer new_access_token')
  })

  it('calls onTokenRefresh callback with new tokens', async () => {
    const onTokenRefresh = vi.fn()
    const baseFetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(mockTokenResponse('new_at', 'new_rt'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt_old',
      onTokenRefresh,
    }, baseFetch)

    await fetch('https://api.example.com/data')

    expect(onTokenRefresh).toHaveBeenCalledWith({
      accessToken: 'new_at',
      refreshToken: 'new_rt',
      expiresIn: 3600,
    })
  })

  it('returns original 401 when refresh fails', async () => {
    const baseFetch = vi.fn()
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      // Token refresh fails
      .mockResolvedValueOnce(new Response('invalid_grant', { status: 400 }))

    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt_expired',
    }, baseFetch)

    const response = await fetch('https://api.example.com/data')
    expect(response.status).toBe(401)
  })

  it('updates refresh token for subsequent refreshes', async () => {
    const baseFetch = vi.fn()
      // First request: 401
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      // First refresh: returns new refresh token
      .mockResolvedValueOnce(mockTokenResponse('at1', 'rt_rotated'))
      // First retry: success
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      // Second request: 401 again
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      // Second refresh: should use rotated refresh token
      .mockResolvedValueOnce(mockTokenResponse('at2'))
      // Second retry: success
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt_original',
    }, baseFetch)

    await fetch('https://api.example.com/data')
    await fetch('https://api.example.com/data')

    // Second refresh should use the rotated token
    const secondRefreshBody = baseFetch.mock.calls[4][1].body
    expect(secondRefreshBody).toContain('refresh_token=rt_rotated')
  })

  it('sends scopes when provided', async () => {
    const baseFetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(mockTokenResponse('at'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const fetch = withOAuthRefresh({
      tokenUrl: 'https://auth.example.com/token',
      refreshToken: 'rt',
      scopes: ['read', 'write'],
    }, baseFetch)

    await fetch('https://api.example.com/data')

    const tokenBody = baseFetch.mock.calls[1][1].body
    expect(tokenBody).toContain('scope=read+write')
  })
})
