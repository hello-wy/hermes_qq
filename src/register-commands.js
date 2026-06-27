import { defineCommand, listHelp } from "./commands.js";

function formatModelList(models, activeModel, defaultModel) {
  const lines = [
    `当前模型: ${activeModel}`,
    `默认模型: ${defaultModel}`,
    "",
    "可用模型:",
  ];

  if (!models.length) {
    lines.push("- 当前 key 没有返回可用模型");
    return lines.join("\n");
  }

  for (const model of models) {
    const prefix = model === activeModel ? "* " : "- ";
    lines.push(`${prefix}${model}`);
  }
  return lines.join("\n");
}

let registered = false;

// Register all bot commands once. Handlers receive a ctx bundling the
// dependencies they need (reply, stores, clients, config, helpers).
export function registerCommands() {
  if (registered) {
    return;
  }
  registered = true;

  defineCommand(
    "ping",
    async ({ reply }) => {
      await reply("pong");
    },
    { help: "/ping - 连通性检查" },
  );

  defineCommand(
    "help",
    async ({ reply }) => {
      await reply(["可用命令:", ...listHelp()].join("\n"));
    },
    { help: "/help - 查看可用命令" },
  );

  defineCommand(
    "model",
    async ({ command, reply, stateStore, hermesClient, config, getActiveModel }) => {
      if (command.args.length === 0) {
        await reply(
          [
            `当前模型: ${getActiveModel()}`,
            `默认模型: ${config.hermesModel}`,
            "用法: /model list | /model <模型名> | /model reset",
          ].join("\n"),
        );
        return;
      }

      const subcommand = String(command.args[0] || "").trim().toLowerCase();
      if (["list", "ls", "all"].includes(subcommand)) {
        const models = await hermesClient.listModels();
        await reply(formatModelList(models, getActiveModel(), config.hermesModel));
        return;
      }

      if (["reset", "default"].includes(subcommand)) {
        await stateStore.clearSelectedModel();
        await reply(`已恢复默认模型: ${config.hermesModel}`);
        return;
      }

      const requestedModel = command.args.join(" ").trim();
      if (!requestedModel) {
        await reply("请提供模型名，例如: /model gpt-5.4-xhigh-fast-jailbreak");
        return;
      }

      const models = await hermesClient.listModels();
      if (models.length > 0 && !models.includes(requestedModel)) {
        await reply(
          [
            `当前 key 不支持模型: ${requestedModel}`,
            "先执行 /model list 查看可用模型。",
          ].join("\n"),
        );
        return;
      }

      await stateStore.setSelectedModel(requestedModel);
      await reply(`已切换模型: ${requestedModel}`);
    },
    { help: "/model [list|<模型名>|reset] - 查看或切换模型" },
  );

  defineCommand(
    "new",
    async ({ baseKey, stateStore, reply }) => {
      await stateStore.bumpSession(baseKey);
      await reply("已创建新会话。");
    },
    { aliases: ["reset"], help: "/new, /reset - 新建会话" },
  );

  defineCommand(
    "balance",
    async ({ command, route, reply, solidClient, config, isAdmin }) => {
      if (config.balanceAdminOnly && !isAdmin(route.userId)) {
        await reply("该命令仅管理员可用。");
        return;
      }

      const email = String(command.args[0] || "").trim();
      if (!email) {
        await reply("用法: /balance <邮箱>");
        return;
      }

      const result = await solidClient.getBalanceByEmail(email);
      if (!result) {
        await reply(`未找到用户: ${email}`);
        return;
      }

      await reply(
        [
          `邮箱: ${result.email}`,
          `余额: ${result.balance}`,
          `累计充值: ${result.totalRecharged}`,
          `状态: ${result.status || "未知"}`,
        ].join("\n"),
      );
    },
    { aliases: ["余额"], help: "/balance <邮箱> - 查询用户余额" },
  );
}
