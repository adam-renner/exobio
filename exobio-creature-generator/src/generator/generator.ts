// generator.ts
import type { CreatureParameters, BoneSegment, ApiSeedData, PolygonPoint, SkullParameters } from './types';
import {DEFAULT_CREATURE} from './types';
import axios from 'axios';

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

// --- Generates a set of polygon points for a defined width/height ---
const generatePolygonPoints = (width: number, height: number, complexity: number, seed: number): PolygonPoint[] => {
    const points: PolygonPoint[] = [];
    const numPoints = 4 + (seed % complexity); // 4 to 7 points for complexity

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

// --- LIMB GENERATION LOGIC ---
const generateLimbSegments = (limbCount: number): BoneSegment[] => {
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
};

// --- MAPPING FUNCTION ---
// Map API data to creature parameters
export const generateCreatureFromApiSeed = (apiData: ApiSeedData): CreatureParameters => {
    const seedText = apiData.text.toLowerCase();
    const text = seedText && typeof seedText === 'string' ? seedText : "default seed text for error recovery";
    let color = DEFAULT_CREATURE.color;
    // Limb count based on text length
    //todo: build this out for other limb counts
    const limbCount = text.length % 2 === 0 ? 4 : 2; // Even length -> Quadruped (4), Odd -> Biped (2)
    
    // Ribs based on word count
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const ribSegments = (wordCount % 5) + 3;

    // --- SKULL GENERATION ---
    const width = 50 + (text.length % 20);
    const height = 60 + (wordCount % 20);
    const depth = 40 + (wordCount % 10);
    const complexitySeed = text.charCodeAt(5) || 5;

    // 1. CRANIUM POINTS
    const craniumFront = generatePolygonPoints(width, height, 4, complexitySeed);
    // Side view uses height and depth
    const craniumSide = generatePolygonPoints(depth, height, 4, complexitySeed + 1);

    // 2. JAW POINTS
    const jawHeight = 40 + (text.length % 15);
    const jawWidth = width * 0.7;
    
    // Front jaw
    const jawFront: PolygonPoint[] = [
        { x: -jawWidth / 2, y: height / 2 - 10 }, 
        { x: jawWidth / 2, y: height / 2 - 10 }, 
        { x: jawWidth / 2, y: height / 2 + jawHeight }, 
        { x: -jawWidth / 2, y: height / 2 + jawHeight }
    ];

    // Side jaw
    const jawSide: PolygonPoint[] = [
        { x: -depth / 2, y: height / 2 - 10 }, // Hinge point (back top)
        { x: -depth / 2, y: height / 2 + jawHeight * 0.5 }, // Back bottom
        { x: depth / 2 + jawHeight * 0.5, y: height / 2 + jawHeight * 0.3 }, // Chin point
        { x: depth / 2, y: height / 2 - 5 } // Front top
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
        jawPointsFront: jawFront,
        jawPointsSide: jawSide,
    };

    return {
        name: `The ${text.split(' ')[0]}-${limbCount} Creature`,
        sentence: text,
        color,
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
            segments: generateLimbSegments(limbCount) 
        }
    };
};

// Export the main function
export const generateNewCreature = async (): Promise<CreatureParameters> => {
    const apiData = await fetchApiSeed();
    return generateCreatureFromApiSeed(apiData);
};