export const MIN_POINTS = 100;
export const MAX_POINTS = 12500;
export const POINTS_STEP = 100;

export type PointsValidationResult = {
  // バリデーションを通った場合のみ数値が入る(それ以外はnull)
  value: number | null;
  // 未入力時はnull(まだ何もエラーとして出さない)
  errorMessage: string | null;
};

// パターンA(入力中にカンマ整形)・パターンB(確認画面のみカンマ整形)の両方で共通利用する検証ロジック
export function validatePointsExchange(rawDigits: string): PointsValidationResult {
  if (rawDigits === "") {
    return { value: null, errorMessage: null };
  }

  if (!/^\d+$/.test(rawDigits)) {
    return { value: null, errorMessage: "半角数字のみで入力してください" };
  }

  const value = Number(rawDigits);

  if (value < MIN_POINTS || value > MAX_POINTS) {
    return {
      value: null,
      errorMessage: `${MIN_POINTS.toLocaleString()}〜${MAX_POINTS.toLocaleString()}ポイントの範囲で入力してください`,
    };
  }

  if (value % POINTS_STEP !== 0) {
    return {
      value: null,
      errorMessage: `${POINTS_STEP}ポイント単位で入力してください(例: 100, 200, 300...)`,
    };
  }

  return { value, errorMessage: null };
}
