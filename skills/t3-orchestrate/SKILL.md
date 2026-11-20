---
name: t3-orchestrate
description: "跨 agent / 跨模型委派：通过 T3 Code MCP 让另一个 provider 或模型做事，包括子任务、多模型并行、续写已有子线程、新开顶层线程、在另一台机器上运行。用户要求“让某模型/agent 去做 X”或写出 `provider:model:effort` 记法时使用；任务需要另一个 provider、模型、推理设置或独立 checkout 时也使用。"
---

# 通过 T3 委派其他 agent

本 skill 只用于跨 agent、跨模型的委派：需要另一个 provider、模型、推理设置或独立 checkout。如果子 agent 与当前会话的 provider 相同、模型由宿主提供、且没有额外设置，用宿主原生的子 agent 工具（Claude 的 `Agent`），不必遵循本 skill。

## 选形态

先判断结果要不要回到当前会话，再按下表选工具：

| 情况 | 工具 |
|---|---|
| 要拿到结果 | `delegate_task` |
| 让已完成的子任务在原上下文里接着做同一件工作 | `t3_thread_send` 发往它的 `childThreadId` |
| 用户明确要求新开一个独立会话，由用户自己去驱动 | `t3_thread_launch`（单个，可绑定 worktree）或 `create_threads`（多个，在当前 checkout） |

复审和复核用新的 `delegate_task`。新任务看不到之前的过程，结论才独立。

## 步骤

### 1. 定 target

用户可能用**记法** `provider:model:effort(other_config)` 指定 target，例如 `codex:gpt-6.2-sol:xhigh(full_access)`。逐段拆开：

- `provider`、`model` → `target.providerInstanceId`、`target.model`
- `effort` → 能力表里这个模型的推理强度选项，写进 `target.options`
- `other_config` → 逗号分隔的其他设置，按意思对应到能力表里的 `options` 键，或者对应到 `runtimeMode`这类调用参数。例如 `full_access` → `runtimeMode: "full-access"`

本线程第一次委派前调用一次 `orchestrator_capabilities`；出错后，或用户换了 provider，再调用一次。短列表里没有的模型用 `search` 查找；在另一台机器上运行时传 `environmentId`，机器列表用 `t3_environment_links` 查看。provider、model 和 `options` 的键与取值，按能力表的原样填写。

完成：用户指定的每一项都在能力表中找到了对应。缺任何一项时，告诉用户缺的是哪一项，然后停下来等用户决定。

### 2. 写简报

子 agent 只收到 `task`，看不到当前会话。简报要写明：

- **目标**：要回答的问题，或要完成的改动。
- **位置**：用绝对路径指出要读或要改的文件、目录。
- **已知信息**：已经确认的事实，以及已经排除的方向。
- **范围**：只读，或者允许修改哪些文件；能否提交、联网、运行命令。
- **交付**：最终回复里要有什么、用什么格式。

`runtimeMode` 不传，子 agent 继承当前会话的权限，默认是 `full-access`，可以读写文件、执行命令。因此子 agent 能做什么，完全由简报中的范围决定；只读要求也要写在简报里。`role` 会给子线程的消息加角色前缀。这两个参数只在用户要求时传。

完成：一个完全没有上下文的同事拿到简报后，不用提问就能开始工作。

### 3. 选工作区

- `isolation: "shared"`（缺省）：子 agent 和你共用当前 checkout。适合只读，或只有一个 agent 在改文件。
- `isolation: "worktree"`：从父提交新建一个 checkout，只包含已提交的内容。多个子 agent 同时改代码，或者每个子 agent 要各自出一个 PR 时用它。

完成：同时修改同一个 checkout 的 agent 不超过一个；需要被子 agent 看到的修改已经提交，或者已经写进简报。

### 4. 发出

- 用 `mode: "async"`（缺省）。任务能在 45 秒内完成时可以用 `mode: "wait"` 直接拿结果；`wait` 最多等 45 秒，超时不会取消子任务，如果需要继续等待就看第 5 步。
- 多个互不依赖的子任务，在同一个回复里一次全部发出。
- 记下返回的 `taskId`、`childThreadId`、`link` 和 `next`。
- 调用报错或回复丢失时，用同一个 `clientRequestId` 重发，以免重复启动。

完成：每个子任务都有 `taskId` 和 `link`。

### 5. 等待

选一种等法：

- **结束本回合**（缺省）：按返回的 `next` 结束当前回合。子任务进入终态后会唤醒你，唤醒消息带任务标题、终态和最终回复。后续工作依赖这个结果时，被唤醒后从中断的那一步接着做，直到原来的流程做完。
- **留在本回合**：任务很短时，对 `childThreadId` 循环调用 `t3_thread_wait`，直到 `status` 进入终态（`completed`、`failed`、`interrupted`）。这时 `delegate_task` 返回的“不要等待”的 `next` 不适用。
- 通过 `t3_thread_launch` 或 `create_threads` 创建的**顶层线程**：不会唤醒你，结果用 `t3_thread_wait` 去取。

完成：每个子任务都已进入终态，或者回合已经结束、等待唤醒。

### 6. 读结果

- `task_status` 的 `summary` 是最终结果的摘要，唤醒消息里带的就是它。`workState` 为 `waiting_for_children` 时，说明它的子任务还没完成，结果还不能用。
- 要逐字使用结果（审稿意见、报告、代码评审）时，用 `t3_thread_read` 读 `childThreadId`。默认最新的消息排在前面：从头读用 `afterPosition: -1`，之后接着用返回的 `nextPosition`；单条被截断时，用 `itemId` 加 `textOffset: nextTextOffset` 读到结尾；`maxCharsPerItem` 最大 20000。
- 读完最终结果后，这个子任务会被标记为已交付。

完成：结论依赖的部分，已经读到原文的最后一个字。

### 7. 处理与汇报

- 子任务失败、`interrupted` 或回复为空时：把 `link` 和已读到的内容告诉用户，由用户决定是重试还是调整。重试时沿用原来的 provider 和模型。
- 用户提出新的要求，需要改变正在运行的子任务时：用 `t3_thread_send` 加 `mode: "steer"` 发给它。
- 替换或停止子任务用 `task_cancel`，它会一并停掉这个子任务的下级任务和之后的运行。顶层线程用 `t3_thread_interrupt`。
- 在回复里提到子任务或线程时，原样使用它的 `link`。

完成：每个子任务都已交付、已取消，或者已经把它的状态告诉了用户。
