// types.ts

// --- SEED FROM API---
// Using random fact data from an external API to drive procedural generation
export interface ApiSeedData {
  id: string;
  text: string; // String used for generation
  source?: string;
}

// --- PROCEDURAL PARAMETERS INTERFACES ---

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface BoneSegment {
  length: number;    
  thickness: number; 
  angle: number;     
}

export interface SkullParameters {
    // CRANIUM DIMENSIONS
    overallWidth: number;   
    overallHeight: number;  
    overallDepth: number;   
    
    // CRANIUM SHAPE POINTS
    craniumPointsFront: PolygonPoint[];
    craniumPointsSide: PolygonPoint[];
    
    // EYE SOCKETS
    eyeCount: 1 | 2;
    eyeSize: number;     
    eyeDepth: number;    
    eyeSpacing: number; 
    
    // NOSTRIL
    nostrilSize: number; 
    nostrilYOffset: number; 
    
    // JAWBONE
    jawPointsFront: PolygonPoint[];
    jawPointsSide: PolygonPoint[];
}


// Full parameter set
export interface CreatureParameters {
  color: string;
  name: string;
  sentence: string; // Seed sentence used for generation
  skull: SkullParameters;
  torso: {
    type: 'ribs';
    height: number;
    width: number;
    ribSegments: number;
  };
  limbs: {
    count: number;
    segments: BoneSegment[]; 
  };
}


// Initial/default state for the component
export const DEFAULT_CREATURE: CreatureParameters = {
    color: '#ddcab3ff',
    name: 'Placeholder',
    sentence: 'Placeholder',
    skull: {
        overallWidth: 60, overallHeight: 80, overallDepth: 60,
        craniumPointsFront: [{x: -30, y: -40}, {x: 30, y: -40}, {x: 30, y: 0}, {x: -30, y: 0}],
        craniumPointsSide: [{x: -30, y: -40}, {x: 30, y: -40}, {x: 30, y: 0}, {x: -30, y: 0}],
        eyeCount: 2, eyeSize: 8, eyeDepth: 5, eyeSpacing: 20,
        nostrilSize: 4, nostrilYOffset: 10,
        jawPointsFront: [{x: -20, y: 0}, {x: 20, y: 0}, {x: 10, y: 40}, {x: -10, y: 40}],
        jawPointsSide: [{x: -20, y: 0}, {x: 20, y: 0}, {x: 10, y: 40}, {x: -10, y: 40}],
    },
    torso: { type: 'ribs', height: 100, width: 40, ribSegments: 5 },
    limbs: { count: 2, segments: [{ length: 80, thickness: 10, angle: 0 }] }
};