// 東京観光の予定データ（ページ上の編集や node gen-ics.mjs で更新されます）
const TRIP = {
  "title": "東京観光 予定表",
  "subtitle": "2026/12/11(金) 〜 12/16(水)",
  "note": "時刻や場所は仮案です。確定したら書き換えてください。",
  "days": [
    {
      "date": "2026-12-11",
      "theme": "移動・浅草・スカイツリー",
      "items": [
        {
          "start": "13:30",
          "title": "成田空港　着",
          "place": "",
          "kind": "hotel",
          "end": "",
          "cal": "共有"
        },
        {
          "start": "14:30",
          "title": "浅草・雷門・浅草寺・仲見世通り",
          "place": "浅草",
          "kind": "sight"
        },
        {
          "start": "16:30",
          "title": "隅田川テラスを散歩",
          "place": "隅田川テラス",
          "kind": "sight"
        },
        {
          "start": "17:30",
          "title": "夕食",
          "place": "浅草周辺",
          "kind": "meal"
        },
        {
          "start": "19:00",
          "end": "21:00",
          "title": "東京スカイツリー 展望台",
          "place": "東京スカイツリー",
          "kind": "sight"
        },
        {
          "start": "21:30",
          "title": "宿へ戻る",
          "kind": "move"
        }
      ]
    },
    {
      "date": "2026-12-12",
      "theme": "明治神宮・原宿・渋谷・新宿",
      "items": [
        {
          "start": "09:00",
          "title": "明治神宮",
          "place": "明治神宮",
          "kind": "sight"
        },
        {
          "start": "10:30",
          "title": "竹下通り・表参道",
          "place": "原宿",
          "kind": "sight"
        },
        {
          "start": "12:00",
          "title": "昼食",
          "place": "原宿",
          "kind": "meal"
        },
        {
          "start": "13:30",
          "title": "スクランブル交差点・ハチ公",
          "place": "渋谷",
          "kind": "sight"
        },
        {
          "start": "15:00",
          "end": "17:00",
          "title": "SHIBUYA SKY（要予約）",
          "place": "渋谷スカイ",
          "kind": "sight"
        },
        {
          "start": "17:30",
          "title": "夕食",
          "place": "渋谷",
          "kind": "meal"
        },
        {
          "start": "19:30",
          "title": "都庁展望台（無料）・歌舞伎町散策",
          "place": "新宿",
          "kind": "sight"
        },
        {
          "start": "21:30",
          "title": "宿へ戻る",
          "kind": "move"
        }
      ]
    },
    {
      "date": "2026-12-13",
      "theme": "築地・銀座・皇居・東京駅",
      "items": [
        {
          "start": "08:30",
          "title": "築地場外市場で朝食",
          "place": "築地場外市場",
          "kind": "meal"
        },
        {
          "start": "10:30",
          "title": "銀座ショッピング",
          "place": "銀座",
          "kind": "sight"
        },
        {
          "start": "12:30",
          "title": "昼食",
          "place": "銀座",
          "kind": "meal"
        },
        {
          "start": "14:00",
          "title": "皇居外苑・二重橋",
          "place": "皇居外苑",
          "kind": "sight"
        },
        {
          "start": "15:30",
          "title": "東京駅赤れんが駅舎・一番街",
          "place": "東京駅",
          "kind": "sight"
        },
        {
          "start": "18:00",
          "title": "夕食",
          "place": "有楽町",
          "kind": "meal"
        },
        {
          "start": "20:00",
          "title": "宿へ戻る",
          "kind": "move"
        }
      ]
    },
    {
      "date": "2026-12-14",
      "theme": "上野・ベテル・秋葉原",
      "items": [
        {
          "start": "09:00",
          "title": "上野恩賜公園・上野動物園",
          "place": "上野",
          "kind": "sight"
        },
        {
          "start": "12:00",
          "title": "昼食（アメ横）",
          "place": "アメ横",
          "kind": "meal"
        },
        {
          "start": "13:30",
          "title": "東京国立博物館 または ゆかりの街歩き",
          "place": "上野",
          "kind": "sight"
        },
        {
          "start": "15:00",
          "end": "16:00",
          "title": "ベテル",
          "kind": "fixed",
          "cal": "個人"
        },
        {
          "start": "16:30",
          "title": "秋葉原",
          "place": "秋葉原",
          "kind": "sight"
        },
        {
          "start": "18:30",
          "title": "夕食",
          "place": "秋葉原",
          "kind": "meal"
        },
        {
          "start": "20:30",
          "title": "宿へ戻る",
          "kind": "move"
        }
      ]
    },
    {
      "date": "2026-12-15",
      "theme": "ディズニーランド（終日）",
      "items": [
        {
          "start": "06:45",
          "title": "起床・出発（早めに向かう）",
          "kind": "move"
        },
        {
          "start": "08:00",
          "title": "ディズニーランド 到着",
          "kind": "fixed",
          "cal": "共有"
        },
        {
          "start": "08:30",
          "end": "21:00",
          "title": "ディズニーランドで1日遊ぶ",
          "place": "東京ディズニーランド",
          "kind": "sight"
        },
        {
          "start": "21:30",
          "title": "宿へ戻る",
          "kind": "move"
        }
      ]
    },
    {
      "date": "2026-12-16",
      "theme": "Zoom・お土産・帰路",
      "items": [
        {
          "start": "09:00",
          "title": "荷造り・チェックアウト準備",
          "kind": "hotel"
        },
        {
          "start": "09:45",
          "end": "10:45",
          "title": "Zoomホスト",
          "kind": "fixed",
          "cal": "個人"
        },
        {
          "start": "11:30",
          "title": "お土産買い",
          "place": "東京駅・一番街",
          "kind": "sight"
        },
        {
          "start": "13:00",
          "title": "帰路（東京 → 自宅）",
          "kind": "move"
        }
      ]
    }
  ]
};
