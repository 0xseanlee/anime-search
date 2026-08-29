/**
 * 中日英別名對照 — 解決「中文俗名搜不到」的核心
 * AniList 只索引 romaji / english / native，中文需靠本地映射展開為可查詢詞
 */

export interface AliasEntry {
    /** 中文常用名（正字） */
    zh: string[];
    /** 對應的可在 AniList 命中的查詢詞（日文原名 / 羅馬字 / 英文） */
    hits: string[];
}

/** 核心對照表：key 為正規化後的中文（NFKC lower 去空白） → 命中詞 */
const TABLE: AliasEntry[] = [
    // 使用者回報案例
    { zh: ['相反的你和我', '相反的你與我'], hits: ['正反対な君と僕', 'Seihantai na Kimi to Boku', 'You and I Are Polar Opposites'] },
    // 高頻熱門中文別名
    { zh: ['葬送的芙莉蓮', '葬送的芙利蓮'], hits: ['Sousou no Frieren', 'Frieren: Beyond Journey\'s End', '葬送のフリーレン'] },
    { zh: ['我獨自升級', '我獨自升級 第二季', '單人升級'], hits: ['Ore dake Level Up na Ken', 'Solo Leveling'] },
    { zh: ['咒術迴戰', '咒术回战'], hits: ['Jujutsu Kaisen'] },
    { zh: ['間諜家家酒', '間諜過家家', 'SPY×FAMILY'], hits: ['SPY x FAMILY', 'Spy Family'] },
    { zh: ['藥師少女的獨語', '藥師少女'], hits: ['Kusuriya no Hitorigoto', 'The Apothecary Diaries', '薬屋のひとりごと'] },
    { zh: ['膽大黨', '膽大黨 第二季'], hits: ['Dandadan', 'ダンダダン'] },
    { zh: ['不時輕聲地以俄語遮羞的鄰座艾莉同學', '艾莉同學'], hits: ['Roshidere', 'Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san', '時々ボソッとロシア語でデレる隣のアーリャさん'] },
    { zh: ['進擊的巨人', '進撃的巨人'], hits: ['Shingeki no Kyojin', 'Attack on Titan', '進撃の巨人'] },
    { zh: ['鬼滅之刃', '鬼滅之刃 柱訓練篇'], hits: ['Kimetsu no Yaiba', 'Demon Slayer', '鬼滅の刃'] },
    { zh: ['排球少年', '排球少年!!'], hits: ['Haikyuu!!', 'ハイキュー!!'] },
    { zh: ['鏈鋸人', '電鋸人'], hits: ['Chainsaw Man', 'チェンソーマン'] },
    { zh: ['我的英雄學院', '我英'], hits: ['Boku no Hero Academia', 'My Hero Academia', '僕のヒーローアカデミア'] },
    { zh: ['輝夜姬想讓人告白', '輝夜大小姐'], hits: ['Kaguya-sama wa Kokurasetai', 'Kaguya-sama: Love is War', 'かぐや様は告らせたい'] },
    { zh: ['關於我轉生變成史萊姆這檔事', '轉生史萊姆', '史萊姆'], hits: ['Tensei shitara Slime Datta Ken', 'That Time I Got Reincarnated as a Slime', '転生したらスライムだった件'] },
    { zh: ['藍色監獄', 'BLUE LOCK'], hits: ['Blue Lock', 'ブルーロック'] },
    { zh: ['防風少年', 'WIND BREAKER'], hits: ['Wind Breaker', 'WIND BREAKER'] },
    { zh: ['無職轉生', '無職轉生 第三季'], hits: ['Mushoku Tensei', '無職転生'] },
    { zh: ['死神 千年血戰篇', 'BLEACH 死神'], hits: ['BLEACH: Sennen Kessen-hen', 'BLEACH: Thousand-Year Blood War'] },
    { zh: ['膽大黨', 'DAN DA DAN'], hits: ['Dandadan'] },
    { zh: ['地獄樂'], hits: ['Jigokuraku', 'Hell\'s Paradise', '地獄楽'] },
    { zh: ['迷宮飯', '迷宮飯'], hits: ['Dungeon Meshi', 'Delicious in Dungeon', 'ダンジョン飯'] },
    { zh: ['香格里拉·開拓異境', '香格里拉'], hits: ['Shangri-La Frontier', 'シャングリラ・フロンティア'] },
    { zh: ['膽大黨'], hits: ['Dandadan'] },
];

function norm(s: string): string {
    return (s ?? '').normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[·•・ー\-_\/\\|，。、：；！？,.!?;:'"()\[\]{}<>~`@#$%^&*+=]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 正規化 key → 命中詞 的反向索引 */
const normMap = new Map<string, string[]>();
for (const e of TABLE) {
    for (const z of e.zh) {
        const k = norm(z);
        if (!k) continue;
        const exist = normMap.get(k);
        if (exist) {
            for (const h of e.hits) if (!exist.includes(h)) exist.push(h);
        } else {
            normMap.set(k, [...e.hits]);
        }
    }
}

/** zh 正規化 → 原始中文顯示（用於反向注入到 anime 欄位） */
const revMap = new Map<string, string[]>(); // hit norm → zh[]
for (const e of TABLE) {
    for (const h of e.hits) {
        const hk = norm(h);
        const arr = revMap.get(hk) ?? [];
        for (const z of e.zh) if (!arr.includes(z)) arr.push(z);
        revMap.set(hk, arr);
    }
}

/**
 * 查詢詞展開：輸入任意字串，回傳「原始 + 別名命中詞」去重清單
 * - 完全命中：query 正好等於某中文 key → 回對應 hits
 * - 子串命中：query 包含 key 或 key 包含 query（處理「相反的你」前綴）→ 也回 hits
 * - 去重 + 保留原始 query 在首位
 */
export function resolveAliases(rawQuery: string): { expanded: string[]; matchedZh: string[] } {
    const q = norm(rawQuery);
    if (!q) return { expanded: [rawQuery], matchedZh: [] };
    const qNoSpace = q.replace(/\s+/g, '');
    const hitSet = new Set<string>();
    const matchedZh: string[] = [];

    // 1. 完全命中
    const direct = normMap.get(q) ?? normMap.get(qNoSpace);
    if (direct) {
        direct.forEach((h) => hitSet.add(h));
        // 記錄命中哪個中文
        for (const e of TABLE) {
            for (const z of e.zh) if (norm(z) === q || norm(z) === qNoSpace) { if (!matchedZh.includes(z)) matchedZh.push(z); }
        }
    }

    // 2. 子串 / 前綴命中（容忍多打或少打 1-2 字）
    for (const [k, hits] of normMap.entries()) {
        if (k === q || k === qNoSpace) continue;
        const kNoSpace = k.replace(/\s+/g, '');
        const isSub = kNoSpace.length >= 2 && qNoSpace.length >= 2 && (kNoSpace.includes(qNoSpace) || qNoSpace.includes(kNoSpace));
        if (isSub) {
            hits.forEach((h) => hitSet.add(h));
            // 找到對應中文原名
            for (const e of TABLE) {
                for (const z of e.zh) if (norm(z) === k) { if (!matchedZh.includes(z)) matchedZh.push(z); break; }
            }
        }
    }

    const expanded = [rawQuery.trim(), ...Array.from(hitSet)];
    return { expanded, matchedZh };
}

/** 依 Anime 的 romaji/english/native 反查對應中文別名（用於 fuzzy 欄位與 SEO） */
export function chineseAliasesForAnime(anime: { title?: { romaji?: string; english?: string; native?: string }; synonyms?: string[] }): string[] {
    const out: string[] = [];
    const candidates = [anime.title?.romaji, anime.title?.english, anime.title?.native, ...(anime.synonyms ?? [])].filter(Boolean) as string[];
    for (const c of candidates) {
        const k = norm(c);
        const zhs = revMap.get(k);
        if (zhs) for (const z of zhs) if (!out.includes(z)) out.push(z);
        // 也試無空格版
        const k2 = k.replace(/\s+/g, '');
        for (const [rk, zhs2] of revMap.entries()) {
            if (rk.replace(/\s+/g, '') === k2) for (const z of zhs2) if (!out.includes(z)) out.push(z);
        }
    }
    // 進一步：若 romaji 包含 key 的羅馬字，也回中文
    for (const e of TABLE) {
        for (const h of e.hits) {
            const hn = norm(h);
            for (const c of candidates) {
                const cn = norm(c);
                if (cn.includes(hn) || hn.includes(cn)) {
                    for (const z of e.zh) if (!out.includes(z)) out.push(z);
                }
            }
        }
    }
    return out;
}

/** 所有中文 key（用於提示或預熱） */
export function allChineseKeys(): string[] {
    return Array.from(normMap.keys());
}
