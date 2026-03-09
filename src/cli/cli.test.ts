import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { join } from 'path'

const bin = join(__dirname, '../../bin/api-bridge.js')

function run(...args: string[]): string {
  return execFileSync('node', [bin, ...args], {
    encoding: 'utf-8',
    timeout: 5000,
  }).trim()
}

function runErr(...args: string[]): string {
  try {
    execFileSync('node', [bin, ...args], {
      encoding: 'utf-8',
      timeout: 5000,
    })
    return ''
  } catch (err: any) {
    return (err.stderr || err.stdout || '').trim()
  }
}

describe('CLI', () => {
  it('shows help with --help', () => {
    const output = run('--help')
    expect(output).toContain('api-bridge')
    expect(output).toContain('list')
    expect(output).toContain('call')
    expect(output).toContain('serve')
  })

  it('shows help with -h', () => {
    const output = run('-h')
    expect(output).toContain('api-bridge')
  })

  it('shows help with no args', () => {
    const output = run()
    expect(output).toContain('Usage:')
  })

  it('errors on unknown command', () => {
    const output = runErr('foo')
    expect(output).toContain('Unknown command: foo')
  })

  it('errors on missing spec URL', () => {
    const output = runErr('list')
    expect(output).toContain('Missing spec URL')
  })

  it('errors on missing operation ID for call', () => {
    const output = runErr('call', 'https://example.com/openapi.json')
    expect(output).toContain('Missing operation ID')
  })
})
