# 开发方案：§10 团队事件类型查询 + §12 staff 后台团队自动化管理 API

> 本文档是 [vehicle-delivery-booking.md](./vehicle-delivery-booking.md) 中 §10 / §12 两项"需要开发"条目的落地方案，供后续实现时参考，不是需求文档本身。
> 结论全部基于对当前分支代码的实际检查（而非推测），检查方式和文件路径见各节。
> 最后更新：2026-08-13（§3.1 里标 ❌ 暂缓的几项——改/删团队、改成员角色——已经补齐；团队 webhook 和团队事件类型也从"只能创建"补成了完整 CRUD，见 §3.4）

## 0. 结论先行

- `apps/api/v2` 是全仓库唯一产出 OpenAPI 文档的服务（`docs/api-reference/v2/openapi.json`），`apps/api/` 下也只有这一个子应用，没有 v1。§10/§12 只能加在这里，没有第二个选项。
- §10、§12（**含原本标为暂缓的部分，现已全部补齐**）**都已完成开发并本地端到端验证通过**，见 §2 / §3。
- 本次开发是自用/内部验证，**没有推送到 GitHub、没有开 PR**，全部提交都在本地分支 `feat/team-management-and-availability-fixes` 上。
- 好消息：不少"看起来要写"的东西其实已经是**孤立但现成**的代码（从未被删干净、只是没接上），可以直接复用。但"现成"不等于"能直接跑"——§3.2 的"建团队事件类型"这一项在真正调用之前完全没有测试过，实测直接暴露了三个之前读代码看不出来的坑（host priority 类型不匹配、assignAllTeamMembers 不会自动同步 host、事件类型创建的默认权限是 OWNER 不是 ADMIN），全部记录在 §3.2。
- **§3.4（本次新增）**：用户指出团队 webhook 之前"只能创建、不能读取/修改/删除"，参照现成的用户级 `webhooks.controller.ts` 补齐了完整 CRUD；顺带把 §3.1 里原本标"暂缓"的团队增删改、成员改角色也一起做了，不再拆成"首批子集"和"后续"两批。

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

## 2. §10：`GET /v2/teams/{teamId}/event-types` —— ✅ 已完成

提交：`4898509a67`（本地分支，未推送）。

### 目标

staff 后台传团队 ID + `eventSlug`，拿到对应的 `eventTypeId`（以及基本信息），不需要硬编码数字 ID。

### 接口

```
GET /v2/teams/{teamId}/event-types?eventSlug={slug}&hostsLimit={n}
```

- 复用现成的 `GetTeamEventTypesQuery_2024_06_14`（`eventSlug` 可选——不传则返回团队下全部事件类型列表，传了则按 slug 精确查一个）
- `hostsLimit` 已经支持，staff 后台如果只是要拿 `eventTypeId`，**建议调用时传 `hostsLimit=0`**，避免把 host 列表（含成员基本信息）一起带出来——这属于"按需 select"的范畴，不需要额外开发，是现成参数

### 实际新增/修改的文件

| 文件 | 内容 |
|---|---|
| `apps/api/v2/src/modules/teams/teams.module.ts`（新建，此前不存在） | 声明 `TeamsRepository` / `TeamsEventTypesRepository` / `TeamsEventTypesService` / `OutputTeamEventTypesService` / `OutputTeamEventTypesResponsePipe` / `UsersRepository` 为 provider，`imports` 了 `PrismaModule` / `RedisModule` / `MembershipsModule`（`RolesGuard` 依赖）/ `EventTypesModule_2024_06_14` / `UsersModule`，`exports` 供其他模块复用 |
| `apps/api/v2/src/modules/teams/event-types/controllers/teams-event-types.controller.ts`（新建） | `GET /v2/teams/:teamId/event-types`，`@UseGuards(ApiAuthGuard, RolesGuard)` + `@Roles("TEAM_MEMBER")`，参照 [webhooks.controller.ts](../../apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts) 的薄 controller 写法：有 `eventSlug` 调 `getTeamEventTypeBySlug`（未命中抛 404），没有则调 `getTeamEventTypes` |
| `apps/api/v2/src/modules/teams/event-types/outputs/get-team-event-types.output.ts`（新建） | 列表响应的输出 DTO（`GetTeamEventTypesOutput_2024_06_14`），单条命中直接复用了已有的 `GetEventTypeOutput_2024_06_14`（它本来就支持 `TeamEventTypeOutput_2024_06_14`） |
| `apps/api/v2/src/modules/teams/event-types/controllers/teams-event-types.controller.e2e-spec.ts`（新建） | 见下方"验证"小节 |
| `apps/api/v2/src/modules/endpoints.module.ts`（修改） | 加一行 `TeamsModule` import |

### 没有新增（复用现成代码，跟计划一致）

- Service/Repository 层：零新增，`getTeamEventTypeBySlug` / `getTeamEventTypes` 直接复用
- 鉴权：`ApiAuthGuard` + `RolesGuard` 全部现成，没有改动

### 验证

新增了 `teams-event-types.controller.e2e-spec.ts`，起了完整的 `AppModule`、连本地真实 Postgres（`localhost:5432`）和 Redis（`localhost:6379`，均为宿主机原生进程，不是 docker-compose 里那两个已停止的容器），4 个用例全部通过：

1. 按 `teamId + eventSlug` 精确命中 → 200，`id`/`slug`/`teamId` 都对
2. 命中不存在的 `eventSlug` → 404
3. 不传 `eventSlug` → 200，返回团队下全部事件类型列表
4. 用同一个已认证身份，请求一个**没有加入**的团队 → 403

第 4 个用例顺带验证了 `RolesGuard` 的拒绝分支——这是它在本仓库第一次被真实调用路径执行（此前是 §1 表里提到的"零调用点"孤立代码）。

**踩的坑，记下来供 §4（PR2）复用**：一开始想用两个不同身份（团队成员 + 非成员）分别测通过/拒绝，用的是 `withApiAuth` 对两个不同 email 各起一个 Nest app。结果两个 app 的请求全部被鉴权成"后创建的那个 app 绑定的用户"——`ApiAuthStrategy` 是按固定 passport 策略名（`"api-auth"`）注册的，同一个 Jest 测试文件里创建第二个 app 会把第一个 app 的策略覆盖掉，两个 app 实际共享同一个（最后注册的）mock 身份。换成真实 API Key（`ApiKeysRepositoryFixture.createApiKey` + `Authorization: Bearer cal_test_<key>`）想绕开这个问题，结果发现**这条路径在当前本地环境里对所有测试文件都返回 401**（用仓库里已有的、大概率在 CI 里通过的 `event-types.controller.e2e-spec.ts` 现成用例做基线测试，同样 401）——是本地环境配置问题（推测跟某个 env 变量缺失或 API key 前缀配置有关），不是这次改动引入的。最终方案：**同一个身份 + 两个团队**（只加入其中一个），照样能验证 `RolesGuard` 的"是团队成员"和"不是团队成员"两条分支，绕开了以上两个问题。PR2 涉及更多需要"用不同身份互相验证权限"的端点（比如"非 ADMIN 不能加成员"），到时候要么复用这个"同身份多资源"的思路，要么先查清楚本地真实 API Key 鉴权 401 的根因。

### 预估规模

1 个 controller 文件 + 1 个 module 文件 + 1 处已有文件的一行改动，符合"小 PR"要求，是本方案里最小的一块，建议第一个做。

## 3. §12：staff 后台团队自动化管理 API —— ✅ 已完成（含全量 CRUD）

提交（本地分支，未推送）：`a67b79de35`（团队/成员/webhook 首批）、`702ad5446f`（建团队事件类型）、`a2212c5cda`（团队+成员剩余 CRUD）、`13aa5f0576`（团队 webhook 剩余 CRUD）、`10973349f0`（团队事件类型剩余 CRUD）、`726fa2fc9c`（顺带修的一个既有 e2e 测试的 flaky 问题）。

### 3.1 范围取舍（首批的取舍，现已全部补齐）

原始需求原话是"建团队（如临时小组）或复用已有团队、加减成员、建事件类型、配 webhook"，**没有明确要求**改团队信息、删团队、改成员角色，首批按这个范围做的。后续用户明确要求把剩下的补齐（团队 webhook 尤其被指出"只能创建不能读取"不合理），于是全部补上了，不再区分"首批"和"暂缓"：

| 端点 | 状态 | 备注 |
|---|---|---|
| `POST /v2/teams` | ✅ 首批 | 需求明确要"建团队" |
| `GET /v2/teams` / `GET /v2/teams/{teamId}` | ✅ 首批 | "复用已有团队"的前提是能查到，`getTeamsUserIsMemberOf`/`getById` 已现成 |
| `PATCH /v2/teams/{teamId}` | ✅ 补齐（`TEAM_ADMIN`） | |
| `DELETE /v2/teams/{teamId}` | ✅ 补齐（`TEAM_OWNER`，比其他动作更严） | 不可逆操作，故意比 `PATCH`/成员管理的 `TEAM_ADMIN` 门槛更高；级联删除靠 schema 的 `onDelete: Cascade`，不需要手动清理 |
| `GET /v2/teams/{teamId}/memberships` | ✅ 补齐（`TEAM_MEMBER`） | `MembershipsRepository` 之前连"按 teamId 查全部成员"的方法都没有，新加了 `findByTeamId` |
| `POST /v2/teams/{teamId}/memberships` | ✅ 首批 | 需求明确要"加成员" |
| `DELETE /v2/teams/{teamId}/memberships/{userId}` | ✅ 首批 | 需求明确要"减成员"；**`MembershipsRepository` 里连底层方法都没有，不只是缺 controller**，见 §3.2 |
| `PATCH /v2/teams/{teamId}/memberships/{userId}`（改角色） | ✅ 补齐（`TEAM_ADMIN`） | 新加了 `MembershipsRepository.updateRole` |
| `GET /v2/teams/{teamId}/event-types` | ✅ 首批（§10，见 §2） | |
| `POST /v2/teams/{teamId}/event-types` | ✅ 首批 | 需求明确要"建事件类型"，`createTeamEventType` 已现成，实测踩了三个坑，见 §3.2 |
| `PATCH /v2/teams/{teamId}/event-types/{eventTypeId}` | ✅ 补齐（`TEAM_ADMIN`） | 复用现成的 `updateTeamEventType`，输入转换镜像了 create 那条已验证过的路径 |
| `DELETE /v2/teams/{teamId}/event-types/{eventTypeId}` | ✅ 补齐（`TEAM_ADMIN`） | 复用现成的 `deleteTeamEventType` |
| `POST /v2/teams/{teamId}/webhooks` | ✅ 首批 | 需求明确要"配 webhook" |
| `GET /v2/teams/{teamId}/webhooks`（列表）/ `GET .../webhooks/{webhookId}`（单条） | ✅ 补齐（`TEAM_ADMIN`） | 见 §3.4，用户指出的"只能写不能读"问题 |
| `PATCH /v2/teams/{teamId}/webhooks/{webhookId}` | ✅ 补齐（`TEAM_ADMIN`） | |
| `DELETE /v2/teams/{teamId}/webhooks/{webhookId}` | ✅ 补齐（`TEAM_ADMIN`） | |

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
- 复用 `TeamsEventTypesService.createTeamEventType(user, teamId, body)` + 现成的 `CreateTeamEventTypeInput_2024_06_14` DTO（`packages/platform/types` 里本来就有，之前零调用）
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`
- **`createTeamEventType` 本身也是零调用点的代码**，实测（不是读代码）才发现的三个坑，全部已修复/记录，供以后改这块代码时参考：
  1. **没有输入转换路径**：`InputEventTypesService_2024_06_14` 完全没有处理团队 DTO 的方法。新增了 `transformAndValidateCreateTeamEventTypeInput`，复用个人事件类型那条已验证过的转换/校验逻辑（两个 DTO 共享同一个 `BaseCreateEventTypeInput`，团队专属字段靠原有的 `...rest` 展开原样透传），用一次类型转换（`as unknown as CreateEventTypeInput_2024_06_14`）接进去，没有改动被个人事件类型创建共用的转换函数本身
  2. **`hosts[].priority` 类型不匹配**：API 层是字符串标签（`"medium"`），数据库 `Host.priority` 是整数——之前完全没人转换，直接传给 Prisma 报 `PrismaClientValidationError`。已加一个小的反向映射（映射方向对应 `OutputTeamEventTypesService.getPriorityLabel` 已有的正向映射）
  3. **`assignAllTeamMembers: true` 不会自动同步到 Host 表**：实测传了这个字段、不传 `hosts`，创建成功但 Host 表没有任何记录。翻 git log 确认这是有意为之（"make 'assign all team members' pure frontend"，同步逻辑在网页端表单提交时算，不在后端）。结论：调用这个接口时**必须显式传 `hosts` 数组**，不能只传 `assignAllTeamMembers`——对交车场景反而更合适，因为轮询保底需要给每个 host 单独设置 priority（见主需求文档 §3.1）
  4. **（不是 bug，是发现）事件类型创建的默认权限比 `RolesGuard` 严**：`RolesGuard` 只要求 `TEAM_ADMIN`，但 `createEventType` 内部另有一层独立的 `TeamPermissionSettingService` 检查，`eventType.create` 这个权限点的**默认最低角色是 `OWNER`**（`packages/features/teams/lib/teamPermissions.ts`），比 `RolesGuard` 的 `TEAM_ADMIN` 更严格。也就是说光是团队 ADMIN 调这个接口默认会被拒——这是本仓库既有的、按 team 可配置的细粒度权限系统在正常生效（见主需求文档 §8），不是要修的问题，只是调用方需要知道：默认情况下只有 team owner（或该团队把 `eventType.create` 权限设置里调低了门槛）才能建团队事件类型

**`POST /v2/teams/{teamId}/webhooks`**
- **需要新增** `WebhooksRepository.createTeamWebhook(teamId, data)`，照抄 `createEventTypeWebhook` 的写法（`Webhook.teamId` 字段本身已存在，Prisma 层不需要改 schema）
- **需要新增**一个 Service 方法（建议叫 `TeamWebhooksService.createTeamWebhook`，跟现有 `TeamEventTypeWebhooksService` 区分开，因为一个是团队维度、一个是事件类型维度，两者不是一回事，命名上要避免混淆），内部调用 `validateWebhookUrl` + 查重（照抄 `TeamEventTypeWebhooksService.createTeamEventTypeWebhook` 的校验逻辑，把 `getEventTypeWebhookByUrl` 换成一个新的按 teamId 查重的方法）
- 输出：直接复用现成但目前孤立的 `TeamWebhookOutputDto` / `TeamWebhookOutputResponseDto`（`apps/api/v2/src/modules/webhooks/outputs/team-webhook.output.ts`），不需要新写
- 鉴权：`RolesGuard` + `@Roles("TEAM_ADMIN")`

### 3.3 首批新增/修改的文件

| 文件 | 类型 |
|---|---|
| `apps/api/v2/src/modules/teams/controllers/teams.controller.ts` | 新建（create/list/get team） |
| `apps/api/v2/src/modules/teams/controllers/team-memberships.controller.ts` | 新建（add/remove member） |
| `apps/api/v2/src/modules/teams/services/teams-management.service.ts` | 新建（create team + 自动加 owner membership 的编排逻辑；add/remove member） |
| `apps/api/v2/src/modules/teams/inputs/create-team.input.ts` / `create-membership.input.ts` | 新建 |
| `apps/api/v2/src/modules/teams/outputs/team.output.ts` / `membership.output.ts` | 新建 |
| `apps/api/v2/src/modules/memberships/memberships.repository.ts` | 修改，加 `deleteMembership`（全仓库之前零实现） |
| `apps/api/v2/src/modules/webhooks/webhooks.repository.ts` | 修改，加 `createTeamWebhook` + `getTeamWebhookByUrl` |
| `apps/api/v2/src/modules/webhooks/services/team-webhooks.service.ts` | 新建 |
| `apps/api/v2/src/modules/webhooks/controllers/team-webhooks.controller.ts` | 新建 |
| `apps/api/v2/src/modules/teams/event-types/controllers/teams-event-types.controller.ts` | 修改（§10 已有的 GET 上加了 POST，同一个 controller） |
| `apps/api/v2/src/platform/event-types/event-types_2024_06_14/services/input-event-types.service.ts` | 修改，加 `transformAndValidateCreateTeamEventTypeInput` + host priority 映射 |
| `apps/api/v2/src/modules/teams/teams.module.ts` / `apps/api/v2/src/modules/webhooks/webhooks.module.ts` | 修改，接入新 controller/service |
| 对应的 `*.e2e-spec.ts`（5 个文件，共 31 条用例） | 新建 |

按单次 commit 的文件数/行数看确实超过"小 PR"的建议阈值，但既然本次不走 PR、只是自用分支上的连续提交，就没有再按 PR2a/b/c 拆分——按 §4 的顺序做，每个动作一次独立提交，每次都本地跑过 e2e 才提交。

### 3.4 补齐剩余 CRUD（用户明确要求后新增）

用户指出团队 webhook"只能创建、不能读取"不合理，参照现成的用户级 `apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts` 补齐；顺带把 §3.1 里原本因为"需求原话没提"而暂缓的团队改/删、成员改角色也一起做了。

**团队本身**：`TeamsManagementService` 加 `updateTeam`/`deleteTeam`，直接包一层 `TeamsRepository.update`/`delete`（两个方法本来就已经现成）。`DELETE` 单独给了比其他动作更高的 `TEAM_OWNER` 门槛（其余都是 `TEAM_ADMIN`）——不可逆操作，且级联删除范围大（成员、事件类型、webhook 全部因为 schema 的 `onDelete: Cascade` 一起没了），值得比"改名字"这种动作更谨慎。

**成员列表 + 改角色**：`MembershipsRepository` 新增 `findByTeamId`（列表）和 `updateRole`（改角色）——这两个方法之前完全不存在，不是"补 controller"就够。

**团队事件类型的 update/delete**：直接复用 `TeamsEventTypesService.updateTeamEventType`/`deleteTeamEventType`（本来就实现好了，只是零调用点）。update 路径需要一个新的输入转换方法 `transformAndValidateUpdateTeamEventTypeInput`，写法完全镜像 create 路径已经验证过的 `transformAndValidateCreateTeamEventTypeInput`——同样的"个人/团队 DTO 共享基类、类型转换接进已验证的转换函数"思路，这次没有再踩 create 路径踩过的那三个坑（因为走的是同一条转换管线，priority 映射、`...rest` 透传都已经在 create 那次修好了）。

**团队 webhook 的 GET/PATCH/DELETE**：新增 `IsTeamWebhookGuard`（镜像既有的 `IsUserWebhookGuard`），校验 URL 里的 `:webhookId` 确实属于 `:teamId`，不属于就 403。`WebhooksRepository` 加了 `getTeamWebhooksPaginated`（之前只有 user-scoped 和 event-type-scoped 的分页查询）。**这五个端点全部要求 `TEAM_ADMIN`，包括读**——跟其他"读用 `TEAM_MEMBER`、写用 `TEAM_ADMIN`"的端点不一样，因为 webhook 响应里会带 `secret` 字段（跟现有用户级 webhook 接口对自己调用者暴露 `secret` 是同一个字段），团队 webhook 是全队共享的，所以读也收紧到 admin。

**顺带修的一个无关 bug**：改团队 webhook 时反复跑 `webhooks.controller.e2e-spec.ts`（既有的用户级 webhook 测试，作为回归检查）遇到过三次同一个"unique constraint failed"失败——用固定字符串 `"2mdfnn2"` 当 webhook id，`afterAll` 里的清理调用又没有 `await`，导致某次运行被打断后残留脏数据，下次运行必现冲突。改成了随机 id + 补上 `await`（`726fa2fc9c`），这是这份测试文件本身的既有问题，跟本次团队功能改动无关，只是反复回归测试时正好撞上了。

**验证**：这一批新增了 21 条 e2e 用例（团队+成员 12 条、团队 webhook 5 条+1 条权限、团队事件类型 4 条），加上之前的 23 条，全套 `src/modules/teams/` + 两个 webhook 测试文件累计 44 条全部通过。也重新生成过一次真实的 `docs/api-reference/v2/openapi.json`（用修好的本地 dev server，不是临时脚本），按路径和 schema 逐项比对 main 分支，确认零删除、只新增了这次加的 8 条路径和相应的输出/输入 DTO schema。

## 4. 开发顺序（实际执行记录）

1. ✅ `GET /v2/teams/{teamId}/event-types`（§2）
2. ✅ 建团队 + 加/减成员 + 团队 webhook（§3.2 前三块）
3. ✅ 建团队事件类型（§3.2 第四块）—— 最后做是因为它依赖的 `createTeamEventType` 从零调用点开始，实际接入过程中发现的坑（§3.2）比其余三个端点加起来都多，属于"看起来简单、实测最复杂"的一项
4. ✅（用户要求后）团队改/删 + 成员列表/改角色（§3.4）
5. ✅（用户要求后）团队 webhook 的 GET/PATCH/DELETE（§3.4）
6. ✅（用户要求后）团队事件类型的 PATCH/DELETE（§3.4）
7. ✅ 顺手修了 §3.4 提到的既有 e2e 测试 flaky 问题
8. ✅ 用修好的本地 dev server 重新生成 `docs/api-reference/v2/openapi.json`，核对无删除

## 5. 已解决 / 仍然待定的点

1. ~~`RolesGuard` 是从未被实际使用过的代码~~ —— **已验证**。累计 6 个 e2e spec 文件覆盖了它的授权/拒绝分支（"非成员访问被拒""TEAM_MEMBER 访问被拒需要 TEAM_ADMIN/TEAM_OWNER 的端点""ADMIN/OWNER 正常访问"），全部通过，不再是未验证代码。
2. **用 `RolesGuard`（OWNER/ADMIN/MEMBER 三级）还是接入 `TeamPermissionSetting` 细粒度权限系统**——本方案在 controller 层选了前者（原因不变，见下），但 §3.2 实测发现事件类型创建这类动作在**更深一层**（`createEventType` 内部）本来就会走 `TeamPermissionSetting`，且默认比 `RolesGuard` 更严（`OWNER` vs `TEAM_ADMIN`）。也就是说两套机制其实已经在同时生效、分层组合：`RolesGuard` 做入口粗粒度拦截（非团队成员早失败，省一次 DB/权限查询），`TeamPermissionSetting` 在具体动作内部做精细裁决。目前没有把 `TeamPermissionSetting` 直接接进 `RolesGuard` 本身，因为它仍然绑定在 `packages/features`，跨到 `apps/api/v2` 的引入代价没变；如果 staff 后台后续要用 API 直接**读/改**某个团队的权限配置（而不是被动受它约束），才需要重新评估。
3. **`POST /v2/teams` 的滥用风险**：仍未处理。任何持有有效 API key 的调用方都能建团队并自动成为 owner。§7.3 提到 `ApiKey.teamId` 可以把 key 锁定到某个团队，但"建团队"这个动作发生在团队存在之前，锁定字段起不到作用，需要额外考虑要不要限制"谁的 API key 能调用建团队接口"（例如只允许系统管理员级别的 key）。**`DELETE /v2/teams/{teamId}` 现在也是这个风险的镜像问题**：拿到 owner 权限的调用方可以整个删掉团队（级联删除成员/事件类型/webhook），目前唯一的门槛是 `TEAM_OWNER` 角色，没有额外的二次确认或软删除机制。
4. **§10 的数据暴露面**：仍未处理。`getTeamEventTypeBySlug` 走的是 `include`（不是 `select`），会带出 `users`/`hosts`/`schedule`/`destinationCalendar` 等完整关联数据，超出"服务器对服务器查 eventTypeId"这个用途实际需要的字段。`hostsLimit=0` 能省掉 host 列表，但 `users`/`schedule` 等字段目前没有开关。
5. **建团队事件类型的三个坑**，详见 §3.2 第四块：`hosts[].priority` 需要手动做字符串标签→整数的转换（已修复）；`assignAllTeamMembers: true` 不会自动同步 Host 表，调用方必须显式传 `hosts`（已在 API 层留了注释说明，没有改动底层行为）；这个动作的默认权限门槛是 `TeamPermissionSetting` 里的 `OWNER`，比 `RolesGuard` 的 `TEAM_ADMIN` 更严（这是既有设计，不是 bug）。
6. **团队 webhook 读也收紧到 `TEAM_ADMIN`**：跟其他资源"读 `TEAM_MEMBER`/写 `TEAM_ADMIN`"的分层不一致，是刻意的（响应带 `secret`），但如果以后要放宽（比如加一个不带 secret 的精简视图给普通成员看"这个团队配了哪些 webhook"），需要单独设计输出 DTO，不能简单改角色门槛了事。

## 6. 参考

- 主需求文档：[vehicle-delivery-booking.md](./vehicle-delivery-booking.md) §10 / §12
- 薄 controller 写法参考：`apps/api/v2/src/modules/webhooks/controllers/webhooks.controller.ts`
- 资源归属校验写法参考：`apps/api/v2/src/modules/event-types/guards/event-type-ownership.guard.ts`
- 团队角色鉴权：`apps/api/v2/src/modules/auth/guards/roles/roles.guard.ts`
