// generator.ts
import axios from 'axios';
import { createNoise2D } from 'simplex-noise';
import type { CreatureParameters, BoneSegment, ApiSeedData, PolygonPoint, SkullParameters } from './types';
import {DEFAULT_CREATURE} from './types';

// --- API FETCH FUNCTION ---
const fetchApiSeed = async (): Promise<ApiSeedData> => {
    try {
        // Using a public API for a random fact to seed generation
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json'); 
        // Reformat the response
        if (response.data && response.data.text && typeof response.data.text === 'string') {
            return {
                id: response.data.id,
                text: response.data.text, 
            };
        }
        // If the API call succeeds but the data is bad, use the fallback text
        return { id: 'bad-data', text: 'generation error due to incomplete api response' };

    } catch (error) {
        console.error("Error fetching API seed:", error);
        // Fallback data
        return { id: 'fallback', text: 'api network failure, generation is now based on a default value' };
    }
};

// --- POLYGON POINT GENERATION ---

// Symmetry along the vertical axis to minic bilateral symmetry
// Used for front views
/*const generateSymmetricalPolygonPoints = (width: number, height: number, complexity: number, seed: number): PolygonPoint[] => {
    const rightSidePoints: PolygonPoint[] = [];
    const numPointsHalf = 8 + (seed % complexity); // 8 to 11 points per side
    
    // Generate top point (on the central axis)
    rightSidePoints.push({ x: 0, y: -height / 2 }); 

    for (let i = 1; i < numPointsHalf - 1; i++) {
        // Generate points for the right half (X > 0)
        rightSidePoints.push({
            x: width / 2 * (0.5 + Math.random() * 0.5), 
            y: height * (Math.random() - 0.5) // Y can be anywhere
        });
    }
    // Generate bottom point (on the central axis)
    rightSidePoints.push({ x: 0, y: height / 2 }); 

    // Sort to ensure proper connection from top to bottom on the right side
    rightSidePoints.sort((a, b) => a.y - b.y);

    const fullPoints: PolygonPoint[] = [];
    
    // 1. Add top-to-bottom points from the right side
    fullPoints.push(...rightSidePoints.filter(p => p.x >= 0)); 
    
    // 2. Add mirrored points from bottom-to-top on the left side
    const leftSide = rightSidePoints.map(p => ({ x: -p.x, y: p.y }));
    fullPoints.push(...leftSide.filter(p => p.x <= 0).reverse());

    return fullPoints;
};*/

// Generates a set of polygon points for a defined width/height
// Used for side views
const generatePolygonPoints = (width: number, height: number, complexity: number, seed: number): PolygonPoint[] => {
    const points: PolygonPoint[] = [];
    const numPoints = 8 + (seed % complexity); // 8 to 11 points for complexity

    // Define vertices around the center (0,0) with some randomness
    for (let i = 0; i < numPoints; i++) {
        // Use angle to distribute points
        const angle = (i / numPoints) * Math.PI * 2;
        // Introduce randomness to the radius
        const radiusX = width / 2 * (0.8 + Math.random() * 0.4); 
        const radiusY = height / 2 * (0.8 + Math.random() * 0.4);
        
        points.push({
            x: Math.round(Math.cos(angle) * radiusX),
            y: Math.round(Math.sin(angle) * radiusY),
        });
    }
    
    // Sort points to connect in a logical order (clockwise) for proper drawing
    points.sort((a, b) => {
        const angleA = Math.atan2(a.y, a.x);
        const angleB = Math.atan2(b.y, b.x);
        return angleA - angleB;
    });

    return points;
};

    const noise2D = createNoise2D();

// --- Perlin Noise Helper Function ---
const generateSymmetricalPolygonPoints = (width: number, height: number, seedX: number, complexity: number): PolygonPoint[] => {
    const points: PolygonPoint[] = [];
    const numPointsHalf = 8 + (seedX % complexity); // Using fixed number for now
    const scale = 0.75; // Controls the "zoom" of the noise (higher = more detailed)
    
    // Generate right side points (from top to bottom)
    for (let i = 0; i <= numPointsHalf; i++) {
        const y_norm = (i / numPointsHalf) * height - (height / 2);
        
        // Use noise based on the Y position and the seed (seedX)
        const noiseValue = noise2D(y_norm * scale + seedX, 0); 
        
        // Base width, adjusted smoothly by noise; adjust range for more "bumpiness"
        const radius = (width / 1.75) * (0.6 + noiseValue * 0.3); 
        
        // Right side (X > 0)
        points.push({ x: Math.round(radius), y: Math.round(y_norm) });
    }

    // Mirror the points for symmetry
    const fullPoints: PolygonPoint[] = [];
    
    // 1. Add top-to-bottom points from the right side (does not include central axis points)
    fullPoints.push(...points.slice(1, -1)); 
    
    // 2. Add top and bottom points to link the sides
    fullPoints.unshift({ x: 0, y: points[0].y }); // Top Center
    fullPoints.push({ x: 0, y: points[points.length - 1].y }); // Bottom Center

    // 3. Add mirrored points from bottom-to-top on the left side
    const leftSide = points.slice(1, -1).map(p => ({ x: -p.x, y: p.y })).reverse();
    fullPoints.push(...leftSide);

    return fullPoints;
};

// --- LIMB GENERATION LOGIC ---
/*const generateLimbSegments = (limbCount: number): BoneSegment[] => {
    // Generate two or three segments per limb with random dimensions and angles
    const segmentCount = limbCount === 2 ? 3 : 2; // Two-legged creatures get more segments
    //todo: third segment sometimes apearing with 2 limbs - fix!
    const segments: BoneSegment[] = [];

    for (let i = 0; i < segmentCount; i++) {
        segments.push({
            //todo: work on the formulas below
            // Length decreases
            length: 50 + (Math.random() * 30) - (i * 10),
            // Thickness decreases
            thickness: 10 - (i * 2) - (Math.random() * 2),
            // Random angle for joint
            angle: Math.random() * 60 - 30, 
        });
    }
    return segments;
};*/

// --- LIMB GENERATION USING L-SYSTEMS ---

interface LSystemRule {
    axiom: string; // Starting string
    rules: { [key: string]: string }; // Rules
    iterations: number;
    angleDelta: number; // Angle change for joints
    segmentLength: number; // Base length
    segmentThickness: number; // Base thickness
}

const growLSystem = (rule: LSystemRule): string => {
    let current = rule.axiom;
    for (let i = 0; i < rule.iterations; i++) {
        let next = '';
        for (const char of current) {
            next += rule.rules[char] || char;
        }
        current = next;
    }
    return current;
};

// Parsing L-System output into bone segments
const parseLSystemToSegments = (lSystemOutput: string, rule: LSystemRule): BoneSegment[] => {
    const segments: BoneSegment[] = [];
    let currentAngle = 0;
    let thickness = rule.segmentThickness;

    for (const char of lSystemOutput) {
        switch (char) {
            case 'F': // Create a segment (main bone)
            case 'A':
                segments.push({
                    length: rule.segmentLength + Math.random() * 5, 
                    thickness: thickness,
                    angle: currentAngle,
                });
                thickness *= 0.8; // Taper the segment thickness
                break;
            case '+': // Turn right (increase angle)
                currentAngle += rule.angleDelta;
                break;
            case '-': // Turn left (decrease angle)
                currentAngle -= rule.angleDelta;
                break;
            // Branching [ and ] are ignored for simplicity here
        }
    }
    return segments;
};

const generateLimbSegments = (seedText: string): BoneSegment[] => {
    const seedChar = seedText.charAt(0);
    let rule: LSystemRule;

    // Dynamically select rules based on the first character of the seed text
    if (['a', 'b', 'c', 'd', 'e'].includes(seedChar)) {
        // Tentacle/Wiry Look
        rule = {
            axiom: 'F-F',
            rules: { 'F': 'F+F--F' },
            iterations: 3,
            angleDelta: 25 + Math.random() * 10,
            segmentLength: 10,
            segmentThickness: 5,
        };
    } else if (['f', 'g', 'h', 'i', 'j'].includes(seedChar)) {
        // Spikey/Crab Look
        rule = {
            axiom: 'A',
            rules: { 'A': 'A-F+F' },
            iterations: 4,
            angleDelta: 70 + Math.random() * 10,
            segmentLength: 20,
            segmentThickness: 8,
        };
    } else {
        // Standard/Mammalian Look
        rule = {
            axiom: 'FFF',
            rules: { 'F': 'F-F' },
            iterations: 2,
            angleDelta: 15 + Math.random() * 5,
            segmentLength: 40,
            segmentThickness: 12,
        };
    }
    
    const lSystemOutput = growLSystem(rule);
    
    // Use only a few segments to keep limbs manageable
    const allSegments = parseLSystemToSegments(lSystemOutput, rule);
    
    return allSegments.slice(0, 5); 
};


// --- MAPPING FUNCTION ---
// Map API data to creature parameters
export const generateCreatureFromApiSeed = (apiData: ApiSeedData): CreatureParameters => {
    const seedText = apiData.text.toLowerCase();
    const text = seedText && typeof seedText === 'string' ? seedText : "default seed text for error recovery";

    // Color definitions
    let strokeColor = DEFAULT_CREATURE.strokeColor;
    let fillColor = DEFAULT_CREATURE.fillColor;
    let holeColor = DEFAULT_CREATURE.holeColor;
    // Limb count based on text length
    //todo: build this out for other limb counts
    const limbCount = text.length % 2 === 0 ? 4 : 2; // Even length -> Quadruped (4), Odd -> Biped (2)
    
    // Ribs based on word count
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const ribSegments = (wordCount % 5) + 3;

    // --- SKULL GENERATION ---
    const width = 50 + (text.length % 50);
    const height = 60 + (wordCount % 60);
    const depth = 80 + (wordCount % 100);
    const complexitySeed = text.charCodeAt(5) || 5;

    // 1. CRANIUM POINTS
    // Front view uses width and height and symmetrical points
    const craniumFront = generateSymmetricalPolygonPoints(width, height, 4, complexitySeed);
    // Side view uses height and depth
    const craniumSide = generatePolygonPoints(depth, height, 4, complexitySeed + 1);

    // 2. JAW POINTS
    const jawHeight = 10 + (text.length % 15);
    const jawWidth = width * 0.7;

    // Jaw length
    // const jawLength = 100 + (text.length % 50) + depth * 0.5;
    
    // Front jaw
    // todo: Update to use generateSymmetricalPolygonPoints
    const jawFront: PolygonPoint[] = [
        { x: -jawWidth / 2, y: height / 2 + 2 }, // top left
        { x: jawWidth / 2, y: height / 2 + 2 }, // top right
        { x: jawWidth / 2, y: height / 2 + jawHeight }, // bottom left
        { x: -jawWidth / 2, y: height / 2 + jawHeight } // bottom right
    ];

    // Side jaw
    // todo: Update to use generatePolygonPoints
    const jawSide: PolygonPoint[] = [
        { x: -depth / 4, y: height / 2 + 2 }, // Hinge point (top right)
        { x: -depth / 4, y: height / 2 + jawHeight }, // Back bottom  (bottom right)
        { x: depth / 2 + jawHeight * 0.5, y: height / 2 + jawHeight }, // Chin point (bottom left)
        { x: depth / 2, y: height / 2 + 2 } // Front top (top left)
    ];

    const skullParams: SkullParameters = {
        overallWidth: width, overallHeight: height, overallDepth: depth,
        craniumPointsFront: craniumFront,
        craniumPointsSide: craniumSide,
        eyeCount: 2,
        eyeSize: 6 + (complexitySeed % 5),
        eyeDepth: 10 + (complexitySeed % 3),
        eyeSpacing: width * 0.3,
        nostrilSize: 3 + (complexitySeed % 2),
        nostrilYOffset: height * 0.1,
        jawWidth: jawWidth,
        jawPointsFront: jawFront,
        jawPointsSide: jawSide,
    };

    return {
        name: `The ${text.split(' ')[0]}-${limbCount} Creature`,
        sentence: text,
        strokeColor,
        fillColor,
        holeColor,
        skull: skullParams,
        torso: { 
            //todo: using ribs as spine for now; separate into its own type later
            type: 'ribs', // Simplifying for now
            height: 100, 
            width: 10, 
            ribSegments 
        },
        limbs: { 
            count: limbCount, 
            segments: generateLimbSegments(seedText) 
        }
    };
};

// Export the main function
export const generateNewCreature = async (): Promise<CreatureParameters> => {
    const apiData = await fetchApiSeed();
    return generateCreatureFromApiSeed(apiData);
};