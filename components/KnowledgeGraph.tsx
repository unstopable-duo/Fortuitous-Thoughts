
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Note } from '../types';

interface KnowledgeGraphProps {
  currentNote: Note;
  allNotes: Note[];
  onSelectNote: (id: string) => void;
}

interface Node extends Note {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCurrent: boolean;
  color: string;
}

interface Link {
  source: string; // Node ID
  target: string; // Node ID
  reason?: string;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ currentNote, allNotes, onSelectNote }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [hoveredLink, setHoveredLink] = useState<{link: Link, x: number, y: number} | null>(null);
  
  // Animation ref
  const reqRef = useRef<number>(0);
  
  // Physics parameters
  const REPULSION = 1200;
  const SPRING_LENGTH = 180;
  const SPRING_STRENGTH = 0.04;
  const DAMPING = 0.85; // Friction
  const CENTER_PULL = 0.008;

  // 1. Prepare Graph Data - Use ALL notes
  const graphData = useMemo(() => {
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();

    // Merged Notes: Replace the entry in allNotes with currentNote to ensure we have latest SmartLinks
    const mergedNotes = allNotes.map(n => n.id === currentNote.id ? currentNote : n);
    
    // If currentNote is new and not in allNotes yet, add it
    if (!mergedNotes.find(n => n.id === currentNote.id)) {
        mergedNotes.push(currentNote);
    }

    // Add ALL notes as nodes
    mergedNotes.forEach(n => {
        // Determine color based on Life Axis
        let color = '#64748b'; // Default muted
        switch(n.metadata?.lifeAxis) {
            case 'Career': color = '#3b82f6'; break; // Blue
            case 'Health': color = '#10b981'; break; // Emerald
            case 'Creative Output': color = '#8b5cf6'; break; // Violet
            case 'Learning': color = '#f59e0b'; break; // Amber
            case 'Relationships': color = '#f43f5e'; break; // Rose
            case 'Mental State': color = '#06b6d4'; break; // Cyan
        }
        
        const isCurrent = n.id === currentNote.id;
        if (isCurrent) color = '#ffffff'; // Current is white

        const node: Node = {
            ...n,
            x: Math.random() * 800 - 400, 
            y: Math.random() * 600 - 300,
            vx: 0,
            vy: 0,
            radius: isCurrent ? 20 : 8 + (Math.min(n.content.length / 500, 10)), // Size by content length
            isCurrent,
            color
        };
        nodes.push(node);
        nodeMap.set(n.id, node);
    });

    // Create Links based on metadata.smartLinks from the MERGED nodes
    nodes.forEach(sourceNode => {
        if (Array.isArray(sourceNode.metadata?.smartLinks)) {
            sourceNode.metadata!.smartLinks.forEach(sl => {
                // Ensure target exists in our node list
                if (nodeMap.has(sl.targetId)) {
                    // Check if link already exists (bidirectional check)
                    const exists = links.some(l => 
                        (l.source === sourceNode.id && l.target === sl.targetId) || 
                        (l.source === sl.targetId && l.target === sourceNode.id)
                    );
                    
                    if (!exists) {
                        links.push({ 
                            source: sourceNode.id, 
                            target: sl.targetId,
                            reason: sl.reason 
                        });
                    }
                }
            });
        }
    });

    return { nodes, links };
  }, [currentNote, allNotes]);

  // 2. Physics Simulation & Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    let width = container.clientWidth;
    let height = container.clientHeight;
    
    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Center nodes initially if fresh
    graphData.nodes.forEach(n => {
      if (n.x === 0 && n.y === 0) {
         n.x = width / 2 + (Math.random() - 0.5) * 100;
         n.y = height / 2 + (Math.random() - 0.5) * 100;
      }
    });

    const draggingNode: { current: Node | null } = { current: null };
    let mouseX = 0;
    let mouseY = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Physics Step
      graphData.nodes.forEach(node => {
        if (node === draggingNode.current) {
            node.vx = (mouseX - node.x) * 0.1;
            node.vy = (mouseY - node.y) * 0.1;
            return;
        }

        let fx = 0;
        let fy = 0;

        // 1. Repulsion (Nodes push apart)
        graphData.nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 1) dist = 1; 
          
          const force = REPULSION / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // 2. Attraction (Links pull together)
        graphData.links.forEach(link => {
          // Find actual node objects
          const source = graphData.nodes.find(n => n.id === link.source);
          const target = graphData.nodes.find(n => n.id === link.target);
          if (!source || !target) return;

          if (node === source || node === target) {
            const other = node === source ? target : source;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            const displacement = dist - SPRING_LENGTH;
            const force = displacement * SPRING_STRENGTH;
            
            fx -= (dx / dist) * force;
            fy -= (dy / dist) * force;
          }
        });

        // 3. Center Gravity
        const cx = width / 2;
        const cy = height / 2;
        fx += (cx - node.x) * CENTER_PULL;
        fy += (cy - node.y) * CENTER_PULL;

        // Apply Forces
        node.vx = (node.vx + fx) * DAMPING;
        node.vy = (node.vy + fy) * DAMPING;
        node.x += node.vx;
        node.y += node.vy;

        // Boundaries
        const padding = node.radius + 10;
        if (node.x < padding) { node.x = padding; node.vx *= -1; }
        if (node.x > width - padding) { node.x = width - padding; node.vx *= -1; }
        if (node.y < padding) { node.y = padding; node.vy *= -1; }
        if (node.y > height - padding) { node.y = height - padding; node.vy *= -1; }
      });

      // Drawing Step
      
      // Draw Links
      ctx.lineWidth = 1.5;
      graphData.links.forEach(link => {
        const source = graphData.nodes.find(n => n.id === link.source);
        const target = graphData.nodes.find(n => n.id === link.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          
          // Link Hit Logic inside render loop for simplicity (could be optimized)
          const isLinkHovered = hoveredLink === null ? false : (hoveredLink.link === link);
          
          ctx.strokeStyle = isLinkHovered ? '#818cf8' : 'rgba(148, 163, 184, 0.15)'; 
          ctx.lineWidth = isLinkHovered ? 3 : 1.5;
          ctx.stroke();
        }
      });

      // Draw Nodes
      graphData.nodes.forEach(node => {
        // Shadow/Glow
        ctx.shadowBlur = node.isCurrent ? 20 : 0;
        ctx.shadowColor = node.color;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        ctx.shadowBlur = 0;

        // Border for current or hovered
        if (node.isCurrent || node === hoveredNode) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = node === hoveredNode ? '#ffffff' : 'rgba(255,255,255,0.5)';
            ctx.stroke();
        }

        // Title Labels (Always show if radius big, else only on hover)
        if (node.isCurrent || node === hoveredNode || node.radius > 15) {
            ctx.font = `${node.isCurrent ? 'bold 12px' : '10px'} Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = node.title.length > 20 ? node.title.substring(0, 18) + '..' : node.title;
            const textWidth = ctx.measureText(text).width;
            
            // Background pill
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.roundRect(node.x - textWidth/2 - 6, node.y + node.radius + 8, textWidth + 12, 20, 4);
            ctx.fill();

            ctx.fillStyle = '#f1f5f9';
            ctx.fillText(text, node.x, node.y + node.radius + 18);
        }
      });

      reqRef.current = requestAnimationFrame(animate);
    };

    reqRef.current = requestAnimationFrame(animate);

    // Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedNode = graphData.nodes.find(n => {
            const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
            return dist < n.radius + 5;
        });

        if (clickedNode) {
            draggingNode.current = clickedNode;
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

        if (draggingNode.current) {
            canvas.style.cursor = 'grabbing';
            return;
        }

        // Hit Detection - Node
        const hovered = graphData.nodes.find(n => {
            const dist = Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2);
            return dist < n.radius + 5;
        });
        setHoveredNode(hovered || null);

        // Hit Detection - Link (Line Segment Distance)
        if (!hovered) {
            const linkHit = graphData.links.find(l => {
                const source = graphData.nodes.find(n => n.id === l.source);
                const target = graphData.nodes.find(n => n.id === l.target);
                if (!source || !target) return false;
                
                // Distance from point (mx, my) to line segment (sx, sy)-(tx, ty)
                const A = mouseX - source.x;
                const B = mouseY - source.y;
                const C = target.x - source.x;
                const D = target.y - source.y;

                const dot = A * C + B * D;
                const len_sq = C * C + D * D;
                let param = -1;
                if (len_sq !== 0) param = dot / len_sq;

                let xx, yy;

                if (param < 0) { xx = source.x; yy = source.y; }
                else if (param > 1) { xx = target.x; yy = target.y; }
                else { xx = source.x + param * C; yy = source.y + param * D; }

                const dx = mouseX - xx;
                const dy = mouseY - yy;
                return Math.sqrt(dx * dx + dy * dy) < 5; // 5px tolerance
            });
            setHoveredLink(linkHit ? { link: linkHit, x: mouseX, y: mouseY } : null);
        } else {
            setHoveredLink(null);
        }

        canvas.style.cursor = (hovered || hoveredLink) ? 'pointer' : 'default';
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (draggingNode.current) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dist = Math.sqrt((draggingNode.current.x - x) ** 2 + (draggingNode.current.y - y) ** 2);
            
            // If didn't move much, treat as click
            if (dist < draggingNode.current.radius + 10) {
                if (draggingNode.current.id !== currentNote.id) {
                    onSelectNote(draggingNode.current.id);
                }
            }
            draggingNode.current = null;
            canvas.style.cursor = 'grab';
        }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', () => { draggingNode.current = null; });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [graphData, currentNote, allNotes, onSelectNote, hoveredLink]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#0a0a0c] overflow-hidden">
        {/* Background Grid Effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
        }}></div>
        
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Tooltip for Nodes */}
        {hoveredNode && (
            <div className="absolute z-20 pointer-events-none bg-surface/90 backdrop-blur border border-accent/20 p-3 rounded-xl shadow-2xl max-w-[250px] animate-fade-in" 
                 style={{ left: hoveredNode.x + 20, top: hoveredNode.y - 20 }}>
                <div className="text-xs font-bold text-accent uppercase tracking-wider mb-1">{hoveredNode.metadata?.lifeAxis || 'Note'}</div>
                <div className="font-bold text-text-main mb-1">{hoveredNode.title}</div>
                <div className="text-[10px] text-text-muted line-clamp-3 leading-relaxed">
                    {hoveredNode.metadata?.summary || hoveredNode.content.substring(0, 100)}...
                </div>
            </div>
        )}

        {/* Tooltip for Links */}
        {hoveredLink && (
            <div className="absolute z-20 pointer-events-none bg-black/80 backdrop-blur border border-white/10 p-2 rounded-lg shadow-xl max-w-[200px] animate-fade-in" 
                 style={{ left: hoveredLink.x + 10, top: hoveredLink.y + 10 }}>
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Connection</div>
                <div className="text-xs text-white italic">"{hoveredLink.link.reason || 'Semantic Similarity'}"</div>
            </div>
        )}

        <div className="absolute bottom-6 left-6 pointer-events-none">
            <div className="bg-black/60 backdrop-blur border border-white/10 p-3 rounded-lg text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white"></span> Current Thought</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Career</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Health</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Other</div>
                <div className="mt-2 pt-2 border-t border-white/10 italic">
                    Drag to rearrange • Hover for details
                </div>
            </div>
        </div>
    </div>
  );
};

export default KnowledgeGraph;
