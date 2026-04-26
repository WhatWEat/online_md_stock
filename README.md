# Web

本目录既可以作为主仓库里的站点工程，也可以单独作为一个 GitHub Pages 发布仓库。

本地启动：

```bash
cd web
npm install
npm run docs:dev
```

构建静态站点：

```bash
cd web
npm run docs:build
```

默认会从以下目录读取 Markdown 报告：

- `../code/report/md_reports`
- `../code/report/custom_stock_md_reports`

也可以用环境变量覆盖：

```bash
INDUSTRY_MD_DIR=../some/industry STOCK_MD_DIR=../some/stocks npm run docs:build
```

如果需要一键跑完整流程：

```bash
./run_daily_web_pipeline.sh
```

如果要顺便启动本地预览：

```bash
START_DEV_SERVER=1 ./run_daily_web_pipeline.sh
```

## 作为独立发布仓库使用

如果 `web/` 已经单独 `git init` 并关联到新的仓库，那么推荐这样用：

1. 在主仓库根目录生成最新站点内容：

```bash
./run_daily_web_pipeline.sh
```

2. 进入 `web/` 子仓库并提交：

```bash
cd web
git add .
git commit -m "update reports site"
git push -u origin main
```

3. 在 GitHub 仓库 `online_md_stock` 的 `Settings -> Pages` 里把 `Source` 设置为 `GitHub Actions`

说明：

- 独立仓库部署时，GitHub Action 不会再去读父仓库的 `../code/report/**`
- 它会直接使用已经提交到 `web/site/**` 的页面内容构建并发布
- 因此本地更新顺序应当是：先在主仓库跑 `docs:prepare`，再把 `web/` 子仓库 push 上去

## GitHub Pages

仓库已经提供 GitHub Actions 工作流模板，实际工作流文件应放在：

```bash
.github/workflows/deploy-pages.yml
```

触发条件：

- `main` 分支有新的 `web/**` 变更
- `main` 分支有新的 `code/report/**` Markdown 报告变更
- 手动触发 `workflow_dispatch`

如果仓库是项目页而不是用户主页，构建时需要设置 `SITE_BASE=/<repo-name>/`。当前 workflow 已按仓库名自动处理。
