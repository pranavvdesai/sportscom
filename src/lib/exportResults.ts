import ExcelJS from 'exceljs'
import type { Candidate, Decision, Evaluation } from '../types'

const LABELS: Record<Decision, string> = {
  in: 'Definitely In',
  maybe: 'Maybe',
  out: 'Out',
}

type ExportGroup = {
  candidateId: number
  candidateName: string
  email: string
  role: string
  finalDecision: Decision | null
  sections: string[]
  entries: Evaluation[]
}

function buildGroups(rows: Evaluation[], candidates: Candidate[]): ExportGroup[] {
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const map = new Map<number, ExportGroup>()

  for (const r of rows) {
    const profile = byId.get(r.candidate_id)
    const existing = map.get(r.candidate_id)
    if (!existing) {
      map.set(r.candidate_id, {
        candidateId: r.candidate_id,
        candidateName: r.candidate_name || profile?.name || '',
        email: profile?.email || '',
        role: profile?.vertical || '',
        finalDecision: r.decision,
        sections: r.section?.trim() ? [r.section.trim()] : [],
        entries: [r],
      })
    } else {
      existing.entries.push(r)
      if (r.candidate_name) existing.candidateName = r.candidate_name
      if (!existing.email && profile?.email) existing.email = profile.email
      if (!existing.role && profile?.vertical) existing.role = profile.vertical
      if (r.section?.trim() && !existing.sections.includes(r.section.trim())) {
        existing.sections.push(r.section.trim())
      }
    }
  }

  for (const g of map.values()) {
    g.entries.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0
      const tb = b.created_at ? Date.parse(b.created_at) : 0
      return tb - ta
    })
    g.finalDecision = g.entries.find((e) => e.decision)?.decision ?? null
  }

  return Array.from(map.values()).sort((a, b) => a.candidateName.localeCompare(b.candidateName))
}

function formatRemarks(entries: Evaluation[]): string {
  return entries
    .map((e) => {
      const who = e.interviewer_name || 'Interviewer'
      const decision = e.decision ? LABELS[e.decision] : 'Remarks only'
      const section = e.section?.trim() ? ` | Section ${e.section.trim()}` : ''
      const body = (e.remarks || '').trim() || '—'
      const chars = e.characteristics?.trim() ? `\n   Characteristics: ${e.characteristics.trim()}` : ''
      return `• ${who} (${decision}${section}): ${body}${chars}`
    })
    .join('\n')
}

export async function downloadResultsExcel(rows: Evaluation[], candidates: Candidate[]): Promise<void> {
  const groups = buildGroups(rows, candidates)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Sportscom'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Interview Results', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultRowHeight: 22 },
  })

  sheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 42 },
    { header: 'Role Applied For', key: 'role', width: 22 },
    { header: 'Decision', key: 'decision', width: 18 },
    { header: 'Section', key: 'section', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 72 },
  ]

  const header = sheet.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B4332' },
    }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 12 }
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0D1F17' } },
      left: { style: 'thin', color: { argb: 'FF0D1F17' } },
      bottom: { style: 'thin', color: { argb: 'FF0D1F17' } },
      right: { style: 'thin', color: { argb: 'FF0D1F17' } },
    }
  })

  const decisionFill: Record<string, string> = {
    in: 'FFD8F3E0',
    maybe: 'FFFFF0CC',
    out: 'FFFFD6D6',
  }

  groups.forEach((g, index) => {
    const decisionLabel = g.finalDecision ? LABELS[g.finalDecision] : 'No final decision'
    const row = sheet.addRow({
      name: g.candidateName,
      email: g.email || '—',
      role: g.role || '—',
      decision: decisionLabel,
      section: g.sections.join(', ') || '—',
      remarks: formatRemarks(g.entries),
    })

    const remarkLines = Math.max(1, formatRemarks(g.entries).split('\n').length)
    row.height = Math.min(18 + remarkLines * 16, 120)
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1A1A1A' } }
      cell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D7D3' } },
        left: { style: 'thin', color: { argb: 'FFD0D7D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D7D3' } },
        right: { style: 'thin', color: { argb: 'FFD0D7D3' } },
      }
      if (index % 2 === 1 && colNumber !== 4) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF7FAF8' },
        }
      }
    })

    const decisionCell = row.getCell(4)
    decisionCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1A1A1A' } }
    decisionCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    if (g.finalDecision) {
      decisionCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: decisionFill[g.finalDecision] },
      }
    }
  })

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, groups.length + 1), column: 6 },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `Sportscom_Interview_Results_${stamp}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
