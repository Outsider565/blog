# Blog

SMELT 与 Loop-μP 两篇 Looped Transformer 研究文章的独立博客，以及据此制作的一份报告幻灯片，中英文各一版，基于 Astro 与 MDX。推送到 GitHub 的 `main` 分支后自动构建并发布到 GitHub Pages。

| 页面 | 中文 | English |
| --- | --- | --- |
| SMELT | https://outsider565.github.io/blog/smelt/ | https://outsider565.github.io/blog/en/smelt/ |
| Loop-μP | https://outsider565.github.io/blog/loop-mup/ | https://outsider565.github.io/blog/en/loop-mup/ |
| 报告幻灯片 | https://outsider565.github.io/blog/loop-science/ | https://outsider565.github.io/blog/en/loop-science/ |

`/blog/` 本身没有目录页。页面不带站点页眉、页脚或返回链接，每篇文章右上角只有语言切换和主题切换。

## 报告幻灯片

共 42 页，中英文各一版，封面署名为“王少文 · 清华大学 / Shaowen Wang · Tsinghua University”。全稿从“如何稳定训练循环模型”推进到“预算匹配后循环为何值得训练”：开场 1 页、Loop-μP 17 页、SMELT 23 页、总结致谢 1 页。当前备注计划合计约 35 分 39 秒，时长与计时只在 S 备注面板和 `?presenter` 窗口展示。

16:9、白底，1280 × 720 的页面按窗口等比缩放。Loop-μP 先定义共享层循环模型与两个训练目标，再用固定变量位置的交互表回顾 μP、Depth-μP、CompleteP；随后提出共享循环问题，先区分残差流、分支预激活和输出，再用两个缩放变量、三个公式条件、内部与输出更新的对照以及交互可行域给出 Loop-μP 与完整配方。理论与实验保留 8 张图，实验依次展示初始化与训练后残差范数、前十步更新、初始化与训练后增量相关性、学习率迁移和 loss。详细推导保留在文章中；SMELT 完整包含开篇动画与 18 张图，覆盖预算匹配、三步消融、多尺度 Scaling Law、下游收益及循环内部机制。
- 翻页：→ ↓ PageDown 空格 / ← ↑ PageUp，Home / End 到首页和末页，输入页码后按 Enter 跳页；也可用底部工具栏或在触屏上左右滑动。网址里的 `#页码` 就是当前页，刷新和切换语言时保留。
- F 全屏；S 备注面板（含计时、本页计划时间和下一页标题）；P 打开备注窗口（`?presenter`），与放映页通过 BroadcastChannel 同步翻页，可以一边放英文一边看中文备注；O 页面目录；L 切换语言；? 按键说明。
- 焦点在交互图里时，方向键交给图使用（例如热力图），按 Esc 退出后继续翻页。图的入场动画在该页第一次出现时播放，回到该页时保持最终状态；开篇动画有“重播”按钮。
- 内容在 `src/data/loop-science/slides.ts`：每页的中英文标题、要点、所用的图、计划时长和备注。只引用两篇文章已有的文字、图注和数值；改动后保持中英两版同步。
- 页面框架 `src/components/deck/`（`LoopScienceDeck.astro` 排版各页，`DeckFigure.astro` 嵌入图表，`LoopDefinition.astro` 绘制共享层示意，`LoopProblem.astro` 展示核心公式，`ParameterTable.astro` 提供固定位置的参数化切换），样式 `src/styles/deck.css`，翻页与备注脚本 `src/scripts/deck.ts`，路由 `src/pages/loop-science.astro` 与 `src/pages/en/loop-science.astro`。
- 图按原有版宽排版后等比缩放；MMLU、领域收益和长度收益独立成页。专家复用分成“16 组配置总览”和“单 token 路由动画 + 重叠分布”两页，两处控件和 DOM ID 独立。三个公式条件、内部与输出更新的对照、可行域分别单独成页。
- 每页含中英双语第一人称口播稿。页脚只展示篇章与页码；章节封面保留完整作者、单位与 arXiv 编号。涉及其他工作的页面保留学术尾注。
- 幻灯片隐藏图下的数据表、读数行，以及 SMELT 图 5 的所选训练曲线和图 6 的代入试算；Dyck 示例原文可滚动查看。原始文章保留完整交互内容。
- 字体沿用 Farm Sans 中文子集，已从同版本 Noto Sans CJK SC 2.004 补齐报告所需汉字。修改文案后检查常规和粗体字形覆盖，并用浏览器逐页核验公式、缩放与交互。

## 本地开发

需要 Node.js 22.22.0 或更高版本（`.node-version` 与发布流程使用 Node.js 24）。

```sh
npm ci
npm run dev
```

开发地址为 `http://localhost:4321/blog/smelt/`、`http://localhost:4321/blog/loop-mup/`、`http://localhost:4321/blog/loop-science/`，英文版在路径中加 `en/`。

```sh
npm run build:verified   # 类型检查 + 构建，输出到 dist/
npm run preview          # 本机预览 dist/，地址 http://127.0.0.1:4173/blog/
```

## 修改与发布

- 正文：`src/content/blog/zh/` 与 `src/content/blog/en/` 下的 `smelt.mdx`、`loop-mup.mdx`。两种语言用相同的 `urlSlug`，它决定网址。
- 署名、图注、引用：`src/data/smelt/`、`src/data/loop-mup/`（`authors.json`、`citation.bib` 等）。
- 交互图：`src/components/{smelt,loop-mup}/`，计算在 `src/lib/{smelt,loop-mup}/`，浏览器脚本在 `src/scripts/{smelt,loop-mup}/`，样式在 `src/styles/`。
- 论文原图：`public/images/smelt/`（SVG，按字节复制，勿转码）。
- 页面框架：`src/layouts/ArticlePage.astro`（标题区、目录、引用块）与 `src/layouts/SiteLayout.astro`（`<head>` 元数据）。
- 报告幻灯片：见上文“报告幻灯片”一节。

推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run build:verified` 并部署；在 GitHub 仓库的 Actions 页查看结果。网址前缀由 `scripts/site-config.mjs` 决定，默认 `https://outsider565.github.io` + `/blog`，可用环境变量 `SITE_URL`、`BASE_PATH` 覆盖。

## 来源与限制

源码复制自 Training Farm 仓库的 `loopmup` 分支（2026-11-10 的工作区状态），去掉了 Training Farm 的品牌、About Us、Puro 文章、统计脚本和分享卡片。之后两边独立维护，Training Farm 里的修改不会自动同步到这里。

仓库公开；不要提交凭据、未公开材料或 `.env` 文件。
