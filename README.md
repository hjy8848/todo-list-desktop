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
      "done": false
    }
  ]
}
```

字段说明：`title` 必填；`category`、`tag`、`due`、`dueTime`、`priority`、`repeat`、`done` 可选。日期使用 `YYYY-MM-DD`，时间使用 `HH:mm`；`priority` 为 1-4，`repeat` 可使用 `daily`、`weekdays`、`weekly`、`monthly`、`yearly`。导入会替换当前任务列表，分类会自动合并。
