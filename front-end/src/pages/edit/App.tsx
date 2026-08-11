import { useEffect, useState } from "react";
import { fetchTicket, updateTicket } from "../../api/ticketApi";
import { TicketForm } from "../../components/TicketForm";
import type { Ticket, TicketInput } from "../../types/ticket";
import { getTicketIdFromPath } from "../../utils/path";

export function App() {
  const id = getTicketIdFromPath();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // API通信: 編集対象の既存データを取得して、フォームの初期値にする
  useEffect(() => {
    if (!id) return;
    fetchTicket(id)
      .then((data) => setTicket(data))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSubmit(input: TicketInput) {
    if (!id) return;
    const saved = await updateTicket(id, input);
    window.location.href = `/tickets/${saved.id}`;
  }

  if (isLoading) return <p>読み込み中...</p>;
  if (!ticket) return <p>チケットが見つかりません</p>;

  return (
    <div>
      <a href={`/tickets/${id}`}>← 詳細に戻る</a>
      <h1>チケット編集</h1>
      <TicketForm initialValues={ticket} onSubmit={handleSubmit} submitLabel="更新する" />
    </div>
  );
}
