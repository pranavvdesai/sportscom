import type { Candidate } from '../types'
import type { Decision, Evaluation, PanelId } from '../types'
import { supabase } from './supabase'

const LOCAL_KEY = 'panel-eval-evaluations'

function readLocal(): Evaluation[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Evaluation[]) : []
  } catch {
    return []
  }
}

function writeLocal(rows: Evaluation[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
}

export async function saveEvaluations(
  inputs: {
    interviewerName: string
    panel: PanelId
    candidate: Candidate
    decision: Decision | null
    remarks: string
    characteristics: string
  }[],
): Promise<{ ok: boolean; shared: boolean; error?: string }> {
  const rows: Evaluation[] = inputs.map((input) => ({
    interviewer_name: input.interviewerName.trim(),
    panel: input.panel,
    candidate_id: input.candidate.id,
    candidate_name: input.candidate.name,
    decision: input.decision,
    remarks: input.remarks.trim(),
    characteristics: input.characteristics.trim(),
  }))

  const { error } = await supabase.from('evaluations').insert(rows)

  if (error) {
    const local = readLocal()
    const stamped = rows.map((row, i) => ({
      ...row,
      id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    }))
    writeLocal([...stamped, ...local])
    return { ok: true, shared: false, error: error.message }
  }

  return { ok: true, shared: true }
}

export async function fetchEvaluations(): Promise<{ rows: Evaluation[]; shared: boolean }> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) {
    return { rows: readLocal(), shared: false }
  }

  // Prefer shared cloud data so everyone sees the same Results tab
  return { rows: data as Evaluation[], shared: true }
}
