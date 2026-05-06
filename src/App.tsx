/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { 
  Sparkles, CloudRain, Calendar, Compass, AlertCircle, Loader2, 
  RotateCcw, Bookmark, BookmarkCheck, LayoutGrid, Archive, 
  Sliders, Plus, Activity, Droplets, ThermometerSun, Trash2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiApiKey || '' });

// --- TYPES ---
interface WardrobeItem {
  item_id: string;
  name: string;
  category: string;
  color: string;
  formality: number;
  warmth: number;
  water_resistant?: boolean;
  imageUrl?: string;
  price?: number;
}

interface Outfit {
  outfit_name: string;
  items: string[];
  styling_notes: string;
  reasoning: string;
  confidence_score: number;
}

// --- MOCK DATA ---
const initialWardrobe: WardrobeItem[] = [
  { item_id: "top_001", name: "Crisp Oxford Shirt", category: "button_down", color: "white", formality: 7, warmth: 4, imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80", price: 350 },
  { item_id: "top_002", name: "Heavyweight Band Tee", category: "t_shirt", color: "black", formality: 2, warmth: 3, imageUrl: "https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&w=600&q=80", price: 120 },
  { item_id: "layer_001", name: "Gabardine Trench", category: "outerwear", color: "beige", formality: 6, warmth: 6, water_resistant: true, imageUrl: "https://images.unsplash.com/photo-1559551409-dadc959f76b8?auto=format&fit=crop&w=600&q=80", price: 1250 },
  { item_id: "layer_002", name: "Cashmere Cardigan", category: "sweater", color: "charcoal", formality: 4, warmth: 8, water_resistant: false, imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80", price: 890 },
  { item_id: "bottom_001", name: "Selvedge Denim", category: "jeans", color: "navy", formality: 5, warmth: 5, imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80", price: 280 },
  { item_id: "bottom_002", name: "Pleated Trousers", category: "pants", color: "black", formality: 8, warmth: 5, imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&q=80", price: 450 },
  { item_id: "shoe_001", name: "Leather Chelsea", category: "boots", color: "black", formality: 6, warmth: 6, water_resistant: true, imageUrl: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=600&q=80", price: 650 },
  { item_id: "shoe_002", name: "Minimalist Sneakers", category: "sneakers", color: "white", formality: 3, warmth: 4, water_resistant: false, imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80", price: 320 }
];

const loadingPhrases = [
  "Initializing Aura Engine...",
  "Scanning digital inventory...",
  "Calculating thermoregulation algorithms...",
  "Matching event formality constraints...",
  "Applying color theory models...",
  "Finalizing curated ensembles..."
];

// --- AI SCHEMA ---
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    outfits: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          outfit_name: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          styling_notes: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          confidence_score: { type: Type.NUMBER }
        },
        required: ["outfit_name", "items", "styling_notes", "reasoning", "confidence_score"]
      }
    }
  },
  required: ["outfits"]
};


const ALL_PRESETS = [
  { title: "Creative Pitch", temp: "65", condition: "Overcast", location: "SOHO House", formality: "Smart Casual", vibe: "Effortless luxury, dark academia subtly", avoid: "Neon, Bright red" },
  { title: "Date Night", temp: "72", condition: "Clear", location: "Bistro Downtown", formality: "Elevated Casual", vibe: "Romantic, understated elegance", avoid: "Yellow, Orange" },
  { title: "Weekend Retreat", temp: "55", condition: "Breezy", location: "Cabana Club", formality: "Relaxed", vibe: "Cozy, layered, quiet luxury", avoid: "Formal wear" },
  { title: "Gala Event", temp: "68", condition: "Clear", location: "Art Museum", formality: "Black Tie Optional", vibe: "Classic, sharp, avant-garde details", avoid: "Casual fabrics" },
  { title: "Airport Lounge", temp: "68", condition: "AC/Drafty", location: "JFK Terminal 4", formality: "Travel Chic", vibe: "Comfortable but wealthy, athleisure", avoid: "Stiff fabrics" },
  { title: "Ski Lodge", temp: "30", condition: "Snow", location: "Aspen Resort", formality: "Aprés Ski", vibe: "Warm, textured, high-end winter", avoid: "Cotton, thin layers" },
  { title: "Yacht Party", temp: "85", condition: "Sunny", location: "Monaco", formality: "Resort Wear", vibe: "Breezy, linen, nautical luxury", avoid: "Heavy knits, black" },
  { title: "Tech Keynote", temp: "70", condition: "Stage Lighting", location: "Moscone Center", formality: "Elevated Tech", vibe: "Minimalist, approachable but authoritative", avoid: "Loud patterns" },
  { title: "Fashion Week", temp: "50", condition: "Cold / Windy", location: "Paris Street", formality: "Avant Garde", vibe: "Statement, dramatic, fashion-forward", avoid: "Basic fits, boring colors" },
  { title: "Cozy Cafe", temp: "45", condition: "Raining", location: "Local Roastery", formality: "Casual", vibe: "Aesthetic, comfortable, literary", avoid: "Synthetics, formal shoes" },
];

export default function App() {
  // Global App State
  const [activeTab, setActiveTab] = useState<'engine' | 'wardrobe' | 'archive'>('engine');
  const [inventory, setInventory] = useState<WardrobeItem[]>(initialWardrobe);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);

  // Engine Input State
  const [weatherTemp, setWeatherTemp] = useState('65');
  const [weatherCondition, setWeatherCondition] = useState('Overcast');
  const [eventTitle, setEventTitle] = useState('Creative Review Pitch');
  const [eventLocation, setEventLocation] = useState('SOHO House');
  const [eventFormality, setEventFormality] = useState('Smart Casual');
  const [vibe, setVibe] = useState('Effortless luxury, dark academia subtly');
  const [avoidColors, setAvoidColors] = useState('Neon, Bright red');

  // Engine Processing State
  const [loading, setLoading] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  // Add Garment Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemConfig, setNewItemConfig] = useState<Partial<WardrobeItem>>({
    name: '', category: 't_shirt', color: 'black', formality: 5, warmth: 5, water_resistant: false, imageUrl: '', price: 100
  });

  const [currentPresets, setCurrentPresets] = useState(ALL_PRESETS.slice(0, 4));

  useEffect(() => {
    const interval = setInterval(() => {
      const shuffled = [...ALL_PRESETS].sort(() => 0.5 - Math.random());
      setCurrentPresets(shuffled.slice(0, 4));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const applyPreset = (preset: typeof ALL_PRESETS[0]) => {
    setWeatherTemp(preset.temp);
    setWeatherCondition(preset.condition);
    setEventTitle(preset.title);
    setEventLocation(preset.location);
    setEventFormality(preset.formality);
    setVibe(preset.vibe);
    setAvoidColors(preset.avoid);
  };

  // Rotate loading phrases
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPhraseIndex(prev => (prev + 1) % loadingPhrases.length);
      }, 2000);
    } else {
      setLoadingPhraseIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!geminiApiKey) {
      setError("Please add your GEMINI_API_KEY to the environment variables via the Settings panel.");
      return;
    }

    setLoading(true);
    setError(null);
    setOutfits([]);

    const payload = {
      context: {
        weather: { temp_f: parseInt(weatherTemp), condition: weatherCondition },
        event: { title: eventTitle, location: eventLocation, formality: eventFormality }
      },
      preferences: {
        vibe,
        avoid_colors: avoidColors.split(',').map(c => c.trim()).filter(Boolean)
      },
      wardrobe_inventory: inventory.map(({ imageUrl, ...rest }) => rest) // Exclude URLs to save tokens
    };

    const systemInstruction = `You are the core intelligence engine for "Aura", a billion-dollar luxury AI styling application. Your role is to analyze a user's digital wardrobe inventory, current weather data, user schedule, and personal style preferences to generate hyper-personalized, fashion-forward outfit recommendations.
Rules & Guidelines:
Fashion Expertise: Apply high-end luxury styling nuances, silhouette balancing, and advanced color theory.
Context Awareness: You MUST strictly adhere to the weather parameters and event dress codes provided.
No Hallucinations: You may ONLY suggest item IDs that exist in the user's provided wardrobe_inventory.
Output Format: Respond with exactly three (3) highly curated outfit recommendations. Output a "confidence_score" integer out of 100 representing how well it fits the prompt.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: JSON.stringify(payload),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.7,
        }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        setOutfits(data.outfits || []);
      } else {
        throw new Error("No response received from Aura Intelligence.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while generating recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWeatherTemp('65');
    setWeatherCondition('Overcast');
    setEventTitle('Creative Review Pitch');
    setEventLocation('SOHO House');
    setEventFormality('Smart Casual');
    setVibe('Effortless luxury, dark academia subtly');
    setAvoidColors('Neon, Bright red');
    setOutfits([]);
    setError(null);
  };

  const toggleSaveOutfit = (outfit: Outfit) => {
    setSavedOutfits(prev => {
      const isSaved = prev.some(o => o.outfit_name === outfit.outfit_name);
      if (isSaved) {
        return prev.filter(o => o.outfit_name !== outfit.outfit_name);
      }
      return [outfit, ...prev];
    });
  };

  const handleAddGarment = () => {
    if (!newItemConfig.name) return;
    const newItem: WardrobeItem = {
      item_id: `item_${Date.now()}`,
      name: newItemConfig.name || 'Unknown Item',
      category: newItemConfig.category || 't_shirt',
      color: newItemConfig.color || 'black',
      formality: newItemConfig.formality || 5,
      warmth: newItemConfig.warmth || 5,
      water_resistant: newItemConfig.water_resistant || false,
      imageUrl: newItemConfig.imageUrl || '',
      price: newItemConfig.price || 0
    };
    setInventory(prev => [newItem, ...prev]);
    setIsAddModalOpen(false);
    setNewItemConfig({ name: '', category: 't_shirt', color: 'black', formality: 5, warmth: 5, water_resistant: false, imageUrl: '', price: 100 });
  };

  const getItemDetails = (id: string) => inventory.find(item => item.item_id === id);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-stone-200 flex flex-col overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-stone-900 leading-none mt-1">Aura.</h1>
            <div className="hidden sm:flex px-2 py-0.5 bg-stone-100 border border-stone-200 text-[10px] font-mono tracking-widest uppercase items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-0.5" /> Engine Online
            </div>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-4 font-medium text-[10px] sm:text-sm tracking-wide uppercase overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('engine')}
              className={`px-2 sm:px-4 py-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'engine' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Sliders className="w-4 h-4 hidden sm:block" /> Intelligence
            </button>
            <button 
              onClick={() => setActiveTab('wardrobe')}
              className={`px-2 sm:px-4 py-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'wardrobe' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <LayoutGrid className="w-4 h-4 hidden sm:block" /> Inventory
            </button>
            <button 
              onClick={() => setActiveTab('archive')}
              className={`px-2 sm:px-4 py-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'archive' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Archive className="w-4 h-4 hidden sm:block" /> Archive ({savedOutfits.length})
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-10">
        <AnimatePresence mode="wait">
          
          {/* --- INTELLIGENCE ENGINE VIEW --- */}
          {activeTab === 'engine' && (
            <motion.div 
              key="engine"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
            >
              {/* Left Column: Context Inputs */}
              <div className="lg:col-span-4 space-y-10">
                <div className="space-y-8 pr-4">
                  <section className="space-y-4">
                    <div className="border-b border-stone-200 pb-2 flex items-center gap-3">
                      <Zap className="w-4 h-4 text-stone-400" />
                      <h2 className="text-sm font-semibold tracking-wider uppercase text-stone-700">Quick Directives</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[60px]">
                      <AnimatePresence mode="popLayout">
                         {currentPresets.map(preset => (
                           <motion.button 
                             key={preset.title}
                             initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                             animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                             exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                             transition={{ duration: 0.4 }}
                             onClick={() => applyPreset(preset)}
                             className="px-3 py-1.5 border border-stone-200 text-[10px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 hover:border-stone-900 hover:bg-stone-100 transition-colors"
                           >
                             {preset.title}
                           </motion.button>
                         ))}
                      </AnimatePresence>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="border-b border-stone-200 pb-2 flex items-center gap-3">
                      <CloudRain className="w-4 h-4 text-stone-400" />
                      <h2 className="text-sm font-semibold tracking-wider uppercase text-stone-700">Atmosphere</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Temp (°F)</label>
                        <input type="number" value={weatherTemp} onChange={e => setWeatherTemp(e.target.value)}
                          className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-lg font-serif focus:outline-none focus:border-stone-900 transition-colors" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Condition</label>
                        <input type="text" value={weatherCondition} onChange={e => setWeatherCondition(e.target.value)}
                          className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-lg font-serif focus:outline-none focus:border-stone-900 transition-colors" />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="border-b border-stone-200 pb-2 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <h2 className="text-sm font-semibold tracking-wider uppercase text-stone-700">Engagement</h2>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Event Directive</label>
                        <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                          className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-lg font-serif focus:outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300" placeholder="e.g. VIP Gallery Opening" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Location</label>
                          <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)}
                            className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-sm font-sans focus:outline-none focus:border-stone-900 transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Dress Code</label>
                          <input type="text" value={eventFormality} onChange={e => setEventFormality(e.target.value)}
                            className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-sm font-sans focus:outline-none focus:border-stone-900 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="border-b border-stone-200 pb-2 flex items-center gap-3">
                      <Compass className="w-4 h-4 text-stone-400" />
                      <h2 className="text-sm font-semibold tracking-wider uppercase text-stone-700">Parameters</h2>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Aesthetic Vibe</label>
                        <textarea value={vibe} onChange={e => setVibe(e.target.value)} rows={2}
                          className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-sm font-sans focus:outline-none focus:border-stone-900 transition-colors resize-none leading-relaxed" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1">Color Constraints (Avoid)</label>
                        <input type="text" value={avoidColors} onChange={e => setAvoidColors(e.target.value)}
                          className="w-full bg-transparent border-b border-stone-300 pb-2 pt-1 text-sm font-sans focus:outline-none focus:border-stone-900 transition-colors" />
                      </div>
                    </div>
                  </section>
                </div>
                
                <div className="space-y-3 pt-6 border-t border-stone-200">
                  <button onClick={handleGenerate} disabled={loading}
                    className="w-full bg-stone-900 text-stone-50 py-4 px-6 flex items-center justify-between hover:bg-stone-800 transition-all disabled:bg-stone-300 disabled:cursor-not-allowed group"
                  >
                    <span className="font-semibold tracking-widest uppercase text-xs">
                      {loading ? "Processing..." : "Commence Styling"}
                    </span>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                  </button>
                  
                  <button onClick={handleReset} disabled={loading}
                    className="w-full bg-transparent text-stone-500 py-3 px-6 flex items-center justify-center gap-2 hover:text-stone-900 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="font-semibold tracking-widest uppercase text-[10px]">Reset Parameters</span>
                  </button>
                </div>
                
                {error && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 text-red-900 text-sm border border-red-100 flex items-start gap-3 rounded-none">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Engine Output */}
              <div className="lg:col-span-8 bg-stone-100/50 border border-stone-200 relative min-h-[600px] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
                
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/5 backdrop-blur-md z-10 flex items-center justify-center p-4">
                    <div className="flex flex-col items-center space-y-8 p-8 sm:p-12 bg-white shadow-2xl border border-stone-200 w-full max-w-md text-center">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <motion.div 
                          animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 border-t-2 border-stone-900 rounded-full" 
                        />
                        <Activity className="w-6 h-6 text-stone-900 animate-pulse" />
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence mode="wait">
                          <motion.p key={loadingPhraseIndex}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="font-serif text-base sm:text-lg text-stone-900 tracking-tight px-2"
                          >
                            {loadingPhrases[loadingPhraseIndex]}
                          </motion.p>
                        </AnimatePresence>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400">Aura Engine v2.0</p>
                      </div>
                      
                      {/* Fake loading bar */}
                      <div className="w-full h-px bg-stone-200 overflow-hidden relative mt-8">
                        <motion.div 
                          className="absolute top-0 bottom-0 left-0 bg-stone-900"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 15 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {!loading && outfits.length > 0 ? (
                  <div className="w-full h-full space-y-12">
                    <div className="flex items-end justify-between border-b border-stone-200 pb-4">
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-serif text-stone-900">Curated Ensembles</h2>
                        <p className="text-xs sm:text-sm font-sans text-stone-500 mt-2">Tailored for {eventTitle} at {weatherTemp}°F</p>
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase hidden sm:block">
                        Generated {new Date().toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="space-y-12 pb-10">
                      {outfits.map((outfit, index) => {
                        const isSaved = savedOutfits.some(o => o.outfit_name === outfit.outfit_name);
                        return (
                          <motion.div key={index}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15 }}
                            className="bg-white border border-stone-200 group"
                          >
                            <div className="p-4 sm:p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6 border-b border-stone-100">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                  <span className="px-2 py-1 bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase">Look {index + 1}</span>
                                  <span className="flex items-center gap-1 text-[10px] font-mono tracking-widest text-stone-500 uppercase">
                                    <Activity className="w-3 h-3" /> {outfit.confidence_score}% Match
                                  </span>
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight break-words">{outfit.outfit_name}</h3>
                              </div>
                              <button 
                                onClick={() => toggleSaveOutfit(outfit)}
                                className={`flex-shrink-0 flex items-center justify-center p-3 border transition-colors self-start md:self-auto ${
                                  isSaved ? 'bg-stone-900 border-stone-900 text-white' : 'bg-transparent border-stone-300 text-stone-400 hover:text-stone-900 hover:border-stone-900'
                                }`}
                              >
                                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                              </button>
                            </div>

                            <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                              <div className="space-y-6">
                                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
                                   Components <span className="w-full h-px bg-stone-100 flex-1 ml-2"></span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                  {outfit.items.map(itemId => {
                                    const item = getItemDetails(itemId);
                                    return (
                                      <div key={itemId} className="space-y-2">
                                        <div className="aspect-[4/5] bg-stone-100 border border-stone-200 overflow-hidden relative group/img">
                                          {item?.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover grayscale-[0.2] group-hover/img:grayscale-0 transition-all duration-500 mix-blend-multiply" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                               <LayoutGrid className="w-6 h-6 text-stone-300" />
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-stone-900 leading-tight">{item?.name || itemId}</p>
                                          {item && <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">{item.color} • {item.category.replace('_', ' ')}</p>}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              
                              <div className="space-y-8">
                                <div className="space-y-3">
                                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Styling Directive</h4>
                                  <p className="text-sm text-stone-600 leading-relaxed font-serif italic text-pretty">
                                    "{outfit.styling_notes}"
                                  </p>
                                </div>
                                <div className="space-y-3 pt-6 border-t border-stone-100">
                                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-widest">Architectural Reasoning</h4>
                                  <p className="text-sm text-stone-600 leading-relaxed text-pretty">
                                    {outfit.reasoning}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center text-center opacity-50 space-y-4 max-w-sm">
                    <Activity className="w-12 h-12 text-stone-300" />
                    <p className="text-sm font-sans text-stone-500 tracking-wide">Awaiting parameters to synthesize wardrobe architecture.</p>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}

          {/* --- WARDROBE INVENTORY VIEW --- */}
          {activeTab === 'wardrobe' && (
            <motion.div key="wardrobe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4 sm:pb-6 mb-6 sm:mb-10">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">Digital Inventory</h2>
                  <p className="text-xs sm:text-sm text-stone-500 font-sans tracking-wide mt-1 sm:mt-2">Comprehensive catalog of owned garments.</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6">
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">
                      {inventory.length} Items Indexed
                    </span>
                    <span className="text-xs font-mono tracking-widest text-stone-900 uppercase font-bold">
                      Valuation: ${inventory.reduce((acc, item) => acc + (item.price || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Garment
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {inventory.map(item => (
                  <div key={item.item_id} className="group cursor-pointer">
                    <div className="aspect-[3/4] bg-stone-100 border border-stone-200 overflow-hidden relative mb-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover grayscale-[0.2] group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700 mix-blend-multiply" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><LayoutGrid className="w-8 h-8 text-stone-300" /></div>
                      )}
                      
                      {/* Overlay attributes */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setInventory(prev => prev.filter(i => i.item_id !== item.item_id)) }}
                          className="w-6 h-6 bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-sm hover:bg-red-100 hover:text-red-700 transition-colors"
                          title="Remove Garment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {item.water_resistant && (
                          <div className="w-6 h-6 bg-white/90 backdrop-blur border border-stone-200 flex items-center justify-center shadow-sm" title="Water Resistant">
                             <Droplets className="w-3 h-3 text-stone-900" />
                          </div>
                        )}
                        <div className="w-6 h-6 bg-white/90 backdrop-blur border border-stone-200 flex items-center justify-center shadow-sm group/tip relative">
                           <ThermometerSun className="w-3 h-3 text-stone-900" />
                           <span className="absolute right-8 bg-stone-900 text-white text-[10px] px-2 py-1 opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none tracking-widest">
                             Warmth: {item.warmth}/10
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-widest">{item.name}</h3>
                      <div className="flex flex-wrap gap-2 text-[10px] text-stone-500 uppercase tracking-widest">
                        <span>{item.color}</span>
                        <span>•</span>
                        <span>{item.category.replace('_', ' ')}</span>
                        {item.price !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-stone-900 font-bold">${item.price}</span>
                          </>
                        )}
                      </div>
                      <div className="pt-2">
                        <div className="w-full bg-stone-100 h-0.5">
                          <div className="bg-stone-900 h-0.5" style={{ width: `${(item.formality / 10) * 100}%` }}></div>
                        </div>
                        <p className="text-[9px] text-stone-400 uppercase tracking-widest mt-1">Formality Scale</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- ARCHIVE VIEW --- */}
          {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-end justify-between border-b border-stone-200 pb-6 mb-10">
                <div>
                  <h2 className="text-4xl font-serif text-stone-900 tracking-tight">The Archive</h2>
                  <p className="text-sm text-stone-500 font-sans tracking-wide mt-2">Personal gallery of bookmarked ensembles.</p>
                </div>
              </div>

              {savedOutfits.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                  <Archive className="w-12 h-12 text-stone-300" />
                  <p className="text-sm font-sans text-stone-500 tracking-wide uppercase">No ensembles archived yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {savedOutfits.map((outfit, index) => (
                    <div key={index} className="border border-stone-200 bg-white p-6 relative group">
                      <button onClick={() => toggleSaveOutfit(outfit)} className="absolute top-4 right-4 text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">
                         <BookmarkCheck className="w-5 h-5" />
                      </button>
                      <h3 className="text-xl font-serif text-stone-900 mb-4 pr-6 leading-tight">{outfit.outfit_name}</h3>
                      <div className="flex -space-x-4 mb-6">
                        {outfit.items.slice(0, 4).map((id, i) => {
                           const item = getItemDetails(id);
                           return (
                             <div key={i} className="w-16 h-16 rounded-full border-2 border-white bg-stone-100 overflow-hidden relative z-10 hover:z-20 hover:scale-110 transition-transform">
                               {item?.imageUrl ? (
                                 <img src={item.imageUrl} alt="" className="w-full h-full object-cover mix-blend-multiply" />
                               ) : null}
                             </div>
                           );
                        })}
                        {outfit.items.length > 4 && (
                          <div className="w-16 h-16 rounded-full border-2 border-white bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold z-10">
                            +{outfit.items.length - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-mono tracking-wide uppercase line-clamp-2 leading-relaxed">
                        {outfit.styling_notes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-[10px] font-mono tracking-widest text-stone-400 uppercase bg-white mt-auto">
         Aura Intelligence Engine © {new Date().getFullYear()} // Proprietary Architecture
      </footer>

      {/* Add Garment Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100 bg-stone-50 flex-shrink-0">
                <h3 className="text-lg font-serif font-medium text-stone-900">Index Garment</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-900">✕</button>
              </div>
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto min-h-0">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Name</label>
                  <input type="text" value={newItemConfig.name} onChange={e => setNewItemConfig({...newItemConfig, name: e.target.value})} placeholder="e.g. Vintage Leather Jacket" className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Category</label>
                    <input type="text" value={newItemConfig.category} onChange={e => setNewItemConfig({...newItemConfig, category: e.target.value})} placeholder="e.g. jacket" className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Color</label>
                    <input type="text" value={newItemConfig.color} onChange={e => setNewItemConfig({...newItemConfig, color: e.target.value})} placeholder="e.g. black" className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Image URL (Optional)</label>
                  <input type="text" value={newItemConfig.imageUrl} onChange={e => setNewItemConfig({...newItemConfig, imageUrl: e.target.value})} placeholder="https://..." className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Estimated Value ($)</label>
                  <input type="number" min="0" value={newItemConfig.price} onChange={e => setNewItemConfig({...newItemConfig, price: parseInt(e.target.value)})} className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Formality (1-10)</label>
                    <input type="number" min="1" max="10" value={newItemConfig.formality} onChange={e => setNewItemConfig({...newItemConfig, formality: parseInt(e.target.value)})} className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Warmth (1-10)</label>
                    <input type="number" min="1" max="10" value={newItemConfig.warmth} onChange={e => setNewItemConfig({...newItemConfig, warmth: parseInt(e.target.value)})} className="w-full border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-900" />
                  </div>
                </div>
                <div className="pt-2 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newItemConfig.water_resistant} onChange={e => setNewItemConfig({...newItemConfig, water_resistant: e.target.checked})} className="w-4 h-4 text-stone-900 border-stone-300 focus:ring-stone-900" />
                    <span className="text-sm font-medium text-stone-700">Water Resistant</span>
                  </label>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-3 flex-shrink-0">
                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900">Cancel</button>
                <button onClick={handleAddGarment} className="px-6 py-2 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-stone-800 disabled:opacity-50" disabled={!newItemConfig.name}>Index Garment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
