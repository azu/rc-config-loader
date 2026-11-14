# 設定ファイルの探索

[English](requirements.md)

## このドキュメントについて

`rcFile`は、ツールの名前から`.<名前>rc`の設定ファイルを探し、見つかった設定を返します。
探す場所は、起点のディレクトリから親のディレクトリへ順にさかのぼります。
親Productは[rc-config-loader](../../product.ja.md)です。

### スコープ

- 探すファイルの名前と拡張子
- 起点のディレクトリから親のディレクトリへの探索
- `package.json`のフィールドからの読み込み
- 見つからなかったときと、読めなかったときの扱い

### スコープ外

- 形式ごとの読み方は[設定ファイルの形式](../config-formats/requirements.ja.md)で扱います。
- 1つのファイルを探索なしで読むことは[指定した設定ファイルの読み込み](../config-file-loading/requirements.ja.md)で扱います。
- 複数の設定ファイルを見つけて結合することはしません。最初に見つかった1つだけを返します。

## ユーザーストーリー

### プロジェクトの設定ファイルを見つける

CLIツールの作者として、ツールの名前だけを渡して利用者の設定ファイルを見つけたい。それによって、利用者はプロジェクトのどの階層からツールを実行しても同じ設定を使える。

**受け入れ条件:**

Scenario: 起点のディレクトリに設定ファイルがある場合、その設定が返る

- Given: 起点のディレクトリに`.foorc.json`があり、`{ "foo": 1 }`が書かれている。
- When: ツールが`rcFile("foo", { cwd: 起点 })`を呼ぶ。
- Then: `{ config: { foo: 1 }, filePath: <起点>/.foorc.json }`が返る。

Scenario: 親のディレクトリにだけ設定ファイルがある場合、親の設定が返る

- Given: 起点の2つ上のディレクトリにだけ`.foorc.json`がある。
- When: ツールが`rcFile("foo", { cwd: 起点 })`を呼ぶ。
- Then: 2つ上のディレクトリの`.foorc.json`の設定とその絶対パスが返る。

Scenario: 起点を指定しない場合、現在のディレクトリから探す

- Given: 現在のディレクトリに`.eslintrc`がある。
- When: ツールが`rcFile("eslint")`を呼ぶ。
- Then: 現在のディレクトリの`.eslintrc`の設定が返る。

Scenario: どこにも設定ファイルがない場合、`undefined`が返る

- Given: 起点からファイルシステムのルートまで、`.foorc`の候補が1つもない。
- When: ツールが`rcFile("foo", { cwd: 起点 })`を呼ぶ。
- Then: `undefined`が返り、エラーは投げられない。

### package.jsonに設定を書けるようにする

CLIツールの作者として、利用者が`package.json`のフィールドに設定を書けるようにしたい。それによって、利用者は設定ファイルを増やさずに済む。

**受け入れ条件:**

Scenario: `packageJSON`を有効にし、設定ファイルがない場合、`package.json`のフィールドが返る

- Given: 起点のディレクトリに`.qarrc`の候補がなく、`package.json`に`"qar": { "qar": "qar" }`がある。
- When: ツールが`rcFile("qar", { cwd: 起点, packageJSON: true })`を呼ぶ。
- Then: `{ config: { qar: "qar" }, filePath: <起点>/package.json }`が返る。

Scenario: フィールド名を指定した場合、そのフィールドが返る

- Given: 起点の`package.json`に`"custom": { "key": "value" }`がある。
- When: ツールが`rcFile("qar", { cwd: 起点, packageJSON: { fieldName: "custom" } })`を呼ぶ。
- Then: 設定として`{ key: "value" }`が返る。

Scenario: `packageJSON`を指定しない場合、`package.json`は読まない

- Given: 起点の`package.json`に`"qar"`フィールドがあり、`.qarrc`の候補はない。
- When: ツールが`rcFile("qar", { cwd: 起点 })`を呼ぶ。
- Then: `undefined`が返る。

### 拡張子のない設定ファイルを読む

CLIツールの作者として、`.foorc`のような拡張子のないファイルを、どの形式として試すかを決めたい。それによって、ツールが受け付ける書き方を選べる。

**受け入れ条件:**

Scenario: 試す形式を複数指定した場合、読めた形式の設定が返る

- Given: 起点に拡張子のない`.unknownrc`があり、JavaScriptで書かれている。
- When: ツールが`rcFile("unknown", { cwd: 起点, defaultExtension: [".json", ".yml", ".js"] })`を呼ぶ。
- Then: JavaScriptとして読んだ設定と`<起点>/.unknownrc`が返る。

Scenario: 試す形式を1つだけ指定し、その形式で読めない場合、エラーになる

- Given: 起点に拡張子のない`.foorc`があり、JSONとして誤った中身である。
- When: ツールが`rcFile("foo", { cwd: 起点, defaultExtension: ".json" })`を呼ぶ。
- Then: `Cannot read config file: <起点>/.foorc`で始まるエラーが投げられる。

Scenario: 対応していない拡張子を指定した場合、エラーになる

- Given: なし。
- When: ツールが`rcFile("foo", { defaultExtension: ".toml" })`を呼ぶ。
- Then: `.toml is not supported.`のエラーが投げられる。

### 壊れた設定ファイルに気づく

ツールの利用者として、拡張子の付いた設定ファイルが壊れているときに、ほかの設定へ切り替わらずにエラーで知りたい。それによって、意図しない設定でツールが動くことを防げる。

**受け入れ条件:**

Scenario: 見つかった拡張子付きのファイルが読めない場合、エラーになる

- Given: 起点に`.invalidjsonrc.json`があり、JSONとして誤った中身である。親には読める`.invalidjsonrc.json`がある。
- When: ツールが`rcFile("invalidjson", { cwd: 起点 })`を呼ぶ。
- Then: `Cannot read config file: <起点>/.invalidjsonrc.json`で始まるエラーが投げられ、親の設定は返らない。

## KPI

なし。成功指標を定めていません。

## 機能要件

### 設定ファイルの探索

**概要:** 起点のディレクトリから親へさかのぼり、最初に見つかった設定ファイルか`package.json`のフィールドを読んで返します。

**入力:**

- ツールの名前（`pkgName`）
- `configFileName`: 探すファイルの名前。省略時は`.<pkgName>rc`
- `cwd`: 探索の起点。省略時は現在のディレクトリ
- `defaultExtension`: 拡張子のないファイルを試す形式の拡張子。1つか配列。省略時は`[".json", ".yaml", ".yml", ".js", ".cjs"]`
- `packageJSON`: `package.json`を読むかどうかと、読むフィールドの名前

**出力:** `{ config, filePath }`。`filePath`は読んだファイルの絶対パスです。見つからなければ`undefined`です。

#### 適用する条件

##### 探す候補

各ディレクトリで、`configFileName`に[設定ファイルの形式](../config-formats/requirements.ja.md#拡張子と形式の対応)の表にあるすべての拡張子を付けた名前と、拡張子を付けない名前を候補にします。
拡張子を付けた候補を、拡張子を付けない候補より先に確かめます。
拡張子を付けた候補は、その拡張子の形式で読みます。
拡張子を付けない候補は、`defaultExtension`の順に形式を試します。

##### 探す順序

起点のディレクトリで候補を確かめ、見つからなければ同じディレクトリの`package.json`を確かめます（`packageJSON`が有効なときだけ）。
それでもなければ親のディレクトリへ移り、ファイルシステムのルートまで繰り返します。
最初に見つかったものを返し、残りは確かめません。

##### `configFileName`にパスを渡したとき

`configFileName`は各ディレクトリからの相対パスとして解決します。
絶対パスを渡すと、どのディレクトリから解決しても同じファイルを指すため、そのファイルの候補だけを確かめることになります。
相対パスを渡すと、親のディレクトリからも同じ相対パスで探します。

##### package.json

`packageJSON`が`true`なら`pkgName`、`{ fieldName }`なら`fieldName`のフィールドを読みます。
フィールドの値が空（`undefined`など）なら、見つからなかったものとして親のディレクトリへ進みます。

##### 読んだ値が空のとき

候補のファイルを読んだ値が空（`undefined`、`null`など）のときは、そのファイルを見つからなかったものとして次の候補へ進みます。

#### 例外ケースでの振る舞い

##### 拡張子の付いた候補が読めない

[設定ファイルの形式](../config-formats/requirements.ja.md#形式として読めない)のエラーを投げ、探索を止めます。

##### 拡張子のない候補が読めない

`defaultExtension`が1つだけのときは、その形式のエラーを投げ、探索を止めます。
`defaultExtension`が配列のときの扱いは、未決事項を参照してください。

##### 対応していない拡張子

`defaultExtension`に[設定ファイルの形式](../config-formats/requirements.ja.md#拡張子と形式の対応)の表にない拡張子を含むと、`<拡張子> is not supported.`のエラーを投げます。

##### package.jsonが読めない

`packageJSON`が有効で、`package.json`をJSON5として解析できないときは、解析のエラーをそのまま投げます。

## データ要件

### 必要なデータ

- **設定ファイル:** `.<pkgName>rc`とその拡張子付きの名前のファイル。
- **package.json:** `packageJSON`が有効なときに読むフィールド。

### データ間の関係

1回の探索で、1つの設定ファイルか1つの`package.json`のフィールドだけを返します。

### 個人情報

扱いません。

## 依存する外部サービス

なし。ローカルのファイルシステムだけを読みます。

## セキュリティ上の留意事項

起点から親へさかのぼるため、プロジェクトの外にある親ディレクトリの設定ファイルも読まれることがあります。
JavaScriptとTypeScriptの設定ファイルを見つけると、そのコードを実行します。

## 未決事項

### 拡張子を付けた候補を確かめる順序（未確認）

- **確認したいこと:** 同じディレクトリに複数の拡張子の候補があるとき、どれを優先するのが意図した振る舞いか。
- **候補と根拠:** READMEは`.json`、`.yml`、`.yaml`、`.js`の順に候補を挙げ、`.cjs`を含めていません。`src/rc-config-loader.ts`は`.cjs`、`.js`、`.mjs`、`.json`、`.yaml`、`.yml`、`.ts`、`.cts`、`.mts`の順に確かめ、`.foorc.cjs`と`.foorc.json`が両方あれば`.foorc.cjs`を返します。この順序を確かめるテストはありません。
- **決まるまでの扱い:** 本文には拡張子付きの候補どうしの順序を書きません。
- **判断する人:** azu

### 拡張子のない候補が、試したどの形式でも読めないとき（未確認）

- **確認したいこと:** `defaultExtension`が配列（既定値を含む）のとき、拡張子のない候補がどの形式でも読めない場合に、エラーにするか、見つからなかったものとして探索を続けるか。
- **候補と根拠:** READMEは「設定ファイルの中身が壊れていれば`rcFile`はエラーを投げる」と説明しています。`src/rc-config-loader.ts`は、この場合にエラーを投げず、次の候補と親のディレクトリへ進みます。この場合のテストはありません。
- **決まるまでの扱い:** 本文にはどちらの振る舞いも書きません。
- **判断する人:** azu
