/**
 * 動漫專用的模糊欄位對照與排序 helper
 * 重用 lib/fuzzySearch 的通用演算法，僅定義「拿哪些欄位來比」
 */
import type { Anime } from './animeApi';
import { bestFieldScore, normalizeText, fuzzyFilter, type FuzzyResult } from './fuzzySearch';

export function animeFields(a: Anime): Record<string, string> {
    return {
        romaji: a.title?.romaji ?? '',
        english: a.title?.english ?? '',
        native: a.title?.native ?? '',
        synonyms: (a.synonyms ?? []).join(' '),
        chineseAliases: (a.chineseAliases ?? []).join(' '),
        genres: (a.genres ?? []).join(' '),
        studios: (a.studios ?? []).join(' '),
        format: a.format ?? '',
    };
}

/** 單部動漫對 query 的最佳模糊分數 */
export function animeFuzzyScore(query: string, anime: Anime): { score: number; field: string; text: string } {
    const q = normalizeText(query);
    if (!q) return { score: 1, field: '', text: '' };
    const fields = animeFields(anime);
    const best = bestFieldScore(q, fields);
    return best ? { score: best.score, field: best.field, text: best.text } : { score: 0, field: '', text: '' };
}

/** 將 AniList 回傳的清單做模糊重排（不丟掉任何結果，僅重排） */
export function rankAnimeByFuzzy(query: string, list: Anime[]): (Anime & { _fuzzyScore: number; _matchedField: string })[] {
    const q = normalizeText(query);
    if (!q || list.length === 0) return list.map((a) => ({ ...a, _fuzzyScore: 1, _matchedField: '' }));
    const enriched = list.map((a) => {
        const { score, field } = animeFuzzyScore(q, a);
        // 中文別名命中視為精準
        const isZhHit = field === 'chineseAliases' && score >= 0.52;
        const finalScore = isZhHit ? Math.max(score, 0.92) : score;
        return { ...a, _fuzzyScore: finalScore, _matchedField: field };
    });
    // 主鍵：模糊分數；次鍵：人氣/評分（避免模糊相近時亂序）
    enriched.sort((a, b) => {
        const d = b._fuzzyScore - a._fuzzyScore;
        if (Math.abs(d) > 0.06) return d;
        return (b.popularity ?? 0) - (a.popularity ?? 0);
    });
    return enriched;
}

/** 本地候選池做模糊過濾（用於輸入時的即時提示） */
export function suggestAnime(query: string, pool: Anime[], limit = 6): FuzzyResult<Anime>[] {
    return fuzzyFilter(query, pool, animeFields, { threshold: 0.28, limit });
}
