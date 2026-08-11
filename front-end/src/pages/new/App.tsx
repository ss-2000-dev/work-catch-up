import { createTicket } from "../../api/ticketApi";
import { TicketForm } from "../../components/TicketForm";
import type { TicketInput } from "../../types/ticket";

export function App() {
  async function handleSubmit(input: TicketInput) {
    // API通信: POSTで新規作成
    const saved = await createTicket(input);
    // 画面遷移: フルリロードで詳細ページへ
    window.location.href = `/tickets/${saved.id}`;
  }

  return (
    <div>
      <a href="/">← 一覧に戻る</a>
      <h1>チケット新規作成</h1>
      <TicketForm onSubmit={handleSubmit} submitLabel="作成する" />
    </div>
  );
}
