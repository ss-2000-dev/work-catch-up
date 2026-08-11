const BASE_URL = "http://localhost:4000";

// fetchの共通処理をここに集約する。呼び出し側は「何を送るか」だけ書けばいい。
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
  }

  // 204 No Content などボディが無いレスポンスに対応
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
