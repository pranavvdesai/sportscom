import type { PanelId } from '../types'

/** Who can set the final In / Maybe / Out for each panel. */
export const PANEL_DECISION_LEADS: Record<PanelId, string | null> = {
  free: 'Hitesh',
  '1': 'Chaitanya',
  '2': 'Hitesh',
}

/** Who can delete candidates (and all related remarks) from Results. */
export const RESULTS_ADMIN = 'Hitesh'

export function canSetDecision(interviewerName: string, panel: PanelId): boolean {
  const lead = PANEL_DECISION_LEADS[panel]
  if (!lead) return false
  return interviewerName.trim().toLowerCase() === lead.trim().toLowerCase()
}

export function decisionLeadLabel(panel: PanelId): string {
  const lead = PANEL_DECISION_LEADS[panel]
  if (!lead) return 'Panel lead (not set yet)'
  return lead
}

export function canDeleteResults(interviewerName: string): boolean {
  return interviewerName.trim().toLowerCase() === RESULTS_ADMIN.trim().toLowerCase()
}
