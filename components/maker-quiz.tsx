"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react"
import { AuraBackground } from "@/components/aura-background"
import {
  saveMakerProfile,
  MAKER_PROFILE_INFO,
  type MakerProfileType,
  type MakerProfile,
} from "@/lib/storage"

interface MakerQuizProps {
  onComplete: (profile: MakerProfile) => void
  onBack: () => void
}

interface QuizOption {
  label: string
  profile: MakerProfileType
}

const QUESTIONS: { question: string; options: QuizOption[] }[] = [
  {
    question: "You find a locked, dusty chest in a painting. What's your first instinct?",
    options: [
      { label: "Sketch the intricate keyhole.", profile: "visualizer" },
      { label: "Write the legend of the pirate who buried it.", profile: "storyteller" },
      { label: "Imagine I'm holding the key — what do I do next?", profile: "inhabitant" },
      { label: 'Slap a "Fragile: Amazon Prime" sticker on it.', profile: "remixer" },
    ],
  },
  {
    question: "If you could add one thing to a quiet landscape painting, what would it be?",
    options: [
      { label: "A vibrant, swirling sunset.", profile: "visualizer" },
      { label: "A whispered conversation between two hidden figures.", profile: "storyteller" },
      { label: "A tent, so I could camp there for the night.", profile: "inhabitant" },
      { label: "A UFO hovering in the background.", profile: "remixer" },
    ],
  },
]

type Stage = "intro" | "q1" | "q2" | "result"

export function MakerQuiz({ onComplete, onBack }: MakerQuizProps) {
  const [stage, setStage] = useState<Stage>("intro")
  const [answers, setAnswers] = useState<[MakerProfileType | null, MakerProfileType | null]>([null, null])

  const handleAnswer = (questionIndex: 0 | 1, profile: MakerProfileType) => {
    const newAnswers = [...answers] as [MakerProfileType | null, MakerProfileType | null]
    newAnswers[questionIndex] = profile
    setAnswers(newAnswers)

    if (questionIndex === 0) {
      setStage("q2")
    } else {
      // Calculate result — Q2 is tie-breaker
      setStage("result")
    }
  }

  const getFinalProfile = (): MakerProfileType => {
    const [a1, a2] = answers
    if (a1 === a2) return a1!
    return a2! // Q2 is tie-breaker
  }

  const handleFinish = () => {
    const profileType = getFinalProfile()
    const profile: MakerProfile = {
      type: profileType,
      quizAnswers: [answers[0]!, answers[1]!],
      createdAt: Date.now(),
    }
    saveMakerProfile(profile)
    onComplete(profile)
  }

  const handleRetake = () => {
    setAnswers([null, null])
    setStage("intro")
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
      <AuraBackground />

      <header className="relative flex items-center justify-between px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={stage === "intro" ? onBack : () => setStage(stage === "q2" ? "q1" : "intro")}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
        <h1 className="font-mono text-[12px] uppercase tracking-[0.28em] text-foreground/55">
          {stage === "result" ? "Your Profile" : "Quick Quiz"}
        </h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <main className="relative flex flex-1 flex-col px-4 pb-12 pt-6 sm:px-8 md:px-12">
        <AnimatePresence mode="wait">
          {stage === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(170,196,176,0.55), rgba(212,166,156,0.55))",
                  border: "0.75px solid rgba(26,26,31,0.14)",
                }}
                aria-hidden="true"
              >
                <span className="font-mono text-3xl">?</span>
              </div>
              <div>
                <h2 className="font-mono text-xl font-normal text-foreground">Build Your Maker Profile</h2>
                <p className="mt-2 max-w-xs font-mono text-[13px] font-light leading-relaxed text-foreground/65">
                  Answer two quick questions to discover how you like to make meaning from art.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStage("q1")}
                className="mt-4 flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-90"
              >
                Start Quiz
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </motion.div>
          )}

          {(stage === "q1" || stage === "q2") && (
            <motion.div
              key={stage}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col gap-6"
            >
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                  Question {stage === "q1" ? "1" : "2"} of 2
                </p>
                <h2 className="mt-3 font-mono text-lg font-normal leading-relaxed text-foreground">
                  {QUESTIONS[stage === "q1" ? 0 : 1].question}
                </h2>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {QUESTIONS[stage === "q1" ? 0 : 1].options.map((option, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswer(stage === "q1" ? 0 : 1, option.profile)}
                    className="group w-full rounded-2xl px-5 py-4 text-left transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(20px) saturate(140%)",
                      WebkitBackdropFilter: "blur(20px) saturate(140%)",
                      border: "0.75px solid rgba(26,26,31,0.12)",
                      boxShadow: "0 8px 24px -12px rgba(60,70,90,0.12)",
                    }}
                  >
                    <span className="font-mono text-[13px] font-light leading-relaxed text-foreground/85 group-hover:text-foreground">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
            >
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(135deg, rgba(170,196,176,0.7), rgba(212,166,156,0.7))",
                  border: "0.75px solid rgba(26,26,31,0.14)",
                  boxShadow: "0 16px 40px -16px rgba(60,70,90,0.25)",
                }}
                aria-hidden="true"
              >
                <span className="font-mono text-2xl font-light">
                  {MAKER_PROFILE_INFO[getFinalProfile()].name[0]}
                </span>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">You are a</p>
                <h2 className="mt-2 font-mono text-2xl font-normal text-foreground">
                  {MAKER_PROFILE_INFO[getFinalProfile()].name}
                </h2>
                <p className="mt-2 font-mono text-[14px] font-light text-foreground/75">
                  {MAKER_PROFILE_INFO[getFinalProfile()].tagline}
                </p>
                <p className="mt-4 max-w-sm font-mono text-[12px] font-light leading-relaxed text-foreground/60">
                  {MAKER_PROFILE_INFO[getFinalProfile()].description}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-90"
                >
                  Start Creating
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex items-center justify-center gap-2 rounded-full px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/60 transition-colors hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Retake Quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
