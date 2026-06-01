import { spawn } from 'node:child_process'

const previewPort = 4173
const previewUrl = `http://127.0.0.1:${previewPort}`

const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(previewPort)], {
  stdio: 'ignore',
  detached: true,
})

preview.unref()

async function waitForPreview(maxWaitMs = 180000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const response = await fetch(previewUrl)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  throw new Error(`Preview server was not ready at ${previewUrl}`)
}

try {
  await waitForPreview()

  const lighthouse = spawn('npx', ['lhci', 'autorun', '--config', './.lighthouserc.cjs'], {
    stdio: 'inherit',
    shell: true,
  })

  lighthouse.on('exit', (code) => {
    preview.kill('SIGTERM')
    process.exit(code ?? 1)
  })
} catch (error) {
  preview.kill('SIGTERM')
  console.error(error)
  process.exit(1)
}
