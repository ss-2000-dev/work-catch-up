import { useState } from "react";
import type { TicketInput, TicketStatus } from "../types/ticket";

type Props = {
  initialValues?: TicketInput;
  onSubmit: (input: TicketInput) => Promise<void>;
  submitLabel: string;
};

// 新規作成ページ・編集ページの両方から使う共通フォーム部品
export function TicketForm({ initialValues, onSubmit, submitLabel }: Props) {
  // 値の保持: 入力項目ごとにuseStateで持つ
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [assignee, setAssignee] = useState(initialValues?.assignee ?? "");
  const [status, setStatus] = useState<TicketStatus>(initialValues?.status ?? "todo");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ title, description, assignee, status });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          タイトル
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
      </div>
      <div>
        <label>
          詳細
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          担当者
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          ステータス
          <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}>
            <option value="todo">未着手</option>
            <option value="in_progress">対応中</option>
            <option value="done">完了</option>
          </select>
        </label>
      </div>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
