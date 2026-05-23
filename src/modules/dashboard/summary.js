// @ts-check
/**
 * @param {Array<{line_id:string, count:number, scrap:number, pace:number, lastCaptureAt?:string}>} lines
 */
export function computeSummary(lines) {
  const activeLines = lines.filter((l) => l.count > 0).length;
  const totalProduction = lines.reduce((acc, l) => acc + l.count, 0);
  const totalScrap = lines.reduce((acc, l) => acc + l.scrap, 0);
  const avgPace = lines.length === 0 ? 0 : lines.reduce((acc, l) => acc + l.pace, 0) / lines.length;
  return {
    totalProduction,
    totalScrap,
    linesActive: activeLines,
    linesTotal: lines.length,
    avgPace
  };
}
