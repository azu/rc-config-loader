# 設定ファイルの探索の設計

[English](design.md)

## このドキュメントについて

[設定ファイルの探索のRequirements](requirements.ja.md)を、`rcFile`と`findConfig`でどう実現しているかを説明します。
親Productは[rc-config-loader](../../product.ja.md)です。

### 対象読者

`rcFile`の探索を変更する人とエージェント。

### 前提知識

[設定ファイルの形式](../config-formats/requirements.ja.md)。形式ごとのローダーは、`suppress`が`false`なら読めないときにエラーを投げ、`true`なら`undefined`を返します。

### このドキュメントで扱わないこと

形式ごとのローダーの実装は、設定ファイルの形式の機能の設計で扱います。

## 実装方針

`rcFile`はオプションに既定値を補い、探索に使う表を作ってから、再帰関数`findConfig`に探索を任せます。
処理はすべて`src/rc-config-loader.ts`にあり、同期のファイル操作だけを使います。

### 1. オプションを決める

`configFileName`、`defaultExtension`、`cwd`、`packageJSON`を、省略されていれば既定値で補います。
`packageJSON`がオブジェクトなら`fieldName`を、そうでなければ`pkgName`をフィールド名にします。

### 2. 拡張子のない候補のローダーを決める

`defaultExtension`の各拡張子を`selectLoader`でローダーに変えます。
`selectLoader`は、既定の`defaultExtension`に含まれない拡張子に`<拡張子> is not supported.`のエラーを投げます。
`defaultExtension`が配列ならローダーの配列（`loadersByOrder`）、1つならローダー1つになります。

探索の表`loaderByExt`は、拡張子からローダーを引く共通の表`defaultLoaderByExt`に、空文字列の拡張子として`loadersByOrder`を加えたものです。

### 3. ディレクトリごとに候補を確かめる

`cwd`を`path.resolve`で絶対パスにし、区切り文字で分けた配列`parts`にします。
`findConfig`は`loaderByExt`のキーの順に、`parts`のディレクトリへ`configFileName + 拡張子`を`path.resolve`で結合した場所を確かめます。
キーの順は表を作った順で、`.cjs`、`.js`、`.json`、`.yaml`、`.yml`、空文字列です。
`path.resolve`で結合するため、`configFileName`が絶対パスならディレクトリは無視されます。

ファイルが`fs.existsSync`で見つかったら、次のように読みます。

- ローダーが1つ（拡張子付きの候補、または`defaultExtension`が1つ）なら、`suppress = false`で読みます。読めなければエラーが投げられます。
- ローダーが配列なら、順に`suppress = true`で読み、最初に値を返したローダーの結果を使います。どれも`undefined`を返したら、この候補を飛ばします。

どちらの場合も、読んだ値が偽（falsy）なら次の候補へ進みます。

ローダーが1つの候補を2回読まないようにしています。以前は1つのローダーを配列として扱った結果、同じファイルを2回実行していました。設定ファイルに副作用があると問題になるため直しました（[#4](https://github.com/azu/rc-config-loader/pull/4)）。

### 4. package.jsonを確かめる

候補がどれも見つからず`packageJSON`が有効なら、同じディレクトリの`package.json`を`JSON5.parse`で読み、フィールドの値が真（truthy）ならそれを返します。

### 5. 親へ移る

`parts`の末尾を取り除いて`findConfig`を呼び直します。
`parts`が空になったら`undefined`を返します。

## アーキテクチャ・シーケンス図

```mermaid
sequenceDiagram
    participant Tool as 呼び出し元
    participant rcFile
    participant findConfig
    participant Loader as ローダー
    Tool->>rcFile: rcFile(pkgName, opts)
    rcFile->>rcFile: 既定値を補い、loaderByExtを作る
    rcFile->>findConfig: parts, loaderByExt, ...
    loop 各ディレクトリ（起点からルートへ）
        loop 拡張子付き、拡張子なしの候補
            findConfig->>Loader: 見つかった候補を読む
            Loader-->>findConfig: 設定 / undefined / 例外
        end
        findConfig->>findConfig: package.jsonのフィールド（有効時）
    end
    findConfig-->>rcFile: { config, filePath } または undefined
    rcFile-->>Tool: 結果
```

## データモデル・ER 図

`rcConfigLoaderOption`（`packageJSON`、`configFileName`、`defaultExtension`、`cwd`）と、戻り値の`rcConfigResult`（`config`、`filePath`）を`src/types.ts`で定義しています。

## API・インターフェース

```ts
export function rcFile<R extends {}>(
    pkgName: string,
    opts?: rcConfigLoaderOption
): rcConfigResult<R> | undefined;
```

READMEのAPIの節が利用者向けの説明です。

## 外部サービスとの連携方式

なし。

## データの取り扱い設計

読んだ設定は戻り値として返すだけで、キャッシュしません。呼ぶたびにファイルを読み直します。

## 認証認可に関する特記事項

なし。ファイルの読み取り権限はNode.jsのプロセスに従います。

## セキュリティ上の留意事項

探索はファイルシステムのルートまで進み、途中で止める指定はありません。

## デプロイに関する特記事項

なし。

## 検討した代替手段

親へさかのぼる探索、拡張子付きの候補を先に確かめること、`package.json`を同じディレクトリの候補の後に確かめることについて、検討した代替手段と判断理由の記録はなく、不明です。
探索は[zkochan/rcfile](https://github.com/zkochan/rcfile)を元にしています。

## 未決事項

なし。振る舞いの未確認の項目は[Requirementsの未決事項](requirements.ja.md#未決事項)にあります。
