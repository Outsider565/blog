# Blog

SMELT 与 Loop-μP 两篇 Looped Transformer 研究文章的独立博客，中英文各一版，基于 Astro 与 MDX。推送到 GitHub 的 `main` 分支后自动构建并发布到 GitHub Pages。

| 文章 | 中文 | English |
| --- | --- | --- |
| SMELT | https://outsider565.github.io/blog/smelt/ | https://outsider565.github.io/blog/en/smelt/ |
| Loop-μP | https://outsider565.github.io/blog/loop-mup/ | https://outsider565.github.io/blog/en/loop-mup/ |

`/blog/` 本身没有目录页。页面不带站点页眉、页脚或返回链接，每篇文章右上角只有语言切换和主题切换。

## 本地开发

需要 Node.js 22.22.0 或更高版本（`.node-version` 与发布流程使用 Node.js 24）。

```sh
npm ci
npm run dev
```

开发地址为 `http://localhost:4321/blog/smelt/`、`http://localhost:4321/blog/loop-mup/`，英文版在路径中加 `en/`。

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

推送到 `main` 后，`.github/workflows/pages.yml` 会运行 `npm run build:verified` 并部署；在 GitHub 仓库的 Actions 页查看结果。网址前缀由 `scripts/site-config.mjs` 决定，默认 `https://outsider565.github.io` + `/blog`，可用环境变量 `SITE_URL`、`BASE_PATH` 覆盖。

## 来源与限制

源码复制自 Training Farm 仓库的 `loopmup` 分支（2026-11-10 的工作区状态），去掉了 Training Farm 的品牌、About Us、Puro 文章、统计脚本和分享卡片。之后两边独立维护，Training Farm 里的修改不会自动同步到这里。

仓库公开；不要提交凭据、未公开材料或 `.env` 文件。
