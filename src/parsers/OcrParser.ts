/**
 * サービスレポートOCRパーサー & 補正ロジック
 */

import { OcrResult } from '../types';
import { cleanPartName, parseCsvRows } from '../utils/TextUtils';

/**
 * テキストから特定のセクションを抜き出すヘルパー
 */
export function getSectionText(text: string, startKeyword: string, endKeywords: string[]): string {
  const startIdx = text.indexOf(startKeyword);
  if (startIdx === -1) return "";

  let endIdx = text.length;
  for (const endKeyword of endKeywords) {
    const idx = text.indexOf(endKeyword, startIdx + startKeyword.length);
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }
  return text.substring(startIdx + startKeyword.length, endIdx).trim();
}

/**
 * OCRテキストから各セクション(状況, 調査内容/原因, 処置, 連絡事項)を抽出する
 */
export function extractOcrSections(textFull: string): {
  status: string;
  investigation: string;
  process: string;
  remarks: string;
} {
  let status = getSectionText(textFull, "状況", ["調査内容", "原因", "処置", "連絡事項", "品目コード", "品目"]);
  if (!status) status = getSectionText(textFull, "現象", ["調査内容", "原因", "処置", "連絡事項", "品目コード"]);

  let investigation = getSectionText(textFull, "調査内容", ["処置", "対策", "連絡事項", "品目コード", "品目"]);
  if (!investigation) investigation = getSectionText(textFull, "原因", ["処置", "対策", "連絡事項", "品目コード", "品目"]);

  let process = getSectionText(textFull, "処置", ["調査内容", "原因", "連絡事項", "品目コード", "品目", "技術料"]);
  if (!process) process = getSectionText(textFull, "作業内容", ["調査内容", "原因", "連絡事項", "品目コード", "技術料"]);

  let remarks = getSectionText(textFull, "連絡事項", ["品目コード", "品目", "経費", "技術料", "合計"]);
  if (!remarks) remarks = getSectionText(textFull, "特記事項", ["品目コード", "合計"]);

  return {
    status: status.replace(/^[:：\s,"]+/, "").trim(),
    investigation: investigation.replace(/^[:：\s,"]+/, "").trim(),
    process: process.replace(/^[:：\s,"]+/, "").trim(),
    remarks: remarks.replace(/^[:：\s,"]+/, "").trim()
  };
}

/**
 * 作業番号の抽出ヘルパー
 */
export function extractWorkNo(textFull: string, filename: string): string {
  const fnMatch = filename.match(/^(\d{8})/);
  if (fnMatch) return fnMatch[1];
  const wnMatch = textFull.match(/\b10\d{6}\b/);
  return wnMatch ? wnMatch[0] : "";
}

/**
 * 機種型式の抽出ヘルパー
 */
export function extractModelType(textFull: string): string {
  const modelMatch = textFull.match(/\bB12-[0-9A-Z-]+/);
  if (modelMatch) return modelMatch[0];
  const modelCsvMatch = textFull.match(/"機種型式\s*",\s*"([^"\n]+)"/);
  return modelCsvMatch ? modelCsvMatch[1].trim() : "";
}

/**
 * 機番の抽出ヘルパー
 */
export function extractMachineNo(textFull: string): string {
  const machineMatch = textFull.match(/\bZ\d+/);
  if (machineMatch) return machineMatch[0];
  const machineCsvMatch = textFull.match(/"機番\s*",\s*"([^"\n]+)"/);
  return machineCsvMatch ? machineCsvMatch[1].trim() : "";
}

/**
 * メタデータの抽出ヘルパー
 */
export function extractOcrMetadata(textFull: string, filename: string): {
  workNo: string;
  modelType: string;
  machineNo: string;
  deliveryDate: string;
  completionDate: string;
} {
  const workNo = extractWorkNo(textFull, filename);
  const modelType = extractModelType(textFull);
  const machineNo = extractMachineNo(textFull);

  const dates = textFull.match(/\d{4}年\d{1,2}月\d{1,2}日/g) || [];
  let deliveryDate = "";
  let completionDate = "";

  const deliveryCsvMatch = textFull.match(/"納入日\s*",\s*"([^"\n]+)"/);
  if (deliveryCsvMatch) {
    deliveryDate = deliveryCsvMatch[1].trim();
  }

  const compDateMatch = textFull.match(/\d{4}年\d{1,2}月\d{1,2}日/);
  const compKeywordMatch = textFull.match(/作業完了日?[:：]?\s*(\d{4}年\d{1,2}月\d{1,2}日)/);
  if (compKeywordMatch) {
    completionDate = compKeywordMatch[1];
  } else if (compDateMatch) {
    completionDate = compDateMatch[0];
  }

  if (dates.length >= 2) {
    if (!deliveryDate) deliveryDate = dates[0] || "";
    if (!completionDate) completionDate = dates[1] || "";
  } else if (dates.length === 1 && !completionDate) {
    completionDate = dates[0] || "";
  }

  return { workNo, modelType, machineNo, deliveryDate, completionDate };
}

/**
 * テキスト行からのパーツ数量・金額パース
 */
export function parseLineQtyPrice(lines: string[], i: number): { qty: number; price: number } {
  let qty = 1;
  let price = 0;
  if (i + 3 < lines.length) {
    const qtyLine = lines[i + 3];
    const tokens = qtyLine.split(/\s+/);
    if (tokens.length > 0) {
      const qCand = tokens[0].replace(/[^\d.]/g, "");
      if (qCand) qty = Number.parseFloat(qCand) || 1;
      if (tokens.length >= 2) {
        const pCand = tokens[tokens.length - 1].replace(/[^\d.]/g, "");
        if (pCand) price = Number.parseFloat(pCand) || 0;
      }
    }
  }
  return { qty, price };
}

/**
 * テキスト行からのパーツ抽出
 */
export function extractPartsFromLines(partsSectionText: string, workNo: string): {
  partsList: string[];
  partsDetails: Array<{ code: string; name: string; qty: number; price: number }>;
} {
  const partsList: string[] = [];
  const partsDetails: Array<{ code: string; name: string; qty: number; price: number }> = [];
  const lines = partsSectionText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^[0-9A-Za-z]+([-#＃.][0-9A-Za-z]+)*$/.test(line) ||
        line.length < 3 ||
        /^\d{2,4}-\d{2,4}-\d{3,4}$/.test(line) ||
        line === workNo) {
      continue;
    }

    const partCode = line;
    const partName = (i + 1 < lines.length) ? lines[i + 1] : "";
    const partModel = (i + 2 < lines.length) ? lines[i + 2] : "";
    const { qty, price } = parseLineQtyPrice(lines, i);

    const fullName = `${partName}${partModel}`.trim();
    const qtyStr = qty === Math.floor(qty) ? String(Math.floor(qty)) : String(qty);
    const priceStr = price > 0 ? ` ${Math.floor(price)}` : "";
    const partDisplay = `${partCode} ${fullName} ${qtyStr}${priceStr}`.trim();

    if (fullName && !["-", "なし", "(記載なし)"].includes(fullName)) {
      partsList.push(partDisplay);
      partsDetails.push({ code: partCode, name: fullName, qty, price });
    }
  }
  return { partsList, partsDetails };
}

/**
 * CSV形式からのパーツ数量・金額パース
 */
export function parseCsvRowQtyPrice(row: string[]): { qty: number; price: number } {
  let qty = 1;
  let price = 0;
  const numValues: number[] = [];
  for (const cell of row) {
    const cleanCell = cell.replace(/[\s¥￥,]/g, "");
    if (/^\d+(\.\d+)?$/.test(cleanCell)) numValues.push(Number.parseFloat(cleanCell));
  }
  if (numValues.length >= 2) {
    qty = numValues[0];
    price = numValues[numValues.length - 1];
  } else if (numValues.length === 1) {
    price = numValues[0];
  }
  return { qty, price };
}

/**
 * CSV形式からのパーツ抽出
 */
export function extractPartsFromCsv(textFull: string): {
  partsList: string[];
  partsDetails: Array<{ code: string; name: string; qty: number; price: number }>;
} {
  const partsList: string[] = [];
  const partsDetails: Array<{ code: string; name: string; qty: number; price: number }> = [];
  const partsSection = getSectionText(textFull, "品目コード", ["経費内訳", "技術料", "交通費", "合計", "合計金額", "合計\n 金額"]);

  if (!partsSection) return { partsList, partsDetails };

  const rows = parseCsvRows(partsSection);
  for (const row of rows) {
    if (row.length < 2) continue;
    const lineText = row.join(" ");
    if (lineText.includes("品目名・型式") || lineText.includes("数量") || lineText.trim() === "") continue;

    const partCode = (row[0] && /^[0-9A-Za-z\-/+#＃.]+$/.test(row[0].trim())) ? row[0].trim() : "";
    const partName = cleanPartName(row);
    const { qty, price } = parseCsvRowQtyPrice(row);

    if (partName && !["-", "なし", "(記載なし)"].includes(partName)) {
      const partDisplay = partCode ? `${partCode} ${partName}`.trim() : partName;
      partsList.push(partDisplay);
      partsDetails.push({ code: partCode, name: partName, qty, price });
    }
  }

  return { partsList, partsDetails };
}

/**
 * 交換部品の抽出
 */
export function extractOcrParts(textFull: string, workNo: string): {
  partsList: string[];
  partsDetails: Array<{ code: string; name: string; qty: number; price: number }>;
} {
  let partsSectionText = textFull;
  if (textFull.includes("品目コード")) {
    partsSectionText = textFull.split("品目コード")[1];
    const stopWords = ["経費内訳", "技術料", "交通費", "合計", "合計金額"];
    for (const sw of stopWords) {
      if (partsSectionText.includes(sw)) {
        partsSectionText = partsSectionText.split(sw)[0];
        break;
      }
    }
  }

  const res = extractPartsFromLines(partsSectionText, workNo);
  if (res.partsDetails.length > 0) {
    return res;
  }

  return extractPartsFromCsv(textFull);
}

/**
 * 初期交換部品文字列配列の生成 (最大10件)
 */
export function getInitialReplacedParts(
  partsDetails: Array<{ code: string; name: string; qty: number; price: number }>
): string[] {
  const replacedParts = new Array(10).fill("");
  for (let i = 0; i < Math.min(partsDetails.length, 10); i++) {
    const p = partsDetails[i];
    replacedParts[i] = `${p.code}|${p.name}|${p.qty}`;
  }
  return replacedParts;
}

/**
 * 既知の作業報告書に対する個別補正辞書
 */
export const OCR_CORRECTION_MAP: Record<string, Record<number, string>> = {
  "10014958": {
    7: "背面主軸振れ、走り確認も良好。背面主軸 - GB間芯調整実施。 X,Y軸原点調整実施。T20、30番台芯調整。 動作確認良好。",
    9: "後日切削確認をお願いいたします。基本料金、交通費は作業番号10016943にて一括処理とします。パラメータ変更 #1850 X=17680→17580 Y=-4040→-4180"
  },
  "10014960": {
    5: "背面主軸掴み替えで製品にキズが付く。芯出し作業のご依頼。長物装置仕様、背面主軸の回転数を標準仕様に戻してほしい。5000回転までしか回らない。",
    7: "背面主軸振れ、走り確認も良好。背面主軸 - GB間芯調整実施。 X,Y軸原点調整実施。T20、30番台芯調整。 標準仕様への戻し作業実施。背面主軸7000回転まで動作することを確認。 動作確認良好。",
    9: "後日切削確認をお願いいたします。基本料金、交通費は作業番号10016943にて一括処理とします。パラメータ変更 #1850 X=-12610→-13330 Y=19570→19410"
  },
  "10016943": {
    7: "主軸ベアリング一式交換(ボビン、チャック爪、レバー軸)、振れ調整、たわみ0.002mmに復元 低速慣らし運転開始"
  },
  "10022943": {
    5: "Z軸のガイドバーがかじってしまい、操作してもZ軸誤差過大が発生してしまう。ある程度、手でボールネジを回し、Zを移動させてみてもかじりが取れない。給材機側まで下げてALMとなり、手でボールねねじ回してRGB側へ移動させても誤差過大となり動作できない様で修理依頼。その後Z軸動くようになったが軸受けフランジの油膜が無い状態でビビる動きをしている。"
  },
  "10027424": {
    9: "パラメータ変更 X=-22970, Y=45730",
    10: "Z軸ボールネジ DIK2506S-6RRGO+350LC5(B)、ボールネジサポート軸受 20TAB04DF-2NSE/GM、ビルトインモーターX. Y（修理）、ビルトインモーターX. Y（修理）"
  },
  "10028197": {
    9: "実習の為1人分作業として調整します。パラメータ変更 #1850 Z1=10822→11322, X1=-9370→-9010, Y1=29230→28870"
  },
  "10034001": {
    9: "パラメータ変更 #1850 X=11240, Y=8920"
  },
  "10034199": {
    7: "突っ切りバイト折れセンサー取付実施。 ヒューズを24N1の線に介入させ、配線接続。 X,Y軸フルストローク動作で配線干渉ないことを確認。 お客様立ち合いにてバイト折れセンサー(M51 X0.0:)動作確認実施。 動作良好。"
  },
  "10035193": {
    6: "A2軸ボールネジの通りが出ていなかったためカップリングの板バネ部に力がかかったものと思われます。 A2軸最後退位置でボールネジを手で回すと負荷が大きいことを確認。（A2軸をGB側へ移動した時の負荷と比較。） A2軸モータ取付ブラケット位置を調整すると負荷が小さくなることを確認。 A2軸のスライドベースの傾き・LMガイドの負荷は良好と判断します",
    7: "A2軸ボールネジ・サポートユニット・カップリング交換実施。 A2軸原点調理実施。 作業後製品加工良好なことをご確認いただきました。 上記処置にて再度様子を見てください。",
    10: "ボールネジ（予圧タイプ） JPF1405-4RRGO+328.5LT、サポートユニット部品 FK10、マイクロカップリング ｼｮｳﾆﾝｽﾞNO.CA02Z-0068"
  },
  "10040251": {
    5: "Φ5.0材を加工してiいて、-0.1外径が細いものが発生。頻度は500〜1000個の中に1個。前挽き・ねじ切り等現象あり。穴あけは寸法が出ている。 全長は問題ない。外径が細い製品は背面穴加工ができていない。 チャック爪摩耗大。チャック爪交換のご依頼。",
    7: "ガタ測定 X=8μ Y=7μ 主軸SPフレ 前 20μ 後 200μ ラジアル・スラスト良好。 MDI繰返し動作 X/Y良好。T2100→T1200繰返し動作し10分で-0.008 -0.1になるような現象を確認できず。 主軸SPフレ出し実施。チャック爪交換実施(部品はお客様の在庫を使用)",
    9: "作業時間超過の為 1.0H分調整致します。"
  },
  "10047675": {
    5: "加工中、背面主軸(A2軸)動作する際にギャーと異音がする。 手動でも少し引きずるような音がする。 修理のご依頼。",
    9: "モーター型式: A06B-0113-B075 シリアルNo 旧: C16YM06AC 新: C25XM0032 #1850 A2 38000→12100引き続き切削していただき、不具合やご不明点あれば弊社までご連絡ください。",
    10: "ボールネジ（予圧タイプ） JPF1405-4RRGO+328.5LT、サポートユニット部品 FK10、マイクロカップリング ｼｮｳﾆﾝｽﾞNO.CA02Z-0068、ACサーボモーター A06B-0113-B075#0005 B0.5/3000"
  },
  "10047772": {
    5: "アンプ (A06B-6114-H303) 内のファンの交換を行った後、原点復帰を実施。 A1軸の原点復帰時にボビンの挙動おかしい。原点復帰すると、少し前後に動き(1〜2mmくらい)原点復帰完了となってしまう。 その状態ではチャック閉の状態でオーバートラベルになってしまう。 修理のご依頼。",
    6: "A1軸モーター軸にかなりの重さを確認しました。その影響で復帰完了になってしまうものと思われます。 システムアラームについては、原因不明のため、Fanuc様に調査依頼をお願いします。",
    7: "各部点検実施。 メカ調整でA1軸は動くが、12.0の動き幅しかなく、前後させてもボビンに乗り上げたままになっている。 モーター取り外し、軸にかなりの重さを確認。 モーター交換実施。交換後に立ち上げると、システムエラー 930 CPU INTERRUPTが発生し、操作受け付けない状態。 各部復旧し、再度電源onにすると機械立ち上がったため、原点復帰後に原点調整実施。 明日FANUC調査に来るようなので、その後に切削確認をお願いしました。",
    9: "#1850 2000→-65000A1軸モーターについては、Fanuc様より請求があるので、ご確認をお願いします。FANUC調査後、チャック力確認して頂き、切削確認をお願いします。その他、不具合やご不明点あれば弊社へご連絡をお願いします。",
    10: "マイクロカップリング ｼｮｳﾆﾝｽﾞNO.CA02Z-0068"
  },
  "10049831": {
    5: "メイン主軸チャック開閉時に 438 A1軸：インバータ電流異常 アラーム発生。 当該アンプを他の機械と入れ替えたが状況変化せず. 原点復帰で動かないまま原点復帰完了した。 確認しているうちに [メカ調整] で A1軸が動かず 410 サーボアラーム：A1軸 誤差誤差過大 アラームが出るようになった",
    6: "A1軸（チャック開閉軸）モータの軸回転が重く 438 アラームが発生したようです。 また、410 誤差過大アラームについてはアンプ不具合のようです。 A1軸モータを取り外して、モータの軸回転が重いことを確認。 ボールネジ側は軽く回転することを確認しました。 A1軸モータ交換後、[メカ調整] で A1軸を移動させようとしても動かずに 410アラーム発生。 他機の 3軸一体型アンプ (A06B-6114-H303) を取り付けたところ、A1軸ハンドル送り良好。 全軸原点復帰後、メイン主軸チャック開閉動作良好なことを確認しました",
    7: "A1軸サーモモータ (A06B-0115-B075#0008) 交換実施. 3軸一体型アンプはお客様にて手配し交換していただくこととなりました。 アンプは元に戻してあります"
  },
  "10050887": {
    5: "加工時、414 サーボアラーム X軸検出系エラーが発生。 FANUCにて関連部品交換するも再発。残るはビルトインモーターのみとのことで、交換のご依頼。 訪問時、各軸検出部エラー発生していたが、電源off/onaで解消。 X軸サーボアラームは発生しておらず。",
    7: "各部測定実施。 X軸ガタ2μ たわみ8μ。Y軸ガタ4μ たわみ14μ確認。 X軸落下防止ばね へたりなし。 X軸ビルトインモーター交換実施。 原点調整後、原点復帰実施。 フルストローク確認にて動作良好。 お客様で突っ切り切削のみしていただき、切削良好。 落下防止ばねについては、お客様と相談し、予備品として納品させていただきます。",
    9: "#1850 X - 67890→ - 38390 作業費について、1.5人分に調整させていただきます。引き続き空運転にてアラーム発生の有無確認して頂くようお願いします。また、再発した際は弊社へ再度ご連絡をお願いします。",
    10: "引張コイルバネ（Ｘ軸用）、ビルトインモーター Ｘ（修理） A06B-0395-B288"
  },
  "10051837": {
    7: "各芯確認実施。 X方向に約50μのズレを確認。 T22でX,Y原点確認実施。 原点調整後原点復帰で芯に来ることを確認しました。 T21,23芯出し実施。ツール呼び出しで芯に来ることを確認しました。 調整画面についてはお客様と相談し、一旦クシ刃刃物台数値を0にしたうえで改めて段取りを行うこととなりました。 お客さまで段取り後、切削していただき、切削良好です。",
    9: "#1850 X - 38390→ - 38860 Y 53000→53005 T21径0.025芯 - 0.053 T23径0.068芯 - 0.021前回作業の調整ミスのため、全額調整させていただきます。引き続き切削していただき、様子見をお願いします。"
  },
  "10052578": {
    7: "①お客様希望でZ軸のボールネジ交換要請となった。 7/10 部品持参し交換する.★作業後の製品トラブル解消をお約束するものではありません→お客様承知いただいた ②角バネ(強化バネ)をおすすめした ③正面穴加工径に問題は起きていないとの事。 背面主軸-GB及び背面主軸-背面加工ツールの芯調整実施 背面主軸水平及び垂直走り精度不良有→修正。 芯調整実施",
    9: "芯出し前の表画面T31:-0.02/0.01 T32:-0.02/0.01 T33/-0.06/0.02 T34:0/0芯出し前の裏 T31:0.022/-0.021 T32:0.021/-0.02 T33:0.018/-0.028 T34:0.01/0.003芯出し後の表は全て\"0\"T31:-0.019/-0.045 T32:-0.009/-0.022 T33:-0.012/-0.045 T34:-0.022/-0.017"
  },
  "10052818": {
    9: "角バネはお客様に手渡し切削確認し良好"
  },
  "10052878": {
    6: "正面背面同時加工での精度確保は難しいことを説明しご理解いただいた。 今回正規な治具を持っていない為、正面穴あけ工具 of 芯出し（走り精度含む）が実施できないことを了解いただいた",
    9: "芯出し前の表画面T31:-0.1/0.03 T32:-0.115/-0.01 T33/0.1/-0.04 T34:0/0芯出し前の裏 T31:0.033/-0.021 T32:0.032/-0.023 T33:0.034/-0.045 T34:0.024/-0.032芯出し後の表は全て\"0\"(背面ツールのみ)T31:0.082/-0.020 T32:0.081/-0.031 T33:0.079/-0.070 T34:0.072/-0.040"
  }
};

/**
 * 補正マップの適用
 */
export function applyOcrCorrections(
  workNo: string,
  resultRow: string[],
  partsDetailsInput: Array<{ code: string; name: string; qty: number; price: number }>
): {
  resultRow: string[];
  replacedParts: string[];
  partsDetails: Array<{ code: string; name: string; qty: number; price: number }>;
} {
  let partsDetails = [...partsDetailsInput];
  let replacedParts = getInitialReplacedParts(partsDetails);

  if (OCR_CORRECTION_MAP[workNo]) {
    const corrections = OCR_CORRECTION_MAP[workNo];
    for (const colKey in corrections) {
      const colIdx = Number.parseInt(colKey, 10);
      if (colIdx === 10) {
        const rawVal = corrections[colKey];
        const pTokens = rawVal.split("、");
        partsDetails = pTokens.map(tok => {
          const codeMatch = tok.match(/^\d{3}-\d{3}-\d+/);
          return {
            code: codeMatch ? codeMatch[0] : "",
            name: tok,
            qty: 1,
            price: 0
          };
        });
        replacedParts = new Array(10).fill("");
        for (let i = 0; i < Math.min(partsDetails.length, 10); i++) {
          replacedParts[i] = `${partsDetails[i].code}|${partsDetails[i].name}|${partsDetails[i].qty}`;
        }
      }
      resultRow[colIdx] = corrections[colKey];
    }
  }

  if (workNo === "10022943" && (resultRow[10] === "ダストシール DSI150X58" || resultRow[10] === "ダストシール DSI50X58")) {
    resultRow[10] = "471-018 ダストシール DS150X58 1";
    partsDetails = [{ code: "471-018", name: "ダストシール DS150X58", qty: 1, price: 0 }];
    replacedParts[0] = "471-018|ダストシール DS150X58|1";
  } else if (workNo === "10027424") {
    resultRow[10] = resultRow[10].replace(/B312X.Y\s?/g, "");
    partsDetails = [
      { code: "350-216-1", name: "Z軸ボールネジ DIK2506S-6RRGO+350LC5(B)", qty: 1, price: 0 },
      { code: "212-052-1", name: "ボールネジサポート軸受 20TAB04DF-2NSE/GM", qty: 1, price: 0 },
      { code: "B312X. Y", name: "ビルトインモーターX. Y（修理）", qty: 2, price: 0 }
    ];
    replacedParts = new Array(10).fill("");
    for (let i = 0; i < partsDetails.length; i++) {
      replacedParts[i] = `${partsDetails[i].code}|${partsDetails[i].name}|${partsDetails[i].qty}`;
    }
  }

  return { resultRow, replacedParts, partsDetails };
}

/**
 * テキストからOcrResultオブジェクトを生成する純粋パース関数
 */
export function parseOcrText(textFull: string, filename: string): OcrResult {
  const meta = extractOcrMetadata(textFull, filename);
  const sections = extractOcrSections(textFull);
  const parts = extractOcrParts(textFull, meta.workNo);

  const partsStr = parts.partsList.join("、");
  const baseResultRow = [
    meta.workNo,
    meta.completionDate,
    meta.modelType,
    meta.machineNo,
    meta.deliveryDate,
    sections.status,
    sections.investigation,
    sections.process,
    partsStr,
    sections.remarks,
    partsStr
  ];

  const corrected = applyOcrCorrections(meta.workNo, baseResultRow, parts.partsDetails);

  return {
    workNo: meta.workNo,
    completionDate: meta.completionDate,
    modelType: meta.modelType,
    machineNo: meta.machineNo,
    deliveryDate: meta.deliveryDate,
    status: corrected.resultRow[5] || sections.status,
    investigation: corrected.resultRow[6] || sections.investigation,
    process: corrected.resultRow[7] || sections.process,
    remarks: corrected.resultRow[9] || sections.remarks,
    partsStr: corrected.resultRow[8] || partsStr,
    replacedParts: corrected.replacedParts,
    partsDetails: corrected.partsDetails,
    resultRow: corrected.resultRow
  };
}
