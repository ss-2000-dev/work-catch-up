import { useEffect, useState } from "react";
import { deleteTicket, fetchTicket, updateTicket } from "../../api/ticketApi";
import type { Ticket, TicketStatus } from "../../types/ticket";
import { TicketStatusBadge } from "../../components/TicketStatusBadge";
import { getTicketIdFromPath } from "../../utils/path";

export function App() {
  // 画面遷移: SPAルーターを使わないので、URL(/tickets/1)から自分でidを取り出す
  const id = getTicketIdFromPath();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchTicket(id)
      .then((data) => setTicket(data))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleStatusChange(status: TicketStatus) {
    if (!id || !ticket) return;
    // 値の保持 + API通信: サーバーを更新したら、画面のstateも更新して見た目に反映する
    const updated = await updateTicket(id, { ...ticket, status });
    setTicket(updated);
  }

  async function handleDelete() {
    if (!id) return;
    await deleteTicket(id);
    // 画面遷移: フルリロードで一覧ページに戻る(GA4のpage_viewも通常どおり発火する)
    window.location.href = "/";
  }

  if (isLoading) return <p>読み込み中...</p>;
  if (!ticket) return <p>チケットが見つかりません</p>;

  return (
    <div>
      <a href="/">← 一覧に戻る</a>
      <h1>{ticket.title}</h1>
      <TicketStatusBadge status={ticket.status} />
      <p>{ticket.description}</p>
      <p>担当: {ticket.assignee}</p>

      <div style={{ marginTop: 16 }}>
        <span>ステータス変更: </span>
        <button onClick={() => handleStatusChange("todo")}>未着手</button>
        <button onClick={() => handleStatusChange("in_progress")}>対応中</button>
        <button onClick={() => handleStatusChange("done")}>完了</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href={`/tickets/${ticket.id}/edit`}>編集する</a>{" "}
        <button onClick={handleDelete}>削除する</button>
      </div>
    </div>
  );
}
