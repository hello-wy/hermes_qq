import { EventEmitter } from "node:events";
import WebSocket from "ws";

export class OneBotClient extends EventEmitter {
  constructor({ wsUrl, accessToken }) {
    super();
    this.wsUrl = wsUrl;
    this.accessToken = accessToken;
    this.ws = null;
    this.selfId = "";
    this.pending = new Map();
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.closedManually = false;
  }

  connect() {
    this.closedManually = false;
    this.openSocket();
  }

  openSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const headers = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    this.ws = new WebSocket(this.wsUrl, { headers });

    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      this.emit("connect");
    });

    this.ws.on("message", (buffer) => {
      try {
        const payload = JSON.parse(buffer.toString());
        if (payload?.self_id && !this.selfId) {
          this.selfId = String(payload.self_id);
        }
        if (payload?.echo && this.pending.has(payload.echo)) {
          const { resolve, reject, timer } = this.pending.get(payload.echo);
          clearTimeout(timer);
          this.pending.delete(payload.echo);
          if (payload.status === "ok") {
            resolve(payload.data);
          } else {
            reject(new Error(payload.msg || "OneBot request failed"));
          }
          return;
        }
        if (payload?.post_type === "message") {
          this.emit("message", payload);
          return;
        }
        if (payload?.post_type === "request") {
          this.emit("request", payload);
          return;
        }
        if (payload?.post_type === "meta_event") {
          this.emit("meta_event", payload);
        }
      } catch (error) {
        this.emit("warn", `Failed to parse OneBot payload: ${String(error)}`);
      }
    });

    this.ws.on("close", () => {
      this.ws = null;
      this.emit("disconnect");
      this.rejectPending("OneBot socket closed");
      this.scheduleReconnect();
    });

    this.ws.on("error", (error) => {
      this.emit("warn", `OneBot socket error: ${String(error)}`);
    });
  }

  scheduleReconnect() {
    if (this.closedManually || this.reconnectTimer) {
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  rejectPending(message) {
    for (const [echo, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
      this.pending.delete(echo);
    }
  }

  async sendAction(action, params = {}, timeoutMs = 10000) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OneBot WebSocket is not connected");
    }

    const echo = Math.random().toString(36).slice(2);
    const payload = JSON.stringify({ action, params, echo });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(echo);
        reject(new Error(`OneBot action timed out: ${action}`));
      }, timeoutMs);

      this.pending.set(echo, { resolve, reject, timer });
      this.ws.send(payload, (error) => {
        if (!error) {
          return;
        }
        clearTimeout(timer);
        this.pending.delete(echo);
        reject(error);
      });
    });
  }

  async getLoginInfo() {
    const data = await this.sendAction("get_login_info", {}, 10000);
    if (data?.user_id) {
      this.selfId = String(data.user_id);
    }
    return data;
  }

  async getMsg(messageId) {
    return this.sendAction("get_msg", { message_id: messageId }, 10000);
  }

  async sendPrivateMsg(userId, message) {
    return this.sendAction("send_private_msg", { user_id: Number(userId), message }, 15000);
  }

  async sendGroupMsg(groupId, message) {
    return this.sendAction("send_group_msg", { group_id: Number(groupId), message }, 15000);
  }

  close() {
    this.closedManually = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectPending("OneBot client closed");
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}
