"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "../icons"
import { markOnboarded } from "@/app/actions/onboarding"
import {
  PotsFigure,
  RitualFigure,
  TrackFigure,
  WelcomeFigure,
} from "./illustrations"

type Slide = {
  title: React.ReactNode
  body: string
  Illu: React.ComponentType
}

export function OnboardingShell({ userName }: { userName: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [busy, startTransition] = useTransition()

  const slides: Slide[] = [
    {
      title: (
        <>
          Welcome, <span className="italic">{userName}.</span>
        </>
      ),
      body: "Pesa is a quiet place to give every cedi a home.",
      Illu: WelcomeFigure,
    },
    {
      title: (
        <>
          Pots, <span className="italic">not categories.</span>
        </>
      ),
      body: "Group what matters — Rent, Mom, Savings, Tithe — each with a target.",
      Illu: PotsFigure,
    },
    {
      title: (
        <>
          Payday is <span className="italic">a ritual.</span>
        </>
      ),
      body: "When salary lands, disburse it into pots. We track what's left.",
      Illu: RitualFigure,
    },
    {
      title: (
        <>
          See it <span className="italic">land.</span>
        </>
      ),
      body: "Insights and the monthly wrap show how it all flowed.",
      Illu: TrackFigure,
    },
  ]

  const isLast = step === slides.length - 1
  const slide = slides[step]
  const Illu = slide.Illu

  const finish = () => {
    startTransition(async () => {
      try {
        await markOnboarded()
        router.refresh()
      } catch {
        // Network blip — still refresh; worst case the user sees onboarding
        // once more next time. Better than getting stuck on the last slide.
        router.refresh()
      }
    })
  }

  const next = () => {
    if (isLast) finish()
    else setStep((s) => s + 1)
  }

  return (
    <div className="onboarding" role="dialog" aria-label="Welcome to Pesa">
      <button
        type="button"
        className="btn btn-ghost onboarding-skip"
        onClick={finish}
        disabled={busy}
      >
        Skip
      </button>

      <div className="onboarding-illu">
        <div className="onboarding-illu-frame">
          <Illu />
        </div>
      </div>

      <div className="onboarding-copy">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {step > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Back"
            >
              <Icon name="back" size={18} />
            </button>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            {slides.map((_, i) => (
              <span
                key={i}
                style={{
                  width: step === i ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: step >= i ? "var(--ink)" : "var(--line)",
                  transition: "all 200ms ease",
                }}
              ></span>
            ))}
          </div>
        </div>

        <div
          className="serif"
          style={{ fontSize: 32, lineHeight: 1.05, marginTop: 4 }}
        >
          {slide.title}
        </div>
        <div className="body" style={{ fontSize: 16, color: "var(--ink-2)" }}>
          {slide.body}
        </div>

        <button
          type="button"
          className="btn btn-green btn-block"
          style={{ marginTop: 8 }}
          onClick={next}
          disabled={busy}
        >
          {isLast ? (
            <>
              <Icon name="check" size={16} /> Let&apos;s go
            </>
          ) : (
            <>
              Next <Icon name="chevron" size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
