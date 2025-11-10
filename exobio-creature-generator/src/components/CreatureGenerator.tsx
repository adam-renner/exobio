// CreatureGenerator.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { CreatureParameters, BoneSegment } from '../generator/types';
import {DEFAULT_CREATURE} from '../generator/types';
import { generateNewCreature } from '../generator/generator';

// --- SVG COMPONENTS ---

interface BoneProps {
    segment: BoneSegment;
    color: string;
}

// Draws a single bone segment using a rectangle
//todo: how to make more bone-like? Should this use assets instead?
const BoneSegmentComponent: React.FC<BoneProps> = ({ segment, color }) => {
    // Draws the rectangle centered on its X-axis for easier rotation and connection
    const xOffset = -segment.thickness / 2;
    return (
        <rect 
            x={xOffset} 
            y={0} 
            width={segment.thickness} 
            height={segment.length} 
            fill={color} 
            rx={segment.thickness / 2} // Rounds corners of rectangle
        />
    );
};

interface LimbProps {
    segments: BoneSegment[];
    color: string;
    // Initial position of the limb attachment point (ex: shoulder/hip)
    //todo: rename? Rework to use with hip/shoulder structures later?
    startX: number;
    startY: number; 
    // Initial rotation of the limb
    initialRotation: number;
}

// Assembles a multi-segment limb with joints
const LimbComponent: React.FC<LimbProps> = ({ segments, color, startX, startY, initialRotation }) => {
    let cumulativeRotation = initialRotation;
    
    // Draws limbs recursively, translating and rotating each segment
    return (
        <g transform={`translate(${startX}, ${startY})`}>
            {segments.map((segment, index) => {
                const rotation = cumulativeRotation + segment.angle;
                // Update rotation for the next joint
                //todo: Does the rotation need to be limited for realism?
                cumulativeRotation = rotation;

                return (
                    <g 
                        key={index} 
                        transform={`rotate(${rotation}) translate(0, ${index > 0 ? segment.length : 0})`}
                    >
                        <BoneSegmentComponent segment={segment} color={color} />
                    </g>
                );
            })}
        </g>
    );
};


// --- MAIN GENERATOR ---

const CreatureGenerator: React.FC = () => {
    const [creature, setCreature] = useState<CreatureParameters>(DEFAULT_CREATURE);
    const [isLoading, setIsLoading] = useState(false);

    const generate = useCallback(async () => {
        setIsLoading(true);
        try {
            const newCreature = await generateNewCreature();
            setCreature(newCreature);
        } catch (error) {
            console.error("Failed to generate creature:", error);
            // On error, revert to a default state or show an error message
            //todo: improve error handling...
            setCreature({...DEFAULT_CREATURE, name: "Generation Failed"});
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load initial creature
    useEffect(() => {
        generate();
    }, [generate]);

    // Simplified logic to position limbs (based on count)
    const limbPositions = [
        { x: 0, y: 0, rot: -100 },  // Top Left
        { x: 0, y: 0, rot: 100 },    // Top Right
        { x: 0, y: 70, rot: -80 },  // Bottom Left (if 4 or 6)
        { x: 0, y: 70, rot: 80 },  // Bottom Right (if 4 or 6)
        // todo: more positions for 6 limbs? Should this be asymmetrical?
    ].slice(0, creature.limbs.count);

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>{creature.name}</h2>
            <p>{creature.limbs.count}-Limbed Skeleton</p>
            <p>Generation seed sentence: {creature.sentence}</p>

            <svg 
                width="400" 
                height="400" 
                viewBox="-200 -150 400 400" 
                style={{ border: '2px solid #eee', margin: '20px', backgroundColor: '#ffffffff' }}
            >
                {/* HEAD (simplified as a circle for now) */}
                // todo: rework to use baseShape and pointCount for polygons
                <circle 
                    cx={0} 
                    cy={-50} 
                    r={creature.head.radius} 
                    fill={creature.color} 
                />

                {/* TORSO (keeping it simple for now) */}
                // todo: rework to use ribs
                <rect 
                    x={-creature.torso.width / 2} 
                    y={-creature.torso.height / 2} 
                    width={creature.torso.width} 
                    height={creature.torso.height} 
                    fill={creature.color}
                    rx={5}
                />
                
                {/* LIMBS */}
                //todo: rework to add hip/shoulder structures
                {limbPositions.map((pos, index) => (
                    <LimbComponent 
                        key={index}
                        segments={creature.limbs.segments} 
                        color={creature.color}
                        startX={pos.x} 
                        startY={pos.y}
                        initialRotation={pos.rot}
                    />
                ))}
            </svg>

            <button onClick={generate} disabled={isLoading} style={{ padding: '10px 20px' }}>
                {isLoading ? 'Generating...' : 'Generate Weird Skeleton'}
            </button>
        </div>
    );
};

export default CreatureGenerator;

// Remember: render <CreatureGenerator /> in App.tsx!