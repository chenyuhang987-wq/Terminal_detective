import React, { useEffect, useRef } from 'react';

// Animated SVG data-flow lines between 3 agent nodes
const AGENT_COLORS = ['#00e5ff', '#ff6b6b', '#a78bfa'];

export default function DataFlowCanvas({ agents, activeAgent, flowActivity }) {
  const svgRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);

  // Node positions for a triangle layout (normalized 0-1)
  const positions = [
    { x: 0.5,  y: 0.08 },  // Agent 0 — top center
    { x: 0.08, y: 0.88 },  // Agent 1 — bottom left
    { x: 0.92, y: 0.88 },  // Agent 2 — bottom right
  ];

  // Edge pairs (bidirectional)
  const edges = [[0, 1], [1, 2], [0, 2]];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const W = svg.clientWidth || 320;
    const H = svg.clientHeight || 220;

    const px = positions.map(p => ({ x: p.x * W, y: p.y * H }));

    // Initialize particles on each edge
    particlesRef.current = [];
    edges.forEach(([a, b]) => {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          from: a, to: b, t: Math.random(),
          speed: 0.004 + Math.random() * 0.003,
          size: 2.5 + Math.random() * 2,
          reverse: i % 2 === 0,
        });
      }
    });

    const drawFrame = () => {
      timeRef.current += 1;
      const t = timeRef.current;

      // Clear all dynamic elements
      const existing = svg.querySelectorAll('.dyn');
      existing.forEach(el => el.remove());

      // Draw base edges
      edges.forEach(([a, b]) => {
        const color = activeAgent === a ? AGENT_COLORS[a]
          : activeAgent === b ? AGENT_COLORS[b]
          : 'rgba(255,255,255,0.06)';

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'dyn');
        line.setAttribute('x1', px[a].x); line.setAttribute('y1', px[a].y);
        line.setAttribute('x2', px[b].x); line.setAttribute('y2', px[b].y);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', activeAgent === a || activeAgent === b ? '1.5' : '0.8');
        line.setAttribute('stroke-dasharray', '4 6');
        line.setAttribute('stroke-dashoffset', -(t * 1.2));
        svg.insertBefore(line, svg.firstChild);
      });

      // Draw particles
      particlesRef.current.forEach(p => {
        p.t += p.reverse ? -p.speed : p.speed;
        if (p.t > 1) p.t = 0;
        if (p.t < 0) p.t = 1;

        const fromPt = px[p.from];
        const toPt = px[p.to];
        const cx = fromPt.x + (toPt.x - fromPt.x) * p.t;
        const cy = fromPt.y + (toPt.y - fromPt.y) * p.t;
        const col = AGENT_COLORS[p.from];

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'dyn');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', p.size);
        circle.setAttribute('fill', col);
        circle.setAttribute('opacity', 0.7 + Math.sin(t * 0.08 + p.t * 10) * 0.3);

        // Glow
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('class', 'dyn');
        glow.setAttribute('cx', cx);
        glow.setAttribute('cy', cy);
        glow.setAttribute('r', p.size * 3);
        glow.setAttribute('fill', col);
        glow.setAttribute('opacity', 0.12);
        svg.appendChild(glow);
        svg.appendChild(circle);
      });

      // Activity pulse ring on active node
      if (flowActivity) {
        const ap = px[activeAgent];
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('class', 'dyn');
        ring.setAttribute('cx', ap.x);
        ring.setAttribute('cy', ap.y);
        ring.setAttribute('r', 24 + Math.sin(t * 0.15) * 6);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', AGENT_COLORS[activeAgent]);
        ring.setAttribute('stroke-width', '1.5');
        ring.setAttribute('opacity', 0.5 + Math.sin(t * 0.12) * 0.3);
        svg.appendChild(ring);
      }

      animFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animFrameRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [activeAgent, flowActivity]);

  return (
    <div className="relative w-full" style={{ height: 220 }}>
      {/* Agent node labels */}
      {agents.map((agent, i) => {
        const p = positions[i];
        const color = AGENT_COLORS[i];
        const isActive = activeAgent === i;
        return (
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
              boxShadow: isActive ? `0 0 20px ${color}, 0 0 40px ${color}40` : `0 0 8px ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
              transition: 'box-shadow 0.3s',
            }}>
              {['👁️', '🔥', '💻'][i]}
            </div>
            <div style={{
              marginTop: 4,
              fontSize: '0.6rem',
              fontFamily: 'monospace',
              color,
              textShadow: `0 0 6px ${color}`,
              fontWeight: 700,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
            }}>
              {agent.agent_id}
            </div>
          </div>
        );
      })}

      {/* SVG canvas behind nodes */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
        overflow="visible"
      >
        <defs>
          <filter id="particle-glow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}