# 开发方案：§10 团队事件类型查询 + §12 staff 后台团队自动化管理 API

> 本文档是 [vehicle-delivery-booking.md](./vehicle-delivery-booking.md) 中 §10 / §12 两项"需要开发"条目的落地方案，供后续实现时参考，不是需求文档本身。
> 结论全部基于对当前分支代码的实际检查（而非推测），检查方式和文件路径见各节。
> 最后更新：2026-08-13

## 0. 结论先行

- `apps/api/v2` 是全仓库唯一产出 OpenAPI 文档的服务（`docs/api-reference/v2/openapi.json`），`apps/api/` 下也只有这一个子应用，没有 v1。§10/§12 只能加在这里，没有第二个选项。
- §10、§12 目前**都还没有开发**——`apps/api/v2/src/modules/teams/` 和 `.../memberships/` 下只有 Repository/Service，没有任何 `*.controller.ts`，也没有 `teams.module.ts` 把它们接起来。跟 main 分支比对（`git log main..HEAD -- apps/api/v2/src/modules/teams`）也没有相关提交。
- 好消息：不少"看起来要写"的东西其实已经是**孤立但现成**的代码（从未被删干净、只是没接上），可以直接复用，见 §2。
- 建议拆成两个独立 PR，见 §3（§10）和 §4（§12 子集）。

## 1. 涉及的现有代码盘点

| 层 | 文件 | 现状 |
|---|---|---|
| Team CRUD | `apps/api/v2/src/modules/teams/teams/teams.repository.ts` | `create/getById/getByIds/update/delete/getTeamsUserIsMemberOf/findTeamBySlug` 全部已实现 |
| 团队事件类型 | `apps/api/v2/src/modules/teams/event-types/services/teams-event-types.service.ts` | `createTeamEventType` / `getTeamEventTypeBySlug` / `getTeamEventTypes` / `deleteTeamEventType` 全部已实现 |
| 团队事件类型 Repository | `apps/api/v2/src/modules/teams/event-types/teams-event-types.repository.ts` | `getTeamEventTypeBySlug(teamId, eventTypeSlug, hostsLimit?)` 已存在，直接对应 §10 的查询需求 |
| 团队事件类型查询 DTO | `packages/platform/types/event-types/event-types_2024_06_14/inputs/get-event-types-query.input.ts` | `GetTeamEventTypesQuery_2024_06_14`（`eventSlug` / `hostsLimit` / `sortCreatedAt`）已存在，**没有被任何 controller 引用**，是孤立代码 |
| 成员管理 | `apps/api/v2/src/modules/memberships/memberships.repository.ts` | 只有 `createMembership` / 查询类方法；**没有 delete、没有改角色**的方法（不只是 controller 缺，Repository 本身就没有） |
| 团队事件类型 Webhook | `apps/api/v2/src/modules/webhooks/services/team-event-type-webhooks.service.ts` | `createTeamEventTypeWebhook(eventTypeId, body)`——注意这是**按事件类型**订阅，不是按团队；`Webhook` 表本身有独立的 `teamId` 字段（`packages/prisma/schema.prisma:1159`），但 `WebhooksRepository` 里没有 `createTeamWebhook(teamId, ...)` 这个方法 |
| 团队 Webhook 输出 DTO | `apps/api/v2/src/modules/webhooks/outputs/team-webhook.output.ts` | `TeamWebhookOutputDto` / `TeamWebhookOutputResponseDto` 已经写好且带 `teamId` 字段，**同样是孤立代码**，没有任何 controller 引用它 |
| 鉴权：API Key | `apps/api/v2/src/modules/auth/guards/api-auth/api-auth.guard.ts` | 现成，全仓库通用，`ApiKey.teamId` 字段已支持把 key 锁定到某个团队 |
| 鉴权：团队角色 | `apps/api/v2/src/modules/auth/guards/roles/roles.guard.ts` + `@Roles()` 装饰器 | **完整实现**了 org/team 两级角色校验（含 org 角色覆盖 team 角色的场景），走 `MembershipsRepository.findMembershipByTeamId`，Redis 缓存 5 分钟。⚠️ 全仓库搜索 `@Roles(` **零命中**——这套机制目前没有被任何 controller 使用过，是完全未经生产验证的代码，见 §5 |
| 团队级细粒度权限 | `packages/features/teams/services/TeamPermissionSettingService.ts`（`TeamPermissionSetting` 表） | 这是 §8 提到的、目前给 tRPC/网页端用的细粒度权限系统（BOOKING_CANCEL 等 11 项）。**没有任何路径接入 `apps/api/v2`**，引入它需要跨包依赖 `packages/features`，成本远高于直接用上面那套现成的 `RolesGuard`（OWNER/ADMIN/MEMBER 三级）。本方案不使用它，见 §5 的取舍说明 |
| 半公开的单事件类型查询 | `apps/api/v2/src/modules/atoms/controllers/atoms.event-types.controller.ts` (`GET /event-types/:eventSlug/public`) | 标了 `@DocsExcludeController(true)`，是给内嵌组件用的内部端点，不适合直接复用为 §10 的公开 API，但可以作为 controller 写法的参考 |

## 2. §10：`GET /v2/teams/{teamId}/event-types`

### 目标

staff 后台传团队 ID + `eventSlug`，拿到对应的 `eventTypeId`（以及基本信息），不需要硬编码数字 ID。

### 接口

```
GET /v2/teams/{teamId}/event-types?eventSlug={slug}&hostsLimit={n}
```

- 复用现成的 `GetTeamEventTypesQuery_2024_06_14`（`eventSlug` 可选——不传则返回团队下全部事件类型列表，传了则按 slug 精确查一个）
- `hostsLimit` 已经支持，staff 后台如果只是要拿 `eventTypeId`，**建议调用时传 `hostsLimit=0`**，避免把 host 列表（含成员基本信息）一起带出来——这属于"按需 select"的范畴，不需要额外开发，是现成参数

### 需要新增的文件

| 文件 | 内容 |
|---|---|
| `apps/api/v2/src/modules/teams/teams.module.ts`（新建，当前不存在） | 声明 `TeamsRepository` / `TeamsEventTypesRepository` / `TeamsEventTypesService` / `MembershipsRepository`（`RolesGuard` 依赖）为 provider，注册新 controller，`exports` 供其他模块复用（现在好几个模块各自重复声明这几个 provider，见 §1 表，新建这个 module 后可以逐步收敛，但**不在本次范围内**，本次只新增不重构） |
| `apps/api/v2/src/modules/teams/controllers/teams-event-types.controller.ts`（新建） | `GET /v2/teams/:teamId/event-types`，`@UseGuards(ApiAuthGuard, RolesGuard)` + `@Roles("TEAM_MEMBER")`（最低成员即可读，不需要 ADMIN），逻辑上完全参照 [webhooks.controller.ts](../../apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts) 的薄 controller 写法：解析 query → 有 `eventSlug` 调 `teamsEventTypesService.getTeamEventTypeBySlug`，没有则调 `getTeamEventTypes` → 用现成的 `output-team-event-types.service.ts` / `output-team-event-types-response.pipe.ts` 包装返回 |
| `apps/api/v2/src/modules/endpoints.module.ts`（修改） | 加一行 `TeamsModule` import |

### 不需要新增

- Service/Repository 层：零新增，`getTeamEventTypeBySlug` / `getTeamEventTypes` 已完整
- 输出 DTO：复用现成的 `DatabaseTeamEventType` + `OutputTeamEventTypesService`
- 鉴权：`ApiAuthGuard` + `RolesGuard` 全部现成

### 预估规模

1 个 controller 文件 + 1 个 module 文件 + 1 处已有文件的一行改动，符合"小 PR"要求，是本方案里最小的一块，建议第一个做。

## 3. §12：staff 后台团队自动化管理 API（首批子集）

### 3.1 范围取舍

原始需求原话是"建团队（如临时小组）或复用已有团队、加减成员、建事件类型、配 webhook"，**没有明确要求**改团队信息、删团队、改成员角色。§7.2 列出的完整 CRUD 表面比实际需求宽，按"不做投机性开发"的原则，首批只做需求原话明确提到的动作，其余留到 staff 后台真正提出再补：

| 端点 | 是否本次实现 | 原因 |
|---|---|---|
| `POST /v2/teams` | ✅ | 需求明确要"建团队" |
| `GET /v2/teams` / `GET /v2/teams/{teamId}` | ✅ | "复用已有团队"的前提是能查到，`getTeamsUserIsMemberOf`/`getById` 已现成 |
| `PATCH /v2/teams/{teamId}` | ❌ 暂缓 | 需求没提"改团队信息" |
| `DELETE /v2/teams/{teamId}` | ❌ 暂缓 | 需求提到"临时小组用完可清理"，但不是首批必须，且删除是不可逆操作，建议单独一个 PR、单独测试 |
| `POST /v2/teams/{teamId}/memberships` | ✅ | 需求明确要"加成员" |
| `DELETE /v2/teams/{teamId}/memberships/{userId}` | ✅ | 需求明确要"减成员"；**注意 `MembershipsRepository` 里连底层方法都没有，不只是缺 controller**，见 §3.2 |
| `PATCH /v2/teams/{teamId}/memberships/{userId}`（改角色） | ❌ 暂缓 | 需求没提"改角色"，且同样是 Repository 层都没有的新功能，成本和"减成员"接近，等真正需要时再一起做 |
| `POST /v2/teams/{teamId}/event-types` | ✅ | 需求明确要"建事件类型"，`createTeamEventType` 已现成 |
| `POST /v2/teams/{teamId}/webhooks` | ✅ | 需求明确要"配 webhook" |

### 3.2 各端点具体实现

**`POST /v2/teams`**
- 调用现成 `TeamsRepository.create()`
- 创建后用 `MembershipsRepository.createMembership(teamId, callerUserId, "OWNER", true)` 把调用者（"门店管理账号"这个 user）设为 owner——这一步目前没有任何地方做，需要在新 Service 方法里手动编排（属于业务逻辑，按仓库规范放 Service 层，不放 controller 也不放 Repository）
- 鉴权：仅 `ApiAuthGuard`，此时团队还不存在，没有 `RolesGuard` 可用

**`GET /v2/teams`、`GET /v2/teams/{teamId}`**
- 复用 `getTeamsUserIsMemberOf(callerUserId)` / `getById(teamId)`
- 鉴权：`GET /v2/teams/{teamId}` 加 `RolesGuard` + `@Roles("TEAM_MEMBER")`

**`POST /v2/teams/{teamId}/memberships`**
- 复用 `MembershipsRepository.createMembership(teamId, userId, role, accepted)`
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`（加成员至少要 admin，跟网页端权限模型一致）

**`DELETE /v2/teams/{teamId}/memberships/{userId}`**
- **需要新增** `MembershipsRepository.deleteMembership(teamId, userId)`（全仓库搜索 `prisma.membership.delete` 零命中，之前完全没有这个能力，不是"补 controller"这么简单）
- 顺带需要处理：删除成员后，该成员在这个团队下持有的 host 记录要不要一并清理——`TeamsEventTypesRepository.removeUserFromTeamEventTypesHosts(userId, teamId)` 已经现成，Service 层编排时应该调用它，否则会留下指向已移除成员的僵尸 host 记录
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`

**`POST /v2/teams/{teamId}/event-types`**
- 直接复用 `TeamsEventTypesService.createTeamEventType(user, teamId, body)`，输入 DTO 复用 API v2 已有的团队事件类型创建 DTO（`packages/platform/types/event-types` 下已有 create 输入类型，具体到实现时确认字段是否需要裁剪）
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`

**`POST /v2/teams/{teamId}/webhooks`**
- **需要新增** `WebhooksRepository.createTeamWebhook(teamId, data)`，照抄 `createEventTypeWebhook` 的写法（`Webhook.teamId` 字段本身已存在，Prisma 层不需要改 schema）
- **需要新增**一个 Service 方法（建议叫 `TeamWebhooksService.createTeamWebhook`，跟现有 `TeamEventTypeWebhooksService` 区分开，因为一个是团队维度、一个是事件类型维度，两者不是一回事，命名上要避免混淆），内部调用 `validateWebhookUrl` + 查重（照抄 `TeamEventTypeWebhooksService.createTeamEventTypeWebhook` 的校验逻辑，把 `getEventTypeWebhookByUrl` 换成一个新的按 teamId 查重的方法）
- 输出：直接复用现成但目前孤立的 `TeamWebhookOutputDto` / `TeamWebhookOutputResponseDto`（`apps/api/v2/src/modules/webhooks/outputs/team-webhook.output.ts`），不需要新写
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`

### 3.3 新增文件清单

| 文件 | 类型 |
|---|---|
| `apps/api/v2/src/modules/teams/controllers/teams.controller.ts` | 新建（create/list/get team） |
| `apps/api/v2/src/modules/teams/controllers/team-memberships.controller.ts` | 新建（add/remove member） |
| `apps/api/v2/src/modules/teams/services/teams-management.service.ts` | 新建（create team + 自动加 owner membership 的编排逻辑） |
| `apps/api/v2/src/modules/memberships/memberships.repository.ts` | 修改，加 `deleteMembership` |
| `apps/api/v2/src/modules/webhooks/webhooks.repository.ts` | 修改，加 `createTeamWebhook` + 按 teamId 查重方法 |
| `apps/api/v2/src/modules/webhooks/services/team-webhooks.service.ts` | 新建 |
| `apps/api/v2/src/modules/webhooks/controllers/team-webhooks.controller.ts` | 新建 |
| `apps/api/v2/src/modules/teams/controllers/team-event-types.controller.ts` | 新建（建团队事件类型；跟 §10 的 GET 可以是同一个 controller 文件，减少文件数） |
| `apps/api/v2/src/modules/teams/teams.module.ts` / `apps/api/v2/src/modules/webhooks/webhooks.module.ts` | 修改，接入新 controller/service |

这个量级已经超过单个"小 PR"的建议文件数（>10 个文件），**建议再拆一次**：

- **PR2a**：团队 + 成员管理（`POST /teams`、`GET /teams`、`GET /teams/{id}`、`POST/DELETE memberships`）
- **PR2b**：团队事件类型创建（`POST /teams/{id}/event-types`，跟 §10 的 GET 合并成一个 controller）
- **PR2c**：团队 webhook（`POST /teams/{id}/webhooks`）

## 4. 建议开发顺序

1. **PR1**（§2）：`GET /v2/teams/{teamId}/event-types` —— 最小、独立、且是 §4.4 交车邀请闭环的前置依赖，优先级最高
2. **PR2a**：建团队 + 加/减成员 —— staff 后台"建团队或复用已有团队、加减成员"的核心
3. **PR2b**：建团队事件类型 —— 跟 PR1 共用同一个 controller 文件，可以紧跟着做
4. **PR2c**：团队 webhook —— 涉及新 Repository 方法+新 Service，独立验证 URL 校验/查重逻辑

## 5. 需要在动手前确认/注意的点

1. **`RolesGuard` 是从未被实际使用过的代码**（全仓库 `@Roles(` 零命中）。它的团队分支逻辑（`checkUserRoleAccess` 里 `Boolean(teamId) && !Boolean(orgId)` 那一段）看起来完整，但没有被任何生产路径验证过。第一次接入时应该额外写端到端测试覆盖"非成员访问被拒""MEMBER 访问 ADMIN-only 端点被拒""ADMIN 正常访问"这几个分支，不能假设它"看起来对就是对"。
2. **用 `RolesGuard`（OWNER/ADMIN/MEMBER 三级）还是接入 `TeamPermissionSetting` 细粒度权限系统**，本方案选了前者，因为后者目前完全绑定在 `packages/features` + tRPC 里，没有到 `apps/api/v2` 的路径，引入代价明显更高。如果 staff 后台后续需要比"ADMIN 才能加成员"更细的权限颗粒度，需要重新评估。
3. **`POST /v2/teams` 的滥用风险**：任何持有有效 API key 的调用方都能建团队并自动成为 owner。§7.3 提到 `ApiKey.teamId` 可以把 key 锁定到某个团队，但"建团队"这个动作发生在团队存在之前，锁定字段起不到作用，需要额外考虑要不要限制"谁的 API key 能调用建团队接口"（例如只允许系统管理员级别的 key）。
4. **§10 的数据暴露面**：`getTeamEventTypeBySlug` 走的是 `include`（不是 `select`），会带出 `users`/`hosts`/`schedule`/`destinationCalendar` 等完整关联数据。虽然复用现成方法能省事，但对着"服务器对服务器查 eventTypeId"这个具体用途，默认返回这么多字段超出了 `data-prefer-select-over-include.md` 建议的"按需 select"原则。已有的 `hostsLimit` 参数能部分缓解（传 0 可以不带 host），但 `users`/`schedule` 等字段目前没有开关。实现时评估是否要为这个新端点单独包一层更瘦的输出 DTO，而不是直接把 `DatabaseTeamEventType` 全量吐出去。

## 6. 参考

- 主需求文档：[vehicle-delivery-booking.md](./vehicle-delivery-booking.md) §10 / §12
- 薄 controller 写法参考：`apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts`
- 资源归属校验写法参考：`apps/api/v2/src/modules/event-types/guards/event-type-ownership.guard.ts`
- 团队角色鉴权：`apps/api/v2/src/modules/auth/guards/roles/roles.guard.ts`
