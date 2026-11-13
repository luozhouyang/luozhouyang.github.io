---
title: 'Kong Gateway'
description: 'Kong 的核心模型、插件执行阶段，以及我在本地调试网关时常用的几条命令。'
date: 2024-07-18
tags: ['Kong', 'API Gateway']
---

Kong 的好用之处，在于它把网关拆成了几个非常稳定的抽象：**Service** 描述上游，**Route** 描述匹配规则，**Plugin** 描述在请求链路上插入的行为。把这三层关系理顺，大部分配置就不会乱。

## Service 与 Route

Service 是上游服务的逻辑名称，保存 `host`、`port`、`protocol` 和超时等连接信息。Route 则负责“什么样的请求应该进入这个 Service”，可以按 path、host、method、header 匹配。

一个 Service 可以挂多条 Route。例如同一个后端同时暴露 `/api` 和 `/internal`，前者加鉴权，后者只允许内网访问，就不需要复制两份上游配置。

## 插件执行阶段

Kong 的插件不是简单的中间件队列，而是有明确的执行阶段：

- `certificate`：TLS 握手阶段
- `rewrite`：修改请求路径或头部
- `access`：鉴权、限流、路由前的决策
- `response`：在响应返回客户端前处理
- `log`：记录日志和指标

理解阶段比记住插件名字更重要。比如鉴权插件放在 `access`，日志插件放在 `log`，这样请求被拒绝时也能留下记录。

## 本地常用命令

```bash
# 启动一个最简单的 Kong + Postgres
docker compose up -d

# 检查配置是否生效
curl -i http://localhost:8001/services

# 给 service 挂一个 key-auth 插件
curl -X POST http://localhost:8001/services/example/plugins \
  -d name=key-auth
```

调试网关时，我通常会先确认 Route 是否命中，再看插件执行顺序，最后才怀疑上游。Kong 的 Admin API 和日志足够把这三步拆开。

## 一点经验

不要把 Kong 当成“万能业务层”。它适合做认证、限流、路由、可观测性这类横切关注点；复杂业务编排应该留在服务内部。网关越薄，故障面越小。
