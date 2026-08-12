# SECURITY.md — OPEN HNBC 安全说明

> 最后更新：2026-08-11
> 适用仓库：`open-HNBC/HNBCTeam`（前端静态站，开源）
> 后端：`backend/hnapi/`（腾讯云开发 CloudBase 云函数，**不进本开源仓库**，由 `.gitignore` 忽略）

---

## ⒈ 安全模型（务必先读）

本项目是**前端开源、后端闭源**的分离架构：

- **前端**：纯 HTML + 原生 ES Module JS，托管于 GitHub Pages / CloudBase 静态托管。**代码完全公开**，任何人可下载、改 JS、本地起服务、抓包分析接口。
- **后端**：Node.js 云函数（`backend/hnapi/`），运行在 CloudBase，绝不在开源仓库内。

**核心原则**：因为前端代码公开，攻击者可绕过网页直接调用后端接口。所以**所有安全边界（鉴权、限流、校验、内容管控）都必须在后端实现**；前端只做展示、收集输入、改善普通用户体验，**前端校验不可作为安全防御**。

> ⚠️ 本仓库根目录的 `json/domain-lock.js` 仅做**版权警示 + 体验拦截**（非官方域名访问时弹红屏侵权警告）。它是前端脚本，攻击者删掉即可绕过，**不是安全边界**。真正拦死非官方部署的，是后端 CORS / Referer / 鉴权。

---

## ⒉ 密钥与凭证管理（最高优先级）

| 密钥 | 存放位置 | 读取方式 |
|------|----------|----------|
| JWT / 会话签名、AES 加密密钥 | CloudBase 控制台环境变量 | `process.env.*` |
| DeepSeek Key | CloudBase 控制台环境变量 | `process.env.*` |
| 腾讯云 SecretId / SecretKey | 云函数运行角色 / 环境变量 | 由 SDK 自动或 `process.env.*` |
| SMTP 账号密码 | CloudBase 控制台环境变量（`HN_SMTP_*`） | `process.env.*` |

**规则**：
- 所有密钥**只存在于 CloudBase 环境变量**，由后端 `process.env.*` 读取；**绝不**出现在源码、前端、表单、聊天记录或任何会被提交到公开仓库的地方。
- 本仓库 `.gitignore` 已忽略 `backend/`、`cloudbaserc.json`、`.env` 等；推送前仍需人工确认无密钥误提交（见第 6 节核查清单）。
- **腾讯云密钥泄露应急**：一旦 SecretId/SecretKey 在任何渠道暴露，**立即到腾讯云控制台禁用并重新生成**，再更新 CloudBase 环境变量。泄露的密钥等于把云数据库与接口能力交予他人。本仓库曾短暂在对话中粘贴过一对临时密钥，按"用完即废"处理并已作废。

---

## ⒊ 已落实的安全控制（正确做法）

以下为当前后端**已实现**的防护，供审计核对：

| 控制项 | 实现位置 | 说明 |
|--------|----------|------|
| CORS 白名单 | `backend/hnapi/middleware.js` `ALLOW_ORIGINS` | 默认仅 `https://openhnbc.com`、`https://www.openhnbc.com`；来源不在白名单返回 `403`。**非 `*` 通配**。可通过 `HN_ALLOWED_ORIGINS` 环境变量覆盖。 |
| Referer 兜底 | `middleware.js` `checkReferer` | 无 `Origin`（同站请求）时按 Referer 校验必须来自官网；非官网直接 `403`。 |
| 会话鉴权 | `middleware.js` `verifyToken` | 从请求头 `Authorization: Bearer <token>` 取令牌，查 `open_sessions` 集合；过期自动删除。身份 `emailHash` **仅从会话记录解析，绝不读 body/header 传入的 userId**。 |
| 令牌属性 | `index.js` 登录逻辑 | 登录签发**随机 24 字节会话令牌**，存 `open_sessions`，**7 天**过期，可吊销。非永久 token。 |
| 验证码防刷 | `index.js` `/open-auth/send-code` | 按邮箱哈希限流：同一邮箱 **60 秒** 最多 1 次（`rateLimit('code:'+hash,1,60000)`）。 |
| 验证码强度 | `index.js` 登录逻辑 | 登录验证码强制 `^\d{6}$`（6 位数字），非 6 位直接拒绝。 |
| 邮箱格式 / 长度 | `index.js` | 邮箱正则校验，且 `length > 254` 直接拒绝超长参数。 |
| 验证码不外泄 | `email.js` `sendCode` | 生产环境（`HN_DEV≠1`）**绝不明文回传验证码**；仅 `HN_DEV=1` 联调模式才回传。 |
| 邮箱加密存储 | `lib.js` | 用户邮箱 AES 加密为 `email_enc` 入库，查询用 `emailHash`；库内不明文存邮箱。 |
| 错误不泄露内部信息 | `index.js` 全局 catch | 异常统一返回「服务器内部错误，请稍后再试」，**不回传堆栈 / 库结构 / 内部报错**。 |
| 越权删除保护 | `index.js` 删帖 / 删评论 | 仅作者本人或管理员可删；管理员经 `isAdmin` 校验。 |
| 数据表授权范围 | `lib.js` `BUCKET` | 后端仅访问 `open_` 前缀集合（`open_users/open_admins/open_sessions/open_posts/open_comments/open_likes/open_codes`），不碰其他集合。 |
| 前端 XSS 转义 | `json/community.js` `esc()` | 所有用户内容（标题/正文/评论/昵称/头像 URL）渲染前经 `esc()` 转义，再 `innerHTML`。攻击者直接调 API 提交恶意内容也会被转义。 |

---

## ⒋ 已修复的漏洞（2026-08 安全加固）

| 编号 | 漏洞 | 位置 | 修复方式 |
|------|------|------|----------|
| V-1 | 登录验证码未强制为 6 位数字，任意长度均可尝试 | `index.js` `/open-auth/login` | 增加 `^\d{6}$` 强校验，非 6 位数字直接 `参数错误` 拒绝 |
| V-2 | 邮箱参数无长度上限，可传超长字符串 | `index.js` 登录 / 发码 | 增加 `email.length > 254` 拒绝 |
| V-3 | 500 异常把 `e.message` 回传前端，泄露内部报错 / 库结构 | `index.js` 全局 catch | 改为统一「服务器内部错误，请稍后再试」 |
| V-4 | 缺失的 `token-check.js` 被 `index.html`/`docs.html` 引用（404） | 前端 | 替换为 `json/domain-lock.js`（域名锁 + 版权警告） |
| V-5 | 非官方域名 / 本地 / file:// 打开可正常渲染站点内容 | 前端 | 新增 `json/domain-lock.js`：非含 `openhnbc.com` 的域名整页清空并弹红屏侵权警告（含简/EN 切换） |

> 说明：V-4 / V-5 属于**版权与体验层**防护，非安全边界，详见第 1 节。

---

## ⒌ 已知剩余风险（建议后续处理）

按严重程度排序，**均未修复或有条件限制**：

### 🟡 中危
3. **个人资料接口下发明文邮箱**（`index.js` `getProfileView`，第 65 行）。虽仅在本人登录态返回，但仍把解密后的明文 `email` 下发前端，属不必要的数据暴露。建议前端只接收脱敏 `emailMask`，明文留在后端。
4. **前端 token 存 `localStorage`**（`json/community.js` 等）。当前 XSS 已通过 `esc()` 缓解；但一旦未来出现 XSS 疏漏，令牌可被 JS 读取。彻底解决需迁移至后端 `HttpOnly; Secure` Cookie + CORS 带 `credentials`。
5. **SMTP 未配置时返回 `ok:true` 误导用户**（`email.js` `sendCode`，第 201 行）。生产未配 SMTP 时验证码实际发不出去，却返回成功，用户以为已发送。建议未配置 SMTP 且非 DEV 时返回明确错误（如「邮件服务未配置」）。

### 🟢 低风险 / 规范
6. **`permaUrl` 签发 100 年有效签名 URL**（`email.js` 第 41 行）。邮件图片签名链接实质永不过期，泄露后长期有效。建议缩短有效期或改用公开读。
7. **`email.js` 顶层 `console.log` 打印模块版本**（`email.js` 第 11 行）。污染云函数日志，上线建议去除；且 `sendCode` 内 `console.log` 打印 `bannerUrl` 等，建议降级为 debug 级。
8. **依赖版本未锁定**。`package.json` / `package-lock.json` 被 `.gitignore` 忽略，部署时依赖版本不确定，可能引入非预期版本（含已知漏洞）。建议锁定并记录依赖摘要。
9. **`views` 字段不自增**（`index.js` 帖子详情）。浏览量统计恒为 0，属功能缺陷非安全问题。
10. **错误统一返回 HTTP 200 + `{ok:false}`**（`index.js` 多处）。前端易判断，但 HTTP 语义不规范（应 4xx/5xx）。不影响功能。

---

## 6. 漏洞上报

请勿在 Issue、评论区公开披露安全漏洞，避免风险扩散。

### 上报渠道
1. 官网 openhnbc.com → 社区 → 反馈
2. 联系邮箱：furrynaling@outlook.com

提交漏洞建议尽量附带：漏洞类型、复现步骤、影响范围、修复建议（可选）。我们会在合理周期内评估并跟进修复。

### 不受理的上报范围
- 第三方依赖库通用漏洞，但在本项目业务逻辑中无法触发利用
- 暴力破解、社会工程学、针对开发者个人账号 / 服务器的渗透
- 普通功能建议、bug 反馈（请提交 Issue）
- 网络 / CDN / 运营商层面问题
- 用户私自部署本项目后产生的故障（前端开源可被任何人本地运行，属预期）
