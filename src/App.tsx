import React, { useState, useMemo } from "react";
import { 
  Cloud, 
  Sun, 
  Thermometer, 
  Wind, 
  Shirt, 
  ShoppingBag, 
  Sparkles, 
  MapPin,
  Umbrella,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Info,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendation, generateOutfitImage, fetchCurrentWeather, type WeatherRecommendation } from "./services/gemini";

const weatherBackgrounds: Record<string, string> = {
  "맑음": "linear-gradient(to bottom, #7dd3fc, #e0f2fe)",
  "흐림": "linear-gradient(to bottom, #94a3b8, #f1f5f9)",
  "비": "linear-gradient(to bottom, #475569, #94a3b8)",
  "눈": "linear-gradient(to bottom, #e2e8f0, #ffffff)",
  "안개": "linear-gradient(to bottom, #cbd5e1, #f8fafc)",
};

export default function App() {
  const [temperature, setTemperature] = useState<string>("");
  const [condition, setCondition] = useState<string>("맑음");
  const [purpose, setPurpose] = useState<string>("");
  const [location, setLocation] = useState<string>("서울");
  const [userStyle, setUserStyle] = useState<string>("");
  const [specificItem, setSpecificItem] = useState<string>("");
  const [gender, setGender] = useState<string>("여성");
  const [dustLevel, setDustLevel] = useState<string>("보통");
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<WeatherRecommendation | null>(null);
  const [classicImage, setClassicImage] = useState<string | null>(null);
  const [trendyImage, setTrendyImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const handleFetchWeather = async () => {
    if (!location) {
      setError("지역을 입력해주세요.");
      return;
    }
    setFetchingWeather(true);
    setError(null);
    try {
      const weather = await fetchCurrentWeather(location);
      setTemperature(weather.temperature.toString());
      setCondition(weather.condition);
      setDustLevel(weather.dustLevel);
    } catch (err) {
      console.error(err);
      setError("날씨 정보를 가져오는 데 실패했습니다.");
    } finally {
      setFetchingWeather(false);
    }
  };

  const backgroundStyle = useMemo(() => {
    return { background: weatherBackgrounds[condition] || weatherBackgrounds["맑음"] };
  }, [condition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temperature || !purpose) {
      setError("기온과 외출 목적을 입력해주세요.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setRecommendation(null);
    setClassicImage(null);
    setTrendyImage(null);

    try {
      const result = await getRecommendation(
        Number(temperature),
        condition,
        purpose,
        gender,
        dustLevel,
        userStyle,
        specificItem
      );
      setRecommendation(result);

      // Generate images for both styles
      const classicDesc = `${gender}, ${userStyle ? `${userStyle} style (classic interpretation),` : ""} ${specificItem ? `including ${specificItem},` : ""} classic style: ${result.classic.outer}, ${result.classic.top}, ${result.classic.bottom}, ${result.classic.shoes}`;
      const trendyDesc = `${gender}, ${userStyle ? `${userStyle} style (trendy interpretation),` : ""} ${specificItem ? `including ${specificItem},` : ""} trendy/street style: ${result.trendy.outer}, ${result.trendy.top}, ${result.trendy.bottom}, ${result.trendy.shoes}`;
      
      const [cImg, tImg] = await Promise.all([
        generateOutfitImage(classicDesc, condition),
        generateOutfitImage(trendyDesc, condition)
      ]);
      
      setClassicImage(cImg);
      setTrendyImage(tImg);
    } catch (err) {
      console.error(err);
      setError("추천을 가져오는 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen transition-all duration-1000 ease-in-out relative overflow-hidden"
      style={backgroundStyle}
    >
      <div className="p-4 md:p-8 max-w-6xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4 break-keep"
          >
            이 날씨엔 어떻게 입어야 찰떡같이 입을 수 있을까
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-700/70 text-lg font-medium"
          >
            오늘 뭐 입을지 생각하기 귀찮으니까~~
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-white/40 sticky top-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                  <Thermometer className="text-brand-500" />
                  정보 입력
                </h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1.5 uppercase tracking-wider">지역 작성 (선택)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: 서울, 부산, 제주"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-base"
                  />
                  <button
                    type="button"
                    onClick={handleFetchWeather}
                    disabled={fetchingWeather}
                    className="w-full mt-2 text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center justify-center gap-2 bg-brand-50 py-2.5 rounded-xl transition-colors disabled:opacity-50 border border-brand-100"
                  >
                    {fetchingWeather ? <Loader2 size={14} className="animate-spin" /> : <Wind size={14} />}
                    오늘의 날씨 자동입력
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">현재 기온 (°C)</label>
                    <input
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="15"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">성별</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option>여성</option>
                      <option>남성</option>
                      <option>유니섹스</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">날씨 상태</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option>맑음</option>
                      <option>흐림</option>
                      <option>비</option>
                      <option>눈</option>
                      <option>안개</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">미세먼지</label>
                    <select
                      value={dustLevel}
                      onChange={(e) => setDustLevel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm appearance-none"
                    >
                      <option>좋음</option>
                      <option>보통</option>
                      <option>나쁨</option>
                      <option>매우 나쁨</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">외출 목적</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="예: 출근, 데이트, 운동"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">나의 스타일 (선택)</label>
                  <input
                    type="text"
                    value={userStyle}
                    onChange={(e) => setUserStyle(e.target.value)}
                    placeholder="예: 꾸안꾸, 힙합, 미니멀"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">오늘 입고 싶은 아이템 (선택)</label>
                  <input
                    type="text"
                    value={specificItem}
                    onChange={(e) => setSpecificItem(e.target.value)}
                    placeholder="예: 빨간색 가디건, 가죽 자켓"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-sm"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-900/20 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      찰떡 코디 분석 중...
                    </>
                  ) : (
                    <>
                      추천 받기
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Results Section */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {!recommendation && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white/40 backdrop-blur-md rounded-3xl border-2 border-dashed border-white/60"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <Sun className="text-brand-500" size={32} />
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">아직 추천 정보가 없습니다</h3>
                  <p className="text-slate-600">정보를 입력하고 당신에게 찰떡인 코디를 확인해보세요!</p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 border-4 border-white/40 border-t-brand-500 rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shirt className="text-brand-500 animate-pulse" size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mt-6 mb-2">최적의 코디를 찾는 중...</h3>
                  <p className="text-slate-600">잠시만 기다려주세요!</p>
                </motion.div>
              )}

              {recommendation && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Briefing Card */}
                  <div className="bg-brand-600 text-white rounded-3xl p-6 shadow-lg shadow-brand-600/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Cloud className="text-white/80" />
                      <span className="text-sm font-medium uppercase tracking-wider opacity-80">오늘의 날씨 브리핑</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold leading-tight">
                      {recommendation.briefing}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Classic Style */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-6 bg-slate-900 rounded-full" />
                          Classic Version
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정석 스타일</span>
                      </div>
                      
                      <div className="bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden border border-white/40 shadow-lg aspect-[4/5] relative group">
                        {classicImage ? (
                          <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src={classicImage}
                            alt="Classic Outfit"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <p className="text-xs">이미지 생성 중...</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-sm space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">아우터</p>
                            <p className="font-semibold text-slate-800">{recommendation.classic.outer}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">상의</p>
                            <p className="font-semibold text-slate-800">{recommendation.classic.top}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">하의</p>
                            <p className="font-semibold text-slate-800">{recommendation.classic.bottom}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">신발</p>
                            <p className="font-semibold text-slate-800">{recommendation.classic.shoes}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trendy Style */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-brand-600 flex items-center gap-2">
                          <span className="w-2 h-6 bg-brand-500 rounded-full" />
                          Trendy Version
                        </h3>
                        <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">최신 유행</span>
                      </div>
                      
                      <div className="bg-white/80 backdrop-blur-md rounded-3xl overflow-hidden border border-white/40 shadow-lg aspect-[4/5] relative group">
                        {trendyImage ? (
                          <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src={trendyImage}
                            alt="Trendy Outfit"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <p className="text-xs">이미지 생성 중...</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/40 shadow-sm space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">아우터</p>
                            <p className="font-semibold text-slate-800">{recommendation.trendy.outer}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">상의</p>
                            <p className="font-semibold text-slate-800">{recommendation.trendy.top}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">하의</p>
                            <p className="font-semibold text-slate-800">{recommendation.trendy.bottom}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">신발</p>
                            <p className="font-semibold text-slate-800">{recommendation.trendy.shoes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-white/40 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Umbrella size={16} />
                        외출 필수템
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.essentials.map((item, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100/50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200/50">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-50/80 backdrop-blur-md rounded-2xl p-6 border border-amber-100 shadow-sm">
                      <h4 className="text-amber-800 text-sm font-bold flex items-center gap-2 mb-2">
                        <Sparkles size={16} />
                        스타일링 & 건강 팁
                      </h4>
                      <p className="text-amber-900/80 text-sm leading-relaxed">
                        {recommendation.tips}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[10px] px-2">
                    <Info size={10} />
                    <span>이 추천은 AI에 의해 생성되었으며, 실제 날씨와 개인의 체감 온도에 따라 다를 수 있습니다.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
