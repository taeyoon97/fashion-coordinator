import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export interface ClothingSet {
  outer: string;
  top: string;
  bottom: string;
  shoes: string;
  bag: string;
}

export interface WeatherRecommendation {
  briefing: string;
  classic: ClothingSet;
  trendy: ClothingSet;
  essentials: string[];
  tips: string;
}

export async function getRecommendation(
  temperature: number,
  condition: string,
  purpose: string,
  gender: string,
  dustLevel?: string,
  userStyle?: string,
  specificItem?: string
): Promise<WeatherRecommendation> {
  const prompt = `
    당신은 서울의 기후 특성과 최신 패션 트렌드를 완벽하게 이해하고 있는 '전문 날씨 코디네이터 AI'입니다.
    다음 정보를 바탕으로 ${gender}를 위한 옷차림을 두 가지 버전(클래식, 최신 유행)으로 추천해주세요:
    - 성별: ${gender}
    - 기온: ${temperature}°C
    - 날씨 상태: ${condition}
    - 외출 목적: ${purpose}
    ${dustLevel ? `- 미세먼지 수치: ${dustLevel}` : ""}
    ${userStyle ? `- 선호하는 스타일/참고 사항: ${userStyle}` : ""}
    ${specificItem ? `- 반드시 포함하고 싶은 아이템: ${specificItem}` : ""}

    [핵심 고려 사항]
    1. 일교차: 봄/가을에는 아침저녁으로 쌀쌀하므로 겹쳐 입기(레이어드) 좋은 아우터를 반드시 고려할 것.
    2. 미세먼지: 미세먼지나 초미세먼지 수치가 '나쁨' 이상일 경우 반드시 보건용 마스크(KF80/KF94) 착용을 권장할 것.
    3. 습도 및 강수: 여름철 장마나 갑작스러운 소나기를 대비해 우산, 제습이 잘 되는 소재(린넨 등), 레인부츠 등을 상황에 맞게 추천할 것.
    4. 체감 온도: 실제 기온뿐만 아니라 바람이나 습도를 고려한 체감 온도를 기준으로 옷차림을 제안할 것.
    5. 특정 아이템 활용: 사용자가 '${specificItem}'을(를) 입고 싶다고 했다면, 이 아이템을 중심으로 전체적인 코디를 구성할 것.
    6. 스타일 구분: 
       - 클래식(Classic): 유행을 타지 않는 깔끔하고 정석적인 스타일 ${userStyle ? `(사용자의 스타일 '${userStyle}'을 클래식하게 해석)` : ""}
       - 최신 유행(Trendy): 현재 서울에서 가장 힙하고 유행하는 스타일 ${userStyle ? `(사용자의 스타일 '${userStyle}'을 트렌디하게 해석)` : ""}
    7. 각 스타일별로 아우터, 상의, 하의, 신발뿐 아니라 가방(bag)도 반드시 하나 추천할 것.

    반드시 JSON 형식으로 응답하세요.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          briefing: { type: Type.STRING, description: "오늘의 서울 날씨 브리핑 (한 줄 요약)" },
          classic: {
            type: Type.OBJECT,
            properties: {
              outer: { type: Type.STRING },
              top: { type: Type.STRING },
              bottom: { type: Type.STRING },
              shoes: { type: Type.STRING },
            },
            required: ["outer", "top", "bottom", "shoes", "bag"],
          },
          trendy: {
            type: Type.OBJECT,
            properties: {
              outer: { type: Type.STRING },
              top: { type: Type.STRING },
              bottom: { type: Type.STRING },
              shoes: { type: Type.STRING },
            },
            required: ["outer", "top", "bottom", "shoes", "bag"],
          },
          essentials: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "외출 필수템 리스트",
          },
          tips: { type: Type.STRING, description: "스타일링 & 건강 팁" },
        },
        required: ["briefing", "classic", "trendy", "essentials", "tips"],
      },
    },
  });

  const result = JSON.parse(response.text);
  return result;
}

export interface CurrentWeather {
  temperature: number;
  condition: string;
  dustLevel: string;
}

export async function fetchCurrentWeather(location: string): Promise<CurrentWeather> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
      사용자의 지역은 "${location}" 입니다.
      실시간 검색 도구 없이, 일반적인 계절/기후 상식을 바탕으로
      현재 날씨를 "대략적으로 추정"해서 아래 JSON 형식으로만 답하세요.

      규칙:
      - temperature: 숫자만
      - condition: 반드시 "맑음", "흐림", "비", "눈", "안개" 중 하나
      - dustLevel: 반드시 "좋음", "보통", "나쁨", "매우 나쁨" 중 하나
      - 설명 문장 없이 JSON만 출력

      예시:
      {
        "temperature": 18,
        "condition": "맑음",
        "dustLevel": "보통"
      }
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          temperature: { type: Type.NUMBER },
          condition: { type: Type.STRING, enum: ["맑음", "흐림", "비", "눈", "안개"] },
          dustLevel: { type: Type.STRING, enum: ["좋음", "보통", "나쁨", "매우 나쁨"] },
        },
        required: ["temperature", "condition", "dustLevel"],
      },
    },
  });

  return JSON.parse(response.text);
}
export interface OutfitImageRequest {
  title: string;
  condition: string;
  outer: string;
  top: string;
  bottom: string;
  shoes: string;
  bag: string;
  specificItem?: string;
}

function pickImageForItem(item: string): string {
  const text = (item || "").toLowerCase();

  const imageMap: { keywords: string[]; url: string }[] = [
    {
      keywords: ["트렌치", "코트", "coat", "trench"],
      url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["블레이저", "자켓", "재킷", "jacket", "blazer"],
      url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["가디건", "cardigan"],
      url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["블라우스", "셔츠", "shirt", "blouse"],
      url: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["니트", "sweater", "스웨터"],
      url: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["티셔츠", "반팔", "t-shirt"],
      url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["청치마", "데님 스커트", "데님치마", "스커트", "치마", "skirt"],
      url: "https://images.unsplash.com/photo-1583496661160-fb5886a13d77?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["청바지", "데님 팬츠", "데님", "jeans"],
      url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["슬랙스", "팬츠", "trousers", "pants"],
      url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["원피스", "dress"],
      url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["스니커즈", "운동화", "sneakers"],
      url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["로퍼", "구두", "loafer"],
      url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["부츠", "boots"],
      url: "https://images.unsplash.com/photo-1608256246200-53e8b47b2f80?auto=format&fit=crop&w=800&q=80",
    },
    {
      keywords: ["토트백", "숄더백", "크로스백", "백", "가방", "bag"],
      url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    },
  ];

  for (const item of imageMap) {
    if (item.keywords.some((keyword) => text.includes(keyword))) {
      return item.url;
    }
  }

  return "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80";
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function generateOutfitImage(
  outfit: OutfitImageRequest
): Promise<string> {
  const outerImg = pickImageForItem(outfit.outer);
  const topImg = pickImageForItem(outfit.top);
  const bottomImg = pickImageForItem(outfit.bottom);
  const shoesImg = pickImageForItem(outfit.shoes);
  const bagImg = pickImageForItem(outfit.bag);

  const accent = outfit.title.toLowerCase().includes("trendy") ? "#0ea5e9" : "#0f172a";
  const safeSpecific = outfit.specificItem ? escapeHtml(outfit.specificItem) : "";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100">
      <rect width="900" height="1100" fill="#f8fafc"/>
      <rect x="30" y="30" width="840" height="1040" rx="32" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>

      <text x="70" y="90" font-size="34" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">
        ${escapeHtml(outfit.title)}
      </text>
      <text x="70" y="130" font-size="20" font-family="Arial, sans-serif" fill="${accent}">
        날씨: ${escapeHtml(outfit.condition)}
      </text>
      ${
        safeSpecific
          ? `<text x="70" y="165" font-size="18" font-family="Arial, sans-serif" fill="#475569">
               포함 아이템: ${safeSpecific}
             </text>`
          : ""
      }

      <image href="${outerImg}" x="70"  y="210" width="240" height="240" preserveAspectRatio="xMidYMid slice"/>
      <image href="${topImg}"   x="330" y="210" width="240" height="240" preserveAspectRatio="xMidYMid slice"/>
      <image href="${bottomImg}" x="590" y="210" width="240" height="240" preserveAspectRatio="xMidYMid slice"/>

      <image href="${shoesImg}" x="200" y="500" width="240" height="240" preserveAspectRatio="xMidYMid slice"/>
      <image href="${bagImg}"   x="460" y="500" width="240" height="240" preserveAspectRatio="xMidYMid slice"/>

      <rect x="70" y="780" width="760" height="220" rx="24" fill="#f1f5f9"/>

      <text x="100" y="835" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">아우터</text>
      <text x="100" y="865" font-size="24" font-family="Arial, sans-serif" fill="#0f172a">${escapeHtml(outfit.outer)}</text>

      <text x="100" y="915" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">상의</text>
      <text x="100" y="945" font-size="24" font-family="Arial, sans-serif" fill="#0f172a">${escapeHtml(outfit.top)}</text>

      <text x="470" y="835" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">하의</text>
      <text x="470" y="865" font-size="24" font-family="Arial, sans-serif" fill="#0f172a">${escapeHtml(outfit.bottom)}</text>

      <text x="470" y="915" font-size="18" font-family="Arial, sans-serif" font-weight="700" fill="#64748b">신발 / 가방</text>
      <text x="470" y="945" font-size="24" font-family="Arial, sans-serif" fill="#0f172a">${escapeHtml(outfit.shoes)} / ${escapeHtml(outfit.bag)}</text>
    </svg>
  `.trim();

  const encoded =
    typeof window !== "undefined"
      ? window.btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg, "utf-8").toString("base64");

  return `data:image/svg+xml;base64,${encoded}`;
}
