import { useEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { validatePointsExchange } from "../utils/validatePointsExchange";

function formatWithCommas(digits: string): string {
  if (digits === "") return "";
  return Number(digits).toLocaleString("en-US");
}

// カーソルより前にある「数字」の個数を数える(カンマは数えない)
function countDigitsBeforeIndex(value: string, index: number): number {
  return value.slice(0, index).replace(/[^\d]/g, "").length;
}

// フォーマット済み文字列の中で、先頭からdigitCount個目の数字の直後の位置を返す
// (カーソルを「何文字目」ではなく「何個目の数字の後ろ」で覚えておくことで、
//  カンマが増減してもカーソルが数字を追い越さないようにする)
function indexAfterNthDigit(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

// パターンA2: react-number-formatを使わず、自前でカーソル位置を制御しながらカンマ整形する
//
// react-number-format(パターンA1)との違いはここ。カンマ入りの文字列をvalueにそのまま
// 表示すると、入力のたびに「数字だけ抜き出す→再フォーマットする」処理が入るため、
// ブラウザが自動でカーソルを文字列の先頭や末尾に飛ばしてしまう。
// それを防ぐため、変更のたびに「カーソルの前に数字が何個あったか」を数えておき、
// 再フォーマット後の文字列で同じ数字数の位置にカーソルを戻す、という処理を自前で書いている。
//
// 既知の制約: 数字が"0100"のように先頭にゼロを含む状態を経由すると、
// Number()変換でゼロが消えるため桁数がズレるケースがある(バリデーション上はどのみち
// 100未満として弾かれる値だが、カーソル位置の精度は完全ではない)。
export function PointsExchangeFieldPatternA2() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorDigitCount = useRef<number | null>(null);

  const [rawDigits, setRawDigits] = useState(""); // カンマを含まない生の数字文字列
  const [confirmedValue, setConfirmedValue] = useState<number | null>(null);

  const { value, errorMessage } = validatePointsExchange(rawDigits);
  const displayValue = formatWithCommas(rawDigits);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const cursorPos = input.selectionStart ?? input.value.length;

    // ブラウザが素朴に反映した後の文字列(カンマがズレた状態)を元に、
    // カーソルより前に数字が何個あったかを数えておく
    const digitsBeforeCursor = countDigitsBeforeIndex(input.value, cursorPos);
    const nextDigits = input.value.replace(/[^\d]/g, "").slice(0, 5); // 5桁(12500)まで

    pendingCursorDigitCount.current = digitsBeforeCursor;
    setRawDigits(nextDigits);
    setConfirmedValue(null);
  }

  // 再フォーマットされた表示値が確定した後(=再描画後)に、カーソル位置を復元する
  useEffect(() => {
    if (pendingCursorDigitCount.current === null) return;
    const el = inputRef.current;
    if (!el) return;

    const nextPos = indexAfterNthDigit(displayValue, pendingCursorDigitCount.current);
    el.setSelectionRange(nextPos, nextPos);
    pendingCursorDigitCount.current = null;
  }, [displayValue]);

  return (
    <Box>
      <TextField
        inputRef={inputRef}
        label="交換したいポイント数"
        fullWidth
        value={displayValue}
        onChange={handleChange}
        error={!!errorMessage}
        helperText={
          errorMessage ??
          "100ポイント単位、100〜12,500ポイントの範囲で入力できます"
        }
      />

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        disabled={value === null}
        onClick={() => setConfirmedValue(value)}
      >
        確認する
      </Button>

      {confirmedValue !== null && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
          {confirmedValue.toLocaleString()}pt を交換します
        </Box>
      )}
    </Box>
  );
}
