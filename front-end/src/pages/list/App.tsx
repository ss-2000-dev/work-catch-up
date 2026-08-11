import { useEffect, useState } from "react";
import { fetchTickets } from "../../api/ticketApi";
import type { Ticket } from "../../types/ticket";
import { TicketStatusBadge } from "../../components/TicketStatusBadge";

export function App() {
  // 値の保持: 一覧データ・ローディング状態・エラーをそれぞれuseStateで持つ
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API通信: このページが読み込まれた(マウントされた)タイミングで一覧を取得する
  useEffect(() => {
    fetchTickets()
      .then((data) => setTickets(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p>エラーが発生しました: {error}</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>チケット一覧</h1>
        {/* 画面遷移: aタグでの遷移=ブラウザの通常のページ遷移(フルリロード)。
            GA4を導入した場合、遷移のたびにページが読み込まれるので自動でpage_viewが計測される */}
        <a href="/tickets/new">+ 新規作成</a>
      </div>

      <ul>
        {tickets.map((ticket) => (
          <li key={ticket.id} style={{ marginBottom: 8 }}>
            <a href={`/tickets/${ticket.id}`}>{ticket.title}</a>{" "}
            <TicketStatusBadge status={ticket.status} />
            <span style={{ marginLeft: 8, color: "#666" }}>
              担当: {ticket.assignee}
            </span>
          </li>
        ))}
      </ul>

      <hr style={{ margin: "24px 0" }} />
      <a href="/upload">CSV集計ツールを開く</a>
    </div>
  );
}
