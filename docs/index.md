# Hermes QQ 文档中心

> Hermes Agent 的 QQ / OneBot v11 桥接文档主页。

## 快速入口

- [论坛讨论区](https://aiya.de5.net/c/hermes-qq/29)
- [论坛文档入口帖](https://aiya.de5.net/t/topic/168)
- [3 分钟快速开始](./quickstart.md)
- [配置参考（分组版）](./config-reference.md)
- [2026-04-15 初始版本说明](./2026-04-15-initial-release.md)
- [高级说明](./advanced.md)
- [NapCat 部署指引](../deploy/napcat/README.md)

## 文档目标

本项目文档按“先跑通，再收敛权限，最后做进阶优化”的顺序组织：

1. 先让 NapCat 与 Hermes 成功接通。
2. 再收紧群白名单、管理员限制、关键词唤醒策略。
3. 最后再调整输出风格、分段阈值和会话策略。

## 推荐阅读顺序

1. [快速开始](./quickstart.md)
2. [配置参考](./config-reference.md)
3. [初始版本说明](./2026-04-15-initial-release.md)
4. [高级说明](./advanced.md)
5. [NapCat 部署](../deploy/napcat/README.md)

## 设计原则

- 不侵入 Hermes core
- 不侵入 NapCat 登录流程
- 尽量保持配置简单
- 默认输出偏 QQ 纯文本，而不是富 Markdown
