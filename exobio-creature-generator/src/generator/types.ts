// types.ts

// --- SEED FROM API---
// Using random fact data from an external API to drive procedural generation
export interface ApiSeedData {
  id: string;
  text: string; // String used for generation
  source?: string;
}

// --- CORE PARAMETER INTERFACES ---

// Parameters for a single segment of a limb
export interface BoneSegment {
  length: number;    // ex: 80
  thickness: number; // ex: 10
  angle: number;     // ex: 0 (degrees, angle relative to the joint)
}

// Full parameter set
export interface CreatureParameters {
  color: string;
  name: string;
  sentence: string; // Seed sentence used for generation
  head: {
    baseShape: 'circle' | 'polygon';
    radius: number;
    pointCount?: number;
  };
  torso: {
    type: 'ribs' | 'shell';
    height: number;
    width: number;
    ribSegments: number;
  };
  limbs: {
    count: number;
    segments: BoneSegment[]; // Defines the structure for one limb (ex: upper, lower, foot)
  };
}

// Initial/default state for the component
export const DEFAULT_CREATURE: CreatureParameters = {
    color: '#ddcab3ff',
    name: 'Placeholder',
    sentence: 'Placeholder',
    head: { baseShape: 'circle', radius: 20 },
    torso: { type: 'ribs', height: 100, width: 40, ribSegments: 5 },
    limbs: { count: 2, segments: [{ length: 80, thickness: 10, angle: 0 }] }
};