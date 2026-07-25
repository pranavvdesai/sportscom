export type PanelId = '1' | '2' | 'free'

export type Decision = 'in' | 'maybe' | 'out'

export type SportScore = {
  sport: string
  level: number
}

export type DesignSkills = {
  canva: number | null
  videoEditing: number | null
  workInterests: string[]
  whyContent: string
  whyEvent: string
  contributeBoth: string
}

export type CandidateInsight = {
  goodAt: string[]
  competitionLevels: string[]
  levelMentions: string[]
  sportsMentioned: string[]
  achievementsBullets: string[]
  sportsComBullets: string[]
  memoryBullets: string[]
  designBullets?: string[]
  summary: string
}

export type Candidate = {
  id: number
  name: string
  email: string
  vertical: string
  achievements: string
  otherSports: string
  cultureAnswer: string
  favoriteMemory: string
  topSports: SportScore[]
  allScores: Record<string, number>
  design?: DesignSkills
  wantsDesign?: boolean
  insight?: CandidateInsight
}

export type InterviewSlot = {
  id: string
  slot: string
  room: string
  label: string
  candidates: { name: string; email: string; candidateId: number | null }[]
}

export type InterviewerSession = {
  name: string
  panel: PanelId
}

export type Evaluation = {
  id?: string
  interviewer_name: string
  panel: PanelId
  candidate_id: number
  candidate_name: string
  decision: Decision | null
  section: string
  remarks: string
  characteristics: string
  created_at?: string
}
