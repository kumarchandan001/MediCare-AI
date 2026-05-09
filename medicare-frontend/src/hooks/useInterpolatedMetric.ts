/**
 * useInterpolatedMetric — Smoothly interpolates between discrete metric updates
 * 
 * Instead of jumping from 70→75 instantly, transitions over `duration` ms
 * using requestAnimationFrame for butter-smooth 60fps rendering.
 * Respects prefers-reduced-motion for accessibility.
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface InterpolationOptions {
  /** Transition duration in ms (default: 300) */
  duration?: number;
  /** Decimal precision (default: 0) */
  precision?: number;
  /** Easing function (default: easeOutCubic) */
  easing?: (t: number) => number;
  /** Disable interpolation entirely */
  disabled?: boolean;
}

// ── Easing functions ──────────────────────────
const easings = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
} as const;

export { easings };

export function useInterpolatedMetric(
  targetValue: number,
  options: InterpolationOptions = {}
): number {
  const {
    duration = 300,
    precision = 0,
    easing = easings.easeOutCubic,
    disabled = false,
  } = options;

  const [displayValue, setDisplayValue] = useState(targetValue);
  const animRef = useRef<number | null>(null);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    // Skip animation if disabled or reduced motion preferred
    if (disabled || prefersReducedMotion.current) {
      setDisplayValue(targetValue);
      return;
    }

    // Skip animation if this is the initial value
    if (startValueRef.current === targetValue) return;

    // Cancel any running animation
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      const interpolated =
        startValueRef.current + (targetValue - startValueRef.current) * easedProgress;

      const rounded =
        precision === 0
          ? Math.round(interpolated)
          : parseFloat(interpolated.toFixed(precision));

      setDisplayValue(rounded);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
        startValueRef.current = targetValue;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [targetValue, duration, precision, easing, disabled]);

  return displayValue;
}

/**
 * useInterpolatedValues — Interpolate an object of numeric values
 */
export function useInterpolatedValues<T extends Record<string, number>>(
  targetValues: T,
  options: InterpolationOptions = {}
): T {
  const keys = Object.keys(targetValues) as (keyof T)[];
  const result = {} as Record<string, number>;

  for (const key of keys) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    result[key as string] = useInterpolatedMetric(
      targetValues[key] as number,
      options
    );
  }

  return result as T;
}
