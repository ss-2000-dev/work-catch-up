import { useState } from "react";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PointsExchangeFieldPatternA1 } from "../../components/PointsExchangeFieldPatternA1";
import { PointsExchangeFieldPatternA2 } from "../../components/PointsExchangeFieldPatternA2";
import { PointsExchangeFieldPatternB } from "../../components/PointsExchangeFieldPatternB";

type Pattern = "A1" | "A2" | "B";

const PATTERN_DESCRIPTION: Record<Pattern, string> = {
  A1: "react-number-formatライブラリを使い、入力中からカンマ整形する",
  A2: "ライブラリを使わず、自前でカーソル位置を制御しながらカンマ整形する",
  B: "入力中は生の数字のまま。確認結果の表示でのみカンマ整形する",
};

export function App() {
  const [pattern, setPattern] = useState<Pattern>("A1");

  return (
    <Box sx={{ maxWidth: 480, margin: "0 auto", padding: 3 }}>
      <a href="/">← チケット一覧に戻る</a>
      <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
        ポイント交換
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
        入力中のカンマ整形の要否・実装方法を比較するための画面です。下のトグルでパターンを切り替えられます。
      </Typography>

      <ToggleButtonGroup
        value={pattern}
        exclusive
        onChange={(_, next) => next && setPattern(next)}
        sx={{ mb: 1 }}
      >
        <ToggleButton value="A1">A1: ライブラリ利用</ToggleButton>
        <ToggleButton value="A2">A2: 自前実装</ToggleButton>
        <ToggleButton value="B">B: 確認画面のみ</ToggleButton>
      </ToggleButtonGroup>

      <Typography variant="caption" display="block" sx={{ mb: 3, color: "text.secondary" }}>
        {PATTERN_DESCRIPTION[pattern]}
      </Typography>

      {pattern === "A1" && <PointsExchangeFieldPatternA1 />}
      {pattern === "A2" && <PointsExchangeFieldPatternA2 />}
      {pattern === "B" && <PointsExchangeFieldPatternB />}
    </Box>
  );
}
