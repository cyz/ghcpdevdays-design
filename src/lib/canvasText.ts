export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines

  const truncated = lines.slice(0, maxLines)
  while (ctx.measureText(`${truncated[maxLines - 1]}...`).width > maxWidth && truncated[maxLines - 1].length > 0) {
    truncated[maxLines - 1] = truncated[maxLines - 1].slice(0, -1)
  }
  truncated[maxLines - 1] = `${truncated[maxLines - 1]}...`
  return truncated
}

export function wrapTextWithBreaks(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const chunks = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (chunks.length === 0) return ['']

  const lines: string[] = []
  for (const chunk of chunks) {
    const remaining = maxLines - lines.length
    if (remaining <= 0) break
    const wrapped = wrapText(ctx, chunk, maxWidth, remaining)
    lines.push(...wrapped)
  }

  return lines.slice(0, maxLines)
}

export function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
