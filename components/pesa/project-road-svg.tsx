"use client"

import type { ReactNode } from "react"
import { Icon } from "./icons"
import type { Milestone, Project } from "./types"

const NODE = 56
const START_NODE = 44
const FINAL_NODE = 64
const SPACING = 116
const PAD_TOP = 40
const PAD_BOTTOM = 40
const SIDE_OFFSET = 74
const WIDTH = 342

function Node({
  x,
  y,
  size,
  className,
  onClick,
  label,
  children,
}: {
  x: number
  y: number
  size: number
  className: string
  onClick?: () => void
  label: string
  children: ReactNode
}) {
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}>
        {onClick ? (
          <button
            type="button"
            className={`road-node ${className}`}
            style={{ width: size, height: size, border: 0 }}
            onClick={onClick}
            aria-label={label}
          >
            {children}
          </button>
        ) : (
          <div className={`road-node ${className}`} style={{ width: size, height: size }}>
            {children}
          </div>
        )}
      </div>
      <div
        className="tiny"
        style={{
          position: "absolute",
          left: x,
          top: y + size / 2 + 8,
          transform: "translateX(-50%)",
          width: 110,
          textAlign: "center",
          color: "var(--ink-2)",
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
    </>
  )
}

export function ProjectRoad({
  project,
  milestones,
  onSelect,
}: {
  project: Project
  milestones: Milestone[]
  onSelect: (milestoneId: string) => void
}) {
  const centerX = WIDTH / 2
  const count = milestones.length
  const totalNodes = count + 2 // start + milestones + final
  const height = PAD_TOP + PAD_BOTTOM + (totalNodes - 1) * SPACING + NODE

  const nodeX = (i: number) => {
    if (i === 0 || i === totalNodes - 1) return centerX
    const mi = i - 1
    return mi % 2 === 0 ? centerX - SIDE_OFFSET : centerX + SIDE_OFFSET
  }
  const nodeY = (i: number) => PAD_TOP + NODE / 2 + i * SPACING
  const points = Array.from({ length: totalNodes }, (_, i) => ({ x: nodeX(i), y: nodeY(i) }))

  const segmentReached = (toIndex: number) => {
    if (toIndex === totalNodes - 1) {
      const last = milestones[milestones.length - 1]
      return last ? last.status === "completed" : false
    }
    const m = milestones[toIndex - 1]
    return m ? m.status !== "locked" : true
  }

  const projectComplete = count > 0 && milestones.every((m) => m.status === "completed")

  return (
    <div style={{ position: "relative", width: WIDTH, height, margin: "0 auto" }}>
      <svg
        width={WIDTH}
        height={height}
        viewBox={`0 0 ${WIDTH} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {points.slice(1).map((p, idx) => {
          const i = idx + 1
          const prev = points[i - 1]
          const midY = (prev.y + p.y) / 2
          const d = `M ${prev.x} ${prev.y} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`
          const reached = segmentReached(i)
          return (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={reached ? "var(--green-soft)" : "var(--line)"}
              strokeWidth={5}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      <Node x={points[0].x} y={points[0].y} size={START_NODE} className="road-node--completed" label="Start">
        <Icon name="flag" size={18} />
      </Node>

      {milestones.map((m, mi) => {
        const p = points[mi + 1]
        const stateClass =
          m.status === "completed"
            ? "road-node--completed"
            : m.status === "in_progress"
              ? "road-node--active"
              : "road-node--locked"
        return (
          <Node
            key={m.id}
            x={p.x}
            y={p.y}
            size={NODE}
            className={stateClass}
            onClick={() => onSelect(m.id)}
            label={m.title}
          >
            {m.status === "completed" ? (
              <Icon name="check" size={20} />
            ) : m.status === "locked" ? (
              <Icon name="lock" size={18} />
            ) : (
              <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>
                {mi + 1}
              </span>
            )}
          </Node>
        )
      })}

      <Node
        x={points[totalNodes - 1].x}
        y={points[totalNodes - 1].y}
        size={FINAL_NODE}
        className={projectComplete ? "road-node--completed" : "road-node--locked"}
        label={project.name}
      >
        <Icon name={project.icon} size={26} />
      </Node>
    </div>
  )
}
