import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  baseAlpha: number;
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialise 150 stars
    const starCount = 150;
    const stars: Star[] = [];

    const createStar = (randomizeX = true): Star => {
      const baseAlpha = 0.2 + Math.random() * 0.6;
      return {
        x: randomizeX ? Math.random() * width : (Math.random() > 0.5 ? 0 : width),
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.8,
        speedX: (Math.random() - 0.5) * 0.03,
        speedY: (Math.random() - 0.5) * 0.03,
        alpha: baseAlpha,
        baseAlpha: baseAlpha,
      };
    };

    for (let i = 0; i < starCount; i++) {
      stars.push(createStar(true));
    }

    // Handles window resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Handles mouse movements for parallax drift
    const handleMouseMove = (e: MouseEvent) => {
      // Scale drift based on distance from viewport center
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) * 0.05;
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) * 0.05;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse transition
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move stars based on speed + mouse parallax drift
        star.x += star.speedX + mouseRef.current.x * 0.007;
        star.y += star.speedY + mouseRef.current.y * 0.007;

        // Wrap around screen boundaries
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(247, 247, 247, ${star.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
