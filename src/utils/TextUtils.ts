/**
 * テキスト処理・正規化・CSVユーティリティ
 */

export const HANKAKU_KANA: Record<string, string> = {
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
export function convertHankakuToZenkaku(text: string): string {
  if (!text) return "";
  const res: string[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (i + 1 < text.length && (text[i + 1] === "ﾞ" || text[i + 1] === "ﾟ")) {
      const mark = text[i + 1];
      const kana = HANKAKU_KANA[char] || char;
      const voiced: Record<string, string> = {
        "カ": "ガ", "キ": "ギ", "ク": "グ", "ケ": "ゲ", "コ": "ゴ",
        "サ": "ザ", "シ": "ジ", "ス": "ズ", "セ": "ゼ", "ソ": "ゾ",
        "タ": "ダ", "チ": "ヂ", "ツ": "ヅ", "テ": "デ", "ト": "ド",
        "ハ": "バ", "ヒ": "ビ", "フ": "ブ", "ヘ": "ベ", "ホ": "ボ",
        "ウ": "ヴ"
      };
      const semivoiced: Record<string, string> = {
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
export function normalizeText(text: string): string {
  if (!text) return "";

  // 連続スペース、改行の正規化
  let normalized = text.replace(/\s+/g, ' ').trim();

  // 全角英数の半角化
  const zen = "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ";
  const han = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let transText = "";
  for (const char of normalized) {
    const index = zen.indexOf(char);
    if (index !== -1) {
      transText += han[index];
    } else {
      transText += char;
    }
  }
  normalized = transText;

  normalized = normalized.replaceAll("～", "〜");
  normalized = normalized.replaceAll("‐", "-");
  normalized = normalized.replaceAll("—", "-");
  normalized = normalized.replaceAll("♯", "#");
  normalized = normalized.replaceAll("㎛", "μm");

  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * 部品名のクレンジング
 */
export function cleanPartName(row: string[]): string {
  const cleaned: string[] = [];
  for (let idx = 0; idx < row.length; idx++) {
    const t = row[idx].trim();
    if (!t) continue;

    if (idx === 0) {
      // 品目コード（アルファベット、数字、ハイフンのみ）はスキップ
      if (/^[0-9A-Za-z\-/]+$/.test(t) && !["N/", "AD", "LMG", "BS"].includes(t)) {
        continue;
      }
    }

    // 数量や金額（スペースや記号を除去して数字とカンマのみになる場合）はスキップ
    const numCheck = t.replace(/[\s¥￥,]/g, "");
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

interface CsvParseState {
  row: string[];
  cell: string;
  inQuotes: boolean;
  pushCell: () => void;
  pushRow: () => void;
}

/**
 * CSV文字処理
 */
export function processCsvChar(state: CsvParseState, char: string, nextChar?: string): number {
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
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  const state: CsvParseState = {
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

