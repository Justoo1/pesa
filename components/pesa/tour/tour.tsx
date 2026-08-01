"use client"

import { useEffect, useState } from "react"
import { Icon } from "../icons"
import { markTourCompleted } from "@/app/actions/tour"
import type { TabId } from "../ui"

type TourStep = {
  tab: TabId
  selector: string
  title: string
  body: string
}

const STEPS: TourStep[] = [
  {
    tab: "home",
    selector: '[data-tour="home-hero"]',
    title: "This is your payday card",
    body: "It shows how much of your salary is still left to send to pots this month.",
  },
  {
    tab: "home",
    selector: '[data-tour="home-pots"]',
    title: "Your pots",
    body: "Tap any pot to top it up, spend from it, or see how it's tracking toward its target.",
  },
  {
    tab: "bank",
    selector: '[data-tour="tab-bank"]',
    title: "The Bank tab",
    body: "Your salary lands here automatically on payday. You can also add funds or log a personal spend any time.",
  },
  {
    tab: "insights",
    selector: '[data-tour="tab-insights"]',
    title: "Insights",
    body: "See your savings rate, financial health score, and net worth over time here.",
  },
  {
    tab: "settings",
    selector: '[data-tour="tab-settings"]',
    title: "More",
    body: "Set up pots, income sources, and payday reminders here — and come back to Help any time you need a refresher.",
  },
]

export function AppTour({
  tab,
  setTab,
  onDone,
}: {
  tab: TabId
  setTab: (t: TabId) => void
  onDone: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  useEffect(() => {
    if (tab !== step.tab) setTab(step.tab)
    // Only re-run when the step's target tab changes, not on every `tab` update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.tab])

  useEffect(() => {
    let raf1 = 0
    let raf2 = 0
    const measure = () => {
      const el = document.querySelector<HTMLElement>(step.selector)
      if (!el) {
        setRect(null)
        return
      }
      try {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior })
      } catch {
        // scrollIntoView isn't critical — ignore if unsupported.
      }
      setRect(el.getBoundingClientRect())
    }
    // Wait a couple of frames for the tab switch to render before measuring.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure)
    })
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.removeEventListener("resize", measure)
    }
  }, [stepIndex, step.selector])

  const finish = () => {
    void markTourCompleted().catch(() => {
      // Non-critical — worst case the tour offers to replay once more.
    })
    onDone()
  }

  const next = () => {
    if (isLast) finish()
    else setStepIndex((i) => i + 1)
  }
  const back = () => setStepIndex((i) => Math.max(0, i - 1))

  const pad = 6
  const holeStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 16,
        boxShadow: "0 0 0 3px var(--clay), 0 0 0 9999px rgba(20,16,10,0.6)",
        zIndex: 1000,
        pointerEvents: "none",
        transition: "left 200ms ease, top 200ms ease, width 200ms ease, height 200ms ease",
      }
    : {
        position: "fixed",
        inset: 0,
        background: "rgba(20,16,10,0.6)",
        zIndex: 1000,
      }

  const tooltipWidth = 280
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 360
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 640
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        left: Math.min(Math.max(16, rect.left), viewportW - tooltipWidth - 16),
        top:
          rect.bottom + 160 < viewportH
            ? rect.bottom + pad + 12
            : Math.max(16, rect.top - pad - 172),
        width: tooltipWidth,
        zIndex: 1001,
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        width: tooltipWidth,
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
      }

  return (
    <>
      <div onClick={finish} style={holeStyle}></div>
      <div className="card" style={{ ...tooltipStyle, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: stepIndex === i ? 16 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: stepIndex >= i ? "var(--ink)" : "var(--line)",
                  transition: "all 200ms ease",
                }}
              ></span>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "4px 8px" }}
            onClick={finish}
          >
            Skip
          </button>
        </div>
        <div className="serif" style={{ fontSize: 18, lineHeight: 1.15, marginTop: 8 }}>
          {step.title}
        </div>
        <div className="body" style={{ fontSize: 13, marginTop: 4 }}>
          {step.body}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {stepIndex > 0 && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={back}
              aria-label="Back"
              style={{ flexShrink: 0 }}
            >
              <Icon name="back" size={16} />
            </button>
          )}
          <button className="btn btn-green btn-block" onClick={next}>
            {isLast ? (
              <>
                <Icon name="check" size={16} /> Done
              </>
            ) : (
              <>
                Next <Icon name="chevron" size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
