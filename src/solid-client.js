// SolidApi admin client: query a user's balance by email.

export function extractBalance(payload, email) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.code !== undefined && Number(payload.code) !== 0) {
    throw new Error(String(payload.message || `balance request returned code ${payload.code}`));
  }

  const items = Array.isArray(payload?.data?.items) ? payload.data.items : [];
  if (!items.length) {
    return null;
  }

  const target = String(email || "").trim().toLowerCase();
  const matched = target
    ? items.find((item) => String(item?.email || "").trim().toLowerCase() === target)
    : null;
  const user = matched || items[0];

  return {
    email: String(user?.email || ""),
    balance: Number(user?.balance ?? 0),
    totalRecharged: Number(user?.total_recharged ?? 0),
    status: String(user?.status || ""),
  };
}

export class SolidClient {
  constructor(config) {
    this.config = config;
  }

  async getBalanceByEmail(email) {
    const target = String(email || "").trim();
    if (!target) {
      throw new Error("缺少邮箱参数");
    }
    if (!this.config.solidApiKey) {
      throw new Error("未配置 SOLID_API_KEY");
    }

    const url = new URL(`${this.config.solidApiBaseUrl}/admin/users`);
    url.searchParams.set("page", "1");
    url.searchParams.set("page_size", "50");
    url.searchParams.set("search", target);
    url.searchParams.set("include_subscriptions", "true");
    url.searchParams.set("sort_by", "id");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("timezone", "Asia/Shanghai");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": this.config.solidApiKey,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messageText =
        payload?.message ||
        payload?.error?.message ||
        payload?.detail ||
        `balance request failed with HTTP ${response.status}`;
      throw new Error(messageText);
    }

    return extractBalance(payload, target);
  }
}
