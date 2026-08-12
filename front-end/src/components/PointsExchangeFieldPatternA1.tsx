import { useState } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { NumericFormat } from "react-number-format";
import { validatePointsExchange } from "../utils/validatePointsExchange";

// パターンA1: react-number-formatで、入力中からリアルタイムに3桁区切りカンマを付ける
export function PointsExchangeFieldPatternA1() {
  const [rawDigits, setRawDigits] = useState(""); // カンマを含まない生の数字文字列で保持する
  const [confirmedValue, setConfirmedValue] = useState<number | null>(null);

  const { value, errorMessage } = validatePointsExchange(rawDigits);

  return (
    <Box>
      <NumericFormat
        customInput={TextField}
        label="交換したいポイント数"
        fullWidth
        thousandSeparator=","
        decimalScale={0}
        allowNegative={false}
        // 5桁(12500)を超える入力自体を受け付けない、というレベルのガード
        // (100単位・範囲チェック自体はvalidatePointsExchangeが担う)
        isAllowed={(values) => values.value.length <= 5}
        value={rawDigits}
        onValueChange={(values) => {
          setRawDigits(values.value); // values.value はカンマを除いた生の数値文字列
          setConfirmedValue(null); // 入力し直したら確認済み状態は解除する
        }}
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
