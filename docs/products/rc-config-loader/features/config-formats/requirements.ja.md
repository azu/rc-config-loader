# 設定ファイルの形式

[English](requirements.md)

## このドキュメントについて

rc-config-loaderは、JSON、YAML、JavaScript、TypeScriptで書かれた設定ファイルを読み、設定オブジェクトとして返します。
この文書は、ファイルの名前からどの形式として読むかと、形式ごとの読み方を説明します。
[設定ファイルの探索](../config-search/requirements.ja.md)と[指定した設定ファイルの読み込み](../config-file-loading/requirements.ja.md)は、どちらもこの読み方を使います。
親Productは[rc-config-loader](../../product.ja.md)です。

### スコープ

- 拡張子と形式の対応
- JSON、YAML、JavaScript、TypeScriptそれぞれの読み方
- 動作に必要なNode.jsのバージョン
- 読めなかったときのエラー

### スコープ外

- どのファイルを読むかの決め方。拡張子のないファイルをどの形式の順に試すかも含めて、[設定ファイルの探索](../config-search/requirements.ja.md)と[指定した設定ファイルの読み込み](../config-file-loading/requirements.ja.md)で扱います。
- 設定の中身の検証。設定オブジェクトの意味は、rc-config-loaderを使うプログラムが決めます。
- 非同期の設定ファイル。トップレベルの`await`を使うECMAScript Modulesは読めません。APIを同期のまま保つためです。
- `tsconfig.json`による型の除去の設定と、型の検査。

## ユーザーストーリー

### 好きな形式で設定を書く

ツールの利用者として、JSON、YAML、JavaScript、TypeScriptのうち好きな形式で設定ファイルを書きたい。それによって、プロジェクトに合った書き方で設定できる。

**受け入れ条件:**

Scenario: JSONファイルにコメントがある場合、コメントを除いた設定が返る

- Given: `.foorc.json`に、コメントと`{ "foo": 1 }`が書かれている。
- When: プログラムがこのファイルを読む。
- Then: 設定として`{ foo: 1 }`が返る。

Scenario: YAMLファイルの場合、YAMLとして読んだ設定が返る

- Given: `.foorc.yml`に`foo: 1`が書かれている。
- When: プログラムがこのファイルを読む。
- Then: 設定として`{ foo: 1 }`が返る。

Scenario: YAMLファイルが空かコメントだけの場合、空の設定が返る

- Given: `.foorc.yml`が空か、コメントだけを含む。
- When: プログラムがこのファイルを読む。
- Then: 設定として`{}`が返り、エラーにならない。

Scenario: YAMLファイルにマージキーや日時がある場合、展開した設定が返る

- Given: `.foorc.yml`が`<<`のマージキーと`2001-12-14`のような日時を含む。
- When: プログラムがこのファイルを読む。
- Then: マージキーは展開され、日時は`Date`として返る。

Scenario: JavaScriptファイルの場合、`module.exports`の値が返る

- Given: `.foorc.js`か`.foorc.cjs`に`module.exports = { foo: 1 }`が書かれている。
- When: プログラムがこのファイルを読む。
- Then: 設定として`{ foo: 1 }`が返る。

Scenario: ECMAScript Modulesの場合、`export default`の値が返る

- Given: `.foorc.mjs`に`export default { foo: 1 }`が書かれている。
- When: プログラムがこのファイルを読む。
- Then: 設定として`{ foo: 1 }`が返る。`default`を持つモジュールの名前空間オブジェクトは返らない。

Scenario: TypeScriptファイルの場合、型を除いて実行した値が返る

- Given: `.foorc.ts`に、型注釈を付けた`const config: Config = { foo: 1 }`と`export default config`が書かれている。
- When: Node.js 22.18.0以降で、プログラムがこのファイルを読む。
- Then: 設定として`{ foo: 1 }`が返る。

### 壊れた設定ファイルに気づく

ツールの利用者として、設定ファイルが壊れているときに、どのファイルが読めなかったかを知りたい。それによって、直すべきファイルが分かる。

**受け入れ条件:**

Scenario: JSONの構文が誤っている場合、ファイルの場所を含むエラーになる

- Given: `.foorc.json`の中身が`{bad`である。
- When: プログラムがこのファイルを読む。
- Then: `Cannot read config file: <ファイルの絶対パス>`で始まり、元のエラーの内容を含むエラーが投げられる。

Scenario: YAMLファイルに複数のドキュメントがある場合、エラーになる

- Given: `.foorc.yml`が`---`で区切った2つのドキュメントを含む。
- When: プログラムがこのファイルを読む。
- Then: 1つのドキュメントを期待していることを示すエラーが投げられる。

Scenario: ECMAScript Modulesがトップレベルの`await`を使う場合、エラーになる

- Given: `.foorc.mjs`がトップレベルの`await`を含む。
- When: プログラムがこのファイルを読む。
- Then: `Cannot read config file: <ファイルの絶対パス>`で始まるエラーが投げられる。

Scenario: TypeScriptファイルが型の除去だけで実行できない構文を使う場合、エラーになる

- Given: `.foorc.ts`が`enum`を含む。
- When: プログラムがこのファイルを読む。
- Then: `Cannot read config file: <ファイルの絶対パス>`で始まるエラーが投げられる。

## KPI

なし。成功指標を定めていません。

## 機能要件

### 形式ごとの読み込み

**概要:** 1つの設定ファイルを、選ばれた形式で読み、設定オブジェクトを返します。

**入力:** 設定ファイルの絶対パスと、読む形式。

**出力:** 設定オブジェクト。

#### 適用する条件

##### 拡張子と形式の対応

| 拡張子 | 形式 |
| --- | --- |
| `.json` | JSON |
| `.yaml`、`.yml` | YAML |
| `.js`、`.cjs`、`.mjs` | JavaScript（CommonJSまたはECMAScript Modules） |
| `.ts`、`.cts`、`.mts` | TypeScript |

ここにない拡張子に、形式を対応付けることはできません。

##### JSON

JSON5として読みます。コメントや末尾のカンマを含むファイルも読めます。

##### YAML

YAML 1.2として読み、`<<`のマージキーと日時（timestamp）も扱います。
空のファイル、空白やコメントだけのファイル、`---`だけの空のドキュメントは、空の設定`{}`として扱います。
複数のドキュメントを含むファイルは読めません。

##### JavaScript

Node.jsのモジュールとして実行します。CommonJSかECMAScript Modulesかは、Node.jsが拡張子と`package.json`の`type`で決めます。
CommonJSでは`module.exports`の値を、ECMAScript Modulesでは`export default`の値を設定とします。
ファイルの中の`require`と`import`は、ファイルの場所を基準に解決します。
ECMAScript Modulesは同期的に読める必要があり、トップレベルの`await`は使えません。

CommonJSのファイルは、読み込みのたびに実行し直します。
ECMAScript Modulesのファイルは、同じプロセスの中では最初に読んだ内容が使われ、ファイルを変えても読み直しません。

##### TypeScript

Node.jsの型の除去（type stripping）で型を取り除き、JavaScriptと同じ規則で実行します。
型の除去だけで実行できる構文に限ります。`enum`や、実行時のコードを持つ`namespace`は使えません。
`tsconfig.json`は読まず、型の検査もしません。

##### Node.jsのバージョン

Node.js 22.18.0以降で動きます。型の除去が既定で有効になった最初の22系のバージョンです。

#### 例外ケースでの振る舞い

##### 形式として読めない

構文の誤りなどで読めないときは、`Cannot read config file: <ファイルの絶対パス>`と元のエラーの内容をメッセージに含むエラーを投げます。
ただし、拡張子のないファイルを複数の形式で試すときは、試している途中の失敗をエラーにしません。
どの失敗を最後にエラーにするかは、それぞれの機能のRequirementsで決めます。

## データ要件

### 必要なデータ

- **設定ファイル:** ローカルのファイルシステム上にある、UTF-8のテキストファイル。
- **設定オブジェクト:** 設定ファイルを読んだ結果。中身の意味はrc-config-loaderを使うプログラムが決めます。

### データ間の関係

1つの設定ファイルから、1つの設定オブジェクトを返します。

### 個人情報

扱いません。設定ファイルの中身は読み込んだプログラムへ返すだけで、保存も送信もしません。

## 依存する外部サービス

なし。ローカルのファイルだけを読みます。

## セキュリティ上の留意事項

JavaScriptとTypeScriptの設定ファイルは、読み込んだプログラムと同じ権限で実行されます。
これらの設定ファイルを読むことは、そのファイルのコードを実行することと同じです。

## 未決事項

なし。
