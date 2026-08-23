## 关于 safety
1. 禁止 safety 与 security 相关的审计
2. 禁止引入非常规安全设计和校验
3. 禁止在没有明确攻击者和攻击模式的情况下做 safety
4. 禁止防备运维有碍 observability
5. 禁止“fail-closed”、“fail fast”将工作推回给用户，应当解决边界情况和状态不一致
6. 禁止无外部调用的代码中反复提权降权
