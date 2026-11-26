// NestEgg charts — two small canvas drawings, no library. A donut for
// "where the money went" and bars for the six-month trend. Both read
// their numbers from the state module, so they always agree with the
// figures on the page.
import { money0 } from './state.js';

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(10, Math.round(rect.width));
  const height = Math.max(10, Math.round(rect.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width, height };
}

export function drawDonut(canvas, slices) {
  const { ctx, width, height } = setupCanvas(canvas);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 8;
  const inner = radius * 0.62;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  ctx.clearRect(0, 0, width, height);
  if (total <= 0) {
    ctx.fillStyle = '#d8cfc0';
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    return;
  }
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweep = (slice.value / total) * Math.PI * 2;
    ctx.fillStyle = slice.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + sweep);
    ctx.closePath();
    ctx.fill();
    angle += sweep;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#1d2b23';
  ctx.font = '700 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(money0(total), cx, cy - 9);
  ctx.fillStyle = '#6b6257';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('spent in Nov', cx, cy + 13);
}

export function drawTrend(canvas, months) {
  const { ctx, width, height } = setupCanvas(canvas);
  const padLeft = 8, padBottom = 26, padTop = 14;
  const max = Math.max(...months.map((m) => Math.max(m.income, m.spent))) * 1.08;
  const plotW = width - padLeft * 2;
  const plotH = height - padTop - padBottom;
  const groupW = plotW / months.length;
  const barW = Math.min(26, (groupW - 18) / 2);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  months.forEach((m, i) => {
    const x0 = padLeft + i * groupW + (groupW - barW * 2 - 6) / 2;
    const incomeH = (m.income / max) * plotH;
    const spentH = (m.spent / max) * plotH;
    ctx.fillStyle = '#1d4d3b';
    ctx.fillRect(x0, padTop + plotH - incomeH, barW, incomeH);
    ctx.fillStyle = '#d96c3f';
    ctx.fillRect(x0 + barW + 6, padTop + plotH - spentH, barW, spentH);
    ctx.fillStyle = '#6b6257';
    ctx.fillText(m.month, padLeft + i * groupW + groupW / 2, height - 20);
  });
  ctx.fillStyle = '#8a8175';
  ctx.textAlign = 'left';
  ctx.fillText('— income', padLeft, 0);
  ctx.fillStyle = '#d96c3f';
  ctx.fillText('— spent', padLeft + 74, 0);
}
