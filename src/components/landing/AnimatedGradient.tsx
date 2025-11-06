import { useEffect, useRef } from 'react';

export function AnimatedGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create multiple gradient layers
      const gradients = [
        {
          x: canvas.width * 0.2 + Math.sin(time) * 100,
          y: canvas.height * 0.3 + Math.cos(time * 0.7) * 80,
          radius: 400,
          color1: 'rgba(59, 130, 246, 0.15)', // Blue
          color2: 'rgba(59, 130, 246, 0)',
        },
        {
          x: canvas.width * 0.8 + Math.cos(time * 0.8) * 120,
          y: canvas.height * 0.7 + Math.sin(time * 0.6) * 100,
          radius: 500,
          color1: 'rgba(147, 51, 234, 0.12)', // Purple
          color2: 'rgba(147, 51, 234, 0)',
        },
        {
          x: canvas.width * 0.5 + Math.sin(time * 1.2) * 150,
          y: canvas.height * 0.5 + Math.cos(time * 0.9) * 120,
          radius: 600,
          color1: 'rgba(14, 165, 233, 0.1)', // Cyan
          color2: 'rgba(14, 165, 233, 0)',
        },
      ];

      gradients.forEach((grad) => {
        const gradient = ctx.createRadialGradient(
          grad.x,
          grad.y,
          0,
          grad.x,
          grad.y,
          grad.radius
        );
        gradient.addColorStop(0, grad.color1);
        gradient.addColorStop(1, grad.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

