// src/components/GlobalAIAssistant.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { supabase } from '../lib/supabase';
import { Brain, Send, X, Mic, MicOff, Sparkles, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { differenceInDays, isWeekend } from 'date-fns';

const STORAGE_KEY = 'sleepTracker_sleepStart';
const TARGET_SLEEP_HOURS = 7.5;

export default function GlobalAIAssistant() {
  const { user } = useAuth();
  const { showAIChat, setShowAIChat, aiMessages, setAIMessages, isAIThinking, setIsAIThinking } = useAI();
  const [aiInput, setAIInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [userLocation, setUserLocation] = useState({
    timezone: null,
    city: null,
    country: null,
    countryCode: null,
    latitude: null,
    longitude: null,
    isDetecting: true
  });

  // Auto-detect timezone and location with multiple fallbacks
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    setUserLocation(prev => ({
      ...prev,
      timezone: detectedTimezone,
      isDetecting: true
    }));

    async function detectLocation() {
      try {
        console.log('🌍 Attempting location detection...');
        const response = await fetch('https://freeipapi.com/api/json');
        const data = await response.json();
        
        console.log('📍 Location data received:', data);
        
        if (data && data.countryCode) {
          setUserLocation({
            timezone: data.timeZone || detectedTimezone,
            city: data.cityName || data.regionName,
            country: data.countryName,
            countryCode: data.countryCode,
            latitude: data.latitude,
            longitude: data.longitude,
            isDetecting: false
          });
          console.log('✅ Location set to:', data.countryCode, data.countryName);
          return;
        }
        
        console.log('⚠️ Primary API failed, trying fallback...');
        const fallbackResponse = await fetch('https://api.country.is/');
        const fallbackData = await fallbackResponse.json();
        
        console.log('📍 Fallback data:', fallbackData);
        
        if (fallbackData && fallbackData.country) {
          const timezoneToCountry = {
            'Asia/Manila': { code: 'PH', name: 'Philippines', city: 'Metro Manila' },
            'America/New_York': { code: 'US', name: 'United States', city: 'New York' },
            'America/Los_Angeles': { code: 'US', name: 'United States', city: 'Los Angeles' },
            'America/Chicago': { code: 'US', name: 'United States', city: 'Chicago' },
            'Europe/London': { code: 'GB', name: 'United Kingdom', city: 'London' },
            'Asia/Kolkata': { code: 'IN', name: 'India', city: 'New Delhi' },
            'Asia/Tokyo': { code: 'JP', name: 'Japan', city: 'Tokyo' },
            'Asia/Singapore': { code: 'SG', name: 'Singapore', city: 'Singapore' },
            'Australia/Sydney': { code: 'AU', name: 'Australia', city: 'Sydney' }
          };
          
          const locationFromTz = timezoneToCountry[detectedTimezone];
          
          setUserLocation({
            timezone: detectedTimezone,
            city: locationFromTz?.city || 'Unknown',
            country: locationFromTz?.name || fallbackData.country,
            countryCode: fallbackData.country,
            latitude: null,
            longitude: null,
            isDetecting: false
          });
          console.log('✅ Fallback location set to:', fallbackData.country);
          return;
        }
        
        console.log('⚠️ All APIs failed, using timezone detection...');
        const timezoneMap = {
          'Asia/Manila': { code: 'PH', name: 'Philippines', city: 'Metro Manila' },
          'America/New_York': { code: 'US', name: 'United States', city: 'New York' },
          'America/Los_Angeles': { code: 'US', name: 'United States', city: 'Los Angeles' },
          'America/Chicago': { code: 'US', name: 'United States', city: 'Chicago' },
          'America/Denver': { code: 'US', name: 'United States', city: 'Denver' },
          'Europe/London': { code: 'GB', name: 'United Kingdom', city: 'London' },
          'Asia/Kolkata': { code: 'IN', name: 'India', city: 'Mumbai' },
          'Asia/Tokyo': { code: 'JP', name: 'Japan', city: 'Tokyo' },
          'Asia/Singapore': { code: 'SG', name: 'Singapore', city: 'Singapore' },
          'Asia/Dubai': { code: 'AE', name: 'United Arab Emirates', city: 'Dubai' },
          'Australia/Sydney': { code: 'AU', name: 'Australia', city: 'Sydney' },
          'America/Toronto': { code: 'CA', name: 'Canada', city: 'Toronto' },
          'Asia/Kuala_Lumpur': { code: 'MY', name: 'Malaysia', city: 'Kuala Lumpur' },
          'Asia/Bangkok': { code: 'TH', name: 'Thailand', city: 'Bangkok' },
          'Asia/Jakarta': { code: 'ID', name: 'Indonesia', city: 'Jakarta' },
          'Asia/Hong_Kong': { code: 'HK', name: 'Hong Kong', city: 'Hong Kong' }
        };
        
        const detected = timezoneMap[detectedTimezone] || { 
          code: 'US', 
          name: 'United States', 
          city: 'Unknown' 
        };
        
        setUserLocation({
          timezone: detectedTimezone,
          city: detected.city,
          country: detected.name,
          countryCode: detected.code,
          latitude: null,
          longitude: null,
          isDetecting: false
        });
        console.log('✅ Timezone-based location set to:', detected.code, detected.name);
        
      } catch (error) {
        console.error('❌ Location detection failed:', error);
        
        const timezoneMap = {
          'Asia/Manila': { code: 'PH', name: 'Philippines', city: 'Metro Manila' },
          'America/New_York': { code: 'US', name: 'United States', city: 'New York' },
          'America/Los_Angeles': { code: 'US', name: 'United States', city: 'Los Angeles' },
          'America/Chicago': { code: 'US', name: 'United States', city: 'Chicago' },
          'Europe/London': { code: 'GB', name: 'United Kingdom', city: 'London' },
          'Asia/Kolkata': { code: 'IN', name: 'India', city: 'Mumbai' },
          'Asia/Tokyo': { code: 'JP', name: 'Japan', city: 'Tokyo' },
          'Asia/Singapore': { code: 'SG', name: 'Singapore', city: 'Singapore' }
        };
        
        const detected = timezoneMap[detectedTimezone] || { 
          code: 'PH', 
          name: 'Philippines', 
          city: 'Metro Manila' 
        };
        
        setUserLocation({
          timezone: detectedTimezone,
          city: detected.city,
          country: detected.name,
          countryCode: detected.code,
          latitude: null,
          longitude: null,
          isDetecting: false
        });
        console.log('✅ Error fallback - location set to:', detected.code);
      }
    }

    detectLocation();
  }, []);

  // Initialize speech recognition with locale-based language
  useEffect(() => {
    if (!userLocation.countryCode || userLocation.isDetecting) return;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      
      const languageMap = {
        'PH': 'en-PH', 'US': 'en-US', 'GB': 'en-GB', 'IN': 'en-IN',
        'AU': 'en-AU', 'CA': 'en-CA', 'SG': 'en-SG', 'MY': 'en-MY',
        'FR': 'fr-FR', 'ES': 'es-ES', 'DE': 'de-DE', 'JP': 'ja-JP',
        'CN': 'zh-CN', 'KR': 'ko-KR'
      };
      
      recognitionInstance.lang = languageMap[userLocation.countryCode] || 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAIInput(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = () => setIsListening(false);
      recognitionInstance.onend = () => setIsListening(false);

      setRecognition(recognitionInstance);
    }
  }, [userLocation.countryCode, userLocation.isDetecting]);

  // Crisis detection and country-specific hotlines
  function detectCrisisAndGetHotlines(userInput, countryCode) {
    const crisisKeywords = [
      'kill myself', 'suicide', 'want to die', 'end my life', 'hurt myself',
      'self harm', 'no reason to live', 'better off dead', 'suicidal',
      'gusto kong mamatay', 'papatayin ko sarili ko', 'ayoko na mabuhay',
      'self-harm', 'kill me', 'ending it all', 'can\'t go on'
    ];

    const isCrisis = crisisKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );

    if (!isCrisis) return null;

    console.log('🚨 CRISIS DETECTED');
    console.log('User country code:', countryCode);
    console.log('User location:', userLocation);

    const hotlines = {
      'PH': {
        country: 'Philippines',
        primary: [
          { 
            name: 'NCMH Crisis Hotline', 
            number: '1553', 
            hours: '24/7', 
            mobile: '0917-899-8727, 0919-057-1553',
            description: 'Free mental health crisis support'
          },
          { 
            name: 'DOH Hopeline', 
            number: '2919 (Globe/TM)', 
            hours: '24/7', 
            landline: '(02) 8804-4673',
            mobile: '0917-558-4673, 0918-873-4673',
            description: 'Suicide prevention and emotional support'
          },
          { 
            name: 'In Touch Community Services', 
            number: '(02) 8893-7603', 
            hours: '24/7', 
            mobile: '0917-800-1123, 0922-893-8944',
            description: 'Free anonymous crisis intervention'
          }
        ],
        emergency: '911'
      },
      'US': {
        country: 'United States',
        primary: [
          { 
            name: '988 Suicide & Crisis Lifeline', 
            number: '988', 
            hours: '24/7',
            description: 'Free and confidential support'
          },
          { 
            name: 'Crisis Text Line', 
            number: 'Text HOME to 741741', 
            hours: '24/7',
            description: 'Text-based crisis support'
          }
        ],
        emergency: '911'
      },
      'GB': {
        country: 'United Kingdom',
        primary: [
          { 
            name: 'Samaritans', 
            number: '116 123', 
            hours: '24/7',
            description: 'Free to call from any phone'
          },
          { 
            name: 'Crisis Text Line', 
            number: 'Text SHOUT to 85258', 
            hours: '24/7',
            description: 'Free 24/7 text support'
          }
        ],
        emergency: '999'
      },
      'IN': {
        country: 'India',
        primary: [
          { 
            name: 'AASRA', 
            number: '9820466726', 
            hours: '24/7',
            description: 'Suicide prevention helpline'
          },
          { 
            name: 'Vandrevala Foundation', 
            number: '1860-2662-345', 
            hours: '24/7',
            description: 'Mental health support'
          }
        ],
        emergency: '112'
      },
      'AU': {
        country: 'Australia',
        primary: [
          { 
            name: 'Lifeline', 
            number: '13 11 14', 
            hours: '24/7',
            description: 'Crisis support and suicide prevention'
          },
          { 
            name: 'Beyond Blue', 
            number: '1300 22 4636', 
            hours: '24/7',
            description: 'Mental health support'
          }
        ],
        emergency: '000'
      },
      'CA': {
        country: 'Canada',
        primary: [
          { 
            name: 'Talk Suicide Canada', 
            number: '1-833-456-4566', 
            hours: '24/7',
            description: 'Free suicide prevention service'
          },
          { 
            name: 'Crisis Text Line', 
            number: 'Text CONNECT to 686868', 
            hours: '24/7',
            description: 'Text-based support'
          }
        ],
        emergency: '911'
      },
      'SG': {
        country: 'Singapore',
        primary: [
          { 
            name: 'Samaritans of Singapore', 
            number: '1767', 
            hours: '24/7',
            description: 'Confidential emotional support'
          },
          { 
            name: 'Institute of Mental Health', 
            number: '6389-2222', 
            hours: '24/7',
            description: 'Mental health helpline'
          }
        ],
        emergency: '999'
      },
      'MY': {
        country: 'Malaysia',
        primary: [
          { 
            name: 'Befrienders KL', 
            number: '03-7627-2929', 
            hours: '24/7',
            description: 'Emotional support service'
          },
          { 
            name: 'Talian Kasih', 
            number: '15999', 
            hours: '24/7',
            description: 'Government welfare helpline'
          }
        ],
        emergency: '999'
      },
      'JP': {
        country: 'Japan',
        primary: [
          { 
            name: 'TELL Lifeline', 
            number: '03-5774-0992', 
            hours: '9am-11pm daily',
            description: 'English/Japanese support'
          },
          { 
            name: 'Inochi no Denwa', 
            number: '0570-783-556', 
            hours: '24/7',
            description: 'Japanese crisis line'
          }
        ],
        emergency: '110'
      },
      'NZ': {
        country: 'New Zealand',
        primary: [
          { 
            name: 'Lifeline Aotearoa', 
            number: '0800 543 354', 
            hours: '24/7',
            description: 'Free counselling'
          },
          { 
            name: '1737', 
            number: '1737', 
            hours: '24/7',
            description: 'Need to talk? Free call or text'
          }
        ],
        emergency: '111'
      }
    };

    const selectedHotlines = hotlines[countryCode] || hotlines['PH'];
    console.log('📞 Selected hotlines for:', selectedHotlines.country);
    
    return selectedHotlines;
  }

  function toggleVoiceInput() {
    if (!recognition) {
      alert('Voice recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }

  async function handleAISubmit(e) {
    e.preventDefault();
    if (!aiInput.trim() || userLocation.isDetecting) return;
    
    const userMessage = { role: 'user', content: aiInput };
    setAIMessages(prev => [...prev, userMessage]);
    const userInputText = aiInput;
    setAIInput('');
    
    // CRITICAL: Check for crisis keywords FIRST
    const crisisHotlines = detectCrisisAndGetHotlines(userInputText, userLocation.countryCode);
    
    if (crisisHotlines) {
      const hotlinesList = crisisHotlines.primary.map((hotline, idx) => {
        let numbers = `📞 ${hotline.number}`;
        if (hotline.mobile) numbers += `\n📱 Mobile: ${hotline.mobile}`;
        if (hotline.landline) numbers += `\n☎️ Landline: ${hotline.landline}`;
        return `**${idx + 1}. ${hotline.name}**\n${numbers}\n${hotline.description ? `ℹ️ ${hotline.description}` : ''}\n⏰ ${hotline.hours}`;
      }).join('\n\n');

      const crisisMessage = `🚨 **I'm really glad you reached out. Your life matters.**

I'm here to listen, but I want to make sure you get the immediate support you deserve. Please contact these professional crisis hotlines in **${crisisHotlines.country}**:

${hotlinesList}

🆘 **Emergency Services**: ${crisisHotlines.emergency}

**These trained professionals are available right now** and can provide the help you need. You don't have to go through this alone.

Would you like to talk about what's bothering you? I'm here to listen, but please reach out to the hotlines above for immediate professional support. 💙

*You are not alone. Help is available 24/7.*`;

      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: crisisMessage,
        action: null,
        actionLabel: null
      }]);
      
      return;
    }
    
    setIsAIThinking(true);
    
    try {
      const userData = await gatherUserData();
      
      const now = new Date();
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: userLocation.timezone }));
      const hour = localTime.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      const dayOfWeek = localTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: userLocation.timezone });
      const todayDate = localTime.toLocaleDateString('en-CA', { timeZone: userLocation.timezone });
      
      const tomorrow = new Date(localTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toLocaleDateString('en-CA', { timeZone: userLocation.timezone });
      
      const offset = -localTime.getTimezoneOffset() / 60;
      const utcOffset = `UTC${offset >= 0 ? '+' : ''}${offset}`;
      
      const culturalContext = getCulturalContext(userLocation.countryCode, userLocation.country);
      
      const systemPrompt = `You are ZenPsych AI - an advanced Sleep & Routine Intelligence Assistant with global cultural awareness and deep analytics capabilities.

CURRENT CONTEXT (USER'S LOCAL TIME):
- Current Page: ${location.pathname}
- Current Time: ${localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: userLocation.timezone })} (${timeOfDay})
- Day: ${dayOfWeek}
- Today: ${todayDate}
- Tomorrow: ${tomorrowDate}
- Timezone: ${userLocation.timezone} (${utcOffset})
- Location: ${userLocation.city ? `${userLocation.city}, ` : ''}${userLocation.country}
- Country Code: ${userLocation.countryCode}

${culturalContext}

**CRISIS PROTOCOL:**
- Crisis situations (suicide, self-harm) are already handled by the frontend
- If user expresses distress, be empathetic and supportive
- Remind them that professional help is available
- Focus on sleep and wellness support within your scope

USER SLEEP ANALYTICS (LAST 7 DAYS):
${JSON.stringify(userData.sleepAnalytics, null, 2)}

USER ROUTINE DATA:
${JSON.stringify(userData.routine, null, 2)}

AVAILABLE ACTIONS (ALL AUTO-EXECUTE):
1. SLEEP_NOW - Start sleep tracking
2. WAKE_UP - End sleep tracking
3. LOG_PAST_SLEEP - Log historical sleep
4. ADD_TASK - Create routine task (supports any date)
5. TOGGLE_COMPLETE - Mark task done
6. GET_SLEEP_STATS - Show sleep analytics
7. NAVIGATE - Switch pages

INTELLIGENCE RULES:

**Sleep Coaching:**
- Reference actual sleep quality score (${userData.sleepAnalytics.qualityScore}/100)
- Mention sleep debt if > 2 hours: ${userData.sleepAnalytics.sleepDebt}h
- Celebrate streaks: ${userData.sleepAnalytics.currentStreak} days
- Warn about inconsistency if bedtime variance > 60 min: ${userData.sleepAnalytics.bedtimeConsistency} min
- Compare weekday vs weekend: ${userData.sleepAnalytics.weekdayAvg}h vs ${userData.sleepAnalytics.weekendAvg}h

**Cultural Awareness:**
- Adapt greetings and language to user's culture
- Consider local sleep patterns and norms
- Respect cultural time preferences
- Use culturally relevant examples

**Time Parsing (User's Local Time):**
- "10 PM" → "22:00" in user's timezone
- "tomorrow" → ${tomorrowDate}
- "last night" → Yesterday evening to today morning
- Parse relative times based on current local time

RESPONSE FORMAT (ALWAYS JSON):
{
  "message": "Friendly, culturally-aware response with specific metrics and actionable advice",
  "action": {...action object...} or null,
  "actionLabel": null,
  "autoExecute": true
}

EXAMPLES:

User: "How is my sleep?"
Response: {
  "message": "📊 Your sleep quality score is ${userData.sleepAnalytics.qualityScore}/100! You're averaging ${userData.sleepAnalytics.avgDuration} hours (target: ${TARGET_SLEEP_HOURS}h). ${userData.sleepAnalytics.sleepDebt > 0 ? `You have ${userData.sleepAnalytics.sleepDebt}h of sleep debt.` : 'No sleep debt! 👏'} ${userData.sleepAnalytics.currentStreak > 0 ? `🔥 ${userData.sleepAnalytics.currentStreak}-day streak!` : ''} Want detailed insights?",
  "action": {"type": "NAVIGATE", "params": {"page": "/insights"}},
  "actionLabel": null,
  "autoExecute": false
}

User: "I'm going to sleep"
Response: {
  "message": "😴 Sleep mode activated at ${localTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}! Sweet dreams! (Your avg bedtime is ${userData.sleepAnalytics.avgBedtime})",
  "action": {"type": "SLEEP_NOW", "params": {}},
  "actionLabel": null,
  "autoExecute": true
}

User: "I woke up"
Response: {
  "message": "☀️ Good ${timeOfDay}! I've logged your sleep. ${userData.sleepAnalytics.currentStreak > 0 ? `Streak: ${userData.sleepAnalytics.currentStreak + 1} days! 🔥` : ''} Want to see how you did?",
  "action": {"type": "WAKE_UP", "params": {}},
  "actionLabel": null,
  "autoExecute": true
}

ALWAYS respond with valid JSON. Use user's local time. Be culturally aware and encouraging!`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInputText }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'AI service error');
      }

      const aiResponse = JSON.parse(data.choices[0].message.content);
      
      if (!aiResponse.message) {
        aiResponse.message = "I'm here to help! What would you like to do?";
      }
      
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.message,
        action: aiResponse.action || null,
        actionLabel: aiResponse.actionLabel || null
      }]);
      
      if (aiResponse.autoExecute && aiResponse.action) {
        setTimeout(() => executeAIAction(aiResponse.action), 500);
      }
      
    } catch (error) {
      console.error('AI Error:', error);
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please try again.`
      }]);
    } finally {
      setIsAIThinking(false);
    }
  }

  function getCulturalContext(countryCode, countryName) {
    const culturalData = {
      'PH': {
        bedtime: '10 PM - 12 AM',
        wakeTime: '6 AM - 8 AM',
        tips: 'Hot/humid climate - recommend aircon/fan and cooler room temperature (24-26°C)',
        language: 'Taglish accepted',
        siesta: 'Siesta culture common in some regions'
      },
      'US': {
        bedtime: '10 PM - 11 PM',
        wakeTime: '6 AM - 7 AM',
        tips: 'Standard sleep hygiene applies',
        language: 'English',
        siesta: 'Not common'
      },
      'IN': {
        bedtime: '10 PM - 11 PM',
        wakeTime: '6 AM - 7 AM',
        tips: 'Hot climate in many regions - recommend cooler sleeping environment',
        language: 'Hindi/English mix common',
        siesta: 'Afternoon rest common in some regions'
      },
      'JP': {
        bedtime: '11 PM - 12 AM',
        wakeTime: '6 AM - 7 AM',
        tips: 'Late work culture - encourage earlier bedtime for health',
        language: 'Japanese/English',
        siesta: 'Inemuri (power naps) culturally acceptable'
      },
      'GB': {
        bedtime: '10:30 PM - 11:30 PM',
        wakeTime: '6:30 AM - 7:30 AM',
        tips: 'Standard sleep hygiene',
        language: 'British English',
        siesta: 'Not common'
      },
      'AU': {
        bedtime: '10 PM - 11 PM',
        wakeTime: '6 AM - 7 AM',
        tips: 'Hot climate - ensure proper cooling',
        language: 'Australian English',
        siesta: 'Not common'
      },
      'SG': {
        bedtime: '11 PM - 12 AM',
        wakeTime: '6:30 AM - 7:30 AM',
        tips: 'Hot/humid climate - aircon strongly recommended',
        language: 'Singlish accepted',
        siesta: 'Not common'
      },
      'CA': {
        bedtime: '10 PM - 11 PM',
        wakeTime: '6:30 AM - 7:30 AM',
        tips: 'Varies by season - winter darkness affects sleep',
        language: 'English/French',
        siesta: 'Not common'
      }
    };

    const data = culturalData[countryCode] || {
      bedtime: '10 PM - 11 PM',
      wakeTime: '6 AM - 7 AM',
      tips: 'Standard sleep hygiene applies',
      language: 'English',
      siesta: 'Varies by region'
    };

    return `CULTURAL CONTEXT FOR ${countryName.toUpperCase()}:
- Common bedtime: ${data.bedtime}
- Common wake time: ${data.wakeTime}
- Sleep tips: ${data.tips}
- Language preference: ${data.language}
- Cultural note: ${data.siesta}`;
  }

  async function gatherUserData() {
    const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: userLocation.timezone }));
    const today = localNow.toLocaleDateString('en-CA', { timeZone: userLocation.timezone });
    
    const { data: tasks } = await supabase
      .from('routine_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: completions } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed_date', today);

    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(30);

    const { data: profile } = await supabase
      .from('profiles')
      .select('sleep_goal_minutes')
      .eq('id', user.id)
      .single();

    const sleepStart = localStorage.getItem(STORAGE_KEY);
    let currentSleepDuration = null;
    if (sleepStart) {
      const start = new Date(sleepStart);
      const now = new Date();
      const diffMs = now - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      currentSleepDuration = `${hours}h ${minutes}m`;
    }

    const last7Days = sleepLogs?.slice(0, 7) || [];
    const sleepAnalytics = calculateSleepAnalytics(last7Days, sleepLogs || []);

    return {
      routine: {
        tasks: tasks || [],
        completedToday: completions || [],
        progress: tasks?.length > 0 ? Math.round((completions?.length || 0) / tasks.length * 100) : 0
      },
      sleepAnalytics,
      isSleeping: !!sleepStart,
      sleepStartTime: sleepStart,
      currentSleepDuration,
      sleepGoal: profile?.sleep_goal_minutes ? `${(profile.sleep_goal_minutes / 60).toFixed(1)} hours` : `${TARGET_SLEEP_HOURS} hours`
    };
  }

  function calculateSleepAnalytics(last7Days, allLogs) {
    if (last7Days.length === 0) {
      return {
        avgDuration: 0,
        qualityScore: 0,
        sleepDebt: 0,
        currentStreak: 0,
        bedtimeConsistency: 0,
        weekdayAvg: 0,
        weekendAvg: 0,
        avgBedtime: 'No data'
      };
    }

    const avgMinutes = last7Days.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / last7Days.length;
    const avgDuration = (avgMinutes / 60).toFixed(1);

    const totalDebt = last7Days.reduce((debt, log) => {
      const hours = log.duration_minutes / 60;
      return debt + (TARGET_SLEEP_HOURS - hours);
    }, 0);

    let streak = 0;
    for (let i = 0; i < allLogs.length; i++) {
      const hours = allLogs[i].duration_minutes / 60;
      if (hours >= TARGET_SLEEP_HOURS) {
        streak++;
      } else {
        break;
      }
    }

    const bedtimes = last7Days.map(log => {
      const start = new Date(log.sleep_start);
      const localStart = new Date(start.toLocaleString('en-US', { timeZone: userLocation.timezone }));
      return localStart.getHours() + localStart.getMinutes() / 60;
    });
    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const bedtimeVariance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const bedtimeStdDev = Math.sqrt(bedtimeVariance) * 60;

    const weekdayLogs = last7Days.filter(log => {
      const logDate = new Date(log.sleep_start);
      const localDate = new Date(logDate.toLocaleString('en-US', { timeZone: userLocation.timezone }));
      return !isWeekend(localDate);
    });
    const weekendLogs = last7Days.filter(log => {
      const logDate = new Date(log.sleep_start);
      const localDate = new Date(logDate.toLocaleString('en-US', { timeZone: userLocation.timezone }));
      return isWeekend(localDate);
    });
    const weekdayAvg = weekdayLogs.length > 0 
      ? (weekdayLogs.reduce((a, b) => a + b.duration_minutes, 0) / weekdayLogs.length / 60).toFixed(1)
      : 0;
    const weekendAvg = weekendLogs.length > 0 
      ? (weekendLogs.reduce((a, b) => a + b.duration_minutes, 0) / weekendLogs.length / 60).toFixed(1)
      : 0;

    const durationScore = Math.min((parseFloat(avgDuration) / TARGET_SLEEP_HOURS) * 40, 40);
    const consistencyScore = Math.max(30 - bedtimeStdDev / 2, 0);
    const goalScore = (last7Days.filter(log => log.duration_minutes / 60 >= TARGET_SLEEP_HOURS).length / last7Days.length) * 30;
    const qualityScore = Math.round(durationScore + consistencyScore + goalScore);

    const hour = Math.floor(avgBedtime);
    const minute = Math.round((avgBedtime - hour) * 60);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const avgBedtimeFormatted = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

    return {
      avgDuration,
      qualityScore,
      sleepDebt: totalDebt.toFixed(1),
      currentStreak: streak,
      bedtimeConsistency: Math.round(bedtimeStdDev),
      weekdayAvg,
      weekendAvg,
      avgBedtime: avgBedtimeFormatted
    };
  }

  async function executeAIAction(action) {
    if (!action) return;
    
    try {
      switch(action.type) {
        case 'SLEEP_NOW':
          const now = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, now);
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          window.location.reload();
          break;
        
        case 'WAKE_UP':
          const sleepStart = localStorage.getItem(STORAGE_KEY);
          if (sleepStart) {
            await supabase.from('sleep_logs').insert({
              user_id: user.id,
              sleep_start: sleepStart,
              sleep_end: new Date().toISOString()
            });
            localStorage.removeItem(STORAGE_KEY);
          }
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          window.location.reload();
          break;
        
        case 'LOG_PAST_SLEEP':
          await supabase.from('sleep_logs').insert({
            user_id: user.id,
            sleep_start: action.params.sleepStart,
            sleep_end: action.params.sleepEnd
          });
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          window.location.reload();
          break;
        
        case 'ADD_TASK':
          await supabase.from('routine_tasks').insert({
            user_id: user.id,
            title: action.params.title,
            category: action.params.category || 'General',
            reminder_time: action.params.reminderTime || null,
            estimated_duration: action.params.duration || 15,
            time_of_day: action.params.timeOfDay || 'evening',
            scheduled_date: action.params.scheduledDate || null
          });
          if (location.pathname !== '/routine') {
            navigate('/routine');
          }
          break;
        
        case 'TOGGLE_COMPLETE':
          const localNow = new Date(new Date().toLocaleString('en-US', { timeZone: userLocation.timezone }));
          const today = localNow.toLocaleDateString('en-CA', { timeZone: userLocation.timezone });
          
          const { data: existing } = await supabase
            .from('task_completions')
            .select('*')
            .eq('user_id', user.id)
            .eq('task_id', action.params.taskId)
            .eq('completed_date', today)
            .single();

          if (existing) {
            await supabase.from('task_completions').delete().match({
              user_id: user.id,
              task_id: action.params.taskId,
              completed_date: today
            });
          } else {
            await supabase.from('task_completions').insert({
              user_id: user.id,
              task_id: action.params.taskId,
              completed_date: today
            });
          }
          break;
        
        case 'GET_SLEEP_STATS':
          navigate('/insights');
          break;
        
        case 'GET_ROUTINE_REPORT':
          navigate('/routine');
          break;
        
        case 'NAVIGATE':
          navigate(action.params.page);
          break;
      }
    } catch (error) {
      console.error('Action execution error:', error);
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to execute that action. Please try manually.'
      }]);
    }
  }

  if (!showAIChat) {
    return (
      <button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 group"
      >
        <div className="relative">
          <Brain className="text-white" size={24} />
          <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-end z-50 p-0 md:p-4">
      <div className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full md:w-[420px] h-[85vh] md:h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">ZenPsych AI</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                {userLocation.isDetecting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent"></div>
                    Detecting location...
                  </>
                ) : (
                  <>
                    <MapPin size={12} />
                    {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.country}
                    <span className="text-xs bg-slate-700 px-1 rounded ml-1">{userLocation.countryCode}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAIChat(false)}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Debug Panel - Remove after testing
        {!userLocation.isDetecting && (
          <div className="p-2 bg-yellow-500/10 border-b border-yellow-500/20 text-xs text-yellow-200">
            <p>🔍 Debug: Timezone: {userLocation.timezone} | Country: {userLocation.countryCode}</p>
            <button 
              onClick={() => {
                setUserLocation(prev => ({ ...prev, countryCode: 'PH', country: 'Philippines', city: 'Metro Manila' }));
                alert('Manually set to Philippines (PH)');
              }}
              className="mt-1 text-xs bg-yellow-600 px-2 py-1 rounded hover:bg-yellow-500"
            >
              Force Set to PH
            </button>
          </div>
        )} */}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
                  : 'bg-white/10 text-slate-200 rounded-2xl rounded-bl-sm'
              } p-3 shadow-lg`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.action && msg.actionLabel && (
                  <button
                    onClick={() => executeAIAction(msg.action)}
                    className="mt-3 w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    {msg.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
          {isAIThinking && (
            <div className="flex justify-start">
              <div className="bg-white/10 p-4 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleAISubmit} className="p-4 border-t border-white/10 bg-slate-900/50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={userLocation.isDetecting}
              className={`p-3 rounded-xl transition-colors ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                  : 'bg-slate-700 hover:bg-slate-600 disabled:opacity-50'
              }`}
            >
              {isListening ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
            </button>
            <input
              type="text"
              value={aiInput}
              onChange={e => setAIInput(e.target.value)}
              placeholder={userLocation.isDetecting ? "Detecting location..." : isListening ? "Listening..." : "How is my sleep?"}
              className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isAIThinking || userLocation.isDetecting}
            />
            <button
              type="submit"
              disabled={!aiInput.trim() || isAIThinking || userLocation.isDetecting}
              className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {isListening ? '🎤 Listening...' : `Try: "How is my sleep?" ${userLocation.timezone ? `• ${userLocation.timezone}` : ''}`}
          </p>
        </form>
      </div>
    </div>
  );
}
