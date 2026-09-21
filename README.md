# Todo清单桌面应用

一个参考截图风格制作的轻量 Todo 桌面应用，使用 Electron + 原生 HTML/CSS/JavaScript。

## 运行

```powershell
npm install
npm start
```

任务和分类会保存在 Electron 的本地存储中。支持：

- 回车快速添加任务；输入 `明天` / `后天` 自动设置日期；使用 `#标签` 添加标签
- 支持自然语言快速录入：`明天 14:00 完成周报 #写作 p1 每周`
- 完成、删除、双击修改任务
- 点击旗帜循环设置 P1-P4 优先级；重复任务完成后会自动排到下一次
- 按分类、搜索关键词和完成状态筛选
- 任务详情抽屉：日期、时间、提醒、备注、分类、优先级和子任务
- 智能导入：支持 JSON、AI 代码块、Markdown 勾选列表、TXT 普通文本和基础 CSV；支持拖拽文件、追加/覆盖、重复检测和撤销
- 日程概览：月历视图；数据复盘：完成率、分类和优先级统计
- 支持在任务列表中拖拽调整同一日期/优先级下的顺序
- 分类右键重命名/删除；导入后支持撤销；`Ctrl+Shift+A` 全局快速添加
- 系统托盘入口、白噪音和本地系统提醒
- 40 分钟番茄专注计时器

## AI 导入格式

点击应用里的“导入 / 导出”，粘贴 JSON 或 Markdown 中的 `json` 代码块即可导入。AI 可以按下面的格式生成任务：

```json
{
  "format": "todo-list",
  "version": 1,
  "categories": ["工作", "生活"],
  "tasks": [
    {
      "title": "完成项目周报",
      "category": "工作",
      "tag": "写作",
      "due": "2026-09-21",
      "dueTime": "14:00",
      "priority": 1,
      "repeat": "weekly",
      "notes": "整理实验结果并附上结论",
      "reminderAt": "2026-09-21T13:30",
      "subtasks": [
        { "title": "汇总数据", "done": false },
        { "title": "写结论", "done": false }
      ],
      "done": false
    }
  ]
}
```

字段说明：`title` 必填；`category`、`tag`、`due`、`dueTime`、`priority`、`repeat`、`notes`、`reminderAt`、`subtasks`、`done` 可选。日期使用 `YYYY-MM-DD`，时间使用 `HH:mm`；`priority` 为 1-4，`repeat` 可使用 `daily`、`weekdays`、`weekly`、`monthly`、`yearly`。导入默认追加到当前任务，也可以切换为覆盖；默认按“标题 + 日期 + 分类”跳过重复项，并提供一次“撤销导入”。
