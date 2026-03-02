import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

describe('useDevice', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return device state and spawn/attach methods', async () => {
    const { useDevice } = await import('../hooks/useDevice')
    const dev = useDevice({ type: 'usb' })
    expect(typeof dev.spawn).toBe('function')
    expect(typeof dev.attach).toBe('function')
    expect(typeof dev.status).toBe('function')
  })
})
