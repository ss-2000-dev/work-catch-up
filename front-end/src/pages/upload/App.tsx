import { useState } from "react";
import { Modal } from "../../components/Modal";
import { aggregatePointsFromZip } from "../../utils/parseZipCsv";
import type { AggregateResult } from "../../utils/parseZipCsv";

export function App() {
  // 値の保持: 選択中のファイル・処理中フラグ・エラー・集計結果をそれぞれuseStateで持つ
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AggregateResult | null>(null);

  async function handleUpload() {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      // zip解凍・CSVパース・集計はすべてブラウザ内で完結する(サーバーには送らない)
      const aggregated = await aggregatePointsFromZip(selectedFile);
      setResult(aggregated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "集計に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <a href="/">← チケット一覧に戻る</a>
      <h1>CSV集計(zipアップロード)</h1>
      <p>
        仮想ポイントが記載されたCSVをzip化してアップロードすると、
        対象ユーザー数(行数)と仮想ポイントの合計(C列)を集計します。
      </p>

      <div>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        <button onClick={handleUpload} disabled={!selectedFile || isProcessing}>
          {isProcessing ? "集計中..." : "アップロードして集計する"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <Modal isOpen={result !== null} onClose={() => setResult(null)}>
        {result && (
          <div>
            <h2>集計結果</h2>
            <p>ファイル: {result.fileName}</p>
            <p>対象ユーザー数: {result.rowCount.toLocaleString()}件</p>
            <p>仮想ポイント合計: {result.totalPoints.toLocaleString()}pt</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
