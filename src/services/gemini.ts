import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export interface ClothingSet {
  outer: string;
  top: string;
  bottom: string;
  shoes: string;
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
            required: ["outer", "top", "bottom", "shoes"],
          },
          trendy: {
            type: Type.OBJECT,
            properties: {
              outer: { type: Type.STRING },
              top: { type: Type.STRING },
              bottom: { type: Type.STRING },
              shoes: { type: Type.STRING },
            },
            required: ["outer", "top", "bottom", "shoes"],
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
export async function generateOutfitImage(
  clothingDescription: string,
  condition: string
): Promise<string> {
  const safeText = encodeURIComponent(
    `추천 코디 이미지\n날씨: ${condition}\n${clothingDescription.slice(0, 120)}`
  );

  return `data:image/svg+xml;charset=UTF-8,
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#f8fafc"/>
      <rect x="40" y="40" width="720" height="920" rx="32" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
      <text x="400" y="180" text-anchor="middle" font-size="42" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">
        Outfit Preview
      </text>
      <text x="400" y="250" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#0284c7">
        ${condition}
      </text>
      <foreignObject x="90" y="320" width="620" height="520">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="font-family: Arial, sans-serif; font-size: 28px; line-height: 1.6; color: #334155; white-space: pre-wrap; text-align: center;">
          ${decodeURIComponent(safeText).replace(/\n/g, "<br/>")}
        </div>
      </foreignObject>
      <text x="400" y="900" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#64748b">
        AI 이미지 대신 배포용 미리보기
      </text>
    </svg>`;
}
