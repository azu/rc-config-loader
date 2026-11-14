# 設定ファイルの形式の設計

[English](design.md)

## このドキュメントについて

[設定ファイルの形式のRequirements](requirements.ja.md)を、形式ごとのローダーとしてどう実現しているかを説明します。
親Productは[rc-config-loader](../../product.ja.md)です。

### 対象読者

rc-config-loaderの読み込み処理を変更する人とエージェント。

### 前提知識

Node.jsのCommonJSモジュールと、YAMLのスキーマの考え方。

### このドキュメントで扱わないこと

どのファイルをどのローダーで読むかの選び方は、[設定ファイルの探索](../config-search/requirements.ja.md)と[指定した設定ファイルの読み込み](../config-file-loading/requirements.ja.md)の機能の設計で扱います。

## 実装方針

形式ごとに1つのローダー関数を持ち、拡張子からローダーを引く表（`defaultLoaderByExt`）を探索と指定読み込みの両方で共有します。
ローダーはすべて`src/rc-config-loader.ts`にあります。

| 拡張子 | ローダー |
| --- | --- |
| `.cjs`、`.js` | `loadJSConfigFile` |
| `.json` | `loadJSONConfigFile` |
| `.yaml`、`.yml` | `loadYAMLConfigFile` |

各ローダーは、ファイルの絶対パスと`suppress`を受け取り、設定オブジェクトを返します。
`suppress`が`false`なら、読めなかったときにメッセージの先頭へ`Cannot read config file: <パス>\nError: `を足して、元のエラーを投げ直します。
`suppress`が`true`なら、エラーを投げずに`undefined`を返します。
拡張子のないファイルを複数の形式で試すとき、呼び出し側は`true`を渡し、`undefined`を「この形式では読めなかった」として次のローダーへ進みます。

### JSON

ファイルを`fs.readFileSync`で読み、`json5`の`JSON5.parse`で解析します。
以前は`require`で読んでいましたが、webpackでバンドルしたときに動的な`require`を解決できないため、ファイルを読んで解析する方法に変えました（[#25](https://github.com/azu/rc-config-loader/issues/25)、[#26](https://github.com/azu/rc-config-loader/pull/26)）。

### YAML

`js-yaml`は、YAMLのファイルを読むときに初めて`require`します。YAMLを使わない呼び出しで読み込みの時間を増やさないためです。
`CORE_SCHEMA`に`mergeTag`と`timestampTag`を足したスキーマを使います。
js-yaml v5の既定はYAML 1.2の`CORE_SCHEMA`ですが、v4の既定スキーマと同じくマージキーと日時を扱うために2つを足しています。

`loadAll`で一度だけ解析します。
ドキュメントが0個なら`{}`を返します。js-yaml v5の`load`は空の入力で例外を投げますが、`loadAll`は空の配列を返すためです。
ドキュメントが2個以上なら、`load`で解析し直して、`load`と同じ「1つのドキュメントを期待している」エラーを投げます。
ドキュメントが1個で値が`null`（`---`だけなど）なら`{}`を返します。

### JavaScript

ファイルを文字列として読み、`require-from-string`でCommonJSのモジュールとしてコンパイルし、`module.exports`を返します。
ファイルのパスを渡すので、ファイルの中の相対パスの`require`はファイルの場所から解決されます。
`require`のキャッシュを使わないため、同じファイルを読むたびに中身が実行されます。

## アーキテクチャ・シーケンス図

ローダーは独立した関数で、互いに呼び合いません。呼び出しの流れは各機能の設計で示すため、ここでは図を省きます。

## データモデル・ER 図

`ExtensionName`は`.cjs | .js | .json | .yaml | .yml`、`Loader`は`(fileName, suppress) => R`、`ExtensionLoaderMap`は`ExtensionName`から`Loader`への表です（`src/types.ts`）。

## API・インターフェース

ローダーは公開APIではありません。
公開APIの`rcFile`と`loadConfigFile`が、読み込んだ値を`{ config, filePath }`の`config`として返します。

## 外部サービスとの連携方式

なし。依存するnpmパッケージは次のとおりです。

- `json5`: JSONの解析
- `js-yaml`: YAMLの解析
- `require-from-string`: JavaScriptの実行
- `debug`: `DEBUG=rc-config-loader`での読み込み経過の出力

## データの取り扱い設計

読んだ中身は戻り値として返すだけで、保存しません。

## 認証認可に関する特記事項

なし。ファイルの読み取り権限はNode.jsのプロセスに従います。

## セキュリティ上の留意事項

JavaScriptの設定ファイルは、サンドボックスなしで呼び出し元のプロセスの中で実行されます。

## デプロイに関する特記事項

なし。

## 検討した代替手段

### JSONを`require`で読む

以前の実装です。webpackでバンドルできないため、ファイルを読んで解析する方法に変えました（[#25](https://github.com/azu/rc-config-loader/issues/25)）。
JSON5で解析する理由は、記録がなく不明です。

### JavaScriptを`require`で読む

`require-from-string`を選んだ理由と、`require`を検討したかどうかの記録はなく、不明です。

## 未決事項

なし。
