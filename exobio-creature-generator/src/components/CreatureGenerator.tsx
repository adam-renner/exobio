import '../index.css';
import React, { useState, useEffect, useCallback } from 'react';
import type { CreatureParameters, BoneSegment, SkullParameters, PolygonPoint } from '../generator/types';
import { DEFAULT_CREATURE } from '../generator/types';
import { generateNewCreature } from '../generator/generator';


// --- Helper: Convert PolygonPoint[] to SVG's required string ---
const pointsToSvgString = (points: PolygonPoint[]): string => {
    // ex: [{x: 10, y: 20}, {x: 30, y: 40}] -> "10,20 30,40"
    return points.map(p => `${p.x},${p.y}`).join(' ');
};

// --- SKULL VIEW COMPONENTS ---
interface SkullViewProps {
    skullParams: SkullParameters;
    strokeColor: string;
    fillColor: string;
    holeColor: string;
}

const SkullFrontView: React.FC<SkullViewProps> = ({ skullParams, strokeColor, fillColor, holeColor }) => {
    const { craniumPointsFront, jawPointsFront, eyeSize, eyeSpacing, eyeCount, nostrilSize, nostrilYOffset, jawWidth } = skullParams;

    const eyeXOffset = eyeSpacing / 2;

    // TEETH LOGIC (hardcoded)
    //todo: don't love how this looks, need to figure out how to make more realistic
    const toothCount = 10;
    const toothSize = 5;
    const teethYPosition = 40; 

    const toothPoints: PolygonPoint[] = [];
    const startX = -jawWidth / 2;
    
    // Generates pointy teeth pattern
    for (let i = 0; i <= toothCount; i++) {
        const x = startX + (i * jawWidth / toothCount);
        
        // Bottom edge of jaw
        toothPoints.push({ x: x, y: teethYPosition }); 
        
        // Peak of tooth
        if (i < toothCount) {
            toothPoints.push({ x: x + (jawWidth / (toothCount * 2)), y: teethYPosition + toothSize });
        }
    };

    return (
        <g transform="translate(0, 0)">
            {/* 1. CRANIUM (Front) */}
            <polygon
                points={pointsToSvgString(craniumPointsFront)}
                fill= {fillColor}
                stroke={strokeColor}
                strokeWidth={3}
                style={{ strokeLinejoin: 'round', strokeLinecap: 'round' }}
            />

            {/* 2. JAW (Front) */}
            <polygon
                points={pointsToSvgString(jawPointsFront)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={3}
                style={{ strokeLinejoin: 'round', strokeLinecap: 'round' }}
            />

            {/* 3. EYE SOCKETS (Front - centered) */}
            {eyeCount === 2 && (
                <>
                    <circle cx={-eyeXOffset} cy={-10} r={eyeSize} fill={holeColor}/> 
                    <circle cx={eyeXOffset} cy={-10} r={eyeSize} fill={holeColor} />
                </>
            )}
            {eyeCount === 1 && <circle cx={0} cy={-10} r={eyeSize * 1.5} fill={holeColor} />}

            {/* 4. NOSTRIL (Front) */}
            <circle cx={0} cy={nostrilYOffset} r={nostrilSize} fill={holeColor} />

            { /*5. TEETH (Front) */}
            <polyline
            points={pointsToSvgString(toothPoints)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1.5}
            />
        </g>
    );
};

const SkullSideView: React.FC<SkullViewProps> = ({ skullParams, strokeColor, fillColor, holeColor }) => {
    const { craniumPointsSide, jawPointsSide, eyeSize, nostrilSize, nostrilYOffset, overallDepth } = skullParams;

    return (
        <g transform="translate(0, 0)">
            {/* 1. CRANIUM (Side) */}
            <polygon
                points={pointsToSvgString(craniumPointsSide)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={3}
                style={{ strokeLinejoin: 'round', strokeLinecap: 'round' }}
            />

            {/* 2. JAW (Side) */}
            <polygon
                points={pointsToSvgString(jawPointsSide)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={3}
                style={{ strokeLinejoin: 'round', strokeLinecap: 'round' }}
            />
            
            {/* 3. EYE SOCKET (Side - centered toward the front) */}
            <circle 
                cx={overallDepth * 0.2} // X-position in profile
                cy={-10} 
                r={eyeSize} 
                fill={holeColor}
            /> 
            
            {/* 4. NOSTRIL (Side - offset like eyes) */}
            <circle cx={overallDepth * 0.3} cy={nostrilYOffset} r={nostrilSize} fill={holeColor} />
        </g>
    );
};


interface BoneProps {
    segment: BoneSegment;
    strokeColor: string;
}

const BoneSegmentComponent: React.FC<BoneProps> = ({ segment, strokeColor }) => {
    const xOffset = -segment.thickness / 2;
    return (
        <rect 
            x={xOffset} 
            y={0} 
            width={segment.thickness} 
            height={segment.length} 
            stroke={strokeColor}
            fill = "none"
            strokeWidth={2}
            rx={segment.thickness / 2}
        />
    );
};

interface LimbProps {
    segments: BoneSegment[];
    strokeColor: string;
    startX: number;
    startY: number; 
    initialRotation: number;
}

// Updated to use L-systems
const LimbComponent: React.FC<LimbProps> = ({ segments, strokeColor, startX, startY, initialRotation }) => {
    let cumulativeRotation = initialRotation;
    
    return (
        <g transform={`translate(${startX}, ${startY})`}>
            {segments.map((segment, index) => {
                const rotation = cumulativeRotation + segment.angle;
                cumulativeRotation = rotation;

                // Each segment moves from its own start point
                // Segment.length used as the Y-translation only if this is not the first segment
                //todo: update, this is looking wild
                const prevSegmentLength = index > 0 ? segments[index - 1].length : 0;
                
                return (
                    <g 
                        key={index} 
                        // Should transform based on the end of the previous segment
                        //  todo: debug
                        transform={`rotate(${rotation}) translate(0, ${prevSegmentLength})`}
                    >
                        <BoneSegmentComponent segment={segment} strokeColor={strokeColor} />
                    </g>
                );
            })}
        </g>
    );
};

interface TorsoProps {
    torso: CreatureParameters['torso'];
    strokeColor: string;
    isSideView: boolean;
}

const TorsoComponent: React.FC<TorsoProps> = ({ torso, strokeColor, isSideView }) => {
    const viewWidth = isSideView ? torso.height * 0.5 : torso.width;
    const viewHeight = torso.height;

    return (
        <g>
            {/* Spine/Rib cage
            todo: fix this... */}
            <rect 
                x={-viewWidth / 2} 
                y={0} 
                width={viewWidth} 
                height={viewHeight} 
                fill="none" 
                stroke={strokeColor}
                strokeWidth={2}
                rx={5}
            />
            {/* Ribs/segments */}
            {Array.from({ length: torso.ribSegments }).map((_, i) => (
                 <line
                    key={i}
                    x1={-viewWidth / 2}
                    y1={(i + 1) * (viewHeight / (torso.ribSegments + 1))}
                    x2={viewWidth / 2}
                    y2={(i + 1) * (viewHeight / (torso.ribSegments + 1))}
                    stroke={strokeColor}
                    strokeWidth={2}
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
            setCreature({...DEFAULT_CREATURE, name: "Generation Failed"});
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        generate();
    }, [generate]);

    // Calculate Y-offset to put the torso below the skull
    const SKULL_VIEWBOX_HEIGHT = 100;
    const TORSO_Y_OFFSET = SKULL_VIEWBOX_HEIGHT * 0.5; 

    // Dynamic limb positions attached to the torso based on its width/height
    //todo: debug, positions aren't consistant or "connecting" well
    const limbPositions = [
        // Upper Limbs - attached at Y=0.15 of torso height
        { x: -creature.torso.width / 2, y: creature.torso.height * 0.15, rot: -100 }, 
        { x: creature.torso.width / 2, y: creature.torso.height * 0.15, rot: 100 }, 
        // Lower Limbs - attached at Y=0.85 of torso height
        { x: -creature.torso.width / 2, y: creature.torso.height * 0.85, rot: -80 }, 
        { x: creature.torso.width / 2, y: creature.torso.height * 0.85, rot: 80 }, 
    ].slice(0, creature.limbs.count);

    //BIG TODO: layout isn't working!!! May need to reinstall modules
    return (
        <div className="p-5 flex flex-col items-center min-h-screen bg-gray-100 font-inter">
            <div className="bg-white p-6 rounded-xl shadow-xl **w-full mx-auto**">
                <h1 className="text-3xl font-bold mb-2 text-gray-800">{creature.name}</h1>
                <p className="text-gray-500 mb-4">Type: {creature.limbs.count}-Limbed Skeleton | Rib Segments: {creature.torso.ribSegments}</p>

                <button 
                    onClick={generate} 
                    disabled={isLoading} 
                    className="px-6 py-2 mb-6 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300 disabled:opacity-50"
                >
                    {isLoading ? 'Generating...' : 'Generate Weird Skeleton'}
                </button>

                <div className="grid grid-cols-3 gap-6">

                    {/* 1. FRONT VIEW CONTAINER (Column 1) */}
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <h3 className="text-xl font-semibold mb-2">Front View</h3>
                        <svg width="100%" height="400" viewBox="-100 -100 200 400" className="bg-white rounded-md shadow-inner"> 
                            
                            {/* 1. SKULL */}
                            <g transform="translate(0, -50)">
                                <SkullFrontView skullParams={creature.skull} strokeColor={creature.strokeColor} fillColor={creature.fillColor} holeColor={creature.holeColor} />
                            </g>

                            {/* 2. TORSO */}
                            <g transform={`translate(0, ${TORSO_Y_OFFSET})`}>
                                <TorsoComponent torso={creature.torso} strokeColor={creature.strokeColor} isSideView={false} />

                                {/* 3. LIMBS */}
                                {limbPositions.map((pos, index) => (
                                    <LimbComponent 
                                        key={index}
                                        segments={creature.limbs.segments} 
                                        strokeColor={creature.strokeColor}
                                        startX={pos.x} 
                                        startY={pos.y}
                                        initialRotation={pos.rot}
                                    />
                                ))}
                            </g>
                        </svg>
                    </div>

                    {/* 2. SIDE VIEW CONTAINER (Column 2) */}
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <h3 className="text-xl font-semibold mb-2">Side View</h3>
                        <svg width="100%" height="400" viewBox="-100 -100 200 400" className="bg-white rounded-md shadow-inner">

                            {/* 1. SKULL */}
                            <g transform="translate(0, -50)">
                                <SkullSideView skullParams={creature.skull} strokeColor={creature.strokeColor} fillColor={creature.fillColor} holeColor={creature.holeColor} />
                            </g>

                            {/* 2. TORSO */}
                            <g transform={`translate(0, ${TORSO_Y_OFFSET})`}>
                                <TorsoComponent torso={creature.torso} strokeColor={creature.strokeColor} isSideView={true} />

                                {/* 3. LIMBS - Only showing one set due to profile view */}
                                {creature.limbs.count > 0 && (
                                    <>
                                        {/* Upper limb */}
                                        <LimbComponent 
                                            segments={creature.limbs.segments} 
                                            strokeColor={creature.strokeColor}
                                            startX={creature.torso.width * 0.1} 
                                            startY={creature.torso.height * 0.15} 
                                            initialRotation={-90}
                                        />
                                        {/* Lower limb */}
                                        <LimbComponent 
                                            segments={creature.limbs.segments} 
                                            strokeColor={creature.strokeColor}
                                            startX={creature.torso.width * 0.1}
                                            startY={creature.torso.height * 0.85} 
                                            initialRotation={-80}
                                        />
                                    </>
                                )}
                            </g>
                        </svg>
                    </div>
                
                    {/* 3. DEBUGGING/TROUBLESHOOTING DATA (Column 3) */}
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-left">
                        <h3 className="text-xl font-semibold mb-2 text-gray-700">Generation Data</h3>
                        <div className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-y-scroll h-[300px] lg:h-[400px]">
                        <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(creature, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatureGenerator;