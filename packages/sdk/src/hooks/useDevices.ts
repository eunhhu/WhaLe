import { invoke } from '@tauri-apps/api/core'
import { createSignal, onMount } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { Device } from '../types'

export interface DevicesHandle {
  devices: Accessor<Device[]>
  refresh(): void
}

export function useDevices(): DevicesHandle {
  const [devices, setDevices] = createSignal<Device[]>([])
  const refresh = async () => {
    const list = await invoke<Device[]>('frida_list_devices')
    setDevices(list)
  }
  onMount(refresh)
  return { devices, refresh }
}
