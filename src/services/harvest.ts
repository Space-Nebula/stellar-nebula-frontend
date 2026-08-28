import type { HarvestableResourceType } from '../store'

export interface HarvestMeta {
  label: string
  color: string
  description: string
}

/** Display metadata for every resource type that nebula scans can yield. */
export const HARVEST_META: Record<HarvestableResourceType, HarvestMeta> = {
  nebulite: {
    label: 'Nebulite',
    color: '#67e8f9',
    description: 'Condensed cloud matter used to fuel long-range drives.',
  },
  stellarium: {
    label: 'Stellarium',
    color: '#c084fc',
    description: 'Refined stellar isotope prized for precision instruments.',
  },
  voidcrystal: {
    label: 'Void Crystal',
    color: '#f0abfc',
    description: 'Dense crystal formed in collapsed pockets of empty space.',
  },
  darkMatter: {
    label: 'Dark Matter',
    color: '#a78bfa',
    description: 'Unstable exotic matter that powers advanced shielding.',
  },
}
