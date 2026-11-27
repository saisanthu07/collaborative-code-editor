import { motion, useScroll, useSpring } from "framer-motion";

const PAPER_EASE = [0.22, 1, 0.36, 1];

export function ScrollProgressRule() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="h-[2px] w-full origin-left bg-gradient-to-r from-accent via-[#B8741A] to-accent2"
      style={{ scaleX }}
    />
  );
}

export function PaperReveal({
  children,
  className = "",
  delay = 0,
  y = 22,
  amount = 0.16,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, delay, ease: PAPER_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({ children, className = "", stagger = 0.07 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.48, ease: PAPER_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
