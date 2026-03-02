import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }))

describe('useWindow', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return window control methods', async () => {
    const { useWindow } = await import('../hooks/useWindow')
    const win = useWindow('overlay')
    expect(typeof win.show).toBe('function')
    expect(typeof win.hide).toBe('function')
    expect(typeof win.toggle).toBe('function')
    expect(typeof win.close).toBe('function')
    expect(typeof win.setPosition).toBe('function')
    expect(typeof win.setSize).toBe('function')
    expect(typeof win.setAlwaysOnTop).toBe('function')
    expect(typeof win.center).toBe('function')
  })

  it('should invoke correct Tauri command on show', async () => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { useWindow } = await import('../hooks/useWindow')
    const win = useWindow('overlay')
    win.show()
    expect(invoke).toHaveBeenCalledWith('window_show', { id: 'overlay' })
  })
})
