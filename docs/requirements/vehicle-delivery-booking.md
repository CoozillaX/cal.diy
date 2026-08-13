# 需求分析：车辆交付预约系统（基于 cal.diy）

> 状态：分析阶段，尚未开始开发。本文档汇总讨论过程中的结论，供排期和跟 staff 后台对齐使用。
> 最后更新：2026-08-13（补充：Unallocated 行内操作收窄为 Reassign + Cancel）

## 1. 背景

公司希望基于 Cal.com 做一套自己的预约系统（即本仓库 cal.diy），核心场景是车辆交付预约，但要求架构保持通用，以便后续扩展到其他预约场景（例如面试预约）。

预约系统需要跟公司内部的 **staff 后台**（另一套内部系统）打通账号体系。

## 2. 需求清单与结论

| # | 需求 | 结论 | 是否需要开发 |
|---|---|---|---|
| 1 | 客户可以随时自助预约 | 已有，公开预约页本身不需要登录 | 否 |
| 2 | 预约先在 team 内部分配，分配不了转店长 | Round-robin 事件类型 + `Host.priority`（销售中/高优先级，店长最低优先级）即可实现 | 否，纯配置 |
| 3 | 店长作为保底，不能因为自己排班窄而约不进去 | 店长的 Schedule 覆盖范围需要 ≥ 事件类型对外开放的完整预约窗口 | 否，纯配置（需要注意的坑，见 §3.3） |
| 4 | 店长作为保底，不能因为同一时间已有别的预约就被排除 | Cal.com 的轮询分配对已占用时间段有硬性冲突过滤，无法通过配置绕过；已重做为事件类型级独立保底人 + Unallocated 队列 + 重新分配，不再是 per-host 复选框 | **已完成**（架构已重做），见 §4.1 |
| 5 | 按事件类型设置不同可用性（如圣诞节不能交车，但可预约参观） | 用"事件类型绑定独立 Schedule + date override"实现，不需要拆分 team | 否，纯配置 |
| 6 | 电话预约：销售代客户在系统里下单 | 公开预约页本身不限制身份，销售直接代填客户信息提交即可 | 否（除非要做更顺手的内部代填 UI，那是可选的增量工作） |
| 7 | 权限：销售不能随意取消预约 | 本次会话已完成的 `TEAM_PERMISSIONS.BOOKING_CANCEL`，默认最低角色 ADMIN，销售（member）默认不能取消 | **已完成** |
| 8 | 车辆生命周期到"可交付"时，staff 后台请求预约系统向客户发一条只能约一次的邀请 | 用 Cal.com 现有的 Private Link（`HashedLink`，`maxUsageCount: 1`）+ 现有 API `POST /v2/event-types/{eventTypeId}/private-links` 实现 | 否，现有 API 已支持（见 §4.3 需要补的查询接口） |
| 9 | 邀请链接需要根据已有客户信息（如 VIN）预填并锁定字段，不可编辑 | URL 预填机制已存在，但"仅当预填了值才锁定，否则可编辑"的动态锁定行为不存在 | **是**，见 §4.2 |
| 10 | staff 后台需要动态知道某个用途对应哪个事件类型，不能写死数字 ID | 需要一个按团队 + slug 查询事件类型的公开 API | **是**，见 §4.3 |
| 11 | 账号与 staff 后台打通 | staff 后台没有标准 SSO 协议（非 SAML/OIDC），需要自建信任桥接 | **是**，见 §5，待 staff 后台确定细节 |
| 12 | staff 后台用"门店管理账号 key"自动化管理团队：建团队/用现有团队、加减成员、建事件类型、配 webhook | Service/Repository 层大部分已实现，只缺对外 REST controller | **是**，见 §7，规模小于预期 |

## 3. 纯配置项的具体做法

### 3.1 Round-robin 分配 + 店长兜底优先级

- 建团队事件类型，`schedulingType: ROUND_ROBIN`
- 销售设置正常 `Host.priority`（如 Medium/High）
- 店长设置最低 `Host.priority`（Low）
- 原理：`packages/features/bookings/lib/getLuckyUser.ts` 的轮询分配逻辑，只在"当前有空的候选人里选优先级最高的一档"。只要还有一个销售当时有空，系统绝不会选中店长；只有所有销售那个时间段都没空时，店长（若他也有空）才会被选中。
- 注意：这个纯配置方案里的店长仍然是 `hosts` 池里的普通一员，仍然会被硬性冲突过滤挡住——如果店长自己那个时间点也有别的预约，一样约不进去，不是真正的"最后一道保底"。真正不受冲突过滤影响、事件类型级独立配置的保底人机制见 §4.1（`EventType.fallbackHostUserId`），两者是互相独立的选项，可以只用其中一个，也可以同时配置。

### 3.2 按事件类型设置不同可用性

- 不需要拆分 team。每个事件类型可以绑定独立的 Schedule（`packages/prisma/schema.prisma` 的 `Schedule` / `Availability` 模型，`Availability.date` 字段支持按具体日期做例外）
- "交车"事件类型 → 绑定一个把圣诞节整天 block 掉的 Schedule
- "参观"事件类型 → 绑定值班人员各自的排班，谁那天真的排了班，谁的时间就会出现在可预约时段里

### 3.3 店长 Schedule 覆盖坑

- Round-robin 的 `priority` 只决定"在有空的人里选谁"，不会覆盖"这个人有没有配置可用时间"这一层
- 如果店长自己的 Schedule 比销售窄，会出现"销售都没空、但也超出店长排班"的时间段，导致这个时段直接约不进去，不是真正的保底
- 要求：店长的 Schedule 覆盖范围需要 ≥ 事件类型对外开放的完整预约窗口

## 4. 需要开发的项

### 4.1 店长保底（事件类型级独立兜底人 + Unallocated 队列 + 重新分配）—— 已完成，架构已重做

> 本节取代了 2026-08-12 及更早版本描述的 `Host.ignoreTimeConflicts`（per-host 复选框）方案。旧方案已在下面提到的这批提交里被完全移除；这里描述的是当前生效的架构。改造原因：旧方案把店长变成"轮询候选池里的一个、只是不检查冲突"的特殊 host，混在正常销售的 `hosts` 列表里，容易被误勾选/误配置，而且没有回收机制——一旦保底成功，那条预约跟其他正常预约没有区别，没人会注意到它其实是"硬塞"进去的，也没有把它转交给真人的流程。

**新架构的核心变化**：保底人**完全独立于** `hosts` 列表，是事件类型上的一个单独指针（`EventType.fallbackHostUserId`），只有当轮询分配在正常 host 池里**真的一个人都选不出来**时才会用到；保底成功的预约会带一个专门的状态落进保底人自己的"Unallocated"（待分配）队列，等人工把它转交给一个真正的销售，而不是悄悄混进正常预约列表里。

**1）事件类型配置 —— Assignment 标签新增独立开关**

- `packages/prisma/schema.prisma`：删除 `Host.ignoreTimeConflicts`；新增 `EventType.fallbackHostUserId Int?`（`onDelete: SetNull`，指向 `User`），与 `hosts` 完全脱钩，不占用 `Host` 表的一行
- Assignment 标签页 host 列表下方新增一个独立的 Switch（"启用保底"）+ 人员选择器；开启后只能选**一个人**，候选名单是团队里"满足该团队配置的 `booking.reassign` 最低角色要求"的成员（复用本仓库早前完成的 Team 权限系统，见 §8）——保底人必须是一个有权限把预约转交给别人的人，否则保底了也没法转出去
- 关掉开关只是把 `fallbackHostUserId` 清空，不会动 `hosts` 列表一根汗毛，因为保底人从来就不是 host

**2）预约分配 —— 只在轮询真的选不出人时才兜底**

- `packages/features/bookings/lib/handleNewBooking/resolveFallbackHost.ts`：轮询分配在正常 `hosts` 池里因为"没人在这个时间点有空"（`NoAvailableUsersFound` / `RoundRobinHostsUnavailableForBooking`）而失败时才会被调用；如果失败原因是别的（比如某个必须固定出席的 host 缺席），不会触发保底
- 保底判定**只看保底人自己配置的 Schedule 覆盖范围**（`buildDateRanges`，跟 §3.3 提到的"店长排班要覆盖完整窗口"是同一个概念），**刻意不检查保底人当时是否已有别的预约**——这正是保底存在的意义：所有正常销售 + 保底人的 Schedule 都覆盖这个时间点，但保底人已经被别的预约占用时，仍然应该分给保底人兜底，而不是报错"约不上"
- `packages/trpc/server/routers/viewer/slots/util.ts`：客户日历上的可点时段计算（`AvailableSlotsService`）同步补了一条保底人的合成可用性，逻辑跟提交时一致，避免"提交时能兜底，但客户日历上那个时间点根本不显示成可点"的层间不一致（这是 §4.1 旧版本已经踩过的坑，这次直接在设计阶段就避免了）
- 保底成功的预约状态设为 `AWAITING_HOST`（复用 schema 里一个此前只属于一个基本已废弃的"即时会议"功能、从未被任何在用代码路径写入过的枚举值，经过全仓库排查确认可以安全复用），而不是正常的 `ACCEPTED`；**仅对无需人工确认的事件类型生效**——需要确认的事件类型走原有 `PENDING` 流程，不受影响

**3）Bookings 列表 —— 新增 Unallocated 标签**

- 在"Upcoming"标签前新增"Unallocated"标签（但默认打开的仍然是 Upcoming，不改变现有习惯）；后端按 `status = 'awaiting_host'` 过滤，同时把这类预约从"Upcoming"的查询条件里排除掉，避免同一条出现在两个标签下
- **行内操作被有意收窄，不是跟 Upcoming 完全一致**（这是上线后根据实际使用反馈调整的——最初按"跟 Upcoming 一样"实现，但很快发现 Reschedule 对没有确定 host 的预约会直接报错"Could not find original booking"，且即便修好也没有意义）：
  - **保留**：Reassign（解决问题的正路）、Cancel event（放弃这条）、Report booking
  - **禁用（灰色可见，不隐藏）**：Reschedule booking、Request reschedule、Edit location、Add guests——这四个要么是"挪动时间/地点/访客"这类只有在真正有人接这单之后才有意义的编辑，要么（Reschedule）本身就会把同一个"没人有空"的问题原样搬到另一个时间点，不解决根本问题
  - 判定逻辑集中在 `apps/web/components/booking/actions/bookingActions.ts` 的 `isActionDisabled`，按 `booking.status === AWAITING_HOST` 加一条排除条件，Reassign 单独拆出不受影响

**4）重新分配（Reassign）—— 顺带发现并重做，手动 + 自动都做了**

开发过程中发现"重新分配"这个功能（不只是保底场景，round-robin 预约的重新分配整体）当时是完全坏的：UI 弹窗还在，但背后调用的 tRPC 接口在仓库剥离 Enterprise Edition 代码时被整体删除了，前端留下的是硬编码的空操作桩。既然 Unallocated 预约必须靠重新分配才能转成正常 Upcoming 预约，这部分不修好整个方案就不闭环，所以一并重做：

- 新增 `packages/features/bookings/lib/roundRobinReassignment/`：`applyReassignment`（核心：换 `Booking.userId`、把 `AWAITING_HOST` 转回 `ACCEPTED`、记 `reassignById`/`reassignReason`、尽力同步日历事件、写一条 `AssignmentReason` 审计记录）+ `manualReassignRoundRobinHost`（手动指定人）+ `autoReassignRoundRobinHost`（系统按现有的 `LuckyUserService` 自动挑）+ `getReassignmentCandidates`（给弹窗提供候选名单，同样按 `booking.reassign` 最低角色过滤）
- 候选人 / 自动挑选的池子统一从 `eventType.hosts`（真正的轮询 host 记录）取，**不是** `eventType.users`——后者是一个团队轮询事件类型里几乎总是空的历史遗留关联表，第一版实现踩了这个坑（浏览器里实测 automatic reassign 报"没有配置其他 host"，人工排查确认 `_user_eventtype` 表对这个事件类型是空的），已修正
- 在 `viewer.teams.*` 下恢复了三个 tRPC 接口（`getRoundRobinHostsToReassign` / `roundRobinReassign` / `roundRobinManualReassign`），前端 `ReassignDialog.tsx` 接回真实调用；managed-event 类型的重新分配（另一种排期类型）明确保持未实现，不在本次范围内

**5）已知边界**

- 只有"提交预约"这个动作会走保底逻辑；但改期（reschedule）在 Cal.com 里底层复用的是同一条建预约流程（带上 `rescheduleUid`），所以一条**原本正常分配**的 round-robin 预约，如果被改期到一个"轮询池里所有人都没空"的新时间点，理论上同样会触发保底、变成 `AWAITING_HOST` 落进 Unallocated——这是沿用现有代码路径的自然结果，不是专门为保底做的新分支，暂未特殊处理。
- Managed event type（另一种排期类型）的重新分配保持未实现，走该类型的预约不受本节任何改动影响。
- 重新分配时的日历/视频同步是尽力而为（`try/catch` 包裹，从不阻塞核心的 DB 更新）——把已创建的日历事件真正迁移到新负责人的日历账号下是一个大得多的操作（相当于跨账号取消+重建），不在本次范围内。
- 保底/Unallocated 仅对**无需人工确认**的事件类型生效；需要确认的事件类型完全不受影响，继续走原有 `PENDING` 流程。

**验证方式**：全程在浏览器里用两个测试账号（team owner + team member）端到端走过：配置保底开关和人选、把两个正常销售的排班收窄到互不重叠的日子、用保底人身份约进一条 `AWAITING_HOST` 预约、确认它出现在保底人的 Unallocated 标签而不是 Upcoming、确认该标签下 Reschedule/Request reschedule/Edit location/Add guests 均为禁用状态（可见但灰置）；然后分别用手动重新分配（指定候选人）和自动重新分配（系统挑）把它转出去，确认数据库里 `status` 正确转回 `ACCEPTED`、`userId`/`reassignById`/`reassignReason` 正确写入、生成了 `AssignmentReason` 记录，且该预约从 Unallocated 消失、出现在新负责人的 Upcoming 里；也验证了 Cancel 对 Unallocated 预约仍然正常生效。自动重新分配那一步发现并修正了上面提到的 `eventType.hosts` vs `eventType.users` 的 bug；另外 Assignment 标签页的保底开关本身也曾有一个 Prisma 层的 bug（`fallbackHostUserId` 带 `@relation` 后不能作为裸标量字段出现在 `Prisma.EventTypeUpdateInput.data` 里，报 "Unknown argument fallbackHostUserId. Did you mean fallbackHostUser?"），已改为标准的 `connect`/`disconnect` 关系写法修复。

提交记录（按顺序）：`b0034380b5` `d4d28da68c`（事件类型级保底指针 + Assignment 开关，替换旧的 per-host 方案）、`dd11a2abfa`（提交时分配保底 + `AWAITING_HOST`）、`1f5457215e`（slot 显示层同步）、`8b47310d8a` `42094689c2`（Unallocated 标签，前后端）、`9432adfeaf` `1c6f2a0173` `415187e15e` `624d9dec84`（重新分配重做，仓库层 + service + tRPC + 前端接线）、`287ac9c1b7`（修复保底开关的 Prisma 关系写法 bug）、`b85d24952b` `bed45388bd`（收窄 Unallocated 的行内操作到 Reassign + Cancel）。

### 4.2 预填字段的动态锁定（如 VIN）

**现状**：
- URL 参数预填机制已存在（`prefillFormParams`，如 `?vin=xxx` 能把值塞进对应问题）
- 预约表单里有 `field.editable === "user-readonly"` 的字段模式（`apps/web/modules/bookings/components/BookEventForm/BookingFields.tsx:135`），命中时字段确实会渲染成不可编辑
- 但这个模式是**写死在事件类型的问题配置上的**——要么这个问题永远锁定（不管客户是谁），要么永远可编辑；无法做到"仅当这次请求带了值才锁定，没带就正常可填"
- 该"只读"选项在目前的自定义问题编辑器（`apps/web/modules/event-types/components/tabs/advanced/FormBuilder.tsx`）里也没有暴露成可勾选的入口，看起来是给系统内部保留的值

**需求**：系统里已经有客户的 VIN 等信息时，客户打开预约链接应看到该字段已预填且不可编辑；如果没有，应保持可编辑。

**建议方案**：改 `BookingFields.tsx` 里 `readOnly` 的判断逻辑，改为"这个字段被标记为可锁定 + URL 预填参数里这个字段确实带了非空值"才锁定，否则维持可编辑。可能还需要在事件类型问题配置里加一个"允许被预填锁定"的开关。

**规模**：中等，一处表单逻辑改动 + 可能的一小块配置 UI。

### 4.3 按团队 + slug 查询事件类型（供 staff 后台动态发现）

**现状**：
- `apps/api/v2/src/modules/teams` 目录下**没有任何 controller**，team 相关的对外 REST API 目前是空的
- `packages/platform/types/event-types/event-types_2024_06_14/inputs/get-event-types-query.input.ts` 里有一个 `GetTeamEventTypesQuery_2024_06_14`（支持按 `eventSlug` 过滤），但**没有接到任何 controller 上**，是孤立未使用的代码
- 有一个内部专用的 `GET /event-types/{slug}/public?teamId=` 查询（`apps/api/v2/src/modules/atoms/controllers/atoms.event-types.controller.ts`），但它标记为 `@DocsExcludeController`，是给内嵌组件（Platform Atoms）用的，不适合作为服务间调用的公开 API

**需求**：staff 后台需要动态知道"某个团队 + 某个用途"对应哪个 `eventTypeId`，不希望写死数字 ID（要考虑通用性，方便以后新增面试预约等场景）。

**建议方案**：新增公开 REST 接口：

```
GET /v2/teams/{teamId}/event-types?eventSlug={slug}
```

staff 后台只需要记住"团队 ID + 一个语义化的 slug"（如 `vehicle-delivery`，以后面试预约用 `interview`），不用碰数字 ID；新增用途时只需要在 cal.diy 里新建事件类型、定好 slug，staff 后台代码不需要改动。

**规模**：小，复用已有的半成品 DTO（`GetTeamEventTypesQuery_2024_06_14`），补 1 个 controller + 1 个 service 方法。

### 4.4 车辆交付邀请的完整调用链（组合已有能力，非新概念）

1. 车辆状态变为"可交付" → staff 后台调用 §4.3 的接口，用团队 ID + `eventSlug` 拿到 `eventTypeId`
2. staff 后台调用 `POST /v2/event-types/{eventTypeId}/private-links`，`maxUsageCount: 1`（可选 `expiresAt`），拿到唯一链接
3. staff 后台在链接后拼接客户信息作为 URL 参数（如 VIN），依赖 §4.2 做到预填并锁定
4. staff 后台通过自己的邮件/短信渠道把链接发给客户（**已确认**：staff 后台目前用 Cal 官方产品的方式发送，不需要 cal.diy 这边处理投递）
5. 客户点开链接预约，走 §3.1 的 round-robin + 店长兜底逻辑
6. 客户再次打开同一链接 → 系统按 `usageCount` 自动拒绝，无需额外开发

## 5. 账号打通（SSO / 统一账号）

**现状**：staff 后台没有标准的身份认证协议（非 SAML/OIDC），是内部自研系统。

**结论**：需要自建"信任桥接"机制——staff 后台登录后，携带一个签名过的短期 token 跳转到 cal.diy，cal.diy 校验 token 后自动登录/创建对应账号。

**待确认**（需要 staff 后台那边先明确）：
- token 怎么签发、用什么算法/密钥
- 账号字段如何对应（staff 后台的用户 ID/邮箱 是否与 cal.diy 的 User 一一对应）
- 新用户是否需要自动建号，还是要求提前在 cal.diy 侧预置好账号

此项待 staff 后台确定细节后再具体设计接口，是本次分析中唯一还没有明确技术方案的模块。

## 6. 优先级建议

1. **P0 - 直接配置，可立即验证**：§3.1 / §3.2 / §3.3（round-robin 优先级 + 按事件类型 Schedule）
2. **P1 - 小规模开发，支撑交车邀请闭环**：§4.3（team 事件类型查询接口）、§7（团队自动化管理 API）
3. **P2 - 中等规模开发**：§4.2（预填字段动态锁定）
4. **已完成**：§4.1（店长保底：事件类型级独立兜底人 + Unallocated 队列 + 重新分配）—— 分配、显示层、Unallocated 队列、手动/自动重新分配均已接上并端到端验证
5. **待外部依赖**：§5（账号打通）—— 卡在 staff 后台还没有可对接的协议，需要先跟对方确认

## 7. staff 后台自动化管理 API（团队 / 成员 / 事件类型 / Webhook）

**目标**：staff 后台持有一个"门店管理账号"的 API key，用它就能自动完成：建团队（如临时小组）或复用已有团队（如销售团队）、管理团队成员、给团队建事件类型（如"车辆交付"）、配置 webhook 接收预约通知——全程不需要人工登录 cal.diy 网页操作。

### 7.1 现状盘点

逐项查了 `apps/api/v2` 的代码，结论是：**大部分业务逻辑已经在 Service/Repository 层写好了，只是没有对外暴露 REST controller**，工作量比"从零开发"小很多。

| 能力 | Service/Repository 层 | Controller（对外接口） | 结论 |
|---|---|---|---|
| 创建团队 | `TeamsRepository.create()` 已有 | 无 | 只缺 controller |
| 查询/列出团队 | `TeamsRepository.getById/getByIds/getTeamsUserIsMemberOf/findTeamBySlug()` 全部已有 | 无 | 只缺 controller |
| 更新/删除团队 | `TeamsRepository.update/delete()` 已有 | 无 | 只缺 controller |
| 加成员 | `MembershipsRepository.createMembership(teamId, userId, role, accepted)` 已有 | 无 | 只缺 controller |
| 改成员角色 / 移除成员 | 没找到对应方法 | 无 | 需要新写 |
| 给团队建事件类型 | `TeamsEventTypesService.createTeamEventType(user, teamId, body)` 完整实现，内部调用 `createEventType()`，支持 hosts / round-robin 等 | 无 | 只缺 controller |
| 按团队 slug 查事件类型 | 见 §4.3，DTO 已有（`GetTeamEventTypesQuery_2024_06_14`） | 无 | 只缺 controller |
| 团队 / 事件类型维度的 webhook | `TeamEventTypeWebhooksService.createTeamEventTypeWebhook(eventTypeId, body)` 完整实现，含 URL 校验、去重、`payloadTemplate` | 无 | 只缺 controller |
| 用户维度的 webhook | 都有 | `POST/GET/PATCH/DELETE /v2/webhooks` **已经能用** | 已完成，但目前只能挂在调用者本人身上，不能指定 `teamId` |

### 7.2 建议新增的接口

新增到 `apps/api/v2/src/modules/teams`：

```
POST   /v2/teams                                 创建团队（调用方即 owner）
GET    /v2/teams                                 列出调用方所属/可管理的团队（含已有的销售团队）
GET    /v2/teams/{teamId}                        团队详情
PATCH  /v2/teams/{teamId}                        更新团队信息
DELETE /v2/teams/{teamId}                        删除团队（临时小组用完可清理）

POST   /v2/teams/{teamId}/memberships            加成员
PATCH  /v2/teams/{teamId}/memberships/{userId}   改角色（repository 层还没有，需要新写）
DELETE /v2/teams/{teamId}/memberships/{userId}   移除成员

POST   /v2/teams/{teamId}/event-types            建事件类型（如"车辆交付"），复用现成的 createTeamEventType
GET    /v2/teams/{teamId}/event-types?eventSlug= 按 slug 查事件类型（见 §4.3）

POST   /v2/teams/{teamId}/webhooks               团队维度 webhook，复用现成的 createTeamEventTypeWebhook 改造
```

### 7.3 鉴权

沿用现有模式：API key 挂在"门店管理账号"这个 user 身上，建团队时调用者自动成为 owner；团队相关操作走"调用者是不是该团队 admin/owner"的鉴权，与现有 `EventTypeOwnershipGuard` 同一思路。`ApiKey` 模型本身也支持把 key 直接锁定到某个 `teamId`（`ApiKey.teamId` 字段），如果希望 key 权限更收敛，可以走这条路线。

### 7.4 术语澄清

"人员变动，可以 webhook 或 api 修改这边的 team"——这里只能是 **API**（staff 后台主动调用 POST/PATCH/DELETE 来改 team）。"Webhook" 是反方向的（cal.diy 主动通知 staff 后台，比如预约发生时触发），两者不是一回事，设计接口时需要按这个方向来区分。

## 8. 已在本仓库完成的相关工作

- Team 权限管理系统（`TeamPermissionSetting`，覆盖事件类型创建/编辑、预约确认/取消/改期/备注/改地点/添加访客/标记未出席等 11 项细粒度权限，可按 team 配置最低角色）
- 上述权限的前后端全链路校验（UI 禁用 + 后端拦截），修复了多处"UI 挡住了但接口没挡"和"接口漏了权限判断"的问题
