// Removed unused imports
import { motion } from 'framer-motion';

/**
 * Animated cart character SVG logo
 * The cart has eyes, wobbles, and sparks fly around it
 */
export default function CartLogo({ size = 36, animate = true }: { size?: number; animate?: boolean }) {
    return (
        <motion.div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            {/* Outer glow ring */}
            {animate && (
                <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                        filter: 'blur(6px)',
                        opacity: 0.5,
                    }}
                    animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Background square */}
            <div
                className="relative rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                    width: size,
                    height: size,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                }}
            >
                {/* Cart SVG character */}
                <motion.svg
                    width={size * 0.7}
                    height={size * 0.7}
                    viewBox="0 0 32 32"
                    fill="none"
                    animate={animate ? { y: [0, -1.5, 0] } : undefined}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    {/* Cart body */}
                    <path
                        d="M4 5H7L10 19H24L26 10H8"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                    {/* Cart basket with fill */}
                    <path
                        d="M10 10H26L24 19H10V10Z"
                        fill="rgba(255,255,255,0.25)"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                    {/* Wheels */}
                    <circle cx="13" cy="22.5" r="2" fill="white" />
                    <circle cx="21" cy="22.5" r="2" fill="white" />
                    {/* Eyes on the cart basket */}
                    <motion.circle
                        cx="15"
                        cy="14"
                        r="1.5"
                        fill="#4f46e5"
                        animate={animate ? { scaleY: [1, 0.1, 1] } : undefined}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                    <motion.circle
                        cx="20"
                        cy="14"
                        r="1.5"
                        fill="#4f46e5"
                        animate={animate ? { scaleY: [1, 0.1, 1] } : undefined}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    />
                    {/* Smile */}
                    <path
                        d="M14.5 17 Q17.5 19.5 20.5 17"
                        stroke="#4f46e5"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Handle */}
                    <line x1="4" y1="5" x2="7" y2="5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </motion.svg>

                {/* Spark particles */}
                {animate && [
                    { x: -4, y: -4, delay: 0 },
                    { x: size * 0.6, y: -3, delay: 0.4 },
                    { x: size * 0.55, y: size * 0.55, delay: 0.8 },
                ].map((spark, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-yellow-300"
                        style={{ left: spark.x, top: spark.y }}
                        animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: spark.delay,
                            ease: 'easeOut',
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
}
