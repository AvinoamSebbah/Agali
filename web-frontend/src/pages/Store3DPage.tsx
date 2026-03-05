import { useRef, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane, Sparkles, Billboard, Edges, Float } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMapPin, FiInfo } from 'react-icons/fi';
import Header from '../components/Header';

// ============================================================
// Store Layout Definition (JSON-based, easily configurable)
// ============================================================

interface StoreSection {
    id: string;
    name: string;
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    products: string[];
    emoji: string;
}

const STORE_LAYOUT: StoreSection[] = [
    {
        id: 'dairy',
        name: 'מוצרי חלב',
        position: [-8, 0.5, -8],
        size: [3, 2, 6],
        color: '#3b82f6',
        products: ['חלב', 'גבינה', 'יוגורט', 'חמאה', 'שמנת', 'קוטג'],
        emoji: '🥛',
    },
    {
        id: 'produce',
        name: 'פירות וירקות',
        position: [-4, 0.5, -8],
        size: [3, 1.5, 6],
        color: '#22c55e',
        products: ['תפוח', 'בננה', 'עגבנייה', 'מלפפון', 'גזר', 'תות', 'אבוקדו'],
        emoji: '🥦',
    },
    {
        id: 'meat',
        name: 'בשר ועוף',
        position: [0, 0.5, -8],
        size: [3, 2, 6],
        color: '#ef4444',
        products: ['עוף', 'בשר בקר', 'כבש', 'נקניק', 'שניצל', 'קציצות'],
        emoji: '🥩',
    },
    {
        id: 'bakery',
        name: 'לחם ומאפים',
        position: [4, 0.5, -8],
        size: [3, 2, 6],
        color: '#f59e0b',
        products: ['לחם', 'חלה', 'בגט', 'עוגה', 'קרואסון', 'פיתה'],
        emoji: '🍞',
    },
    {
        id: 'beverages',
        name: 'משקאות',
        position: [8, 0.5, -8],
        size: [3, 2.5, 6],
        color: '#06b6d4',
        products: ['מים', 'מיץ', 'קולה', 'בירה', 'יין', 'ספרייט', 'פאנטה'],
        emoji: '🥤',
    },
    {
        id: 'snacks',
        name: 'חטיפים',
        position: [-8, 0.5, 0],
        size: [3, 2, 6],
        color: '#a855f7',
        products: ['חטיף', 'ביסלי', 'במבה', 'שוקולד', 'סוכריות', 'ויפר'],
        emoji: '🍿',
    },
    {
        id: 'pantry',
        name: 'מוצרי יסוד',
        position: [-4, 0.5, 0],
        size: [3, 2, 6],
        color: '#8b5cf6',
        products: ['אורז', 'פסטה', 'קמח', 'סוכר', 'שמן', 'מלח', 'תבלינים'],
        emoji: '🥫',
    },
    {
        id: 'frozen',
        name: 'מוצרים קפואים',
        position: [0, 0.5, 0],
        size: [3, 2, 6],
        color: '#38bdf8',
        products: ['גלידה', 'פיצה קפואה', 'ירקות קפואים', 'מוצרלה'],
        emoji: '🧊',
    },
    {
        id: 'cleaning',
        name: 'ניקיון',
        position: [4, 0.5, 0],
        size: [3, 2, 6],
        color: '#10b981',
        products: ['סבון', 'שמפו', 'אבקת כביסה', 'מרכך', 'נייר טואלט'],
        emoji: '🧴',
    },
    {
        id: 'pharmacy',
        name: 'בריאות',
        position: [8, 0.5, 0],
        size: [3, 2, 6],
        color: '#f43f5e',
        products: ['ויטמינים', 'משחת שיניים', 'קרם', 'שמן תינוק'],
        emoji: '💊',
    },
];

// ============================================================
// 3D Components
// ============================================================

function Floor() {
    return (
        <Plane
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
            args={[40, 40]}
        >
            <meshStandardMaterial
                color="#0d0d2b"
                roughness={0.8}
                metalness={0.1}
            />
        </Plane>
    );
}

function GridFloor() {
    const gridHelper = useMemo(() => new THREE.GridHelper(40, 40, '#1a1a3e', '#1a1a3e'), []);
    return <primitive object={gridHelper} position={[0, 0, 0]} />;
}

function ShelfUnit({
    section,
    highlighted,
    onClick,
}: {
    section: StoreSection;
    highlighted: boolean;
    onClick: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (highlighted && meshRef.current) {
            meshRef.current.position.y = section.position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        }
    });

    const isProduce = section.id === 'produce';
    const isFridge = ['dairy', 'frozen', 'meat'].includes(section.id);
    const [w, h, d] = section.size;

    return (
        <group position={section.position} onClick={onClick}>
            {/* The interactive hit-box (invisible but catches clicks/hovers) */}
            <mesh
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
                visible={false}
            >
                <boxGeometry args={[w, h, d]} />
                <meshBasicMaterial />
            </mesh>

            {/* Actual Visuals */}
            <group ref={meshRef}>
                {isProduce ? (
                    // ── Produce: Elegantly slanted glass display ──
                    <group>
                        {/* Dark base */}
                        <Box args={[w, 0.2, d]} position={[0, -h / 2 + 0.1, 0]}>
                            <meshStandardMaterial color="#0b0f19" metalness={0.8} roughness={0.2} />
                        </Box>

                        {/* Slanted Glass Surface */}
                        <Box args={[w - 0.2, 0.05, d - 0.2]} position={[0, -h / 2 + 0.8, 0]} rotation={[0.2, 0, 0]}>
                            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.15} roughness={0.1} transmission={1} clearcoat={1} />
                            <Edges linewidth={1} color={section.color} />
                            <Box args={[w - 0.3, 0.01, d - 0.3]} position={[0, -0.05, 0]}>
                                <meshStandardMaterial color={section.color} emissive={section.color} emissiveIntensity={highlighted ? 3 : hovered ? 1 : 0.4} />
                            </Box>
                        </Box>

                        {/* Floating holographic light dots above the display */}
                        <Float speed={3} rotationIntensity={0.2} floatIntensity={1}>
                            <Sparkles count={25} scale={[w - 0.5, 0.5, d - 0.5]} position={[0, -h / 2 + 1.2, 0]} size={8} color={section.color} speed={0.4} />
                        </Float>
                    </group>
                ) : isFridge ? (
                    // ── Fridge: Tall sleek frosted monolith ──
                    <group>
                        {/* Outer Glass Shell */}
                        <Box args={[w, h, d]}>
                            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.1} metalness={0.5} roughness={0.1} transmission={1} clearcoat={1} />
                            <Edges linewidth={1} color="#334155" />
                        </Box>

                        {/* Inner Glowing LED Cores */}
                        <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
                            {[-0.6, 0, 0.6].map((yOffset, i) => (
                                <Box key={i} args={[w - 0.4, 0.1, d - 0.4]} position={[0, yOffset, 0]}>
                                    <meshStandardMaterial color={section.color} emissive={section.color} emissiveIntensity={highlighted ? 3 : hovered ? 1 : 0.5} transparent opacity={0.6} />
                                    <Edges linewidth={1} color={section.color} />
                                </Box>
                            ))}
                        </Float>
                    </group>
                ) : (
                    // ── Standard: Floating glass tablets on thin metallic spines ──
                    <group>
                        {/* Center Spine */}
                        <Box args={[0.05, h, 0.05]} position={[0, 0, -d / 2 + 0.1]}>
                            <meshStandardMaterial color="#cbd5e1" metalness={1} roughness={0.1} />
                        </Box>

                        {/* Levitating Glass Shelves */}
                        {[-0.6, 0.1, 0.8].map((yOffset, i) => (
                            <group key={i}>
                                {/* Glass tablet */}
                                <Box args={[w - 0.2, 0.02, d - 0.4]} position={[0, yOffset, 0]}>
                                    <meshPhysicalMaterial color="#ffffff" transparent opacity={0.2} transmission={0.9} roughness={0.1} />
                                    <Edges linewidth={1} color="#475569" />
                                </Box>
                                {/* LED glow edge under tablet */}
                                <Box args={[w - 0.3, 0.01, d - 0.5]} position={[0, yOffset - 0.02, 0]}>
                                    <meshStandardMaterial color={section.color} emissive={section.color} emissiveIntensity={highlighted ? 3 : hovered ? 1 : 0.4} />
                                </Box>
                            </group>
                        ))}
                    </group>
                )}
            </group>

            {/* Highlight glow ring */}
            {highlighted && (
                <Box args={[section.size[0] + 0.2, 0.05, section.size[2] + 0.2]} position={[0, -section.size[1] / 2 - 0.1, 0]}>
                    <meshStandardMaterial
                        color={section.color}
                        emissive={section.color}
                        emissiveIntensity={2}
                    />
                </Box>
            )}

            {/* Label - wrapped in Billboard to prevent clipping and always face camera */}
            <Billboard
                position={[0, section.size[1] / 2 + 1.0, 0]}
                follow={true}
                lockX={false}
                lockY={false}
                lockZ={false}
            >
                <Text
                    fontSize={0.4}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.03}
                    outlineColor="#000000"
                    material-depthTest={false}
                    renderOrder={10}
                >
                    {section.emoji} {section.name}
                </Text>
            </Billboard>
        </group>
    );
}

function CameraRig({ target }: { target: [number, number, number] | null }) {
    const { camera } = useThree();
    const targetRef = useRef(new THREE.Vector3(0, 5, 15));

    useFrame(() => {
        if (target) {
            targetRef.current.lerp(new THREE.Vector3(target[0], target[1] + 8, target[2] + 10), 0.05);
            camera.position.lerp(targetRef.current, 0.05);
            camera.lookAt(target[0], target[1], target[2]);
        }
    });

    return null;
}

function StoreScene({
    highlightedSection,
    onSectionClick,
}: {
    highlightedSection: string | null;
    onSectionClick: (section: StoreSection) => void;
}) {
    const targetPos = highlightedSection
        ? STORE_LAYOUT.find(s => s.id === highlightedSection)?.position || null
        : null;

    return (
        <>
            <ambientLight intensity={1.2} />
            <pointLight position={[0, 15, 0]} intensity={3} color="#ffffff" />
            <pointLight position={[-10, 8, 10]} intensity={1.5} color="#6366f1" />
            <pointLight position={[10, 8, 10]} intensity={1.5} color="#a855f7" />
            <pointLight position={[0, 8, -10]} intensity={1} color="#10b981" />

            <Sparkles count={50} scale={30} size={2} speed={0.3} color="#6366f1" />

            <Floor />
            <GridFloor />

            {STORE_LAYOUT.map(section => (
                <ShelfUnit
                    key={section.id}
                    section={section}
                    highlighted={highlightedSection === section.id}
                    onClick={() => onSectionClick(section)}
                />
            ))}

            <CameraRig target={targetPos} />

            <OrbitControls
                enablePan
                enableZoom
                enableRotate
                maxPolarAngle={Math.PI / 2.2}
                minDistance={5}
                maxDistance={40}
            />
        </>
    );
}

// ============================================================
// Main Page Component
// ============================================================

export default function Store3DPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<StoreSection | null>(null);
    const [foundIn, setFoundIn] = useState<StoreSection[]>([]);

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        if (!q.trim()) {
            setFoundIn([]);
            setHighlightedSection(null);
            return;
        }

        const found = STORE_LAYOUT.filter(section =>
            section.products.some(p => p.includes(q)) ||
            section.name.includes(q)
        );
        setFoundIn(found);

        if (found.length > 0) {
            setHighlightedSection(found[0].id);
            setSelectedSection(found[0]);
        } else {
            setHighlightedSection(null);
        }
    };

    const handleSectionClick = (section: StoreSection) => {
        setSelectedSection(section);
        setHighlightedSection(section.id);
    };

    return (
        <div className="h-screen flex flex-col animated-gradient overflow-hidden">
            <Header />

            {/* Controls overlay - positioned on left side (visible in RTL layout) */}
            <div className="absolute top-20 left-4 z-20 w-72 space-y-3">
                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-strong border border-white/10 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <FiMapPin className="text-primary-400 w-4 h-4" />
                        <h2 className="text-white font-bold text-sm">מפת חנות 3D</h2>
                    </div>

                    <div className="relative">
                        <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="חפש מוצר..."
                            className="w-full input-dark rounded-xl px-4 py-2.5 pr-9 text-sm"
                        />
                    </div>

                    {/* Quick search tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {['חלב', 'לחם', 'עוף', 'מים', 'ביסלי'].map(term => (
                            <button
                                key={term}
                                onClick={() => handleSearch(term)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${searchQuery === term
                                    ? 'bg-primary-500/30 text-primary-300 border border-primary-500/40'
                                    : 'glass text-white/40 hover:text-white border border-white/5'
                                    }`}
                            >
                                {term}
                            </button>
                        ))}
                    </div>

                    {/* Search results */}
                    {searchQuery && (
                        <div className="mt-3 pt-3 border-t border-white/8">
                            {foundIn.length > 0 ? (
                                <div>
                                    <p className="text-accent-emerald text-xs font-semibold mb-2">
                                        ✅ נמצא ב{foundIn.length} מחלקות:
                                    </p>
                                    {foundIn.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSectionClick(s)}
                                            className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <span className="text-sm">{s.emoji} {s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-white/30 text-xs text-center">לא נמצא מוצר</p>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* Selected section info */}
                <AnimatePresence>
                    {selectedSection && (
                        <motion.div
                            key={selectedSection.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="glass-strong border rounded-2xl p-4"
                            style={{ borderColor: selectedSection.color + '40' }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">{selectedSection.emoji}</span>
                                <h3 className="text-white font-bold">{selectedSection.name}</h3>
                            </div>
                            <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">מוצרים באזור זה</p>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedSection.products.map(p => (
                                    <span
                                        key={p}
                                        className="text-xs px-2 py-1 rounded-lg text-white/60"
                                        style={{ background: selectedSection.color + '20' }}
                                    >
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Legend */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass border border-white/8 rounded-2xl p-3"
                >
                    <p className="text-white/30 text-xs mb-2 uppercase tracking-wider flex items-center gap-1">
                        <FiInfo size={10} />
                        ניווט
                    </p>
                    <div className="space-y-1 text-xs text-white/30">
                        <p>🖱️ גלגל עכבר — זום</p>
                        <p>🖱️ גרור — סיבוב</p>
                        <p>🖱️ לחץ על מחלקה — בחר</p>
                        <p>🔍 חפש מוצר — מצא מחלקה</p>
                    </div>
                </motion.div>
            </div>

            {/* 3D Canvas */}
            <div className="flex-1 pt-16">
                <Canvas
                    camera={{ position: [0, 15, 25], fov: 50 }}
                    shadows
                    gl={{ antialias: true, alpha: true }}
                    style={{ background: 'transparent' }}
                >
                    <Suspense fallback={null}>
                        <StoreScene
                            highlightedSection={highlightedSection}
                            onSectionClick={handleSectionClick}
                        />
                    </Suspense>
                </Canvas>
            </div>

            {/* Section quick-nav at bottom */}
            <div className="absolute bottom-6 left-0 right-0 z-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="flex gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
                        {STORE_LAYOUT.map(section => (
                            <button
                                key={section.id}
                                onClick={() => handleSectionClick(section)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${highlightedSection === section.id
                                    ? 'text-white shadow-lg border'
                                    : 'glass text-white/50 hover:text-white border border-white/5'
                                    }`}
                                style={highlightedSection === section.id ? {
                                    background: section.color + '30',
                                    borderColor: section.color + '60',
                                } : {}}
                            >
                                <span>{section.emoji}</span>
                                <span>{section.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
