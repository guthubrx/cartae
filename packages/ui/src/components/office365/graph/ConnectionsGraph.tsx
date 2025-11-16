/**
 * Graph de connexions sémantiques
 *
 * Visualise les connexions entre items détectées par IA
 * sous forme de graph interactif (nodes + edges).
 *
 * Utilise une représentation force-directed layout simple (simulation physique).
 */

import React, { useEffect, useRef, useState } from 'react';
import type { EnrichedOffice365Item } from '../types';

/**
 * Connexion entre deux items
 */
export interface Connection {
  sourceId: string;
  targetId: string;
  score: number;
  reason?: string;
}

/**
 * Props du graph de connexions
 */
export interface ConnectionsGraphProps {
  /**
   * Item central (focus du graph)
   */
  centerItem: EnrichedOffice365Item;

  /**
   * Items connectés
   */
  connectedItems: EnrichedOffice365Item[];

  /**
   * Connexions (edges)
   */
  connections: Connection[];

  /**
   * Callback quand un node est cliqué
   */
  onNodeClick?: (item: EnrichedOffice365Item) => void;

  /**
   * Largeur du canvas
   */
  width?: number;

  /**
   * Hauteur du canvas
   */
  height?: number;

  /**
   * Afficher les labels ?
   */
  showLabels?: boolean;

  /**
   * Afficher les scores de connexion ?
   */
  showScores?: boolean;
}

/**
 * Node du graph
 */
interface GraphNode {
  id: string;
  item: EnrichedOffice365Item;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isCenter: boolean;
}

/**
 * Edge du graph
 */
interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  connection: Connection;
}

/**
 * Graph de connexions sémantiques
 */
export const ConnectionsGraph: React.FC<ConnectionsGraphProps> = ({
  centerItem,
  connectedItems,
  connections,
  onNodeClick,
  width = 800,
  height = 600,
  showLabels = true,
  showScores = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  // Initialiser nodes et edges
  useEffect(() => {
    const centerNode: GraphNode = {
      id: centerItem.id,
      item: centerItem,
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      radius: 30,
      isCenter: true,
    };

    const connectedNodes: GraphNode[] = connectedItems.map((item, index) => {
      // Disposition circulaire initiale
      const angle = (index / connectedItems.length) * 2 * Math.PI;
      const distance = 200;

      return {
        id: item.id,
        item,
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        radius: 20,
        isCenter: false,
      };
    });

    const allNodes = [centerNode, ...connectedNodes];
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    const graphEdges: GraphEdge[] = connections
      .map(conn => {
        const source = nodeMap.get(conn.sourceId);
        const target = nodeMap.get(conn.targetId);
        if (!source || !target) return null;
        return { source, target, connection: conn };
      })
      .filter((e): e is GraphEdge => e !== null);

    setNodes(allNodes);
    setEdges(graphEdges);
  }, [centerItem, connectedItems, connections, width, height]);

  // Simulation force-directed layout
  useEffect(() => {
    if (nodes.length === 0) return;

    const interval = setInterval(() => {
      setNodes(prevNodes => {
        const newNodes = prevNodes.map(n => ({ ...n }));

        // Force de répulsion entre tous les nodes
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const dx = newNodes[j].x - newNodes[i].x;
            const dy = newNodes[j].y - newNodes[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = -100 / (distance * distance);

            newNodes[i].vx += (dx / distance) * force;
            newNodes[i].vy += (dy / distance) * force;
            newNodes[j].vx -= (dx / distance) * force;
            newNodes[j].vy -= (dy / distance) * force;
          }
        }

        // Force d'attraction le long des edges
        edges.forEach(edge => {
          const source = newNodes.find(n => n.id === edge.source.id);
          const target = newNodes.find(n => n.id === edge.target.id);
          if (!source || !target) return;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - 150) * 0.01 * edge.connection.score;

          source.vx += (dx / distance) * force;
          source.vy += (dy / distance) * force;
          target.vx -= (dx / distance) * force;
          target.vy -= (dy / distance) * force;
        });

        // Appliquer vélocités et friction
        newNodes.forEach(node => {
          if (!node.isCenter) {
            // Le node central reste fixe
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= 0.8; // Friction
            node.vy *= 0.8;

            // Garder dans les bounds
            node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
          }
        });

        return newNodes;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [edges, width, height]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source.id);
      const target = nodes.find(n => n.id === edge.target.id);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      // Couleur selon score
      const alpha = edge.connection.score;
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.6})`;
      ctx.lineWidth = 1 + edge.connection.score * 3;
      ctx.stroke();

      // Score au milieu de la ligne
      if (showScores) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        ctx.fillStyle = '#6366F1';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(edge.connection.score.toFixed(2), midX, midY - 5);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode?.id === node.id;

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

      // Couleur selon priorité
      const priorityColor = node.item.aiViz?.priority?.color || '#94A3B8';
      ctx.fillStyle = node.isCenter ? '#6366F1' : priorityColor;
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered ? '#1E293B' : 'white';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      // Label
      if (showLabels || isHovered) {
        ctx.fillStyle = '#1E293B';
        ctx.font = node.isCenter ? 'bold 12px system-ui' : '11px system-ui';
        ctx.textAlign = 'center';

        const label =
          node.item.title.length > 30 ? `${node.item.title.substring(0, 30)}...` : node.item.title;

        // Background blanc pour lisibilité
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(node.x - textWidth / 2 - 4, node.y + node.radius + 4, textWidth + 8, 16);

        ctx.fillStyle = '#1E293B';
        ctx.fillText(label, node.x, node.y + node.radius + 16);
      }
    });
  }, [nodes, edges, hoveredNode, showLabels, showScores, width, height]);

  // Gestion mouse events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Trouver node sous la souris
    const node = nodes.find(n => {
      const dx = x - n.x;
      const dy = y - n.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius;
    });

    setHoveredNode(node || null);
    canvas.style.cursor = node ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = nodes.find(n => {
      const dx = x - n.x;
      const dy = y - n.y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius;
    });

    if (node && onNodeClick) {
      onNodeClick(node.item);
    }
  };

  return (
    <div className="connections-graph" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155' }}>
          Connexions sémantiques
        </h3>
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
          {connectedItems.length} item{connectedItems.length !== 1 ? 's' : ''} connecté
          {connectedItems.length !== 1 ? 's' : ''} • {connections.length} lien
          {connections.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          background: 'white',
        }}
      />

      {/* Tooltip hovered node */}
      {hoveredNode && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: '#F1F5F9',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#475569',
          }}
        >
          <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
            {hoveredNode.item.title}
          </div>
          <div style={{ fontSize: '12px' }}>
            Priorité : {hoveredNode.item.aiViz?.priority?.level || 'aucune'}
          </div>
          {hoveredNode.item.metadata?.from && (
            <div style={{ fontSize: '12px' }}>De : {hoveredNode.item.metadata.from}</div>
          )}
        </div>
      )}

      {/* Légende */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          background: '#F8FAFC',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#64748B',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#6366F1',
              border: '2px solid white',
            }}
          />
          <span>Item central</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#94A3B8',
              border: '2px solid white',
            }}
          />
          <span>Items connectés</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '30px', height: '2px', background: '#6366F1' }} />
          <span>Force de connexion</span>
        </div>
      </div>
    </div>
  );
};
