import { useEffect, useRef, useState } from 'react';

interface UseScrollParallaxOptions {
  speed?: number;
  direction?: 'up' | 'down';
}

export const useScrollParallax = (options: UseScrollParallaxOptions = {}) => {
  const { speed = 0.5, direction = 'up' } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const scrollPosition = window.scrollY;
      const elementTop = rect.top + scrollPosition;
      const viewportHeight = window.innerHeight;
      
      // Calculate parallax offset when element is in viewport
      if (rect.top < viewportHeight && rect.bottom > 0) {
        const parallaxOffset = (scrollPosition - elementTop) * speed;
        setOffset(direction === 'up' ? -parallaxOffset : parallaxOffset);
      }
    };

    handleScroll(); // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, direction]);

  return { ref, offset };
};
