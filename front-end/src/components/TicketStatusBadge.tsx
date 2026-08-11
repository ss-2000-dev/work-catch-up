import type { TicketStatus } from "../types/ticket";

const LABEL: Record<TicketStatus, string> = {
  todo: "未着手",
  in_progress: "対応中",
  done: "完了",
};

const COLOR: Record<TicketStatus, string> = {
  todo: "#999",
  in_progress: "#0070f3",
  done: "#0a8f3c",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      style={{
        color: "#fff",
        backgroundColor: COLOR[status],
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 12,
      }}
    >
      {LABEL[status]}
    </span>
  );
}
