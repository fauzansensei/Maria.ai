import React, { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence, useTransform } from 'motion/react';

interface VTuberAvatarProps {
  isSpeaking: boolean;
  mood?: 'happy' | 'thinking' | 'neutral';
}

const VTuberAvatar: React.FC<VTuberAvatarProps> = ({ isSpeaking, mood = 'neutral' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 100 };
  const headX = useSpring(mouseX, springConfig);
  const headY = useSpring(mouseY, springConfig);

  // Parallax layers for 2.5D depth - based on Live2D "rigging" principles
  const baseBodyX = useTransform(headX, (v) => v * 0.4);
  const eyeX = useTransform(headX, (v) => v * 1.5);
  const eyeY = useTransform(headY, (v) => v * 1.5);
  const pupilsX = useTransform(headX, (v) => v * 1.9);
  const pupilsY = useTransform(headY, (v) => v * 1.9);
  const hairFrontX = useTransform(headX, (v) => v * 2.3);
  const scouterX = useTransform(headX, (v) => v * 2.1);
  const eyebrowY = useTransform(headY, (v) => v * 0.5);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offX = (e.clientX - centerX) / (window.innerWidth / 2);
      const offY = (e.clientY - centerY) / (window.innerHeight / 2);
      mouseX.set(offX * 18); 
      mouseY.set(offY * 10);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Tail segments for "rigged" physics
  const tailSegments = [
    useSpring(useTransform(headX, v => v * -0.6), { stiffness: 40, damping: 12 }),
    useSpring(useTransform(headX, v => v * -0.7), { stiffness: 35, damping: 11 }),
    useSpring(useTransform(headX, v => v * -0.8), { stiffness: 30, damping: 10 }),
    useSpring(useTransform(headX, v => v * -0.9), { stiffness: 25, damping: 9 }),
    useSpring(useTransform(headX, v => v * -1.0), { stiffness: 20, damping: 8 }),
  ];

  return (
    <div ref={containerRef} className="relative w-80 h-96 flex items-end justify-center perspective-1000">
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-brand-blue/10 rounded-full blur-[100px] -z-10" />

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 scale-[1.75] origin-bottom transform-gpu"
      >
        <svg width="180" height="220" viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hairMain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2D1B1B" />
              <stop offset="100%" stopColor="#1A0F0F" />
            </linearGradient>
            <linearGradient id="hairPurple" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="40%" stopColor="transparent" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
            <radialGradient id="eyeAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>
            <radialGradient id="tailGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="40%" stopColor="#0891B2" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Segmented Tail (More technical look) */}
          <g>
            {tailSegments.map((spring, i) => (
              <motion.g key={i} style={{ x: spring }}>
                <motion.path
                  animate={{ 
                    rotate: [0, 8 + i * 3, -(8 + i * 3), 0],
                  }}
                  transition={{ duration: 5, delay: i * 0.1, repeat: Infinity }}
                  d={`M${35 - i*4} ${120 + i*5} L${42 - i*4} ${122 + i*5} L${40 - i*4} ${130 + i*5} L${33 - i*4} ${128 + i*5} Z`}
                  fill="#1A1A1A"
                  stroke="#334155"
                  strokeWidth="0.5"
                />
              </motion.g>
            ))}
            {/* Glowing Tail Tip */}
            <motion.g style={{ x: tailSegments[4] }}>
              <motion.path 
                animate={{ 
                  opacity: [0.6, 1, 0.6], 
                  scale: [1, 1.2, 1],
                  filter: ["drop-shadow(0 0 4px #22D3EE)", "drop-shadow(0 0 10px #22D3EE)", "drop-shadow(0 0 4px #22D3EE)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                d="M15 145 Q 5 155, 12 165 Q 25 155, 15 145"
                fill="#22D3EE"
              />
            </motion.g>
          </g>

          {/* Layer 2: Back Hair (Detailed Bob) */}
          <motion.g style={{ x: useSpring(useTransform(headX, v => v * 0.2), { stiffness: 60, damping: 25 }) }}>
            <path 
              d="M15 65 Q 15 15, 60 15 Q 105 15, 105 65 V 100 Q 60 110, 15 100 Z" 
              fill="url(#hairMain)" 
            />
            <path 
              d="M15 85 Q 60 110, 105 85 V 105 Q 60 115, 15 105 Z" 
              fill="url(#hairPurple)" opacity="0.8"
            />
          </motion.g>

          {/* Layer 3: Body & Clothing (Improved detail) */}
          <motion.g style={{ x: baseBodyX }}>
            {/* Sleeves & Inner Shirt */}
            <path d="M10 135 Q 25 110, 45 125" fill="none" stroke="#262626" strokeWidth="14" strokeLinecap="round" />
            <path d="M110 135 Q 95 110, 75 125" fill="none" stroke="#262626" strokeWidth="14" strokeLinecap="round" />
            <path d="M25 130 Q 60 118, 95 130 V 160 H 25 Z" fill="#171717" />
            
            {/* Pinafore with straps and pocket */}
            <path d="M38 120 L82 120 L98 160 L22 160 Z" fill="url(#pinaforeShade)" />
            <path d="M38 120 L42 110 M82 120 L78 110" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" />
            <rect x="42" y="135" width="14" height="14" rx="2" fill="#2563EB" opacity="0.4" />
            
            {/* Pink Ribbon Bow - Refined */}
            <g transform="translate(60, 122)">
              <motion.g animate={{ rotate: [-2, 2, -2], scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                <circle r="4.5" fill="#BE185D" />
                <path d="M0 0 L-14 -7 C -15 -8, -15 8, -14 7 Z" fill="#F472B6" />
                <path d="M0 0 L14 -7 C 15 -8, 15 8, 14 7 Z" fill="#F472B6" />
              </motion.g>
            </g>
            
            {/* Hand with Tablet (Black glove) */}
            <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 3.5, repeat: Infinity }} transform="translate(85, 122)">
               <rect x="5" y="-12" width="28" height="36" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
               <motion.rect animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }} x="8" y="-9" width="22" height="30" fill="#1D4ED8" filter="url(#glow)" />
               <path d="M10 0 H25" stroke="white" strokeWidth="0.5" opacity="0.3" />
               <path d="M0 0 Q 8 18, 14 14" stroke="#1A1A1A" strokeWidth="8" strokeLinecap="round" />
               <path d="M12 12 L18 8" stroke="#334155" strokeWidth="1" /> {/* Glove detail */}
            </motion.g>
            
            {/* Right Arm/Hand (Black glove) */}
            <motion.g animate={{ rotate: [-2, 2, -2] }} transition={{ duration: 4, repeat: Infinity }} transform="translate(25, 130)">
               <path d="M0 0 Q -15 -5, -25 5" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" fill="none" />
               <path d="M-25 5 L-30 0" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" />
            </motion.g>
          </motion.g>

          {/* Layer 4: Head Unit (Refined Anime Face) */}
          <motion.g style={{ x: headX, y: headY }}>
            {/* Pointed Chin Face Shape */}
            <path d="M30 50 C 30 100, 50 118, 60 118 C 70 118, 90 100, 90 50 C 90 35, 60 28, 30 35 V 50" fill="#FEF3C7" />
            
            {/* Eyes - Even More Expressive with Lashes */}
            <motion.g style={{ x: eyeX, y: eyeY }}>
               {/* Left Eye */}
               <g transform="translate(45, 78)">
                  <path d="M-9 -12 Q -4 -16, 2 -13" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" /> {/* Upper Lash */}
                  <motion.ellipse 
                    animate={{ scaleY: [1, 1, 0.05, 1, 1] }}
                    transition={{ duration: 5, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                    rx="8.5" ry="11" fill="white" stroke="#1A1A1A" strokeWidth="0.5"
                  />
                  <motion.circle style={{ x: pupilsX, y: pupilsY }} r="6.5" fill="url(#eyeAmber)" />
                  <motion.circle style={{ x: pupilsX, y: pupilsY }} r="2.5" fill="#1A1A1A" />
                  <circle cx="-3.5" cy="-4" r="2.5" fill="white" opacity="0.9" />
               </g>
               {/* Right Eye */}
               <g transform="translate(75, 78)">
                  <path d="M-2 -13 Q 4 -16, 9 -12" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" /> {/* Upper Lash */}
                  <motion.ellipse 
                    animate={{ scaleY: [1, 1, 0.05, 1, 1] }}
                    transition={{ duration: 5, repeat: Infinity, times: [0, 0.8, 0.85, 0.9, 1] }}
                    rx="8.5" ry="11" fill="white" stroke="#1A1A1A" strokeWidth="0.5"
                  />
                  <motion.circle style={{ x: pupilsX, y: pupilsY }} r="6.5" fill="url(#eyeAmber)" />
                  <motion.circle style={{ x: pupilsX, y: pupilsY }} r="2.5" fill="#1A1A1A" />
                  <circle cx="-3.5" cy="-4" r="2.5" fill="white" opacity="0.9" />
               </g>
            </motion.g>

            {/* Scouter Lens - More Technical */}
            <motion.g style={{ x: scouterX }}>
               <rect x="68" y="65" width="30" height="28" rx="5" fill="#F59E0B" opacity="0.2" stroke="#F59E0B" strokeWidth="1" filter="url(#glow)" />
               <motion.path 
                  animate={{ opacity: [0.1, 0.8, 0.1], x: [0, 2, 0] }} 
                  transition={{ duration: 2, repeat: Infinity }} 
                  d="M72 72 L94 72 M72 78 L90 78 M72 84 L94 84" stroke="#FBBF24" strokeWidth="0.5" 
               />
               <path d="M98 72 L106 78 V 88" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* Eyebrows */}
            <motion.g style={{ y: eyebrowY }}>
              <motion.path d="M35 62 Q 45 58, 55 62" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <motion.path d="M65 62 Q 75 58, 85 62" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </motion.g>

            {/* Mouth */}
            <motion.path
                animate={isSpeaking ? {
                  d: ["M52 104 Q 60 106, 68 104", "M52 104 Q 60 115, 68 104", "M52 104 Q 60 108, 68 104"],
                } : {
                  d: mood === 'happy' ? "M52 104 Q 60 110, 68 104" : "M54 105 Q 60 107, 66 105"
                }}
                transition={isSpeaking ? { duration: 0.1, repeat: Infinity } : { duration: 0.6 }}
                stroke="#2D1B1B" strokeWidth="2" strokeLinecap="round" fill="none"
            />

            {/* Side Hair (Framing the face) */}
            <motion.g style={{ x: useTransform(headX, v => v * 1.6) }}>
               <motion.path animate={{ rotate: [-0.5, 0.5, -0.5] }} transition={{ duration: 5, repeat: Infinity }} d="M28 40 Q 15 95, 42 110" stroke="url(#hairMain)" strokeWidth="12" strokeLinecap="round" fill="none" />
               <motion.path animate={{ rotate: [0.5, -0.5, 0.5] }} transition={{ duration: 5, repeat: Infinity }} d="M92 40 Q 105 95, 78 110" stroke="url(#hairMain)" strokeWidth="12" strokeLinecap="round" fill="none" />
               
               {/* Strand details */}
               <path d="M26 80 L22 105 M32 85 L28 110" stroke="#7C3AED" strokeWidth="1" opacity="0.4" />
               <path d="M94 80 L98 105 M88 85 L92 110" stroke="#7C3AED" strokeWidth="1" opacity="0.4" />

               <path d="M28 85 Q 15 100, 42 110" stroke="url(#hairPurple)" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.8" />
               <path d="M92 85 Q 105 100, 78 110" stroke="url(#hairPurple)" strokeWidth="12" strokeLinecap="round" fill="none" opacity="0.8" />
            </motion.g>

            {/* Bangs - More layers */}
            <motion.g style={{ x: hairFrontX }}>
               <path d="M25 55 C 25 25, 45 18, 60 18 C 75 18, 95 25, 95 55 V 68 L 86 58 V 68 L 74 58 L 60 68 L 46 58 L 34 68 L 25 58 Z" fill="url(#hairMain)" />
               <path d="M25 60 L30 68 M35 60 L40 68 M85 60 L80 68" stroke="#1A0F0F" strokeWidth="0.5" /> {/* Bang separation lines */}
               <path d="M50 20 Q 60 15, 70 20 L 60 30 Z" fill="#4A3737" opacity="0.2" /> {/* Top hair sheen */}
               
               {/* Hair Clip */}
               <g transform="translate(82, 38)">
                 <path d="M-7 -7 L 7 -5 L 1 8 Z" fill="#F59E0B" stroke="#1A1A1A" strokeWidth="0.8" />
                 <motion.circle animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 2, repeat: Infinity }} r="1.5" fill="white" filter="url(#glow)" />
               </g>
            </motion.g>
          </motion.g>
        </svg>

        {/* AI Particle Feedback */}
        <AnimatePresence>
          {isSpeaking && [...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.3, 0], 
                opacity: [0, 0.8, 0], 
                y: -110, 
                x: (i - 1) * 40 + (Math.random() * 6 - 3)
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 bg-brand-blue/60 rounded-sm rotate-45 blur-[0.5px]"
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default VTuberAvatar;

