// CreatureGenerator.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { CreatureParameters, BoneSegment, SkullParameters, PolygonPoint } from '../generator/types';
import {DEFAULT_CREATURE} from '../generator/types';
import { generateNewCreature } from '../generator/generator';

// --- Convert PolygonPoint[] to SVG's required "points" string ---
const pointsToSvgString = (points: PolygonPoint[]): string => {
    // Example: [{x: 10, y: 20}, {x: 30, y: 40}] -> "10,20 30,40"
    return points.map(p => `${p.x},${p.y}`).join(' ');
};

// --- SKULL VIEW COMPONENTS ---
interface SkullViewProps {
    skullParams: SkullParameters;
    color: string;
}

const SkullFrontView: React.FC<SkullViewProps> = ({ skullParams, color }) => {
    const { craniumPointsFront, jawPointsFront, eyeSize, eyeSpacing, eyeCount, nostrilSize, nostrilYOffset } = skullParams;

    const eyeXOffset = eyeSpacing / 2;

    return (
        <g transform="translate(0, 0)">
            {/* 1. CRANIUM (Front) */}
            <polygon
                points={pointsToSvgString(craniumPointsFront)}
                fill="none"
                stroke={color}
                strokeWidth={2}
            />

            {/* 2. JAW (Front) */}
            <polygon
                points={pointsToSvgString(jawPointsFront)}
                fill="none"
                stroke={color}
                strokeWidth={2}
            />

            {/* 3. EYE SOCKETS (Front - centered on 0,0) */}
            {eyeCount === 2 && (
                <>
                    <circle cx={-eyeXOffset} cy={-10} r={eyeSize} fill="black" /> 
                    <circle cx={eyeXOffset} cy={-10} r={eyeSize} fill="black" />
                </>
            )}
            {eyeCount === 1 && <circle cx={0} cy={-10} r={eyeSize * 1.5} fill="black" />}

            {/* 4. NOSTRIL (Front) */}
            <circle cx={0} cy={nostrilYOffset} r={nostrilSize} fill="black" />
        </g>
    );
};

const SkullSideView: React.FC<SkullViewProps> = ({ skullParams, color }) => {
    const { craniumPointsSide, jawPointsSide, eyeSize, nostrilSize, nostrilYOffset, overallDepth } = skullParams;

    return (
        <g transform="translate(0, 0)">
            {/* 1. CRANIUM (Side) */}
            <polygon
                points={pointsToSvgString(craniumPointsSide)}
                fill="none"
                stroke={color}
                strokeWidth={2}
            />

            {/* 2. JAW (Side) */}
            <polygon
                points={pointsToSvgString(jawPointsSide)}
                fill="none"
                stroke={color}
                strokeWidth={2}
            />
            
            {/* 3. EYE SOCKET (Side - centered toward the front) */}
            <circle 
                cx={overallDepth * 0.2} // X-position in profile
                cy={-10} 
                r={eyeSize} 
                fill="black" 
            /> 
            
            {/* 4. NOSTRIL (Side) */}
            <circle cx={overallDepth * 0.3} cy={nostrilYOffset} r={nostrilSize} fill="black" />
        </g>
    );
};


interface BoneProps {
    segment: BoneSegment;
    color: string;
}

// Draws a single bone segment using a rectangle
//todo: how to make more bone-like?
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

interface TorsoProps {
    torso: CreatureParameters['torso'];
    color: string;
    isSideView: boolean;
}

const TorsoComponent: React.FC<TorsoProps> = ({ torso, color, isSideView }) => {
    const viewWidth = isSideView ? torso.height * 0.5 : torso.width; // Side view is narrower (depth)
    const viewHeight = torso.height;

    // Center point (assuming the origin (0,0) is the center of the viewport)
    return (
        <g>
            {/* Main Spine/Rib Cage (Simplified Polygon/Rect) */}
            <rect 
                x={-viewWidth / 2} 
                y={0} 
                width={viewWidth} 
                height={viewHeight} 
                fill="none" 
                stroke={color}
                strokeWidth={2}
                rx={5}
            />
            {/* Simple representation of ribs/segments */}
            {Array.from({ length: torso.ribSegments }).map((_, i) => (
                 <line
                    key={i}
                    x1={-viewWidth / 2}
                    y1={(i + 1) * (viewHeight / (torso.ribSegments + 1))}
                    x2={viewWidth / 2}
                    y2={(i + 1) * (viewHeight / (torso.ribSegments + 1))}
                    stroke={color}
                    strokeWidth={1}
                />
            ))}
        </g>
    );
}

// --- MAIN GENERATOR COMPONENT ---

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

    // Calculate the total height of the skull and torso for accurate vertical alignment
    // Assuming Skull is 100 units high (for the viewBox context)
    const SKULL_VIEWBOX_HEIGHT = 100;
    
    // Y-offset to place the torso below the skull
    const TORSO_Y_OFFSET = SKULL_VIEWBOX_HEIGHT * 0.5; 

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>{creature.name}</h2>
            <p>Type: {creature.limbs.count}-Limbed Skeleton</p>

            <button onClick={generate} disabled={isLoading} style={{ padding: '10px 20px', marginBottom: '20px' }}>
                {isLoading ? 'Generating...' : 'Generate Weird Skeleton'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {/* FRONT VIEW CONTAINER */}
                <div style={{ border: '1px solid #eee', width: '45%' }}>
                    <h3>Front View</h3>
                    <svg width="250" height="400" viewBox="-100 -100 200 400"> {/* INCREASED VIEWBOX HEIGHT */}
                        
                        {/* 1. SKULL (Centered at Y=-50 for space) */}
                        <g transform="translate(0, -50)">
                            <SkullFrontView skullParams={creature.skull} color={creature.color} />
                        </g>

                        {/* 2. TORSO (Starts around Y=100) */}
                        <g transform={`translate(0, ${TORSO_Y_OFFSET})`}>
                            <TorsoComponent torso={creature.torso} color={creature.color} isSideView={false} />

                            {/* 3. LIMBS (Attached to Torso) */}
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
                        </g>

                    </svg>
                </div>

                {/* SIDE VIEW CONTAINER */}
                <div style={{ border: '1px solid #eee', width: '45%' }}>
                    <h3>Side View</h3>
                    <svg width="250" height="400" viewBox="-100 -100 200 400"> {/* INCREASED VIEWBOX HEIGHT */}

                        {/* 1. SKULL (Centered at Y=-50) */}
                         <g transform="translate(0, -50)">
                            <SkullSideView skullParams={creature.skull} color={creature.color} />
                        </g>

                        {/* 2. TORSO (Starts around Y=100) */}
                        <g transform={`translate(0, ${TORSO_Y_OFFSET})`}>
                            {/* Side view is visually narrower */}
                            <TorsoComponent torso={creature.torso} color={creature.color} isSideView={true} />

                            {/* 3. LIMBS (Side view typically only shows two limbs) */}
                            {creature.limbs.count > 0 && (
                                <>
                                    {/* Simplified limb rendering for the side view, showing one upper and one lower limb */}
                                    <LimbComponent 
                                        segments={creature.limbs.segments} 
                                        color={creature.color}
                                        startX={creature.torso.width * 0.1} // Offset slightly from center
                                        startY={creature.torso.height * 0.15} // Shoulder
                                        initialRotation={-90}
                                    />
                                     <LimbComponent 
                                        segments={creature.limbs.segments} 
                                        color={creature.color}
                                        startX={creature.torso.width * 0.1}
                                        startY={creature.torso.height * 0.85} // Hip
                                        initialRotation={-80}
                                    />
                                </>
                            )}
                        </g>

                    </svg>
                </div>
            </div>
        </div>
    );
};

export default CreatureGenerator;
// Remember: render <CreatureGenerator /> in App.tsx!