# 需求分析：车辆交付预约系统（基于 cal.diy）

> 状态：分析阶段，尚未开始开发。本文档汇总讨论过程中的结论，供排期和跟 staff 后台对齐使用。
> 最后更新：2026-08-12

## 1. 背景

公司希望基于 Cal.com 做一套自己的预约系统（即本仓库 cal.diy），核心场景是车辆交付预约，但要求架构保持通用，以便后续扩展到其他预约场景（例如面试预约）。

预约系统需要跟公司内部的 **staff 后台**（另一套内部系统）打通账号体系。

## 2. 需求清单与结论

| # | 需求 | 结论 | 是否需要开发 |
|---|---|---|---|
| 1 | 客户可以随时自助预约 | 已有，公开预约页本身不需要登录 | 否 |
| 2 | 预约先在 team 内部分配，分配不了转店长 | Round-robin 事件类型 + `Host.priority`（销售中/高优先级，店长最低优先级）即可实现 | 否，纯配置 |
| 3 | 店长作为保底，不能因为自己排班窄而约不进去 | 店长的 Schedule 覆盖范围需要 ≥ 事件类型对外开放的完整预约窗口 | 否，纯配置（需要注意的坑，见 §3.3） |
| 4 | 店长作为保底，不能因为同一时间已有别的预约就被排除 | Cal.com 的轮询分配对已占用时间段有硬性冲突过滤，无法通过配置绕过 | **已完成**（预约提交时），**但有一个未解决的缺口**，见 §4.1 |
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

### 3.2 按事件类型设置不同可用性

- 不需要拆分 team。每个事件类型可以绑定独立的 Schedule（`packages/prisma/schema.prisma` 的 `Schedule` / `Availability` 模型，`Availability.date` 字段支持按具体日期做例外）
- "交车"事件类型 → 绑定一个把圣诞节整天 block 掉的 Schedule
- "参观"事件类型 → 绑定值班人员各自的排班，谁那天真的排了班，谁的时间就会出现在可预约时段里

### 3.3 店长 Schedule 覆盖坑

- Round-robin 的 `priority` 只决定"在有空的人里选谁"，不会覆盖"这个人有没有配置可用时间"这一层
- 如果店长自己的 Schedule 比销售窄，会出现"销售都没空、但也超出店长排班"的时间段，导致这个时段直接约不进去，不是真正的保底
- 要求：店长的 Schedule 覆盖范围需要 ≥ 事件类型对外开放的完整预约窗口

## 4. 需要开发的项

### 4.1 店长忽略时间冲突（始终可被分配）—— 已完成，但有一个未解决的缺口

**问题**：Cal.com 轮询分配在 `packages/features/bookings/lib/handleNewBooking/ensureAvailableUsers.ts` 中有硬性冲突过滤：

```ts
checkForConflicts({ busy: bufferedBusyTimes, time: ..., eventLength: ... })
```

只要候选人在该时间段已有一条预约（不论是本事件类型还是其他、甚至同步的外部日历事件），会被直接从候选池中排除，没有开关可以绕过。若所有销售 + 店长都因各自已有安排被排除，会直接报错"无可用人员"，客户约不上。

**需求**：店长作为保底角色，即使已有重叠预约，也应该始终能被分配到新的一条。

**已完成的部分**：

1. `packages/prisma/schema.prisma` — `Host` 模型加了 `ignoreTimeConflicts` 布尔字段（默认 `false`），已迁移
2. `ensureAvailableUsers.ts` — 该 host 被标记时跳过 `checkForConflicts`（仍然落在他自己配置的工作时间窗口内，不会变成 24 小时随便约）
3. 团队事件类型编辑页 → Assignment 标签 → host 列表 → 加了一个盾牌图标开关（priority/weight 旁边），owner 可以勾选；已在浏览器里端到端验证：勾选、保存、刷新页面后状态正确读回，数据库里 `Host.ignoreTimeConflicts` 字段正确持久化

提交记录：`f18d847f9c`（后端）、`c0e5e0d8dc`（UI）。

**⚠️ 未解决的缺口（重要，会影响这个功能实际能不能用）**：

上面这套改动只覆盖了**预约提交那一刻**的校验（`ensureAvailableUsers.ts`）。但客户在预约页面上"能看到哪些时间段可点"，走的是**另一套完全独立的计算**——`packages/trpc/server/routers/viewer/slots/util.ts`（`AvailableSlotsService`）+ `packages/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability.ts`，这套逻辑目前**不知道 `ignoreTimeConflicts` 这个字段**。

实际影响：如果店长这个时间点已经有别的预约压着，即使他被标记了"忽略冲突"，客户在日历上很可能根本看不到这个时间段可选（因为显示层还是把他当"忙碌"处理，直接算不出可用时间）——也就是说，客户自助预约这条主路径下，这个保底功能目前可能**触发不到**。已确认能生效的场景是：预约不是通过客户自己在日历上选时间产生的（比如内部直接创建、或者通过某个不经过这套 slot 计算的入口）。

要彻底解决，需要把同样的"跳过冲突检查"逻辑也接到 slot 显示计算这条链路上——但这是另一个独立、体量相近甚至更大的改动，触达的是全应用每次日历页面加载都会走的核心文件，风险和范围都明显超出这次"开发 4"的既定范围，所以**没有在这次一起做**，需要你确认是否要继续往下做。

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
4. **已完成，但有缺口待决策**：§4.1（店长忽略冲突）—— 预约提交时的校验已完成并验证；slot 显示层还没接，实际可能触发不到，需要确认是否继续投入
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
