# 指定した設定ファイルの読み込み

[English](requirements.md)

## このドキュメントについて

`loadConfigFile`は、パスで指定した1つの設定ファイルだけを読み、設定を返します。
CLIツールが`--config <path>`のようなオプションで、利用者が指定したファイルを読む場面で使います。
親Productは[rc-config-loader](../../product.ja.md)です。

### スコープ

- パスの解決
- 拡張子から形式を選ぶこと
- 拡張子から形式が決まらないファイルの読み方
- ファイルがないときと、読めないときのエラー

### スコープ外

- 形式ごとの読み方は[設定ファイルの形式](../config-formats/requirements.ja.md)で扱います。
- 設定ファイルを探すことは[設定ファイルの探索](../config-search/requirements.ja.md)で扱います。

## ユーザーストーリー

### 利用者が指定したファイルだけを読む

CLIツールの作者として、利用者がオプションで指定した設定ファイルを、そのファイルだけ読みたい。それによって、指定と違うファイルが読まれることを防げる。

`rcFile`の`configFileName`にパスを渡すと、相対パスは親のディレクトリからも探され、名前に拡張子が足されます。
そのため、サブディレクトリで`rc.json`を指定すると、`../rc.json`が読まれることがありました（[#33](https://github.com/azu/rc-config-loader/pull/33)）。

**受け入れ条件:**

Scenario: 拡張子の付いたファイルを指定した場合、その形式で読んだ設定が返る

- Given: 起点に`rc.json`、`rc.yaml`、`rc.yml`、`rc.js`、`rc.cjs`、`rc.mjs`、`rc.ts`、`rc.cts`、`rc.mts`のいずれかがある。
- When: ツールが`loadConfigFile(<ファイル名>, { cwd: 起点 })`を呼ぶ。
- Then: 拡張子の形式で読んだ設定と、ファイルの絶対パスが返る。

Scenario: 相対パスを指定した場合、`cwd`から解決する

- Given: 起点の下に`sub/sub.json`がある。
- When: ツールが`loadConfigFile("sub/sub.json", { cwd: 起点 })`を呼ぶ。
- Then: `<起点>/sub/sub.json`の設定とその絶対パスが返る。

Scenario: `cwd`を指定しない場合、現在のディレクトリから解決する

- Given: 現在のディレクトリからの相対パスで、ある`rc.json`を指せる。
- When: ツールが`loadConfigFile(<相対パス>)`を呼ぶ。
- Then: その`rc.json`の設定が返る。

Scenario: 絶対パスを指定した場合、`cwd`に関係なくそのファイルを読む

- Given: `rc.json`の絶対パスと、別のディレクトリの`cwd`がある。
- When: ツールが`loadConfigFile(<絶対パス>, { cwd: 別のディレクトリ })`を呼ぶ。
- Then: 指定した`rc.json`の設定が返る。

Scenario: 指定した場所にファイルがなく親にある場合、親のファイルは読まない

- Given: 起点に`rc.json`はなく、親のディレクトリに`rc.json`がある。
- When: ツールが`loadConfigFile("rc.json", { cwd: 起点 })`を呼ぶ。
- Then: `code`が`ENOENT`で、`path`が`<起点>/rc.json`のエラーが投げられる。

Scenario: 拡張子のない名前を指定した場合、拡張子を足さない

- Given: 起点に`rc.json`はあるが、`rc`はない。
- When: ツールが`loadConfigFile("rc", { cwd: 起点 })`を呼ぶ。
- Then: `code`が`ENOENT`のエラーが投げられる。

### 拡張子のない設定ファイルを読む

CLIツールの作者として、`.secretlintrc`のような拡張子のないファイルも指定して読みたい。それによって、利用者がどの形式で書いても同じオプションで指定できる。

**受け入れ条件:**

Scenario: 拡張子のないファイルの中身がJSON、YAML、JavaScriptのいずれかの場合、読めた設定が返る

- Given: 起点に拡張子のない`.jsonrc`、`.yamlrc`、`.jsrc`があり、それぞれJSON、YAML、JavaScriptで書かれている。
- When: ツールが`loadConfigFile(<ファイル名>, { cwd: 起点 })`を呼ぶ。
- Then: それぞれの形式で読んだ設定が返る。

Scenario: 拡張子のないファイルがどの形式でも読めない場合、エラーになる

- Given: 起点に、どの形式としても誤った中身の`.invalidrc`がある。
- When: ツールが`loadConfigFile(".invalidrc", { cwd: 起点 })`を呼ぶ。
- Then: `Cannot read config file: <起点>/.invalidrc`で始まるエラーが投げられる。

### ファイルがないことと壊れていることを区別する

CLIツールの作者として、指定されたファイルがないのか、あるが読めないのかを区別したい。それによって、利用者へそれぞれに合ったメッセージを出せる。

**受け入れ条件:**

Scenario: ファイルがない場合、`ENOENT`のエラーになる

- Given: 起点に`not-found.json`がない。
- When: ツールが`loadConfigFile("not-found.json", { cwd: 起点 })`を呼ぶ。
- Then: `code`が`ENOENT`で、`path`が`<起点>/not-found.json`のエラーが投げられる。

Scenario: ファイルが読めない場合、`Cannot read config file`のエラーになる

- Given: 起点の`invalid.json`が、JSONとして誤った中身である。
- When: ツールが`loadConfigFile("invalid.json", { cwd: 起点 })`を呼ぶ。
- Then: `Cannot read config file: <起点>/invalid.json`で始まるエラーが投げられる。

## KPI

なし。成功指標を定めていません。

## 機能要件

### 指定した設定ファイルの読み込み

**概要:** 指定したパスのファイルを1つだけ読み、設定を返します。

**入力:**

- `filePath`: 設定ファイルのパス。絶対パスか、`cwd`からの相対パス
- `cwd`: 相対パスを解決する起点。省略時は現在のディレクトリ

**出力:** `{ config, filePath }`。`filePath`は読んだファイルの絶対パスです。

#### 適用する条件

##### 読むファイル

`filePath`を`cwd`から解決した1つのファイルだけを読みます。
親のディレクトリを探さず、名前に拡張子を足さず、`package.json`も読みません。

##### 形式の選び方

拡張子が[設定ファイルの形式](../config-formats/requirements.ja.md#拡張子と形式の対応)の表にあれば、その形式で読みます。
表にない拡張子と拡張子のない名前は、JSON、YAML、JavaScriptの順に試し、最初に読めた形式の設定を返します。

#### 例外ケースでの振る舞い

##### ファイルがない

`Config file not found: <絶対パス>`をメッセージとし、`code`が`ENOENT`、`path`が絶対パスのエラーを投げます。

##### 拡張子から選んだ形式で読めない

[設定ファイルの形式](../config-formats/requirements.ja.md#形式として読めない)のエラーを投げます。

##### どの形式でも読めない

JavaScriptとして読んだときのエラーを投げます。メッセージは`Cannot read config file: <絶対パス>`で始まります。

## データ要件

### 必要なデータ

- **設定ファイル:** 利用者が指定した1つのファイル。

### データ間の関係

1回の呼び出しで、1つのファイルから1つの設定を返します。

### 個人情報

扱いません。

## 依存する外部サービス

なし。ローカルのファイルシステムだけを読みます。

## セキュリティ上の留意事項

指定されたファイルの中身がJavaScriptかTypeScriptとして読まれると、そのコードを実行します。
拡張子のない名前も、JSONとYAMLで読めなければJavaScriptとして実行します。

## 未決事項

なし。
