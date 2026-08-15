# dsh-custom-brand

Customizable brand area for the DeepSeek Harness (DSH) Web GUI — replace the whale logo and the DeepSeek wordmark with your own local images, and edit the HARNESS badge text. Everything persists in `localStorage` and survives restarts.

DSH Web 界面左上角品牌区自定义插件：鲸鱼 logo 与 DeepSeek 文字可换成你自己的本地图片，HARNESS 徽章文字可双击编辑。所有修改保存在浏览器 `localStorage`，重启不丢。

## Features / 功能

| Area | Interaction |
| --- | --- |
| Whale logo / 鲸鱼 logo | **Double-click** to pick a local image (auto-downscaled to 256px, PNG keeps transparency); **right-click** to restore the default whale |
| DeepSeek wordmark / DeepSeek 文字 | **Double-click** to pick a local image; **right-click** to restore the original lettering |
| HARNESS badge / HARNESS 徽章 | **Double-click** to edit the text (styled like the original badge letterforms); Enter to commit, Esc to cancel |
| Browser tab title / 标签页标题 | Syncs to the badge text |

## Install / 安装

```sh
dsh plugin --profile web add github:<owner>/dsh-custom-brand
```

or in the DSH settings → Plugins market, search `dsh-custom-brand`. 或在 DSH 设置 → 插件市场中搜索安装。

## Usage / 使用

1. Hover the brand area in the top-left sidebar — a dashed outline hints where editing is available.
2. Double-click the whale or the DeepSeek text to open the file picker; choose any image (PNG/JPG/WebP…). It is scaled to fit the small slot automatically.
3. Right-click an image slot to reset it to the original artwork.
4. Double-click the HARNESS badge and type a new name; the browser tab title updates with it.

Stored keys (browser `localStorage`): `dsh.customLogo`, `dsh.customDeepSeekImg`, `dsh.customBrand`.

## Development / 开发

This is a standard DSH bundle:

- `lib/index.js` — host half (intentionally empty; all behavior is client-side)
- `lib/client.js` — browser half, registered via `window.__ModuleLoader__.load`
- `cordis.patch.yml` — loader row inserting the plugin

Build the tarball with:

```sh
pnpm pack
```

## License / 许可证

MIT
