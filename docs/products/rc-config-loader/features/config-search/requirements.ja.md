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
- 探す拡張子を絞ること
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

### 探す拡張子を絞る

CLIツールの作者として、ツールが受け付ける拡張子だけを探したい。それによって、ツールが想定しない形式の設定ファイル、特に実行されるJavaScriptやTypeScriptのファイルを読まずに済む。

**受け入れ条件:**

Scenario: `extensions`を省略した場合、JSONをJavaScriptより優先する

- Given: 起点に`.priorityrc.json`と`.priorityrc.cjs`がある。
- When: ツールが`rcFile("priority", { cwd: 起点 })`を呼ぶ。
- Then: `<起点>/.priorityrc.json`の設定が返る。

Scenario: `extensions`を指定した場合、その拡張子の候補だけを探す

- Given: 起点に`.limitrc.js`と`.limitrc.json`がある。
- When: ツールが`rcFile("limit", { cwd: 起点, extensions: [".json"] })`を呼ぶ。
- Then: `<起点>/.limitrc.json`の設定が返る。`.limitrc.js`は実行されない。

Scenario: `extensions`の順が、探す優先順になる

- Given: 起点に`.limitrc.js`と`.limitrc.json`がある。
- When: ツールが`extensions: [".js", ".json"]`と`extensions: [".json", ".js"]`でそれぞれ`rcFile("limit", { cwd: 起点, extensions })`を呼ぶ。
- Then: 前者は`.limitrc.js`、後者は`.limitrc.json`の設定が返る。

Scenario: 指定していない拡張子の設定ファイルしかない場合、見つからない

- Given: 起点から親まで、`.onlyjsrc`の候補は`.onlyjsrc.js`だけである。
- When: ツールが`rcFile("onlyjs", { cwd: 起点, extensions: [".json", ".yaml", ".yml"] })`を呼ぶ。
- Then: `undefined`が返る。

Scenario: 拡張子のない候補は、`extensions`にある形式で試す

- Given: 起点に、JavaScriptで書いた拡張子のない`.unknownrc`がある。
- When: ツールが`rcFile("unknown", { cwd: 起点, extensions: [".json", ".yml", ".js"] })`を呼ぶ。
- Then: JavaScriptとして読んだ設定と`<起点>/.unknownrc`が返る。

Scenario: 拡張子のない候補を試す形式が1つだけで、その形式で読めない場合、エラーになる

- Given: 起点に、JavaScriptで書いた拡張子のない`.noextrc`がある。
- When: ツールが`rcFile("noext", { cwd: 起点, extensions: [".json"] })`を呼ぶ。
- Then: `.noextrc`はJavaScriptとして実行されず、`Cannot read config file: <起点>/.noextrc`で始まるエラーが投げられる。

Scenario: 拡張子のない候補を試す形式が`extensions`にない場合、確かめない

- Given: 起点に拡張子のない`.noextrc`がある。
- When: ツールが`rcFile("noext", { cwd: 起点, extensions: [".ts"] })`を呼ぶ。
- Then: `.noextrc`は読まれず、`undefined`が返る。

Scenario: `extensions`が誤っている場合、エラーになる

- Given: なし。
- When: ツールが`extensions: []`か`extensions: [".toml"]`で`rcFile("limit", { extensions })`を呼ぶ。
- Then: それぞれ`extensions should be a non-empty array.`と`.toml is not supported.`のエラーが投げられる。

Scenario: 削除した`defaultExtension`を指定した場合、エラーになる

- Given: なし。
- When: ツールが`rcFile("noext", { defaultExtension: [".js"] })`を呼ぶ。
- Then: `defaultExtension option is removed. Use extensions option instead.`のエラーが投げられる。

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
- `packageJSON`: `package.json`を読むかどうかと、読むフィールドの名前
- `extensions`: 探す拡張子と、その優先順。省略時は`[".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"]`

**出力:** `{ config, filePath }`。`filePath`は読んだファイルの絶対パスです。見つからなければ`undefined`です。

#### 適用する条件

##### 探す候補

各ディレクトリで、`configFileName`に拡張子を付けた名前と、拡張子を付けない名前を候補にします。
拡張子は`extensions`にあるものだけを、`extensions`の順に付けます。
拡張子を付けた候補を、拡張子を付けない候補より先に確かめます。
拡張子を付けた候補は、その拡張子の形式で読みます。

##### 拡張子を付けない候補の形式

拡張子を付けない候補は、`extensions`に`.json`があればJSON、`.yaml`か`.yml`があればYAML、`.js`があればJavaScriptとして、`extensions`に現れた順に試します。
`.cjs`、`.mjs`、`.ts`、`.cts`、`.mts`は、拡張子を付けない候補の形式を増やしません。
試す形式が1つもなければ、拡張子を付けない候補は確かめません。
既定値では、JSON、YAML、JavaScriptの順に試します。

`extensions`にない形式で設定ファイルが読まれることはありません。
`package.json`のフィールドは、`extensions`に関係なく`packageJSON`の指定に従います。

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

試す形式が1つだけのときは、その形式のエラーを投げ、探索を止めます。
試す形式が2つ以上のときの扱いは、未決事項を参照してください。

##### `extensions`の誤り

`extensions`が空の配列なら、`extensions should be a non-empty array.`のエラーを投げます。
[設定ファイルの形式](../config-formats/requirements.ja.md#拡張子と形式の対応)の表にない拡張子を含むなら、`<拡張子> is not supported.`のエラーを投げます。

##### `defaultExtension`を指定した

`defaultExtension`は削除しました。指定すると、`defaultExtension option is removed. Use extensions option instead.`のエラーを投げます。

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
`extensions`からJavaScriptとTypeScriptの拡張子を除くと、それらの設定ファイルは実行されません。

## 未決事項

### 拡張子のない候補が、試したどの形式でも読めないとき（未確認）

- **確認したいこと:** 拡張子のない候補を試す形式が2つ以上（既定値を含む）のとき、どの形式でも読めない場合に、エラーにするか、見つからなかったものとして探索を続けるか。
- **候補と根拠:** READMEは「設定ファイルの中身が壊れていれば`rcFile`はエラーを投げる」と説明しています。`src/rc-config-loader.ts`は、この場合にエラーを投げず、次の候補と親のディレクトリへ進みます。この場合のテストはありません。
- **決まるまでの扱い:** 本文にはどちらの振る舞いも書きません。
- **判断する人:** azu
