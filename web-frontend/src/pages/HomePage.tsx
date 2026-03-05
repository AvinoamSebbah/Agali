import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import {
  FiSearch, FiShoppingCart, FiCamera, FiMap,
  FiArrowLeft,
} from 'react-icons/fi';
import Header from '../components/Header';
import { useCity } from '../contexts/CityContext';

// Animated particle background
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const colors = ['#6366f1', '#a855f7', '#ec4899', '#06b6d4', '#10b981'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

// Magnetic hover card
function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  gradient,
  delay = 0,
  badge,
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  gradient: string;
  delay?: number;
  badge?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateY.set(dx * 10);
    rotateX.set(-dy * 10);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      style={{ rotateX, rotateY, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative group"
    >
      <Link to={href} className="block h-full">
        <div className="relative h-full glass border border-white/8 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-card-hover">
          {/* Gradient glow on hover */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />

          {/* Badge */}
          {badge && (
            <div className="absolute top-4 left-4">
              <span className="badge-promo text-white">{badge}</span>
            </div>
          )}

          {/* Icon */}
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${gradient} mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-white/50 text-sm leading-relaxed mb-5">{description}</p>

          {/* CTA */}
          <div className="flex items-center gap-2 text-primary-400 text-sm font-medium group-hover:gap-3 transition-all duration-200">
            <span>גלה עוד</span>
            <FiArrowLeft size={14} className="rotate-180" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Stat counter animation
function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-5 text-center border border-white/8"
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black gradient-text">{value}</div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </motion.div>
  );
}

export default function HomePage() {
  const { city } = useCity();
  const [typedText, setTypedText] = useState('');
  const fullText = 'חסכו כסף על כל קנייה';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: FiSearch,
      title: 'חיפוש מוצרים',
      description: 'חפשו מוצרים לפי שם או ברקוד וראו את כל המחירים בחנויות ב' + city,
      href: '/search',
      gradient: 'from-primary-500 to-accent-cyan',
      delay: 0.1,
    },
    {
      icon: FiCamera,
      title: 'סריקת קבלה',
      description: 'צלמו את הקבלה ה-AI יזהה את כל הברקודים ויחשב את עלות הסל',
      href: '/receipt-scan',
      gradient: 'from-accent-purple to-accent-pink',
      delay: 0.2,
      badge: '🤖 AI',
    },
    {
      icon: FiShoppingCart,
      title: 'העגלה שלי',
      description: 'הכניסו את רשימת הקניות וגלו מה המחיר הכולל בכל חנות ב' + city,
      href: '/compare',
      gradient: 'from-accent-emerald to-accent-cyan',
      delay: 0.3,
    },
    {
      icon: FiMap,
      title: 'מפת החנות 3D',
      description: 'חוויית ניווט תלת-ממדית בתוך החנות - מצאו כל מוצר בדיוק היכן הוא',
      href: '/store-3d',
      gradient: 'from-accent-amber to-accent-pink',
      delay: 0.4,
      badge: '🔥 חדש',
    },
  ];

  return (
    <div className="min-h-screen animated-gradient grid-bg">
      <ParticleField />
      <Header />

      {/* Hero */}
      <section className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">

          {/* City badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 border border-primary-500/30"
          >
            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-white/70 text-sm">
              מחיר חי ב{city} · עודכן לפני 2 שעות
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl md:text-8xl font-black mb-6 leading-none tracking-tight"
          >
            <span className="gradient-text">עגלי</span>
            <br />
            <span className="text-white/90 text-5xl md:text-6xl font-bold">
              {typedText}
              <span className="animate-pulse text-primary-400">|</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-white/50 text-xl max-w-2xl mx-auto mb-10"
          >
            השוואת מחירים חכמה בין כל הסופרמרקטים בישראל.
            סרקו, השוו, וחסכו — עם עוצמת ה-AI.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to="/search">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold shadow-neon"
              >
                <FiSearch className="w-5 h-5" />
                חפש מוצר עכשיו
              </motion.button>
            </Link>
            <Link to="/receipt-scan">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-bold glass border border-white/15 text-white hover:border-accent-purple/50 hover:shadow-neon-purple transition-all duration-300"
              >
                <FiCamera className="w-5 h-5" />
                סרוק קבלה
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-16"
          >
            <StatCard value="30+" label="רשתות סופרים" icon="🏪" />
            <StatCard value="2M+" label="מוצרים" icon="📦" />
            <StatCard value="₪500" label="חיסכון ממוצע" icon="💰" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-4 pb-20">
        <div className="max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-black text-white mb-3">
              כל הכלים במקום אחד
            </h2>
            <p className="text-white/40">טכנולוגיה חכמה לחיסכון אמיתי</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((feat) => (
              <FeatureCard key={feat.href} {...feat} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer promo strip */}
      <div className="relative z-10 border-t border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-6 justify-center text-white/30 text-sm">
          {['🔒 אבטחה מלאה', '⚡ עדכון בזמן אמת', '🇮🇱 כל רשתות ישראל', '🤖 AI מתקדם'].map(item => (
            <div key={item} className="flex items-center gap-1">{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
