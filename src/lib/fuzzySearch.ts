/**
 * 模糊搜尋核心 — 零依賴、支援中日英混搜、錯字容忍
 * 特性：
 *  - 正規化：NFKC + 小寫 + 去多餘空白與標點
 *  - 子字串優先、接著子序列、最後編輯距離
 *  - 支援多欄位取最高分、Token 平均
 *  - 支援中日文本的字級加權（中文 2 字即有意義）
 *  - 回傳 0~1 分數與 highlight 資料
 */

// ── 正規化 ──────────────────────────────────────────────

/** 將各種標點、空白、全半形統一，去掉干擾字元，保留中日韓字母與數字 */
export function normalizeText(s: string): string {
    if (!s) return '';
    return s
        .normalize('NFKC')
        .toLowerCase()
        .trim()
        // 把常見分隔符統一為空白
        .replace(/[·•・ー\-_\/\\|，。、：；！？,.!?;:'"()\[\]{}<>~`@#$%^&*+=]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** 僅做大小寫與全半形歸一，保留標點（用於 highlight 對照） */
export function looseNormalize(s: string): string {
    return (s ?? '').normalize('NFKC').toLowerCase();
}

// ── CJK 判定 ─────────────────────────────────────────────
function isCJKChar(ch: string): boolean {
    const c = ch.charCodeAt(0);
    // Hiragana / Katakana / CJK Unified / Hangul 範圍寬判
    return (c >= 0x3040 && c <= 0x30ff) || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0x3400 && c <= 0x4dbf);
}

function isMostlyCJK(s: string): boolean {
    if (!s) return false;
    let cjk = 0;
    for (const ch of s) if (isCJKChar(ch)) cjk++;
    return cjk / s.length >= 0.5;
}

// ── Levenshtein ─────────────────────────────────────────

/** 編輯距離，帶 early-exit 上限（超過 maxDist 直接回 > maxDist） */
export function levenshtein(a: string, b: string, maxDist = Infinity): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > maxDist) return maxDist + 1;
    // 確保 n 較小以省記憶體
    if (n > m) return levenshtein(b, a, maxDist);
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
        cur[0] = i;
        let rowMin = cur[0];
        const ca = a.charCodeAt(i - 1);
        for (let j = 1; j <= n; j++) {
            const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
            cur[j] = Math.min(
                prev[j] + 1,      // 刪除
                cur[j - 1] + 1,   // 插入
                prev[j - 1] + cost // 替換
            );
            rowMin = Math.min(rowMin, cur[j]);
        }
        if (rowMin > maxDist) return maxDist + 1;
        const tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
}

/** 歸一化編輯相似度 0~1 */
export function editSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const d = levenshtein(a, b);
    return 1 - d / maxLen;
}

// ── 子序列分數 ──────────────────────────────────────────

/**
 * 查詢是否為目標的子序列，回傳 { matched, score, gaps }
 * score 依「連續命中加分、間隙扣分」計算
 */
export function subsequenceScore(query: string, target: string): { matched: boolean; score: number; indices: number[] } {
    if (!query) return { matched: true, score: 1, indices: [] };
    const q = query; const t = target;
    let qi = 0; let ti = 0;
    const indices: number[] = [];
    let consecutive = 0; let maxConsecutive = 0;
    let gaps = 0;
    while (qi < q.length && ti < t.length) {
        if (q[qi] === t[ti]) {
            indices.push(ti);
            consecutive++; maxConsecutive = Math.max(maxConsecutive, consecutive);
            qi++;
        } else {
            if (indices.length > 0) gaps++;
            consecutive = 0;
        }
        ti++;
    }
    const matched = qi === q.length;
    if (!matched) return { matched: false, score: 0, indices: [] };
    // 基礎分 = 命中率，連續加分、間隙扣分、長度懲罰
    const coverage = q.length / t.length;
    const contBonus = maxConsecutive / q.length * 0.25;
    const gapPenalty = Math.min(gaps * 0.04, 0.3);
    const lenPenalty = t.length > q.length * 4 ? 0.12 : 0;
    const score = Math.max(0, Math.min(1, 0.45 + coverage * 0.35 + contBonus - gapPenalty - lenPenalty));
    return { matched: true, score, indices };
}

// ── 單字串模糊分數 0~1 ──────────────────────────────────

/**
 * 單一 query 對單一 target 的模糊分數
 * 優先級：完全相等 1.0 > 子字串 0.9~0.98 > 子序列 0.4~0.85 > 編輯相似度
 * 中文查詢放寬：2 字即做寬鬆匹配
 */
export function fuzzyScore(rawQuery: string, rawTarget: string): number {
    const q = normalizeText(rawQuery);
    const t = normalizeText(rawTarget);
    if (!q || !t) return 0;
    if (q === t) return 1;

    const qIsCJK = isMostlyCJK(q);
    const qNoSpace = q.replace(/\s+/g, '');
    const tNoSpace = t.replace(/\s+/g, '');

    // CJK 無空白子字串命中（關鍵：中文「相反的你」命中「相反的你和我」）
    if (qIsCJK && qNoSpace.length >= 2) {
        if (tNoSpace.includes(qNoSpace)) {
            const idx = tNoSpace.indexOf(qNoSpace);
            const posBonus = 1 - idx / Math.max(tNoSpace.length, 1) * 0.06;
            const lenBonus = qNoSpace.length / tNoSpace.length * 0.06;
            return Math.min(1, 0.94 + posBonus * 0.03 + lenBonus);
        }
        // 反向：目標較短但被查詢包含（輸入「相反的你和我」→ 欄位「相反的你」）
        if (qNoSpace.includes(tNoSpace) && tNoSpace.length >= 2) {
            return Math.min(1, 0.90 + (tNoSpace.length / qNoSpace.length) * 0.06);
        }
    }

    // 一般子字串：越靠前越高分
    const idx = t.indexOf(q);
    if (idx !== -1) {
        const posBonus = 1 - idx / Math.max(t.length, 1) * 0.08;
        const lenBonus = q.length / t.length * 0.05;
        return Math.min(1, 0.92 + posBonus * 0.04 + lenBonus);
    }

    // 多 token：以空白切，取平均（任一 token 沒命中則扣分）
    const tokens = q.split(' ').filter(Boolean);
    if (tokens.length > 1) {
        let sum = 0; let miss = 0;
        for (const tok of tokens) {
            const s = fuzzyScore(tok, t);
            if (s < 0.35) miss++;
            sum += s;
        }
        const avg = sum / tokens.length;
        return Math.max(0, avg - miss * 0.12);
    }

    // 短查詢門檻：中文 2 字即放寬，英文維持 3 字以上才做編輯距離
    const minLenForEdit = qIsCJK ? 2 : 3;
    if (q.length < minLenForEdit) {
        const sub = subsequenceScore(q, t);
        // 中文短詞：子序列命中給較高分
        if (qIsCJK) {
            if (sub.matched) return Math.min(0.78, sub.score + 0.06);
            // 無空格子序列再試一次
            const sub2 = subsequenceScore(qNoSpace, tNoSpace);
            if (sub2.matched) return Math.min(0.72, sub2.score);
            return 0;
        }
        return sub.matched ? Math.min(0.72, sub.score) : 0;
    }

    // 子序列（也試無空格版，對 CJK 更友好）
    const sub = subsequenceScore(q, t);
    let subScore = sub.matched ? sub.score : 0;
    if (qIsCJK && subScore < 0.4) {
        const subNoSpace = subsequenceScore(qNoSpace, tNoSpace);
        if (subNoSpace.matched) subScore = Math.max(subScore, subNoSpace.score * 0.92);
    }

    // 編輯距離：允許約 30% 錯字（CJK 放寬到 40%）
    const ratio = qIsCJK ? 0.40 : 0.35;
    const maxDist = Math.ceil(q.length * ratio);
    const dist = levenshtein(q, t, maxDist);
    let editScore = 0;
    if (dist <= maxDist) {
        editScore = 1 - dist / Math.max(q.length, t.length);
        // 短目標加分
        if (t.length <= q.length + 2) editScore += 0.05;
        editScore = Math.min(1, editScore);
        // 門檻：太低視為無效
        if (editScore < 0.45) editScore *= 0.6;
    } else {
        // 滑動窗口：在長目標中找最接近的子字串
        if (t.length > q.length + 3) {
            let best = 0;
            const win = q.length + 1;
            for (let i = 0; i <= t.length - win; i++) {
                const slice = t.slice(i, i + win);
                const d = levenshtein(q, slice, maxDist);
                if (d <= maxDist) {
                    const s = 1 - d / Math.max(q.length, slice.length);
                    if (s > best) best = s;
                }
            }
            editScore = best * 0.82; // 窗口匹配稍微扣分
        }
    }

    // CJK 無空格編輯距離作為補充信號
    if (qIsCJK && editScore < 0.5) {
        const qns = qNoSpace; const tns = tNoSpace;
        if (qns.length >= 2 && tns.length >= 2) {
            const md2 = Math.ceil(qns.length * 0.42);
            const d2 = levenshtein(qns, tns, md2);
            if (d2 <= md2) {
                const s2 = (1 - d2 / Math.max(qns.length, tns.length)) * 0.88;
                editScore = Math.max(editScore, s2);
            }
        }
    }

    return Math.max(subScore, editScore);
}

// ── 多欄位取最高分 ──────────────────────────────────────

export interface FuzzyFieldScore {
    field: string;
    text: string;
    score: number;
}

export function bestFieldScore(query: string, fields: Record<string, string | undefined>): FuzzyFieldScore | null {
    let best: FuzzyFieldScore | null = null;
    for (const [field, text] of Object.entries(fields)) {
        if (!text) continue;
        const s = fuzzyScore(query, text);
        if (!best || s > best.score) best = { field, text, score: s };
    }
    return best;
}

// ── 通用過濾 + 排序 ─────────────────────────────────────

export interface FuzzyResult<T> {
    item: T;
    score: number;
    matchedField: string;
    matchedText: string;
}

export interface FuzzyFilterOptions {
    /** 低於此分數直接過濾，預設 0.32 */
    threshold?: number;
    /** 最多回傳筆數 */
    limit?: number;
}

/**
 * 對任意陣列做模糊過濾與排序
 * @param query 使用者輸入
 * @param items 候選清單
 * @param getFields 每個 item 轉成 { fieldName: text } 的多欄位對照
 */
export function fuzzyFilter<T>(
    query: string,
    items: T[],
    getFields: (item: T) => Record<string, string | undefined>,
    opts: FuzzyFilterOptions = {}
): FuzzyResult<T>[] {
    const threshold = opts.threshold ?? 0.32;
    const q = normalizeText(query);
    if (!q) return items.map((item) => ({ item, score: 1, matchedField: '', matchedText: '' }));
    const scored: FuzzyResult<T>[] = [];
    for (const item of items) {
        const fields = getFields(item);
        const best = bestFieldScore(q, fields);
        if (best && best.score >= threshold) {
            scored.push({ item, score: best.score, matchedField: best.field, matchedText: best.text });
        }
    }
    scored.sort((a, b) => b.score - a.score);
    return opts.limit ? scored.slice(0, opts.limit) : scored;
}

// ── Highlight ───────────────────────────────────────────

/** 將目標文字中「按順序命中 query 字元」的位置標出，用於 UI 高亮 */
export function highlightIndices(query: string, target: string): number[] {
    const q = looseNormalize(query).replace(/\s+/g, '');
    const t = looseNormalize(target);
    if (!q || !t) return [];
    // 先嘗試子字串直接對應
    const idx = t.indexOf(q);
    if (idx !== -1) return Array.from({ length: q.length }, (_, i) => idx + i);
    // 否則子序列貪心對應
    const res: number[] = [];
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) { res.push(ti); qi++; }
    }
    return qi === q.length ? res : [];
}

export interface HighlightSegment { text: string; matched: boolean }

/** 回傳可直接渲染的片段陣列 */
export function highlightSegments(query: string, target: string): HighlightSegment[] {
    if (!query || !target) return [{ text: target, matched: false }];
    const indices = new Set(highlightIndices(query, target));
    if (indices.size === 0) return [{ text: target, matched: false }];
    const segs: HighlightSegment[] = [];
    let buf = ''; let curMatched = indices.has(0);
    for (let i = 0; i < target.length; i++) {
        const m = indices.has(i);
        if (m !== curMatched) {
            if (buf) segs.push({ text: buf, matched: curMatched });
            buf = target[i]; curMatched = m;
        } else {
            buf += target[i];
        }
    }
    if (buf) segs.push({ text: buf, matched: curMatched });
    return segs;
}

/** 判斷是否為「精準命中」vs「模糊命中」 */
export function isExactHit(score: number): boolean { return score >= 0.92; }
export function isFuzzyHit(score: number): boolean { return score >= 0.32 && score < 0.92; }
