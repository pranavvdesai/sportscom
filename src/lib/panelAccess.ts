import type { PanelId } from '../types'

/** Who can set the final In / Maybe / Out for each panel. */
export const PANEL_DECISION_LEADS: Record<PanelId, string | null> = {
  free: 'Hitesh',
  '1': null, // tell me the name later
  '2': null, // tell me the name later
}

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
