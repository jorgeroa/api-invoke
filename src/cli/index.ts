/**
 * api-bridge CLI — list, call, and serve API operations.
 *
 * Usage:
 *   api-bridge list <spec-url>
 *   api-bridge call <spec-url> <operation-id> [--arg key=value]...
 *   api-bridge serve <spec-url> [--name <name>] [--token <token>]
 */

import { createClient } from '../client'
import { toMCPTools } from '../agents/mcp'
import { formatResponse } from '../agents/response-formatter'
import { generateToolName } from '../enrichment/heuristic/naming'
import type { Auth, Operation } from '../core/types'

// ── Arg parsing ──

interface ListArgs {
  command: 'list'
  specUrl: string
  token?: string
}

interface CallArgs {
  command: 'call'
  specUrl: string
  operationId: string
  args: Record<string, unknown>
  token?: string
  fullResponse?: boolean
}

interface ServeArgs {
  command: 'serve'
  specUrl: string
  name?: string
  token?: string
  fullResponse?: boolean
}

interface HelpArgs {
  command: 'help'
}

type CliArgs = ListArgs | CallArgs | ServeArgs | HelpArgs

function parseArgs(argv: string[]): CliArgs {
  const positional = argv.slice(2)
  if (positional.length === 0 || positional[0] === '--help' || positional[0] === '-h') {
    return { command: 'help' }
  }

  const command = positional[0]
  if (command !== 'list' && command !== 'call' && command !== 'serve') {
    return die(`Unknown command: ${command}. Use list, call, or serve.`)
  }

  const specUrl = positional[1]
  if (!specUrl) {
    return die(`Missing spec URL for "${command}" command.`)
  }

  let token: string | undefined
  let name: string | undefined
  let fullResponse = false
  const callArgs: Record<string, unknown> = {}
  let operationId: string | undefined

  // For call: third positional is operation ID
  if (command === 'call') {
    operationId = positional[2]
    if (!operationId) {
      die('Missing operation ID for "call" command.')
    }
  }

  // Parse flags
  const flagStart = command === 'call' ? 3 : 2
  let i = flagStart
  while (i < positional.length) {
    const arg = positional[i]
    const next = positional[i + 1]

    switch (arg) {
      case '--token':
        if (!next) die('--token requires a value')
        token = next
        i += 2
        break
      case '--name':
        if (!next) die('--name requires a value')
        name = next
        i += 2
        break
      case '--arg': {
        if (!next) die('--arg requires key=value')
        const eq = next.indexOf('=')
        if (eq <= 0) die(`Invalid --arg format: ${next}. Use key=value.`)
        const key = next.substring(0, eq)
        const val = next.substring(eq + 1)
        // Try to parse as JSON, fall back to string
        try { callArgs[key] = JSON.parse(val) } catch { callArgs[key] = val }
        i += 2
        break
      }
      case '--full-response':
        fullResponse = true
        i += 1
        break
      default:
        die(`Unknown flag: ${arg}`)
    }
  }

  switch (command) {
    case 'list':
      return { command: 'list', specUrl, token }
    case 'call':
      return { command: 'call', specUrl, operationId: operationId!, args: callArgs, token, fullResponse }
    case 'serve':
      return { command: 'serve', specUrl, name, token, fullResponse }
  }
}

function die(message: string): never {
  console.error(`Error: ${message}`)
  process.exit(1)
}

function buildAuth(token?: string): Auth | undefined {
  if (!token) return undefined
  return { type: 'bearer', token }
}

// ── Commands ──

async function runList(args: ListArgs) {
  const client = await createClient(args.specUrl, { auth: buildAuth(args.token) })
  const tools = toMCPTools(client.api)

  console.log(`${client.api.title} v${client.api.version}`)
  console.log(`Base URL: ${client.api.baseUrl}`)
  console.log(`Operations: ${tools.length}\n`)

  for (let i = 0; i < client.api.operations.length; i++) {
    const op = client.api.operations[i]
    const tool = tools[i]
    const params = Object.keys(tool.inputSchema.properties)
    const required = tool.inputSchema.required ?? []
    const paramStr = params.map(p => required.includes(p) ? p : `${p}?`).join(', ')
    console.log(`  ${op.id}(${paramStr})`)
    if (tool.description) {
      console.log(`    ${tool.description}`)
    }
  }
}

/**
 * Find an operation by raw ID or by tool name (snake_case).
 */
function resolveOperation(operations: Operation[], nameOrId: string): Operation | undefined {
  // Try exact operation ID first
  const byId = operations.find(op => op.id === nameOrId)
  if (byId) return byId

  // Try matching by generated tool name
  return operations.find(op => generateToolName(op) === nameOrId)
}

async function runCall(args: CallArgs) {
  const client = await createClient(args.specUrl, { auth: buildAuth(args.token) })
  const op = resolveOperation(client.api.operations, args.operationId)
  if (!op) {
    const ids = client.api.operations.map(o => o.id).join(', ')
    die(`Operation "${args.operationId}" not found. Available: ${ids}`)
  }
  const result = await client.execute(op.id, args.args)
  const output = formatResponse(result.data, {
    fullResponse: args.fullResponse,
  })
  console.log(output)
}

async function runServe(args: ServeArgs) {
  // Dynamic import — @modelcontextprotocol/sdk is a peer dependency
  let McpServer: any
  let StdioServerTransport: any

  try {
    // @ts-ignore — optional peer dependency, dynamically loaded
    const serverMod = await import('@modelcontextprotocol/sdk/server/mcp.js')
    McpServer = serverMod.McpServer
    // @ts-ignore — optional peer dependency, dynamically loaded
    const transportMod = await import('@modelcontextprotocol/sdk/server/stdio.js')
    StdioServerTransport = transportMod.StdioServerTransport
  } catch {
    die(
      '@modelcontextprotocol/sdk is required for serve mode.\n' +
      'Install it: npm install @modelcontextprotocol/sdk'
    )
  }

  const client = await createClient(args.specUrl, { auth: buildAuth(args.token) })
  const serverName = args.name ?? client.api.title ?? 'api-bridge'

  const server = new McpServer({
    name: serverName,
    version: client.api.version ?? '0.1.0',
  })

  // Register each operation as an MCP tool
  for (const op of client.api.operations) {
    const tools = toMCPTools({ ...client.api, operations: [op] })
    if (tools.length === 0) continue
    const tool = tools[0]

    // Build Zod-like schema map for MCP SDK (it expects Zod, but we use the raw shape)
    // The MCP SDK's registerTool actually accepts plain JSON Schema via the shape parameter
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.properties,
      async (params: Record<string, unknown>) => {
        try {
          const result = await client.execute(op.id, params)
          const text = formatResponse(result.data, {
            fullResponse: args.fullResponse,
          })
          return { content: [{ type: 'text' as const, text }] }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return { content: [{ type: 'text' as const, text: message }], isError: true }
        }
      },
    )
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`[api-bridge] MCP server "${serverName}" running on stdio with ${client.api.operations.length} tools`)
}

function printHelp() {
  console.log(`api-bridge — Universal API bridge CLI

Usage:
  api-bridge list <spec-url> [--token <token>]
  api-bridge call <spec-url> <operation-id> [--arg key=value]... [--token <token>] [--full-response]
  api-bridge serve <spec-url> [--name <name>] [--token <token>] [--full-response]

Commands:
  list     List all operations in an API spec
  call     Execute a single API operation
  serve    Start an MCP server exposing all operations as tools

Options:
  --token <token>      Bearer token for authentication
  --name <name>        Server name (serve mode, default: API title)
  --arg key=value      Operation argument (call mode, repeatable)
  --full-response      Disable response truncation
  -h, --help           Show this help message
`)
}

// ── Main ──

async function main() {
  const args = parseArgs(process.argv)

  switch (args.command) {
    case 'help':
      printHelp()
      break
    case 'list':
      await runList(args)
      break
    case 'call':
      await runCall(args)
      break
    case 'serve':
      await runServe(args)
      break
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
