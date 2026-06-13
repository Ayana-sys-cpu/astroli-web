'use client';
import { motion } from 'framer-motion';

interface KineticTextProps {
  text: string;
  className?: string;
  delay?: number;
}

const wordVariant = {
  hidden: { opacity: 0, y: 6, scaleY: 0.85, filter: 'blur(2px)' },
  visible: { opacity: 1, y: 0, scaleY: 1, filter: 'blur(0px)' },
};

export default function KineticText({ text, className, delay = 0 }: KineticTextProps) {
  const words = text.split(' ');
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04, delayChildren: delay } } }}
      style={{ display: 'inline' }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={wordVariant}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          style={{ display: 'inline-block', marginRight: i < words.length - 1 ? '0.25em' : 0 }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}
