// generator.ts
import type { CreatureParameters, BoneSegment, ApiSeedData} from './types';
import {DEFAULT_CREATURE} from './types';
import axios from 'axios';

// --- API FETCH ---
const fetchApiSeed = async (): Promise<ApiSeedData> => {
    try {
        // Using a public API for a random fact to seed generation
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json');
        // Reformat the response
        if (response.data && response.data.text && typeof response.data.text == 'string') {
            return {
                id: response.data.id,
                text: response.data.text, // text stored in 'value' field
            };
        }
        // If the API call succeeds but the data is bad, use the fallback text
        return { id: 'bad-data', text: 'generation error due to incomplete api response' };
    } 
    catch (error) {
        console.error("Error fetching API seed:", error);
        // Fallback data
        return { id: 'fallback', text: 'error loading api data, generation is now based on a default value' };
    }
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
    const seedText = apiData && apiData.text && typeof apiData.text === 'string' 
        ? apiData.text 
        : "default seed text for error recovery";
    
    const text = seedText.toLowerCase();
    
    // RULE 1: Limb count based on text length
    //todo: build this out for other limb counts
    const limbCount = text.length % 2 === 0 ? 4 : 2; // Even length -> Quadruped (4), Odd -> Biped (2)
    
    // RULE 2: Color based on first letter
    //todo: remove?
    // const firstChar = text.charAt(0);
    let color = DEFAULT_CREATURE.color; // Off-white for bones
    // if (['a', 'b', 'c', 'd'].includes(firstChar)) color = '#5E8B7E'; // Green
    // else if (['e', 'f', 'g', 'h'].includes(firstChar)) color = '#A84C4C'; // Red
    // else if (['i', 'j', 'k', 'l'].includes(firstChar)) color = '#D1B000'; // Yello

    // RULE 3: Ribs based on word count
    //todo: 
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const ribSegments = (wordCount % 5) + 3; // Range 3 to 7

    // RULE 4: Head shape based on a random letter in the middle of text
    //todo: rework to create more interesting shapes
    const middleChar = text.charAt(Math.floor(text.length / 2));
    const baseShape: 'circle' | 'polygon' = ['a', 'e', 'i', 'o', 'u'].includes(middleChar) ? 'circle' : 'polygon';

    // RULE 5
    // todo: Add rule for hip/shoulder/girdle structures based on punctuation? 

    return {
        name: `The ${text.split(' ')[0]}-${limbCount} Creature`,
        sentence: text,
        color,
        head: { 
            baseShape, 
            radius: 20 + (text.length % 10), // some varying size
            pointCount: baseShape === 'polygon' ? (wordCount % 4) + 3 : undefined // 3 to 6 sides
        },
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