export type TicketStatus = "todo" | "in_progress" | "done";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  assignee: string;
  createdAt: string;
};

// 新規作成・更新のときは id / createdAt をサーバー側で決めるので除外した型を使う
export type TicketInput = Omit<Ticket, "id" | "createdAt">;
