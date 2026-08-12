import { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { validatePointsExchange } from "../utils/validatePointsExchange";

// パターンB: 入力中はカンマを付けず生の数字のまま。確認画面でのみ3桁区切りにする
export function PointsExchangeFieldPatternB() {
  const [rawDigits, setRawDigits] = useState("");
  const [confirmedValue, setConfirmedValue] = useState<number | null>(null);

  const { value, errorMessage } = validatePointsExchange(rawDigits);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value.replace(/[^\d]/g, ""); // 数字以外の文字は入力させない
    if (next.length <= 5) {
      setRawDigits(next);
    }
    setConfirmedValue(null);
  }

  return (
    <Box>
      <TextField
        label="交換したいポイント数"
        fullWidth
        value={rawDigits}
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
