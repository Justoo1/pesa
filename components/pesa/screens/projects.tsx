"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import type { Bucket, Milestone, MilestoneTransaction, Project } from "../types"
import { NewProjectSheet } from "./new-project"
import { ProjectRoadScreen } from "./project-road"

function ProjectCard({
  project,
  milestones,
  currency,
  onClick,
}: {
  project: Project
  milestones: Milestone[]
  currency: string
  onClick: () => void
}) {
  const totalSaved = milestones.reduce((s, m) => s + m.currentSaved, 0)
  const pct = project.targetAmount > 0 ? (totalSaved / project.targetAmount) * 100 : 0
  const complete = milestones.length > 0 && milestones.every((m) => m.status === "completed")

  return (
    <button
      className="card"
      onClick={onClick}
      style={{
        appearance: "none",
        border: 0,
        textAlign: "left",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        width: "100%",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="row-icon green" style={{ width: 32, height: 32, borderRadius: 10 }}>
          <Icon name={project.icon} size={16} />
        </div>
        {complete && (
          <span className="chip chip-green" style={{ padding: "3px 8px", fontSize: 10 }}>
            <Icon name="check" size={11} /> Complete
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1, color: "var(--ink)" }}>
          {project.name}
        </div>
        <div className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          {fmtMoney(totalSaved, currency)}{" "}
          <span style={{ color: "var(--ink-3)", opacity: 0.5 }}>
            / {fmtMoney(project.targetAmount, currency)}
          </span>
        </div>
      </div>
      <div className="bucket-bar">
        <span style={{ width: `${Math.min(100, pct)}%`, background: complete ? "var(--green)" : "var(--clay)" }}></span>
      </div>
      <div className="tiny">
        {milestones.filter((m) => m.status === "completed").length} of {milestones.length} milestones
      </div>
    </button>
  )
}

export function ProjectsScreen({
  buckets,
  projects,
  milestones,
  milestoneLedger,
  currency,
}: {
  buckets: Bucket[]
  projects: Project[]
  milestones: Milestone[]
  milestoneLedger: MilestoneTransaction[]
  currency: string
}) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null
  if (selectedProject) {
    const projectMilestones = milestones
      .filter((m) => m.projectId === selectedProject.id)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    return (
      <ProjectRoadScreen
        project={selectedProject}
        milestones={projectMilestones}
        milestoneLedger={milestoneLedger}
        buckets={buckets}
        currency={currency}
        onBack={() => setSelectedProjectId(null)}
      />
    )
  }

  return (
    <>
      <div style={{ padding: "8px 20px 4px" }}>
        <div
          className="tiny"
          style={{ fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          Projects
        </div>
        <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, color: "var(--ink)" }}>
          Your <span className="italic">savings journey.</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.length === 0 ? (
          <div className="card" style={{ padding: 20, textAlign: "center" }}>
            <div className="body">
              Set a big goal — a house, a car, anything worth a roadmap — and break it into
              fundable milestones.
            </div>
          </div>
        ) : (
          projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              milestones={milestones.filter((m) => m.projectId === p.id)}
              currency={currency}
              onClick={() => setSelectedProjectId(p.id)}
            />
          ))
        )}
      </div>

      <div style={{ padding: "4px 20px 28px" }}>
        <button className="btn btn-soft btn-block" onClick={() => setNewProjectOpen(true)}>
          <Icon name="plus" size={16} /> New project
        </button>
      </div>

      <NewProjectSheet open={newProjectOpen} onClose={() => setNewProjectOpen(false)} currency={currency} />
    </>
  )
}
