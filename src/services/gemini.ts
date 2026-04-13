import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
  console.warn("GEMINI_API_KEY가 설정되지 않았거나 기본값입니다. 환경 변수를 확인해주세요.");
}

const ai = new GoogleGenAI({ apiKey });

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

  if (!response.text) {
    throw new Error("No response text from Gemini");
  }

  const result = JSON.parse(response.text);
  return result;
}

export interface CurrentWeather {
  temperature: number;
  condition: string;
  dustLevel: string;
}

export async function fetchCurrentWeather(location: string): Promise<CurrentWeather> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What is the current temperature (Celsius), weather condition (one of: 맑음, 흐림, 비, 눈, 안개), and fine dust level (one of: 좋음, 보통, 나쁨, 매우 나쁨) in ${location} right now?`,
      config: {
        tools: [{ googleSearch: {} }],
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

    if (!response.text) {
      throw new Error("Gemini 응답에 텍스트가 없습니다.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("날씨 정보 가져오기 상세 에러:", error);
    // 에러 메시지에 구체적인 원인 포함
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API 사용량이 초과되었습니다. 1~2분 후 다시 시도하시거나, 날씨 정보를 직접 입력해 주세요.");
    } else if (errorMessage.includes("API_KEY_INVALID")) {
      throw new Error("API 키가 유효하지 않습니다. Vercel 설정을 확인해주세요.");
    } else if (errorMessage.includes("User location is not supported")) {
      throw new Error("현재 지역에서 제미나이 검색 기능을 사용할 수 없습니다.");
    }
    throw new Error(`날씨 정보를 가져오지 못했습니다: ${errorMessage}`);
  }
}
export async function generateOutfitImage(
  clothingDescription: string,
  condition: string
): Promise<string> {
  const prompt = `A high-quality, stylish fashion photography of a person wearing: ${clothingDescription}. The setting is a street in Seoul during ${condition} weather. Professional lighting, aesthetic composition, full body shot.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ text: prompt }],
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  // If no image is returned, we'll return a placeholder or handle it in the UI
  return "https://picsum.photos/seed/fashion/800/1200";
}
