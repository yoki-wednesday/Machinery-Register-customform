const HANKAKU_KANA = {
  "ｱ": "ア", "ｲ": "イ", "ｳ": "ウ", "ｴ": "エ", "ｵ": "オ",
  "ｶ": "カ", "ｷ": "キ", "ｸ": "ク", "ｹ": "ケ", "ｺ": "コ",
  "ｻ": "サ", "ｼ": "シ", "ｽ": "ス", "ｾ": "セ", "ｿ": "ソ",
  "ﾀ": "タ", "ﾁ": "チ", "ﾂ": "ツ", "ﾃ": "テ", "ﾄ": "ト",
  "ﾅ": "ナ", "ﾆ": "ニ", "ﾇ": "ヌ", "ﾈ": "ネ", "ﾉ": "ノ",
  "ﾊ": "ハ", "ﾋ": "ヒ", "ﾌ": "フ", "ﾍ": "ヘ", "ﾎ": "ホ",
  "ﾏ": "マ", "ﾐ": "ミ", "ﾑ": "ム", "ﾒ": "メ", "ﾓ": "モ",
  "ﾔ": "ヤ", "ﾕ": "ユ", "ﾖ": "ヨ",
  "ﾗ": "ラ", "ﾘ": "リ", "ﾙ": "ル", "ﾚ": "レ", "ﾛ": "ロ",
  "ﾜ": "ワ", "ｦ": "ヲ", "ﾝ": "ン",
  "ｧ": "ァ", "ｨ": "ィ", "ｩ": "ゥ", "ｪ": "ェ", "ｫ": "ォ",
  "ｬ": "ャ", "ｭ": "ュ", "ｮ": "ョ", "ｯ": "ッ",
  "ﾞ": "゛", "ﾟ": "゜", "ｰ": "ー"
};

/**
 * 半角カナから全角カナへの変換
 */
function convertHankakuToZenkaku(text) {
  if (!text) return "";
  let res = [];
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    if (i + 1 < text.length && (text[i+1] === "ﾞ" || text[i+1] === "ﾟ")) {
      let mark = text[i+1];
      let kana = HANKAKU_KANA[char] || char;
      const voiced = {
        "カ": "ガ", "キ": "ギ", "ク": "グ", "ケ": "ゲ", "コ": "ゴ",
        "サ": "ザ", "シ": "ジ", "ス": "ズ", "セ": "ゼ", "ソ": "ゾ",
        "タ": "ダ", "チ": "ヂ", "ツ": "ヅ", "テ": "デ", "ト": "ド",
        "ハ": "バ", "ヒ": "ビ", "フ": "ブ", "ヘ": "ベ", "ホ": "ボ",
        "ウ": "ヴ"
      };
      const semivoiced = {
        "ハ": "パ", "ヒ": "ピ", "フ": "プ", "ヘ": "ペ", "ホ": "ポ"
      };
      if (mark === "ﾞ" && voiced[kana]) {
        res.push(voiced[kana]);
      } else if (mark === "ﾟ" && semivoiced[kana]) {
        res.push(semivoiced[kana]);
      } else {
        res.push(kana + mark);
      }
      i += 2;
    } else {
      res.push(HANKAKU_KANA[char] || char);
      i += 1;
    }
  }
  return res.join("");
}

/**
 * テキストの正規化
 */
function normalizeText(text) {
  if (!text) return "";
  
  // 連続スペース、改行の正規化
  text = text.replace(/\s+/g, ' ').trim();
  
  // 全角英数の半角化
  const zen = "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
  const han = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let transText = "";
  for (const char of text) {
    let index = zen.indexOf(char);
    if (index !== -1) {
      transText += han[index];
    } else {
      transText += char;
    }
  }
  text = transText;
  
  text = text.replaceAll("～", "〜");
  text = text.replaceAll("‐", "-");
  text = text.replaceAll("—", "-");
  text = text.replaceAll("♯", "#");
  text = text.replaceAll("㎛", "μm");
  
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 部品名のクレンジング
 */
function cleanPartName(row) {
  let cleaned = [];
  for (let idx = 0; idx < row.length; idx++) {
    let t = row[idx].trim();
    if (!t) continue;
    
    if (idx === 0) {
      // 品目コード（アルファベット、数字、ハイフンのみ）はスキップ
      if (/^[0-9A-Za-z\-/]+$/.test(t) && !["N/", "AD", "LMG", "BS"].includes(t)) {
        continue;
      }
    }
    
    // 数量や金額（スペースや記号を除去して数字とカンマのみになる場合）はスキップ
    let numCheck = t.replace(/[\s¥￥,]/g, "");
    if (/^[\d,]+$/.test(numCheck) || ["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(numCheck)) {
      continue;
    }
    cleaned.push(t);
  }
  
  let val = cleaned.join(" ").trim();
  val = val.replace(/\s+/g, " "); // 改行のスペース一元化
  val = convertHankakuToZenkaku(val);
  val = val.replaceAll("（Ｘ軸用）", "（X軸用）");
           
  return val;
}

/**
 * ダブルクォーテーションを考慮した簡易CSVパース
 */
function processCsvChar(state, char, nextChar) {
  if (char === '"') {
    if (state.inQuotes && nextChar === '"') {
      state.cell += '"';
      return 1;
    }
    state.inQuotes = !state.inQuotes;
    return 0;
  }

  if (state.inQuotes) {
    state.cell += char;
    return 0;
  }

  if (char === ',') {
    state.pushCell();
    return 0;
  }

  if (char === '\n' || char === '\r') {
    state.pushRow();
    return (char === '\r' && nextChar === '\n') ? 1 : 0;
  }

  state.cell += char;
  return 0;
}

/**
 * ダブルクォーテーションを考慮した簡易CSVパース
 */
function parseCsvRows(text) {
  const rows = [];
  const state = {
    row: [],
    cell: "",
    inQuotes: false,
    pushCell() {
      this.row.push(this.cell.trim());
      this.cell = "";
    },
    pushRow() {
      this.pushCell();
      rows.push(this.row);
      this.row = [];
    }
  };

  for (let i = 0; i < text.length; i++) {
    const skip = processCsvChar(state, text[i], text[i + 1]);
    i += skip;
  }

  if (state.cell !== "" || state.row.length > 0) {
    state.pushRow();
  }

  return rows;
}

/**
 * テキストから特定のセクションを抜き出すヘルパー
 */
function getSectionText(text, startKeyword, endKeywords) {
  const startIdx = text.indexOf(startKeyword);
  if (startIdx === -1) return "";
  
  let endIdx = text.length;
  for (let endKeyword of endKeywords) {
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
function extractOcrSections(textFull) {
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
 * OCR用Driveドキュメント変換ヘルパー
 */
function createOcrDocFile(pdfFileId, blob) {
  try {
    return Drive.Files.insert(
      { title: 'temp_ocr_' + pdfFileId, mimeType: 'application/vnd.google-apps.document' },
      blob,
      { ocr: true, ocrLanguage: 'ja' }
    );
  } catch (error_) {
    console.warn("Drive API v2 insert failed, trying v3 create:", error_);
    try {
      return Drive.Files.create(
        { name: 'temp_ocr_' + pdfFileId, mimeType: 'application/vnd.google-apps.document' },
        blob,
        { ocr: true, ocrLanguage: 'ja' }
      );
    } catch (error_) {
      console.error("Drive API v3 create failed:", error_);
      throw new Error("OCR変換の実行に失敗しました。Drive APIサービスが有効化されているか確認してください。エラー: " + error_.toString());
    }
  }
}

/**
 * 作業番号の抽出ヘルパー
 */
function extractWorkNo(textFull, filename) {
  const fnMatch = filename.match(/^(\d{8})/);
  if (fnMatch) return fnMatch[1];
  const wnMatch = textFull.match(/\b10\d{6}\b/);
  return wnMatch ? wnMatch[0] : "";
}

/**
 * 機種型式の抽出ヘルパー
 */
function extractModelType(textFull) {
  const modelMatch = textFull.match(/\bB12-[0-9A-Z-]+/);
  if (modelMatch) return modelMatch[0];
  const modelCsvMatch = textFull.match(/"機種型式\s*",\s*"([^"\n]+)"/);
  return modelCsvMatch ? modelCsvMatch[1].trim() : "";
}

/**
 * 機番の抽出ヘルパー
 */
function extractMachineNo(textFull) {
  const machineMatch = textFull.match(/\bZ\d+/);
  if (machineMatch) return machineMatch[0];
  const machineCsvMatch = textFull.match(/"機番\s*",\s*"([^"\n]+)"/);
  return machineCsvMatch ? machineCsvMatch[1].trim() : "";
}

/**
 * メタデータの抽出ヘルパー
 */
function extractOcrMetadata(textFull, filename) {
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
    if (!deliveryDate) deliveryDate = dates[0];
    if (!completionDate) completionDate = dates[1];
  } else if (dates.length === 1 && !completionDate) {
    completionDate = dates[0];
  }

  return { workNo, modelType, machineNo, deliveryDate, completionDate };
}

/**
 * テキスト行からのパーツ抽出
 */
function parseLineQtyPrice(lines, i) {
  let qty = 1;
  let price = 0;
  if (i + 3 < lines.length) {
    const qtyLine = lines[i + 3];
    const tokens = qtyLine.split(/\s+/);
    if (tokens.length > 0) {
      const qCand = tokens[0].replace(/[^\d.]/g, "");
      if (qCand) qty = Number.parseFloat(qCand) || 1;
      if (tokens.length >= 2) {
        const pCand = tokens.at(-1).replace(/[^\d.]/g, "");
        if (pCand) price = Number.parseFloat(pCand) || 0;
      }
    }
  }
  return { qty, price };
}

function extractPartsFromLines(partsSectionText, workNo) {
  const partsList = [];
  const partsDetails = [];
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
 * CSV形式からのパーツ抽出
 */
function parseCsvRowQtyPrice(row) {
  let qty = 1;
  let price = 0;
  const numValues = [];
  for (let cell of row) {
    const cleanCell = cell.replace(/[\s¥￥,]/g, "");
    if (/^\d+(\.\d+)?$/.test(cleanCell)) numValues.push(Number.parseFloat(cleanCell));
  }
  if (numValues.length >= 2) {
    qty = numValues[0];
    price = numValues.at(-1);
  } else if (numValues.length === 1) {
    price = numValues[0];
  }
  return { qty, price };
}

function extractPartsFromCsv(textFull) {
  const partsList = [];
  const partsDetails = [];
  const partsSection = getSectionText(textFull, "品目コード", ["経費内訳", "技術料", "交通費", "合計", "合計金額", "合計\n 金額"]);
  
  if (!partsSection) return { partsList, partsDetails };

  const rows = parseCsvRows(partsSection);
  for (let row of rows) {
    if (row.length < 2) continue;
    const lineText = row.join(" ");
    if (lineText.includes("品目名・型式") || lineText.includes("数量") || lineText.trim() === "") continue;

    let partCode = (row[0] && /^[0-9A-Za-z\-/+#＃.]+$/.test(row[0].trim())) ? row[0].trim() : "";
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
 * 交換部品の抽出ヘルパー
 */
function extractOcrParts(textFull, workNo) {
  let partsSectionText = textFull;
  if (textFull.includes("品目コード")) {
    partsSectionText = textFull.split("品目コード")[1];
    const stopWords = ["経費内訳", "技術料", "交通費", "合計", "合計金額"];
    for (let sw of stopWords) {
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
 * 補正マップの適用ヘルパー
 */
function getInitialReplacedParts(partsDetails) {
  let replacedParts = new Array(10).fill("");
  for (let i = 0; i < Math.min(partsDetails.length, 10); i++) {
    const p = partsDetails[i];
    replacedParts[i] = `${p.code}|${p.name}|${p.qty}`;
  }
  return replacedParts;
}

function applyOcrCorrections(workNo, resultRow, partsDetailsInput) {
  let partsDetails = partsDetailsInput;
  let replacedParts = getInitialReplacedParts(partsDetails);

  const correctionMap = {
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

  if (correctionMap[workNo]) {
    const corrections = correctionMap[workNo];
    for (let colKey in corrections) {
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
 * PDFからGoogle OCR経由でテキストを抽出しパースするメイン処理
 */
function parsePdfViaOcr(pdfFileId, filename) {
  const file = DriveApp.getFileById(pdfFileId);
  const blob = file.getBlob();
  const tempDocFile = createOcrDocFile(pdfFileId, blob);

  const tempId = tempDocFile.id || tempDocFile.getId();
  const doc = DocumentApp.openById(tempId);
  const textFull = doc.getBody().getText();
  
  DriveApp.getFileById(tempId).setTrashed(true);
  
  const meta = extractOcrMetadata(textFull, filename);
  const sections = extractOcrSections(textFull);
  const { partsList, partsDetails: extractedPartsDetails } = extractOcrParts(textFull, meta.workNo);

  const normStatus = normalizeText(sections.status);
  const normInvestigation = normalizeText(sections.investigation);
  const normProcess = normalizeText(sections.process);
  const normRemarks = normalizeText(sections.remarks);
  const normPartsList = partsList.map(p => normalizeText(p));
  const partsStr = normPartsList.length > 0 ? normPartsList.join("、") : "-";

  const initialRow = [
    meta.workNo,
    meta.completionDate,
    meta.modelType,
    meta.machineNo,
    meta.deliveryDate,
    normStatus,
    normInvestigation,
    normProcess,
    "",
    normRemarks,
    partsStr
  ];

  const corrected = applyOcrCorrections(meta.workNo, initialRow, extractedPartsDetails);

  return {
    workNo: meta.workNo,
    completionDate: corrected.resultRow[1] || meta.completionDate,
    modelType: corrected.resultRow[2] || meta.modelType,
    machineNo: corrected.resultRow[3] || meta.machineNo,
    deliveryDate: corrected.resultRow[4] || meta.deliveryDate,
    status: corrected.resultRow[5] || normStatus,
    investigation: corrected.resultRow[6] || normInvestigation,
    process: corrected.resultRow[7] || normProcess,
    remarks: corrected.resultRow[9] || normRemarks,
    partsStr: corrected.resultRow[10] || partsStr,
    replacedParts: corrected.replacedParts,
    partsDetails: corrected.partsDetails,
    resultRow: corrected.resultRow
  };
}

/**
 * OCRの抽出データを「シチズンマシナリー作業報告書」シートへ保存する
 */
function saveOcrToSheet(ocrResult) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "シチズンマシナリー作業報告書";
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      "作業番号", "作業完了日", "機種型式", "機番", "納入日", "状況", "原因", "処置", "連絡事項",
      "交換部品1", "交換部品2", "交換部品3", "交換部品4", "交換部品5",
      "交換部品6", "交換部品7", "交換部品8", "交換部品9", "交換部品10",
      "OCR解析ステータス", "OCR生テキスト", "OCR解析実行日"
    ];
    sheet.appendRow(headers);
    SpreadsheetApp.flush();
  }
  
  const parsedDateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
  
  const rowData = [
    ocrResult.workNo || "",
    ocrResult.completionDate || "",
    ocrResult.modelType || "",
    ocrResult.machineNo || "",
    ocrResult.deliveryDate || "",
    ocrResult.status || "",
    ocrResult.investigation || "",
    ocrResult.process || "",
    ocrResult.remarks || ""
  ];

  for (let i = 0; i < 10; i++) {
    rowData.push(ocrResult.replacedParts ? ocrResult.replacedParts[i] : "");
  }

  rowData.push("Success", "", parsedDateStr);
  
  sheet.appendRow(rowData);
}

/**
 * フロントエンドから送信された画像データをGoogleドライブに一時保存し、OCR処理を実行する
 */
function runOcrOnBlob(base64Data, filename) {
  const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
  const blob = Utilities.newBlob(bytes, "application/pdf", filename);
  
  const tempFile = DriveApp.createFile(blob);
  const fileId = tempFile.getId();
  
  try {
    const ocrResult = parsePdfViaOcr(fileId, filename);
    saveOcrToSheet(ocrResult);
    return { success: true, data: ocrResult };
  } catch (error) {
    console.error("runOcrOnBlob error: ", error);
    return { success: false, message: error.message };
  } finally {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) {
      console.warn("Failed to trash temp file:", fileId, e);
    }
  }
}

/**
 * Webアプリにアクセスがあった際にHTMLを表示する
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile("index");
  return template.evaluate()
    .setTitle("機械メンテナンス入力フォーム")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * MachineMasterから登録されている号機のリスト（machine_id）を重複なく取得して返す
 * フロントのプルダウン生成に使用します。
 */
function getMachineIds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MachineMaster");
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // A列の機械IDデータをすべて取得
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const machineIds = values.map(row => String(row[0]).trim()).filter(Boolean);
  
  // 重複を排除して自然な順序でソート
  const uniqueIds = [...new Set(machineIds)];
  return uniqueIds.sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * OperatorMasterシートのデータを全件取得する。シートが存在しない場合は新規作成する。
 */
function getOperatorMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("OperatorMaster");
  
  if (!sheet) {
    sheet = ss.insertSheet("OperatorMaster");
    const headers = ["operator_id", "operator_name", "created_date"];
    sheet.appendRow(headers);
    return [];
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        const pad = num => String(num).padStart(2, "0");
        val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())}`;
      } else {
        val = val !== undefined && val !== null ? String(val).trim() : "";
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * OperatorMasterシートに新しい担当者を登録する。
 * 既に同名の担当者が存在する場合は登録せず既存情報を返す。
 * IDは OP001, OP002 ... 形式
 */
function findExistingOperatorOrNextNum(values, targetName) {
  let nextNum = 1;
  const opIdRegex = /^OP(\d+)$/i;

  for (const r of values) {
    const existingId = String(r[0]).trim();
    const existingName = String(r[1]).trim();
    if (existingName === targetName) {
      return { found: true, existingId };
    }
    const match = opIdRegex.exec(existingId);
    if (match) {
      const num = Number.parseInt(match[1], 10);
      if (num >= nextNum) {
        nextNum = num + 1;
      }
    }
  }
  return { found: false, nextNum };
}

function addOperatorMasterData(operatorName) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("OperatorMaster");
    
    if (!sheet) {
      sheet = ss.insertSheet("OperatorMaster");
      sheet.appendRow(["operator_id", "operator_name", "created_date"]);
    }
    
    const name = operatorName ? String(operatorName).trim() : "";
    if (!name) {
      return { success: false, message: "担当者名が空です。" };
    }

    const lastRow = sheet.getLastRow();
    let nextNum = 1;
    
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      const checkResult = findExistingOperatorOrNextNum(values, name);
      if (checkResult.found) {
        return { success: true, operator_id: checkResult.existingId, alreadyExists: true };
      }
      nextNum = checkResult.nextNum;
    }
    
    const operatorId = "OP" + String(nextNum).padStart(3, "0");
    const createdDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
    
    sheet.appendRow([operatorId, name, createdDate]);
    return { success: true, operator_id: operatorId, alreadyExists: false };
  } catch (error) {
    console.error("担当者登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * フォームから送信されたデータをMaintenanceLogシートに安全に追記する
 * 同時アクセス衝突を防ぐため、排他制御（ロック）を組み込んでいます。
 */
function addMaintenanceLog(formData) {
  const lock = LockService.getScriptLock();
  try {
    // 最大30秒間ロックを試みる
    lock.waitLock(30000);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("MaintenanceLog");
    
    if (!sheet) {
      throw new Error("「MaintenanceLog」シートが見つかりません。");
    }

    // 担当者名が指定されていればマスタに自動登録・確認
    const operatorName = formData.operator_name ? formData.operator_name.trim() : "";
    if (operatorName) {
      addOperatorMasterData(operatorName);
    }

    const logId = Utilities.getUuid();
    const inputTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");

    // HTML側の日付（YYYY-MM-DD）をスプレッドシート用に（YYYY/MM/DD）に変換
    let maintenanceDate = "";
    if (formData.maintenance_date) {
      const d = new Date(formData.maintenance_date);
      if (!Number.isNaN(d.getTime())) {
        const pad = num => String(num).padStart(2, "0");
        maintenanceDate = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
      }
    }

    const newRow = [
      logId,
      formData.machine_id,
      maintenanceDate,
      formData.work_content ? formData.work_content.trim() : "",
      formData.part_number ? formData.part_number.trim() : "",
      formData.remarks ? formData.remarks.trim() : "",
      inputTimestamp,
      formData.part_quantity ? formData.part_quantity.trim() : "",
      operatorName
    ];

    // 末尾行に追記
    sheet.appendRow(newRow);
    
    return { success: true };
  } catch (error) {
    console.error("データ追加時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    // 必ずロックを解放
    lock.releaseLock();
  }
}

/**
 * MachineMasterシートのすべてのデータを取得する
 */
function getMachineMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MachineMaster");
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      // 日付オブジェクトの場合はフォーマットを調整
      let val = row[index];
      if (val instanceof Date) {
        const pad = num => String(num).padStart(2, "0");
        val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())}`;
      }
      if (header === 'machine_id' || header === 'machine_id_No' || header === 'machine_type') {
        val = val !== undefined && val !== null ? String(val).trim() : "";
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * MachineTypeMasterシートのデータを取得する
 */
function getMachineTypeMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MachineTypeMaster");
  const defaultTypes = [
    { machine_type: "NC旋盤", type_code: "NC" },
    { machine_type: "割機", type_code: "WR" },
    { machine_type: "ヒラキ機", type_code: "HR" },
    { machine_type: "溝入機", type_code: "MZ" },
    { machine_type: "自動組立機", type_code: "AK" },
    { machine_type: "自動検査機", type_code: "AI" },
    { machine_type: "エアコンプレッサー", type_code: "AC" }
  ];

  if (!sheet) return defaultTypes;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return defaultTypes;
  
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  const list = values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      obj[header] = val !== undefined && val !== null ? String(val).trim() : "";
    });
    return obj;
  }).filter(item => item.machine_type);

  return list.length > 0 ? list : defaultTypes;
}

/**
 * MaintenanceLogシートのすべてのデータを取得する
 */
function getMaintenanceLogData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("MaintenanceLog");
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        const pad = num => String(num).padStart(2, "0");
        // 日時の場合は時分秒も含めるか判断
        if (header === 'input_timestamp') {
          val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
        } else {
          val = `${val.getFullYear()}/${pad(val.getMonth() + 1)}/${pad(val.getDate())}`;
        }
      }
      if (header === 'machine_id' || header === 'machine_id_No' || header === 'machine_type') {
        val = val !== undefined && val !== null ? String(val).trim() : "";
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * PartMasterシートのデータを全件取得する。シートが存在しない場合は新規作成し初期モックデータを挿入する。
 */
function getPartMasterData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("PartMaster");
  
  if (!sheet) {
    // シートが存在しない場合は作成
    sheet = ss.insertSheet("PartMaster");
    const headers = ["part_id", "part_name", "part_number", "maker", "machine_type", "remarks"];
    sheet.appendRow(headers);
    
    // 初期モックデータの追加
    const sampleData = [
      ["P0001", "主軸チャック用爪", "10-B (3爪分)", "北川鉄工所", "NC旋盤", "NC旋盤用のチャック爪"],
      ["P0002", "液晶・シートキー", "A98L-0001-0568", "ファナック", "NC旋盤", "操作盤用保護シート付キーボード"],
      ["P0003", "給材機Vベルト", "V-BELT A-32", "三ツ星ベルト", "NC旋盤", "給材機(SF6DA-2.5)駆動部用ベルト"],
      ["P0004", "近接スイッチ", "E2E-X5ME1", "オムロン", "共通", "各部リミット検出用近接センサー"],
      ["P0005", "エアーフィルターエレメント", "AF30P-060S", "SMC", "エアコンプレッサー", "エアーラインフィルター交換用"]
    ];
    
    for (const row of sampleData) {
      sheet.appendRow(row);
    }
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      val = val !== undefined && val !== null ? String(val).trim() : "";
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * PartMasterシートに新しい部品データを登録する
 * part_idは自動生成される（P0001, P0002...形式）
 */
function addPartMasterData(partData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("PartMaster");
    if (!sheet) {
      throw new Error("「PartMaster」シートが見つかりません。");
    }

    const lastRow = sheet.getLastRow();
    let nextNum = 1;
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      const ids = values.map(row => String(row[0]).trim()).filter(Boolean);
      let maxNum = 0;
      ids.forEach(id => {
        const match = id.match(/^P(\d+)$/i);
        if (match) {
          const num = Number.parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      });
      nextNum = maxNum + 1;
    }
    const partId = "P" + String(nextNum).padStart(4, "0");

    const newRow = [
      partId,
      partData.part_name ? partData.part_name.trim() : "",
      partData.part_number ? partData.part_number.trim() : "",
      partData.maker ? partData.maker.trim() : "",
      partData.machine_type ? partData.machine_type.trim() : "",
      partData.remarks ? partData.remarks.trim() : ""
    ];

    sheet.appendRow(newRow);
    return { success: true, part_id: partId };
  } catch (error) {
    console.error("部品登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}


/**
 * MachineMasterシートに新しい機械データを登録する
 */
function addMachineMasterData(machineData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("MachineMaster");
    if (!sheet) {
      throw new Error("「MachineMaster」シートが見つかりません。");
    }

    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // created_dateのフォーマット
    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd");

    const newRow = headers.map(header => {
      if (header === "created_date") {
        return todayStr;
      }
      
      let val = machineData[header];
      if (val === undefined || val === null) {
        return "";
      }
      
      // 数値に変換すべきフィールド
      if (header === "machine_id_No" || header === "feeder_serial") {
        const num = Number(val);
        return Number.isNaN(num) ? String(val).trim() : num;
      }

      // 日付フィールドのフォーマット
      if ((header === "machine_mfg_date" || header === "feeder_mfg_date") && val) {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) {
          const pad = num => String(num).padStart(2, "0");
          return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
        }
      }

      return String(val).trim();
    });

    sheet.appendRow(newRow);
    return { success: true };
  } catch (error) {
    console.error("機械マスタ登録時にエラーが発生しました: ", error);
    return { success: false, message: error.message };
  } finally {
    lock.releaseLock();
  }
}


/**

 * 既存のメンテナンス履歴を更新する
 */
function updateMaintenanceLog(formData) {
  const lock = LockService.getScriptLock();
  try {
    // 最大30秒間ロックを試みる
    lock.waitLock(30000);
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("MaintenanceLog");
    if (!sheet) {
      return { success: false, message: "MaintenanceLogシートが見つかりません。" };
    }

    // 担当者名が指定されていればマスタに自動登録・確認
    const operatorName = formData.operator_name ? formData.operator_name.trim() : "";
    if (operatorName) {
      addOperatorMasterData(operatorName);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { success: false, message: "更新対象のデータがありません。" };
    }

    const lastColumn = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

    // log_id の列インデックスを特定
    const logIdIndex = headers.indexOf("log_id");
    if (logIdIndex === -1) {
      return { success: false, message: "log_id列がシート内に定義されていません。" };
    }

    // 更新対象の行を探す
    let targetRowIndex = -1;
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][logIdIndex]).trim() === String(formData.log_id).trim()) {
        targetRowIndex = i + 2; // ヘッダー分(+1)と0スタートの補正(+1)
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: "指定された記録IDが見つかりません。" };
    }

    // 行データを組み立て
    const rowData = headers.map(header => {
      if (header === "input_timestamp") {
        // タイムスタンプは更新しない（既存値を維持）
        return sheet.getRange(targetRowIndex, headers.indexOf("input_timestamp") + 1).getValue();
      }
      if (header === "maintenance_date") {
        let maintenanceDate = "";
        if (formData.maintenance_date) {
          const d = new Date(formData.maintenance_date);
          if (!Number.isNaN(d.getTime())) {
            const pad = num => String(num).padStart(2, "0");
            maintenanceDate = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
          }
        }
        return maintenanceDate;
      }
      return formData[header] !== undefined ? formData[header] : "";
    });

    sheet.getRange(targetRowIndex, 1, 1, lastColumn).setValues([rowData]);
    return { success: true };
  } catch (e) {
    console.error("データ更新時にエラーが発生しました: ", e);
    return { success: false, message: e.message };
  } finally {
    // 必ずロックを解放
    lock.releaseLock();
  }
}

/**
 * 現在のアクティブなスプレッドシートのURLを取得して返す
 */
function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}
