import JSZip from "jszip";
import Papa from "papaparse";

export type AggregateResult = {
  fileName: string;
  rowCount: number;
  totalPoints: number;
};

// 仮想ポイントが入っている列(C列 = 0始まりで2番目)
const POINT_COLUMN_INDEX = 2;

// zipファイルを受け取り、中のCSVをパースしてC列(仮想ポイント)を集計する
export async function aggregatePointsFromZip(zipFile: File): Promise<AggregateResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const csvEntry = Object.values(zip.files).find(
    (entry) => !entry.dir && entry.name.toLowerCase().endsWith(".csv")
  );

  if (!csvEntry) {
    throw new Error("zip内にCSVファイルが見つかりませんでした");
  }

  const csvText = await csvEntry.async("string");
  const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });

  // 1行目はヘッダー行とみなしてスキップする
  const dataRows = parsed.data.slice(1);

  let totalPoints = 0;
  for (const row of dataRows) {
    const value = Number(row[POINT_COLUMN_INDEX]);
    if (Number.isFinite(value)) {
      totalPoints += value;
    }
  }

  return {
    fileName: csvEntry.name,
    rowCount: dataRows.length,
    totalPoints,
  };
}
