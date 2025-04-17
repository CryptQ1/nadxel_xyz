'use client';

import { useEffect, useRef } from 'react';

export function useParticleAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const scrollSection = document.getElementById('scroll-section');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.body.scrollHeight;
    };
    resizeCanvas();

    const particlesArray: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      life: number;
      inScrollArea: boolean;

      constructor(x: number, y: number, inScrollArea: boolean) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.life = 100;
        this.inScrollArea = inScrollArea;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        this.size *= 0.98;
      }

      draw() {
        ctx.fillStyle = this.inScrollArea
          ? `rgba(251, 250, 249, ${this.life / 100})`
          : `rgba(32, 0, 83, ${this.life / 100})`;
        ctx.beginPath();
        ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.fill();
      }
    }

    const mouse = { x: null as number | null, y: null as number | null };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
      if (!scrollSection) return;
      const scrollRect = scrollSection.getBoundingClientRect();
      const inScrollArea =
        mouse.y >= scrollRect.top + window.scrollY &&
        mouse.y <= scrollRect.bottom + window.scrollY &&
        mouse.x >= scrollRect.left &&
        mouse.x <= scrollRect.right;
      for (let i = 0; i < 2; i++) {
        particlesArray.push(new Particle(mouse.x!, mouse.y!, inScrollArea));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resizeCanvas);

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particlesArray.length - 1; i >= 0; i--) {
        particlesArray[i].update();
        particlesArray[i].draw();
        if (particlesArray[i].life <= 0 || particlesArray[i].size < 0.1) {
          particlesArray.splice(i, 1);
        }
      }
      requestAnimationFrame(animateParticles);
    }
    animateParticles();

    if (scrollSection) {
      let textPosition = scrollSection.offsetWidth;
      const scrollText = document.getElementById('scroll-text')!;
      scrollText.style.left = textPosition + 'px';

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        scrollSection.scrollLeft += e.deltaY * 1.5;
        textPosition -= e.deltaY * 1.5;
        scrollText.style.left = textPosition + 'px';
      };
      scrollSection.addEventListener('wheel', handleWheel);

      let touchStartX = 0;
      let touchCurrentX = 0;
      let isDragging = false;

      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchCurrentX = touchStartX;
        isDragging = true;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        touchCurrentX = e.touches[0].clientX;
        const touchDeltaX = touchStartX - touchCurrentX;
        scrollSection.scrollLeft += touchDeltaX * 1.5;
        textPosition -= touchDeltaX * 1.5;
        scrollText.style.left = textPosition + 'px';
        touchStartX = touchCurrentX;
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      scrollSection.addEventListener('touchstart', handleTouchStart, { passive: false });
      scrollSection.addEventListener('touchmove', handleTouchMove, { passive: false });
      scrollSection.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('resize', resizeCanvas);
        scrollSection.removeEventListener('wheel', handleWheel);
        scrollSection.removeEventListener('touchstart', handleTouchStart);
        scrollSection.removeEventListener('touchmove', handleTouchMove);
        scrollSection.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, []);

  return canvasRef;
}