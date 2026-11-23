import { useEffect, useRef, type RefObject } from 'react';
import { CONFETTI_DURATION_MS, CONFETTI_PIECES_PER_SIDE } from '../../config';
import { createRng } from '../../game/random';
import { prefersReducedMotion } from '../../haptics';
import styles from './Celebration.module.css';

/** Light golds, so the confetti looks like part of the page and not a toy. */
const COLOURS = ['#f2d27a', '#e8c766', '#ddc48a', '#f7ebcb', '#cba64a', '#edd9a0'];
const GRAVITY = 520; // pixels per second squared
const STEPS = 28;

/**
 * Light gold confetti. Pieces start in the empty space just above and beside `targetRef` (the year), rise a little,
 * fall outwards in two low arches, and fade out. It must sit inside a positioned box, which it covers.
 * Visitors who prefer reduced motion see nothing. It never takes focus or catches clicks.
 */
export function Confetti({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const target = targetRef.current;
    if (!layer || !target || prefersReducedMotion() || typeof layer.animate !== 'function') return;

    const rng = createRng(Date.now());
    const box = layer.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const centre = (rect.left + rect.right) / 2 - box.left;
    const half = (rect.right - rect.left) / 2 + 10;
    const originY = rect.top - box.top - 2;
    const seconds = CONFETTI_DURATION_MS / 1000;
    const animations: Animation[] = [];

    for (const side of [-1, 1]) {
      const originX = centre + side * half;
      for (let i = 0; i < CONFETTI_PIECES_PER_SIDE; i++) {
        const angle = ((38 + rng() * 34) * Math.PI) / 180;
        const speed = 230 + rng() * 190;
        const vx = side * Math.cos(angle) * speed;
        const vy = -Math.sin(angle) * speed;
        const width = 5 + rng() * 5;
        const height = rng() < 0.5 ? width : width * 2;
        const spin = (rng() < 0.5 ? -1 : 1) * (200 + rng() * 520);

        const piece = document.createElement('span');
        piece.className = styles.piece;
        piece.style.width = `${width}px`;
        piece.style.height = `${height}px`;
        piece.style.background = COLOURS[Math.floor(rng() * COLOURS.length)];
        piece.style.borderRadius = rng() < 0.3 ? '50%' : '1px';
        layer.appendChild(piece);

        const frames: Keyframe[] = [];
        for (let step = 0; step <= STEPS; step++) {
          const progress = step / STEPS;
          const t = progress * seconds;
          const x = originX + vx * t;
          const y = originY + vy * t + 0.5 * GRAVITY * t * t;
          frames.push({
            offset: progress,
            opacity: progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) / 0.5),
            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(spin * t).toFixed(0)}deg)`,
          });
        }
        animations.push(piece.animate(frames, { duration: CONFETTI_DURATION_MS, delay: rng() * 160, easing: 'linear', fill: 'both' }));
      }
    }

    return () => {
      for (const animation of animations) animation.cancel();
      layer.replaceChildren();
    };
  }, [targetRef]);

  return <div className={styles.layer} ref={layerRef} aria-hidden="true" />;
}
