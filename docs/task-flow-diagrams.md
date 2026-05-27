# 任务管理 — 业务流程图

> 与前端代码分离的独立流程文档。Mermaid 源码可直接在 Cursor、GitHub、语雀、飞书等支持 Mermaid 的工具中渲染。  
> 状态定义详见 [task-state-machine.md](./task-state-machine.md)。

---

## 图例

| 角色 | 颜色标识 | 说明 |
|------|----------|------|
| 需求方 | 🟣 紫色 | 提交观测需求、发起单位用户 |
| 运营商 | 🔵 蓝色 | 拍摄单位（供应商） |
| 系统 | ⚪ 灰色 | 接收需求后生成任务、自动质检等 |

---

## 图 0 · 任务来源（业务起点）

```mermaid
flowchart LR
    DEM[需求方 提交观测需求] --> SYS[系统 生成拍摄任务 状态10]
    SYS --> OPR[运营商 任务管理受理]
    SYS --> DEM2[需求方 查看任务进度]

    style DEM fill:#f9f0ff,stroke:#722ed1
    style SYS fill:#fafafa,stroke:#bfbfbf
    style OPR fill:#e6f4ff,stroke:#1677ff
    style DEM2 fill:#f9f0ff,stroke:#722ed1
```

---

## 图 1 · 任务主状态机（按角色标注流转）

```mermaid
stateDiagram-v2
    direction TB

    classDef terminal fill:#f5f5f5,stroke:#d9d9d9,color:#595959
    classDef active fill:#e6f4ff,stroke:#1677ff,color:#001d66
    classDef initial fill:#fff7e6,stroke:#faad14,color:#874d00

    [*] --> S10

    state "10 未受理" as S10
    state "20 已受理" as S20
    state "40 拒绝" as S40
    state "50 失败" as S50
    state "60 完成" as S60
    state "90 取消" as S90

    S10 --> S20: 🔵 运营商\n确认受理
    S10 --> S40: 🔵 运营商\n拒绝受理
    S10 --> S90: 🟣 需求方\n取消任务

    S20 --> S60: 🔵 运营商\n确认上传\n(需已上传影像)
    S20 --> S50: 🔵 运营商\n任务失败

    note right of S10
        🟣 需求方提交观测需求
        ⚪ 系统生成任务
    end note

    note right of S60
        ⚪ 系统：自动质检通过
        （审批记录展示）
    end note

    class S10 initial
    class S20 active
    class S40,S50,S60,S90 terminal
```

---

## 图 2 · 端到端泳道流程（主路径 + 分支）

```mermaid
flowchart TB
    subgraph DEM["🟣 需求方"]
        direction TB
        A0[提交观测需求]
        B1[查看任务列表/详情]
        B2{未受理?}
        B3[取消任务 → 90]
        B4[等待运营商处理]
        B5{已完成且有成果?}
        B6[下载影像成果]
        B7[空态：暂无影像成果]
    end

    subgraph SYS["⚪ 系统"]
        direction TB
        A2[接收观测需求<br/>生成拍摄任务<br/>状态：10 未受理]
    end

    subgraph OPR["🔵 运营商"]
        direction TB
        C1{未受理?}
        C2[确认受理 → 20]
        C3[拒绝受理 → 40]
        C4[已受理：上传影像结果]
        C5{上传成功?}
        C6[确认上传 → 60]
        C7[任务失败 → 50]
        C8[填写审批意见]
    end

    A0 --> A2
    A2 --> B1
    A2 --> C1

    B1 --> B2
    B2 -->|是| B3
    B2 -->|否| B4
    B4 --> B5
    B5 -->|是| B6
    B5 -->|否| B7

    C1 -->|是| C2
    C1 -->|是| C3
    C1 -->|否| C4
    C2 --> C4
    C4 --> C5
    C5 -->|是| C6
    C5 -->|拍摄/成像失败| C7

    C2 -.-> C8
    C3 -.-> C8
    C6 -.-> C8
    C7 -.-> C8

    C6 --> B5
    C3 --> B7
    C7 --> B7
    B3 --> B7

    style SYS fill:#fafafa,stroke:#bfbfbf
    style DEM fill:#f9f0ff,stroke:#722ed1
    style OPR fill:#e6f4ff,stroke:#1677ff
```

---

## 图 3 · 已受理（20）子流程：上传与确认

> 主状态保持 `20`，直到运营商点击「确认上传」或「任务失败」。

```mermaid
sequenceDiagram
    autonumber
    participant 需求方
    participant 系统
    participant 运营商

    需求方->>系统: 提交观测需求
    系统->>系统: 生成拍摄任务 状态10未受理

    Note over 运营商: 任务已在 20 已受理

    需求方->>需求方: 查看详情（审批记录只读）
    需求方->>需求方: 数据信息：空态 + 下载禁用

    运营商->>运营商: 结果上传环节（中性样式，无蓝色高亮）
    运营商->>运营商: 可选填审批意见

    运营商->>运营商: 点击「上传影像结果」
    Note over 运营商: 模拟上传 ~1.5s
    运营商->>运营商: 附件区出现 Zip 卡片
    运营商->>运营商: 结果上传环节 → 蓝色高亮

    alt 确认上传
        运营商->>运营商: 点击「确认上传」
        系统-->>系统: 状态 → 60 完成<br/>写入 uploadTime / resultUploaded
        需求方->>需求方: 可下载影像成果
    else 任务失败
        运营商->>运营商: 点击「任务失败」
        系统-->>系统: 状态 → 50 失败
        需求方->>需求方: 空态：无可用成果
    end
```

---

## 图 4 · 审批子流程 × 主状态矩阵

```mermaid
flowchart LR
    subgraph steps["审批四步"]
        direction TB
        P1[① 任务创建]
        P2[② 任务受理]
        P3[③ 结果上传]
        P4[④ 任务完成]
        P1 --> P2 --> P3 --> P4
    end

    subgraph s10["10 未受理"]
        T10_1[✓ 完成]
        T10_2[● 进行中·可编辑]
        T10_3[○ 等待]
        T10_4[○ 等待]
    end

    subgraph s20["20 已受理"]
        T20_1[✓ 完成]
        T20_2[✓ 完成]
        T20_3a[● 进行中·未上传·中性]
        T20_3b[● 进行中·已上传·蓝色]
        T20_4[○ 等待]
    end

    subgraph s60["60 完成"]
        T60_1[✓]
        T60_2[✓]
        T60_3[✓]
        T60_4[✓ 系统质检]
    end

    subgraph s40["40 拒绝"]
        R40_2[✗ 已拒绝]
    end

    subgraph s50["50 失败"]
        R50_3[✗ 失败]
    end
```

**图例：** ✓ 已完成 · ● 进行中 · ○ 未开始 · ✗ 异常/拒绝

---

## 图 5 · 双视角数据可见范围

```mermaid
flowchart TB
    subgraph pool["任务池（Mock 6 条）"]
        T[01~06 各一种状态]
    end

    subgraph dem["🟣 需求方视角"]
        D1[筛选：initiatorOrg = 本机构]
        D2[可见 6 条 Mock 任务]
    end

    subgraph sup["🔵 运营商视角"]
        S1[筛选：shootCompany = 本运营商]
        S2[可见 6 条 Mock 任务]
    end

    pool --> D1 --> D2
    pool --> S1 --> S2

    style dem fill:#f9f0ff,stroke:#722ed1
    style sup fill:#e6f4ff,stroke:#1677ff
```

---

## 使用说明

1. **预览：** 在 VS Code / Cursor 安装 Mermaid 插件，或使用 GitHub 直接预览 `.md` 文件。
2. **导出图片：** 复制 Mermaid 代码块到 [mermaid.live](https://mermaid.live) 导出 PNG/SVG。
3. **同步维护：** 前端状态逻辑变更时，先更新 `task-state-machine.md`，再更新本文件中的图。
4. **与代码关系：** 本文档不引用、不修改任何 `.js` / `.html` 文件。

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-25 | 初版，含状态机图、泳道图、上传子流程、审批矩阵、视角范围图 |
| 2026-05-25 | 明确任务来源：需求方提交观测需求 → 系统生成任务 |
