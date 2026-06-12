'use client';

/**
 * Knowledge Graph — D3.js force-directed visualization.
 *
 * Renders the backend's D3 export ({ nodes, links }) as an interactive
 * force-directed graph using d3-force + d3-drag + d3-zoom. Node colour encodes
 * `kind` (method / test / file); links are coloured by relationship type
 * (calls / tests / in_file). Pure client component — no SSR.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface D3Node {
  id: string;
  name: string;
  group: number;
  kind: 'method' | 'test' | 'file';
}
export interface D3Link {
  source: string;
  target: string;
  value: number;
  type: string;
}
export interface D3GraphData {
  nodes: D3Node[];
  links: D3Link[];
}

const KIND_COLOR: Record<string, string> = {
  method: '#38bdf8', // sky
  test: '#a78bfa',   // violet
  file: '#fbbf24',   // amber
};
const LINK_COLOR: Record<string, string> = {
  calls: '#475569',
  tests: '#7c3aed',
  in_file: '#1e293b',
};

export function KnowledgeGraphD3({ data, height = 560 }: { data: D3GraphData; height?: number }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;

    // Clone so d3's mutation of source/target (string -> object) is local.
    const nodes: any[] = data.nodes.map((n) => ({ ...n }));
    const links: any[] = data.links.map((l) => ({ ...l }));

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    const g = svg.append('g');

    // Zoom / pan.
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform)),
    );

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((l: any) => (l.type === 'in_file' ? 40 : 90))
          .strength(0.4),
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(18));

    const link = g
      .append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => LINK_COLOR[d.type] || '#334155')
      .attr('stroke-width', (d: any) => Math.max(1, Math.min(4, d.value)));

    const node = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: any) => (d.kind === 'file' ? 9 : 6))
      .attr('fill', (d: any) => KIND_COLOR[d.kind] || '#94a3b8')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<any, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    node.append('title').text((d: any) => `${d.name} (${d.kind})`);

    const label = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d: any) => d.name)
      .attr('font-size', 9)
      .attr('fill', '#cbd5e1')
      .attr('dx', 10)
      .attr('dy', 3)
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [data, height]);

  return (
    <div ref={containerRef} className="w-full rounded-lg border border-slate-700 bg-[#0b1220]">
      <svg ref={ref} role="img" aria-label="Knowledge graph force-directed visualization" />
    </div>
  );
}
