import { durationMinutes, formatInt, formatLongDate, formatNumber } from './format'

/**
 * Carte de partage d'une séance terminée : image PNG 1080 × 1350 (format 4:5,
 * bien accepté par les réseaux et messageries), dessinée sur un canvas
 * avec la palette néon de l'app. Tout se fait côté client : rien n'est publié.
 */

const W = 1080
const H = 1350
const PAD = 72

const INK = { 950: '#08060d', 850: '#14111d', 700: '#2c2640', 300: '#a9a1bd' }
const NEON = { yellow: '#fff03a', violet: '#b95cff', pink: '#ff4fb8', cyan: '#2de2e6', green: '#3dff8f' }
const RGB = { yellow: '255 240 58', violet: '185 92 255', pink: '255 79 184', cyan: '45 226 230', green: '61 255 143' }

const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const BODY = 'Barlow, system-ui, sans-serif'
const MAX_ROWS = 6

/** police d'affichage chargée avant de dessiner (sinon le canvas prend la police de repli) */
async function loadFonts() {
  if (!document.fonts?.load) return
  await Promise.all(
    [`italic 800 100px ${DISPLAY}`, `italic 700 60px ${DISPLAY}`, `600 40px ${DISPLAY}`, `500 30px ${BODY}`, `700 30px ${BODY}`]
      .map((f) => document.fonts.load(f).catch(() => null)),
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** coupe le texte en lignes tenant dans `maxWidth`, au plus `maxLines` (… à la fin) */
function wrap(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines.map((l) => ellipsis(ctx, l, maxWidth))
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = ellipsis(ctx, `${kept[maxLines - 1]}…`, maxWidth)
  return kept
}

function ellipsis(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function glowText(ctx, text, x, y, color, blur = 24) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.restore()
  ctx.fillText(text, x, y)
}

/** meilleure série d'un exercice : charge max, puis plus de répétitions */
function bestSet(sets) {
  return sets.reduce(
    (best, s) => (!best || (s.weight ?? 0) > (best.weight ?? 0) || ((s.weight ?? 0) === (best.weight ?? 0) && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best),
    null,
  )
}

/**
 * @param session  détail de séance (api.session)
 * @param exercises exercices enrichis de la vue : { name, done, record, ... }
 * @param kcal      énergie estimée ou null
 * @returns HTMLCanvasElement
 */
export async function drawSessionCard({ session, exercises, kcal }) {
  await loadFonts()
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const accentName = NEON[session.color] ? session.color : 'violet'
  const accent = NEON[accentName]

  // ── fond : encre + halos rose / cyan / accent, comme l'app
  ctx.fillStyle = INK[950]
  ctx.fillRect(0, 0, W, H)
  const halo = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgb(${rgb} / ${a})`)
    g.addColorStop(1, `rgb(${rgb} / 0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  halo(W, 0, 820, RGB.pink, 0.28)
  halo(0, 0, 760, RGB.cyan, 0.2)
  halo(W / 2, H + 120, 760, RGB[accentName], 0.22)

  // cadre néon
  ctx.save()
  ctx.strokeStyle = `rgb(${RGB[accentName]} / 0.55)`
  ctx.lineWidth = 3
  ctx.shadowColor = accent
  ctx.shadowBlur = 30
  roundRect(ctx, 28, 28, W - 56, H - 56, 40)
  ctx.stroke()
  ctx.restore()

  ctx.textBaseline = 'alphabetic'
  let y = PAD + 52

  // ── en-tête : marque + date
  ctx.font = `italic 800 44px ${DISPLAY}`
  ctx.fillStyle = NEON.yellow
  glowText(ctx, 'CYBER GYM', PAD, y, NEON.yellow, 18)
  ctx.font = `600 32px ${DISPLAY}`
  ctx.fillStyle = INK[300]
  ctx.textAlign = 'right'
  ctx.fillText(formatLongDate(session.startedAt).toUpperCase(), W - PAD, y)
  ctx.textAlign = 'left'

  // ── titre de séance
  y += 140
  ctx.font = `italic 800 120px ${DISPLAY}`
  const titleLines = wrap(ctx, session.name.toUpperCase(), W - PAD * 2, 2)
  for (const line of titleLines) {
    ctx.fillStyle = accent
    glowText(ctx, line, PAD, y, accent, 36)
    y += 108
  }
  y -= 108
  if (session.muscles) {
    y += 56
    ctx.font = `500 34px ${BODY}`
    ctx.fillStyle = INK[300]
    ctx.fillText(ellipsis(ctx, session.muscles, W - PAD * 2), PAD, y)
  }

  // ── statistiques
  y += 48
  const stats = [
    { label: 'DURÉE', value: `${durationMinutes(session.startedAt, session.endedAt)}`, unit: 'min', color: 'cyan' },
    { label: 'VOLUME', value: formatInt(session.volume), unit: 'kg', color: 'pink' },
    { label: 'SÉRIES', value: formatInt(session.setsDone), unit: '', color: 'violet' },
    session.records
      ? { label: session.records > 1 ? 'RECORDS' : 'RECORD', value: formatInt(session.records), unit: '', color: 'green' }
      : kcal !== null
        ? { label: 'ÉNERGIE', value: formatInt(kcal), unit: 'kcal', color: 'yellow' }
        : { label: 'EXERCICES', value: formatInt(exercises.filter((e) => e.done.length).length), unit: '', color: 'green' },
  ]
  const gap = 20
  const boxW = (W - PAD * 2 - gap) / 2
  const boxH = 150
  stats.forEach((s, i) => {
    const x = PAD + (i % 2) * (boxW + gap)
    const by = y + Math.floor(i / 2) * (boxH + gap)
    ctx.fillStyle = `rgb(${RGB[s.color]} / 0.08)`
    roundRect(ctx, x, by, boxW, boxH, 24)
    ctx.fill()
    ctx.strokeStyle = `rgb(${RGB[s.color]} / 0.6)`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.font = `700 26px ${BODY}`
    ctx.fillStyle = NEON[s.color]
    ctx.letterSpacing = '4px'
    ctx.fillText(s.label, x + 28, by + 48)
    ctx.letterSpacing = '0px'
    ctx.font = `italic 800 72px ${DISPLAY}`
    ctx.fillStyle = NEON.yellow
    ctx.fillText(s.value, x + 28, by + 122)
    if (s.unit) {
      const vw = ctx.measureText(s.value).width
      ctx.font = `600 34px ${DISPLAY}`
      ctx.fillStyle = INK[300]
      ctx.fillText(s.unit, x + 28 + vw + 10, by + 122)
    }
  })
  y += boxH * 2 + gap + 64

  // ── exercices : meilleure série, records en vert
  const done = exercises.filter((e) => e.done.length)
  const rows = done.length > MAX_ROWS ? done.slice(0, MAX_ROWS - 1) : done
  const footerY = H - PAD - 8
  const rowH = Math.min(104, (footerY - 60 - y) / Math.max(1, rows.length + (done.length > rows.length ? 1 : 0)))
  for (const e of rows) {
    ctx.strokeStyle = INK[700]
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PAD, y - rowH + 22)
    ctx.lineTo(W - PAD, y - rowH + 22)
    ctx.stroke()

    const best = bestSet(e.done)
    const right = `${formatNumber(best.weight ?? 0)} kg × ${best.reps ?? 0}`
    ctx.font = `italic 700 50px ${DISPLAY}`
    const rightW = ctx.measureText(right).width
    ctx.fillStyle = e.record ? NEON.green : NEON.yellow
    ctx.textAlign = 'right'
    if (e.record) glowText(ctx, right, W - PAD, y, NEON.green, 20)
    else ctx.fillText(right, W - PAD, y)
    ctx.textAlign = 'left'

    let nameMax = W - PAD * 2 - rightW - 32
    let x = PAD
    if (e.record) {
      ctx.font = `700 22px ${BODY}`
      ctx.letterSpacing = '3px'
      const tag = 'RECORD'
      const tw = ctx.measureText(tag).width + 24
      ctx.fillStyle = NEON.green
      roundRect(ctx, x, y - 32, tw, 36, 18)
      ctx.fill()
      ctx.fillStyle = INK[950]
      ctx.fillText(tag, x + 12, y - 6)
      ctx.letterSpacing = '0px'
      x += tw + 16
      nameMax -= tw + 16
    }
    ctx.font = `600 36px ${BODY}`
    ctx.fillStyle = '#f4f0ff'
    ctx.fillText(ellipsis(ctx, e.name, nameMax), x, y)
    y += rowH
  }
  if (done.length > rows.length) {
    ctx.font = `500 30px ${BODY}`
    ctx.fillStyle = INK[300]
    const more = done.length - rows.length
    ctx.fillText(`+ ${more} autre${more > 1 ? 's' : ''} exercice${more > 1 ? 's' : ''}`, PAD, y - 10)
  }

  // ── pied : adresse de l'app
  ctx.font = `600 30px ${DISPLAY}`
  ctx.fillStyle = INK[300]
  ctx.letterSpacing = '4px'
  ctx.textAlign = 'center'
  ctx.fillText(location.host.toUpperCase(), W / 2, footerY)
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'

  return canvas
}

/** texte accompagnant l'image (ou seul, si l'appareil ne partage pas de fichiers) */
export function shareText({ session, exercises, kcal }) {
  const parts = [
    `${session.name} — ${durationMinutes(session.startedAt, session.endedAt)} min`,
    `${formatInt(session.volume)} kg soulevés en ${formatInt(session.setsDone)} séries`,
  ]
  const records = exercises.filter((e) => e.record)
  if (records.length) parts.push(`🏆 Record${records.length > 1 ? 's' : ''} : ${records.map((e) => `${e.name} ${formatNumber(e.top)} kg`).join(', ')}`)
  if (kcal !== null) parts.push(`≈ ${formatInt(kcal)} kcal`)
  return `${parts.join('\n')}\n\nCyber Gym 💪`
}

export function cardFileName(session) {
  const slug = session.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const day = new Date(session.startedAt).toISOString().slice(0, 10)
  return `cyber-gym-${slug || 'seance'}-${day}.png`
}
