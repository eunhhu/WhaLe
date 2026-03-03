import { createSyncStore } from '@whale1/sdk'

export const trainer = createSyncStore('trainer', {
  speedHack: 1.0,
  godMode: false,
  infiniteAmmo: false,
  noRecoil: false,
  fov: 90,
})
