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
  topSports: string
  canva: string
  videoEditing: string
  workInterests: string
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
        topSports: (profile?.topSports || []).map((s) => `${s.sport} (${s.level})`).join(', ') || '—',
        canva: profile?.design?.canva != null ? String(profile.design.canva) : '—',
        videoEditing: profile?.design?.videoEditing != null ? String(profile.design.videoEditing) : '—',
        workInterests: (profile?.design?.workInterests || []).join('; ') || '—',
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

function styleHeader(row: ExcelJS.Row) {
  row.height = 28
  row.eachCell((cell) => {
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
}

function styleBodyRow(row: ExcelJS.Row, index: number, decisionCol?: number, decisionKey?: Decision | null) {
  const decisionFill: Record<string, string> = {
    in: 'FFD8F3E0',
    maybe: 'FFFFF0CC',
    out: 'FFFFD6D6',
  }
  row.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1A1A1A' } }
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D7D3' } },
      left: { style: 'thin', color: { argb: 'FFD0D7D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D7D3' } },
      right: { style: 'thin', color: { argb: 'FFD0D7D3' } },
    }
    if (index % 2 === 1 && colNumber !== decisionCol) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAF8' },
      }
    }
  })
  if (decisionCol && decisionKey) {
    const decisionCell = row.getCell(decisionCol)
    decisionCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1A1A1A' } }
    decisionCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    decisionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: decisionFill[decisionKey] },
    }
  }
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
    { header: 'Email', key: 'email', width: 40 },
    { header: 'Role Applied For', key: 'role', width: 20 },
    { header: 'Decision', key: 'decision', width: 18 },
    { header: 'Section', key: 'section', width: 12 },
    { header: 'Top Sports (3–5)', key: 'topSports', width: 36 },
    { header: 'Canva', key: 'canva', width: 10 },
    { header: 'Video Editing', key: 'videoEditing', width: 14 },
    { header: 'Design Work Interests', key: 'workInterests', width: 40 },
    { header: 'Remarks', key: 'remarks', width: 68 },
  ]

  styleHeader(sheet.getRow(1))

  groups.forEach((g, index) => {
    const decisionLabel = g.finalDecision ? LABELS[g.finalDecision] : 'No final decision'
    const remarks = formatRemarks(g.entries)
    const row = sheet.addRow({
      name: g.candidateName,
      email: g.email || '—',
      role: g.role || '—',
      decision: decisionLabel,
      section: g.sections.join(', ') || '—',
      topSports: g.topSports,
      canva: g.canva,
      videoEditing: g.videoEditing,
      workInterests: g.workInterests,
      remarks,
    })
    const remarkLines = Math.max(1, remarks.split('\n').length)
    row.height = Math.min(18 + remarkLines * 16, 120)
    styleBodyRow(row, index, 4, g.finalDecision)
  })

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, groups.length + 1), column: 10 },
  }

  // Second sheet: Content & Design applicants only
  const designOnly = candidates
    .filter((c) => c.wantsDesign)
    .sort((a, b) => a.name.localeCompare(b.name))
  const designSheet = workbook.addWorksheet('Content & Design', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  designSheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 40 },
    { header: 'Role Applied For', key: 'role', width: 20 },
    { header: 'Canva', key: 'canva', width: 10 },
    { header: 'Video Editing', key: 'video', width: 14 },
    { header: 'Work Interests', key: 'interests', width: 44 },
    { header: 'Decision', key: 'decision', width: 18 },
    { header: 'Remarks', key: 'remarks', width: 60 },
  ]
  styleHeader(designSheet.getRow(1))
  designOnly.forEach((c, index) => {
    const g = groups.find((x) => x.candidateId === c.id)
    const row = designSheet.addRow({
      name: c.name,
      email: c.email || '—',
      role: c.vertical || '—',
      canva: c.design?.canva != null ? c.design.canva : '—',
      video: c.design?.videoEditing != null ? c.design.videoEditing : '—',
      interests: (c.design?.workInterests || []).join('; ') || '—',
      decision: g?.finalDecision ? LABELS[g.finalDecision] : 'No evaluation yet',
      remarks: g ? formatRemarks(g.entries) : '—',
    })
    row.height = 36
    styleBodyRow(row, index, 7, g?.finalDecision ?? null)
  })
  designSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, designOnly.length + 1), column: 8 },
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
