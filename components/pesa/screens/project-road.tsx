"use client"

import { useState } from "react"
import { Icon } from "../icons"
import { fmtMoney } from "../format"
import { Ring } from "../ui"
import { ProjectRoad } from "../project-road-svg"
import type { Bucket, Milestone, MilestoneTransaction, Project } from "../types"
import { EditMilestoneSheet } from "./edit-milestone"
import { EditProjectSheet } from "./edit-project"
import { MilestoneDetailSheet } from "./milestone-detail"
import { NewMilestoneSheet } from "./new-milestone"

export function ProjectRoadScreen({
  project,
  milestones,
  milestoneLedger,
  buckets,
  currency,
  onBack,
}: {
  project: Project
  milestones: Milestone[]
  milestoneLedger: MilestoneTransaction[]
  buckets: Bucket[]
  currency: string
  onBack: () => void
}) {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [editMilestoneId, setEditMilestoneId] = useState<string | null>(null)
  const [newMilestoneOpen, setNewMilestoneOpen] = useState(false)
  const [editProjectOpen, setEditProjectOpen] = useState(false)

  const totalSaved = milestones.reduce((s, m) => s + m.currentSaved, 0)
  const pct = project.targetAmount > 0 ? (totalSaved / project.targetAmount) * 100 : 0

  const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId) ?? null
  const selectedLedger = selectedMilestoneId
    ? milestoneLedger.filter((t) => t.milestoneId === selectedMilestoneId)
    : []
  const linkedBucket = selectedMilestone?.bucketId
    ? (buckets.find((b) => b.id === selectedMilestone.bucketId) ?? null)
    : null
  const editingMilestone = milestones.find((m) => m.id === editMilestoneId) ?? null

  return (
    <>
      <div
        style={{
          padding: "8px 20px 4px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onBack} aria-label="Back">
          <Icon name="back" size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>
            {project.name}
          </div>
          <div className="tiny">
            {fmtMoney(totalSaved, currency)} of {fmtMoney(project.targetAmount, currency)} saved
          </div>
        </div>
        <Ring pct={Math.min(100, pct)} size={44} stroke={6} />
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setEditProjectOpen(true)}
          aria-label="Edit project"
        >
          <Icon name="edit" size={18} />
        </button>
      </div>

      <div style={{ padding: "24px 0 8px", overflowX: "auto" }}>
        <ProjectRoad project={project} milestones={milestones} onSelect={setSelectedMilestoneId} />
      </div>

      <div style={{ padding: "12px 20px 28px" }}>
        <button className="btn btn-soft btn-block" onClick={() => setNewMilestoneOpen(true)}>
          <Icon name="plus" size={16} /> Add milestone
        </button>
      </div>

      <MilestoneDetailSheet
        open={!!selectedMilestoneId}
        onClose={() => setSelectedMilestoneId(null)}
        onEdit={() => {
          setEditMilestoneId(selectedMilestoneId)
          setSelectedMilestoneId(null)
        }}
        milestone={selectedMilestone}
        linkedBucket={linkedBucket}
        ledger={selectedLedger}
        currency={currency}
      />
      <NewMilestoneSheet
        open={newMilestoneOpen}
        onClose={() => setNewMilestoneOpen(false)}
        projectId={project.id}
        currency={currency}
        buckets={buckets}
      />
      <EditMilestoneSheet
        open={!!editMilestoneId}
        onClose={() => setEditMilestoneId(null)}
        onArchived={() => setEditMilestoneId(null)}
        milestone={editingMilestone}
        currency={currency}
        buckets={buckets}
      />
      <EditProjectSheet
        open={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        onArchived={onBack}
        project={project}
        currency={currency}
      />
    </>
  )
}
