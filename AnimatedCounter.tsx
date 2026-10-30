import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../services/marketData';

interface AnimatedCounterProps {
  valueMinor: number;
  className?: string;
  prefix?: string;
  showPlus?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  valueMinor,
  className = '',
  prefix = '',
  showPlus = false,
}) => {
  const [displayValue, setDisplayValue] = useState(valueMinor);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = valueMinor;
    const duration = 600; // ms

    if (startValue === endValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [valueMinor]);

  const isPositive = displayValue > 0;
  const plusSign = showPlus && isPositive ? '+' : '';

  return (
    <span className={className}>
      {prefix}
      {plusSign}
      {formatCurrency(displayValue)}
    </span>
  );
};
