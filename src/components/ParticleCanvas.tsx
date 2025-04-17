'use client';

import { useRef } from 'react';
import { useParticleAnimation } from '@/hooks/useParticleAnimation';

export default function ParticleCanvas() {
  const canvasRef = useParticleAnimation();

  return <canvas ref={canvasRef} id="particles" className="particles" />;
}