# システム開発フェーズ 具体例: TaskFlow

> チーム向けタスク管理SaaS。プロジェクトごとにタスクを作成・アサイン・ステータス管理し、
> メンバーへの通知やダッシュボードで進捗を把握できる。

**技術スタック**

| レイヤー | 技術 |
|---|---|
| フロントエンド | React (Vite) + TypeScript |
| バックエンド | Node.js + Express + TypeScript + InversifyJS |
| インフラ | AWS (ECS Fargate / RDS Aurora / S3 / CloudFront / Cognito) |
| CI/CD | GitHub Actions |

---

## 1. プロジェクト計画

### 目的・スコープ

- **作るもの:** タスク管理SaaS（MVP）
- **作らないもの:** ガントチャート、タイムトラッキング、課金機能（フェーズ2以降）
- **ターゲット:** 5〜50名規模のソフトウェア開発チーム

### スケジュール（例）

| マイルストーン | 期間 |
|---|---|
| 要求・要件定義 | 2週間 |
| 設計 | 2週間 |
| 実装 | 6週間 |
| テスト | 2週間 |
| リリース準備・UAT | 1週間 |

### 技術選定の理由

| 技術 | 理由 |
|---|---|
| ECS Fargate | サーバー管理不要、スケールアウト容易 |
| Aurora PostgreSQL | RDSより高可用性、PostgreSQL互換 |
| Cognito | 認証基盤を自前実装せず済む（MFA・ソーシャルログイン対応） |
| InversifyJS | TypeScriptとの親和性が高く、テスト時にモックへの差し替えが容易 |
| Vite + React | ビルド高速、エコシステムが成熟 |

---

## 2. 要求

> 誰が何に困っているかをユーザー視点で整理する。システムの話はまだしない。

### 背景・課題

- Slack のスレッドでタスクの進捗を管理しているが、どこに何が書いてあるか分からなくなる
- スプレッドシートで管理しているチームもあるが、更新が属人化して最新状態が不明になる
- 誰がどのタスクを担当していて、いつ終わるかを一目で把握したい

### 要求一覧（ユーザーが求めていること）

| # | 要求 |
|---|------|
| R-1 | タスクを一覧で見て、誰が何をやっているか把握したい |
| R-2 | タスクをアサインして、担当者に通知したい |
| R-3 | タスクのステータスを更新して、チームに共有したい |
| R-4 | プロジェクトごとにタスクをまとめて管理したい |
| R-5 | 自分に関係のあるタスクだけを絞り込んで見たい |

### ユースケース

**主シナリオ（毎日の使い方）**
1. ダッシュボードを開き、自分にアサインされたタスクを確認する
2. タスクの作業を終えたらステータスを「完了」に変更する
3. 新しいタスクを作成し、チームメンバーにアサインする

**副シナリオ**
- プロジェクトのフィルターを使って特定プロジェクトのタスクだけ表示する
- タスクにコメントを残して経緯をメモする

**例外シナリオ**
- セッションが切れた状態で操作すると、ログイン画面にリダイレクトされる
- 権限のないプロジェクトのタスクにアクセスしようとすると 403 が返る

---

## 3. 要件

> 要求を受けて「システムが何をすべきか」を技術的に具体化する。

### 機能要件

| # | 要件 | 対応要求 |
|---|------|---------|
| F-1 | ユーザーはメールアドレスとパスワードでサインアップ・ログインできる | R-1〜5 |
| F-2 | プロジェクトを作成・編集・削除できる | R-4 |
| F-3 | プロジェクトにメンバーを招待できる | R-2 |
| F-4 | タスクを作成・編集・削除できる（タイトル・説明・担当者・期日・ステータス） | R-1, R-3 |
| F-5 | タスクのステータスは `TODO / IN_PROGRESS / DONE` の3種 | R-3 |
| F-6 | タスクをアサインしたとき、担当者にメール通知を送る | R-2 |
| F-7 | 自分にアサインされたタスクでフィルタリングできる | R-5 |
| F-8 | タスク一覧をステータス・期日・担当者でソートできる | R-1 |

### 非機能要件

| # | 要件 | 理由 |
|---|------|------|
| NF-1 | API のレスポンスタイムは p99 で 500ms 以下 | UX |
| NF-2 | 月間稼働率 99.9% 以上（ダウンタイム約 8.7h/年以内） | SLA |
| NF-3 | パスワードは bcrypt でハッシュ化して保存する | セキュリティ |
| NF-4 | API は JWT 認証（Cognito 発行）で保護する | セキュリティ |
| NF-5 | 他テナントのデータに絶対アクセスできない（テナント分離） | セキュリティ |
| NF-6 | 個人情報（メールアドレス等）は暗号化して保存する | コンプライアンス |
| NF-7 | デプロイはゼロダウンタイムで行う | 可用性 |

---

## 4. 基本設計

> どんなコンポーネントに分けて、どう連携させるかを決める。

### AWSアーキテクチャ

```
[ユーザーのブラウザ]
        │ HTTPS
        ▼
[CloudFront] ──→ [S3] (React静的ファイル)
        │ /api/*
        ▼
[ALB (Application Load Balancer)]
        │
        ▼
[ECS Fargate] (Expressサーバー × 2タスク以上)
   │         │
   │         └─→ [ElastiCache Redis] (セッションキャッシュ・レート制限)
   │
   ├─→ [RDS Aurora PostgreSQL] (マスター)
   │         └─→ [RDS Aurora PostgreSQL] (リードレプリカ)
   │
   ├─→ [Cognito] (JWT検証・ユーザー管理)
   │
   └─→ [SES] (メール通知送信)

[ECR] (Dockerイメージ保管)
[CloudWatch] (ログ・メトリクス・アラート)
[Secrets Manager] (DB接続情報・APIキー)
```

### バックエンドのレイヤー構成

```
src/
├── container.ts          # InversifyJS コンテナ定義
├── types.ts              # DIトークン定義
├── controllers/          # HTTPリクエストの受け口
│    └── TaskController.ts
├── services/             # ビジネスロジック（DIで注入）
│    └── TaskService.ts
├── repositories/         # DBアクセス（DIで注入）
│    └── TaskRepository.ts
├── middlewares/          # 認証・バリデーション・エラーハンドリング
├── entities/             # DBエンティティ（TypeORM）
└── errors/               # カスタムエラークラス
```

### データの流れ（タスク作成）

```
React (POST /api/tasks)
    ↓ JWT付きリクエスト
ALB
    ↓
Express (authMiddleware → validateMiddleware)
    ↓ DIコンテナからTaskController取得
TaskController.create()
    ↓ TaskServiceを呼ぶ
TaskService.create()
    ↓ TaskRepositoryを呼ぶ
TaskRepository.save()
    ↓ SQL INSERT
Aurora PostgreSQL
    ↓ 保存成功
TaskService → SES通知送信（アサイン先への通知）
    ↓
201レスポンス（作成したTaskオブジェクト）
    ↓
React (UIを更新)
```

---

## 5. 詳細設計

> 各コンポーネントの中身（型・関数・アルゴリズム）を具体的に設計する。

### データ型定義

```ts
// タスクのステータス
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

// タスクエンティティ
export interface Task {
  id: string;           // UUID
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  dueDate: Date | null;
  createdBy: string;    // userId
  createdAt: Date;
  updatedAt: Date;
}

// タスク作成リクエスト
export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;     // ISO 8601
}

// タスク一覧取得のフィルター
export interface TaskFilter {
  projectId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  sortBy?: 'dueDate' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

### DIコンテナ設定（InversifyJS）

```ts
// types.ts - DIトークン
export const TYPES = {
  TaskService: Symbol.for('TaskService'),
  TaskRepository: Symbol.for('TaskRepository'),
  NotificationService: Symbol.for('NotificationService'),
  Database: Symbol.for('Database'),
};

// container.ts
import { Container } from 'inversify';
import { TYPES } from './types';
import { TaskService } from './services/TaskService';
import { TaskRepository } from './repositories/TaskRepository';
import { SesNotificationService } from './services/SesNotificationService';

const container = new Container();
container.bind(TYPES.TaskService).to(TaskService).inSingletonScope();
container.bind(TYPES.TaskRepository).to(TaskRepository).inSingletonScope();
container.bind(TYPES.NotificationService).to(SesNotificationService).inSingletonScope();

export { container };
```

### サービスの責務（TaskService）

```ts
@injectable()
export class TaskService {
  constructor(
    @inject(TYPES.TaskRepository) private taskRepo: ITaskRepository,
    @inject(TYPES.NotificationService) private notify: INotificationService,
  ) {}

  // タスク作成：DB保存 → アサイン先への通知送信
  async create(input: CreateTaskInput, createdBy: string): Promise<Task>

  // タスク一覧：フィルター・ソート適用
  async list(filter: TaskFilter, requesterId: string): Promise<Task[]>

  // ステータス更新：変更前後を比較してログ出力
  async updateStatus(id: string, status: TaskStatus, requesterId: string): Promise<Task>

  // 削除：自分が作成したタスクか、プロジェクトオーナーのみ許可
  async delete(id: string, requesterId: string): Promise<void>
}
```

### リポジトリの責務（TaskRepository）

```ts
@injectable()
export class TaskRepository implements ITaskRepository {
  // IDで1件取得、存在しない場合は NotFoundError をスロー
  async findById(id: string): Promise<Task>

  // フィルター条件でSQLを動的に組み立てて取得
  async findAll(filter: TaskFilter): Promise<Task[]>

  // INSERT して生成されたタスクを返す
  async save(input: CreateTaskInput, createdBy: string): Promise<Task>

  // UPDATE して更新後のタスクを返す
  async update(id: string, data: Partial<Task>): Promise<Task>

  // DELETE
  async delete(id: string): Promise<void>
}
```

---

## 6. エラーハンドリング設計

### カスタムエラークラス

```ts
// 基底クラス
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor() {
    super(403, 'Access denied', 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}
```

### エラーの種別と対応方針

| エラー種別 | 対応 | 例 |
|---|---|---|
| バリデーションエラー | 400レスポンス、処理停止 | タイトルが空、期日のフォーマット不正 |
| 認証エラー | 401レスポンス、処理停止 | JWTの期限切れ・改ざん |
| 権限エラー | 403レスポンス、処理停止 | 他テナントのリソースへのアクセス |
| リソース未存在 | 404レスポンス、処理停止 | 存在しないタスクIDへの操作 |
| DB接続エラー | 503レスポンス、リトライ（最大3回） | Aurora のフェイルオーバー中 |
| 外部サービスエラー | ログ記録のみ、処理は継続 | SESのメール送信失敗（通知は失敗しても本処理は成功扱い） |
| 予期しない例外 | 500レスポンス、アラート発報 | 未処理の例外 |

### グローバルエラーハンドラー

```ts
// middlewares/errorHandler.ts
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, path: req.path }, err.message);
    return res.status(err.statusCode).json({ code: err.code, message: err.message });
  }

  // 予期しないエラーはアラート対象
  logger.error({ err, path: req.path }, 'Unexpected error');
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
};
```

---

## 7. ログ設計

### ログレベルの定義

| レベル | 用途 | 例 |
|---|---|---|
| `DEBUG` | 開発時の詳細トレース（本番では出力しない） | SQL クエリの内容 |
| `INFO` | 通常の業務イベント | タスク作成、ステータス更新 |
| `WARN` | 問題になりうるが処理は継続できる | 通知メール送信失敗、バリデーションエラー |
| `ERROR` | 処理が失敗した | DB接続エラー、未処理の例外 |

### ログの形式（構造化ログ）

```json
{
  "level": "info",
  "time": "2026-05-12T10:00:00.000Z",
  "requestId": "abc-123",
  "userId": "usr_xyz",
  "action": "task.create",
  "taskId": "tsk_456",
  "projectId": "prj_789",
  "msg": "Task created"
}
```

### 出力する情報・しない情報

| 出力する | 出力しない |
|---|---|
| リクエストID・ユーザーID・リソースID | パスワード・JWTトークン本体 |
| 操作内容（action） | メールアドレス（WARN/ERROR以外） |
| 処理時間（ms） | リクエストボディの全内容 |
| エラーのスタックトレース（ERRORのみ） | |

---

## 8. 環境設計

| 環境 | 用途 | DBデータ | デプロイトリガー |
|---|---|---|---|
| **development** | 開発者ローカル（Docker Compose） | ダミーデータ | 手動 |
| **staging** | 結合テスト・UAT | 本番の匿名化コピー | `main` ブランチへのマージ |
| **production** | 本番 | 本番データ | タグ打ち（`v*.*.*`）後に手動承認 |

### 環境ごとの設定管理

- 機密情報（DB接続情報・APIキー）は **AWS Secrets Manager** で管理
- 環境変数は ECS タスク定義で注入（コードに直書きしない）
- `NODE_ENV` で環境を判別し、ログレベル・デバッグ設定を切り替える

---

## 9. テスト

### 単体テスト（Jest + Inversify テストコンテナ）

DIコンテナでモックに差し替えて、各サービス単体をテストする。

```ts
describe('TaskService', () => {
  let taskService: TaskService;
  let mockTaskRepo: jest.Mocked<ITaskRepository>;
  let mockNotify: jest.Mocked<INotificationService>;

  beforeEach(() => {
    mockTaskRepo = { findById: jest.fn(), save: jest.fn(), ... };
    mockNotify = { send: jest.fn() };

    const container = new Container();
    container.bind(TYPES.TaskRepository).toConstantValue(mockTaskRepo);
    container.bind(TYPES.NotificationService).toConstantValue(mockNotify);
    container.bind(TYPES.TaskService).to(TaskService);

    taskService = container.get(TYPES.TaskService);
  });

  it('タスク作成後にアサイン先へ通知が送られること', async () => {
    mockTaskRepo.save.mockResolvedValue({ id: 'tsk_1', assigneeId: 'usr_2', ... });
    await taskService.create({ title: 'テスト', assigneeId: 'usr_2', ... }, 'usr_1');
    expect(mockNotify.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'usr_2' }));
  });
});
```

### 結合テスト

- テスト用 Aurora（またはローカルの PostgreSQL）に実際に接続してAPIをテスト
- **Supertest** でエンドポイントを叩き、レスポンスのステータスコード・ボディを検証
- CI でテスト用DBコンテナ（`docker-compose.test.yml`）を起動してから実行

### 受け入れテスト（UAT）

| # | シナリオ | 確認者 | 期待結果 |
|---|---------|-------|---------|
| U-1 | 新規ユーザーがサインアップしてプロジェクトを作成できる | PO | プロジェクト一覧に表示される |
| U-2 | タスクをアサインしたとき担当者にメールが届く | PO | メール受信を確認 |
| U-3 | 別テナントのタスクにアクセスしようとすると弾かれる | セキュリティ担当 | 403が返る |
| U-4 | ステータスを更新するとリアルタイムで他のメンバーに反映される | PO | 別ブラウザで確認 |

### パフォーマンステスト（k6）

```js
// 同時100ユーザーでタスク一覧を30秒間叩き続ける
export const options = {
  vus: 100,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(99)<500'],  // NF-1の検証
    http_req_failed: ['rate<0.01'],
  },
};
```

---

## 10. CI/CD（GitHub Actions）

```
[PRを作成]
    │
    ▼
① lint + type-check（ESLint + tsc --noEmit）
    │
    ▼
② 単体テスト（Jest）
    │
    ▼
③ 結合テスト（DBコンテナ起動 → Supertest）
    │
    ▼
④ Dockerイメージビルド → ECRにプッシュ
    │
[mainにマージ]
    │
    ▼
⑤ staging へ自動デプロイ（ECS ローリングアップデート）
    │
[タグ打ち v*.*.*]
    │
    ▼
⑥ 手動承認（GitHub Environments）
    │
    ▼
⑦ production へデプロイ（ECS Blue/Greenデプロイ）
```

**Blue/Greenデプロイの流れ（ゼロダウンタイム）**

1. 新バージョンのタスクを Green として起動
2. ALBのヘルスチェックが通ったら、トラフィックを Green に切り替え
3. 旧バージョン（Blue）を数分後に停止
4. 問題があれば ALB のターゲットグループを Blue に戻す（ロールバック）

---

## 11. リリース・移行計画

### 初回リリース手順

1. staging で UAT 完了を確認
2. production の DB に マイグレーション適用（`typeorm migration:run`）
3. タグ打ち → GitHub Actions の手動承認 → デプロイ
4. ALB のヘルスチェックで全タスクが正常起動したことを確認
5. 動作確認（スモークテスト）

### ロールバック手順

| 問題 | 手順 |
|---|---|
| デプロイ後にエラーレートが上昇 | ECS サービスを前のタスク定義のリビジョンに戻す |
| DBマイグレーションを元に戻す必要がある | `typeorm migration:revert` を実行（逆順でロールバック） |

### マイグレーション方針

- カラム追加は `nullable` または `DEFAULT` 付きで行い、アプリ側の対応と分離する
- カラム削除は 2リリースに分ける（① アプリでの参照をやめる → ② カラム削除）

---

## 12. 運用

### 定期作業

| タイミング | 作業 |
|---|---|
| 毎日 | CloudWatch のエラーログを確認 |
| 毎月 | Aurora の空き容量・コネクション数を確認 |
| 四半期 | 依存パッケージの脆弱性チェック（`npm audit`）・更新 |

### 監視・アラート（CloudWatch）

| メトリクス | しきい値 | アラート先 |
|---|---|---|
| ECS タスクの CPU 使用率 | 80% 以上が5分継続 | Slack #alerts |
| ALB の 5xx エラーレート | 1% 以上 | Slack #alerts + PagerDuty |
| RDS の接続数 | 最大接続数の 80% 以上 | Slack #alerts |
| API レスポンスタイム p99 | 500ms 超過 | Slack #alerts |

### 障害対応フロー

```
アラート発報
    │
    ▼
CloudWatch Logs でエラーを確認（requestId でフィルタ）
    │
    ├─ アプリのバグ → 修正PRを作成 → 緊急リリース
    ├─ DBの問題 → Aurora フェイルオーバー確認・接続プール設定見直し
    └─ 外部サービス障害 → SES/Cognitoのステータスページ確認・縮退運転
```

### 変更管理

- カテゴリルール・通知テンプレートを変更する場合はコードレビュー必須
- 変更内容を `CHANGELOG.md` に記録する（Keep a Changelog 形式）

---

## 13. セキュリティレビュー観点

| 観点 | 対応 |
|---|---|
| **認証** | Cognito の JWT を全 API エンドポイントで検証する |
| **テナント分離** | すべての DB クエリに `WHERE tenant_id = :tenantId` を必ず付与する |
| **OWASP Top 10** | SQLインジェクション対策（TypeORMのパラメータバインド）、XSS対策（React のエスケープ）、CSRF対策（SameSite Cookie） |
| **シークレット管理** | 認証情報は Secrets Manager から取得し、ログに出力しない |
| **通信の暗号化** | ALB〜ECS 間も HTTPS（VPC 内でも TLS） |
| **最小権限の原則** | ECS タスクの IAM ロールは必要な権限のみ付与（例: SES の送信のみ） |
| **依存パッケージ** | `npm audit` を CI に組み込み、High 以上の脆弱性があればビルドを失敗させる |

---

## 14. データ設計（DB）

### テーブル定義（主要テーブル）

```sql
-- テナント
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユーザー（Cognito の sub と紐付け）
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  cognito_sub VARCHAR(255) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL,  -- 暗号化して保存
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- プロジェクト
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(255) NOT NULL,
  owner_id    UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- タスク
CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  project_id   UUID NOT NULL REFERENCES projects(id),
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'TODO',
  assignee_id  UUID REFERENCES users(id),
  due_date     DATE,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### インデックス方針

```sql
-- タスク一覧の主要なクエリパターンに対応
CREATE INDEX idx_tasks_tenant_project ON tasks(tenant_id, project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
```

### バックアップ方針

| 種別 | 設定 | 保持期間 |
|---|---|---|
| 自動バックアップ（Aurora） | 毎日 午前3時（JST） | 7日間 |
| スナップショット（手動） | リリース前に取得 | 無期限（手動削除まで） |
| ポイントインタイムリカバリ | Aurora 標準機能で有効 | 5分前まで復元可能 |
