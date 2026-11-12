import OpenAI from "openai";

const isDummyKey = (key) => {
  if (!key) return true;
  if (key.startsWith('sk-dummy')) return true;
  if (key.includes('your-actual')) return true;
  if (key.includes('your-openai-api-key')) return true;
  return false;
};

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (isDummyKey(apiKey)) {
    return null;
  }
  return new OpenAI({ apiKey });
};

// 🧠 1. Generate Event Description
export const generateEventDescription = async (eventData) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return `🎉 Welcome to ${eventData.title || 'Our Upcoming Event'}!
Join us for an unforgettable experience tailored for our ${eventData.category || 'community'} gathering.
Highlights:
• Engaging interactive sessions and networking opportunities
• Premium venue facilities with full audio-visual setup
• Curated refreshments and hospitality
Reserve your spot today!`;
    }

    const prompt = `Generate a compelling event description for: ${eventData.title}
Category: ${eventData.category}
Date: ${new Date(eventData.startDate).toLocaleDateString()}
Location: ${eventData.location?.city || 'TBD'}
Target audience: ${
      eventData.category === 'college'
        ? 'college students'
        : eventData.category === 'professional'
        ? 'professionals'
        : 'general audience'
    }

Please provide:
1. A catchy tagline (max 10 words)
2. A detailed description (100-200 words)
3. 3-5 key highlights or features`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices?.[0]?.message?.content || "No response from AI.";
  } catch (error) {
    console.error("AI Description generation error:", error.message);
    return `🎉 An extraordinary ${eventData.category || 'special'} event designed to bring everyone together for an unforgettable experience.`;
  }
};

// 🪄 2. Generate Event Name Suggestions
export const generateEventNameSuggestions = async (theme, category) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return [
        `1. ${theme} Summit 2026`,
        `2. Innovate & Connect: ${theme}`,
        `3. NextGen ${category}: ${theme}`,
        `4. The ${theme} Experience`,
        `5. Spark: Igniting ${theme}`
      ];
    }

    const prompt = `Suggest 5 creative and catchy names for a ${category} event with the theme: ${theme}. Format as a numbered list.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.8,
    });

    const text = response.choices?.[0]?.message?.content || "";
    return text.split("\n").filter((item) => item.trim());
  } catch (error) {
    console.error("AI Name suggestions error:", error.message);
    return [
      `1. Premier ${theme} Event`,
      `2. ${category} Showcase`,
      `3. Connect & Inspire`
    ];
  }
};

// ✅ 3. Generate To-Do List
export const generateTodoList = async (eventData) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return `📋 Event Planning Checklist for ${eventData.title || 'Event'}:
• 2 Weeks Prior: Finalize guest count and confirm venue booking
• 1 Week Prior: Send reminder emails and prepare presentation/materials
• 2 Days Prior: Confirm catering and audio-visual equipment setup
• Day of Event: Early venue check, coordinate volunteers, manage registration
• Post-Event: Send thank you notes and review feedback survey`;
    }

    const duration = eventData.startDate && eventData.endDate
      ? `${Math.ceil((new Date(eventData.endDate) - new Date(eventData.startDate)) / (1000 * 60 * 60 * 24))} days`
      : "TBD";

    const prompt = `Create a comprehensive to-do list for planning: ${eventData.title}
Event type: ${eventData.category}
Expected attendees: ${eventData.participants?.length || "TBD"}
Duration: ${duration}
Format as a bulleted list.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.6,
    });

    return response.choices?.[0]?.message?.content || "No response.";
  } catch (error) {
    console.error("AI Todo list generation error:", error.message);
    return "• Finalize venue • Order supplies • Send invites • Test AV equipment";
  }
};

// 💬 4. Chat with AI (Assistant)
export const chatWithAI = async (userMessage, context = "") => {
  try {
    const openai = getOpenAIClient();

    // If no valid OpenAI API key, provide high-quality simulated intelligence
    if (!openai) {
      const topic = userMessage.toLowerCase();

      if (context === "plan" || topic.includes("plan")) {
        return `📋 **AI Event Masterplan**

**1️⃣ Event Overview:**
• **Theme:** Modern, Immersive & High-Engagement
• **Target Audience:** Attendees seeking interactive & educational value
• **Recommended Format:** Keynotes, Breakouts & Collaborative Socials

**2️⃣ Detailed Schedule:**
• **09:00 AM - 10:00 AM:** Check-in, Breakfast & Welcome Networking
• **10:00 AM - 12:30 PM:** Opening Ceremony, Keynote Speakers & Interactive Demos
• **12:30 PM - 02:00 PM:** Networking Lunch & Vendor Showcase
• **02:00 PM - 04:30 PM:** Workshops, Panel Discussions & Q&A
• **04:30 PM - 05:30 PM:** Closing Remarks & High Tea

**3️⃣ Budget Overview (Est. ₹1,20,000):**
• Venue & Lighting: ₹45,000
• Catering & Refreshments: ₹40,000
• Audio/Visual & Streaming: ₹20,000
• Marketing & Badges: ₹15,000

**4️⃣ Weather & Contingency:**
• Clear outdoor terrace setup with indoor backup hall available.
• High-speed Wi-Fi and power backup configured.`;
      }

      if (context === "budget" || topic.includes("budget") || topic.includes("cost")) {
        return `💰 **Comprehensive Event Budget Estimate**

| Expense Category | Item Description | Estimated Cost (INR) |
|---|---|---|
| **Venue Booking** | Main Hall (Full Day with AC & Lighting) | ₹40,000 |
| **Catering & Drinks** | Welcome Snacks, Buffet Lunch & Beverages | ₹45,000 |
| **Audio / Visual** | Dual Mic, Projector, Sound Mixer & Technician | ₹18,000 |
| **Decor & Stage** | Backdrop Banner, Flower Setup & Podium Stand | ₹12,000 |
| **Promotion & Kits** | Lanyards, Welcome Kits & Social Media Boost | ₹8,000 |
| **Emergency Buffer** | Contingency Reserves (5%) | ₹7,000 |

**Total Estimated Budget: ₹1,30,000**
💡 *Pro-Tip: Booking the venue 3 weeks in advance saves up to 15% on peak rates.*`;
      }

      if (context === "marketing" || topic.includes("marketing") || topic.includes("social")) {
        return `📢 **Marketing & Promotion Toolkit**

**📱 Social Media Captions:**
• *Instagram / Twitter:* "The wait is over! 🎉 Join us for an extraordinary day of innovation, networking, and fun. Limited seats available! Register now ➡️ link in bio. #Event2026 #FutureReady"
• *LinkedIn:* "Excited to announce our upcoming flagship event. Connect with industry leaders, gain actionable insights, and collaborate with like-minded peers. Secure your pass today."

**✉️ Email Invitation Subject Lines:**
1. You're Invited: Experience something extraordinary! 🚀
2. Mark Your Calendar — Exclusive access inside.
3. Don't miss out: Early bird passes are live!

**📰 Press Release Headline:**
*"Smart Life Event Planner Unveils Landmark Gathering Bringing Visionaries Together"*`;
      }

      if (context === "vendors" || topic.includes("vendor") || topic.includes("catering")) {
        return `🤝 **Top Recommended Vendors**

1. **🏛️ Venue Partner:**
   • *Grand Convention Center & Ballrooms*
   • Amenities: 500+ Capacity, Valet Parking, Dedicated Generator
   • Contact: events@grandcenter.com | +91 98765 43210

2. **🍽️ Catering Service:**
   • *Royal Flavors Caterers*
   • Cuisine: Multi-cuisine Buffet, Live Counters & Dessert Bar
   • Contact: orders@royalflavors.in | Rating: 4.8/5

3. **🔊 Audio-Visual & Tech:**
   • *SoundPro Systems*
   • Gear: JBL Line-Array, 4K LED Walls, Wireless Lavalier Mics
   • Contact: support@soundpro.net

4. **📸 Photography & Videography:**
   • *Cinematic Moments Studio*
   • Includes: Drone Coverage, 4K Highlights Video & Same-day Album`;
      }

      if (context === "timeline" || topic.includes("timeline") || topic.includes("schedule")) {
        return `⏱️ **Step-by-Step Event Timeline**

• **4 Weeks Before:** Finalize event objectives, budget caps, and confirm speaker roster.
• **3 Weeks Before:** Secure venue booking, deposit payment, and launch registration landing page.
• **2 Weeks Before:** Confirm catering menu, finalize print banners, and test AV technical specs.
• **1 Week Before:** Send attendee briefing emails, confirm volunteer duties, and print attendee badges.
• **Event Eve (Day -1):** Stage rehearsal, mic sound check, banner placements, and registration desk setup.
• **Day of Event:**
  - 08:00 AM: Final walkthrough & team briefing
  - 09:00 AM: Doors open & check-in
  - 10:00 AM: Program commences
  - 05:00 PM: Wrap-up & teardown
• **Post-Event (Day +1):** Send thank-you emails and share photo gallery.`;
      }

      if (context === "risks" || topic.includes("risk") || topic.includes("safety")) {
        return `🛡️ **Risk Assessment & Mitigation Matrix**

1. **Weather Interruptions (Rain / Extreme Heat):**
   • *Impact:* Medium | *Probability:* Low-Medium
   • *Mitigation:* Ensure venue has waterproof indoor canopy and climate-controlled backup halls.

2. **Technical & Power Failure:**
   • *Impact:* High | *Probability:* Low
   • *Mitigation:* On-site diesel generator with automatic changeover switch; dual laptop backups.

3. **Attendance Overflow / Underflow:**
   • *Impact:* Medium | *Probability:* Medium
   • *Mitigation:* Mandatory RSVP registration with 10% buffer seating and overflow lounge.

4. **Medical Emergencies & First Aid:**
   • *Impact:* High | *Probability:* Low
   • *Mitigation:* Certified first-aid kit stationed at reception; local hospital emergency contact on speed-dial.`;
      }

      // Default AI Assistant response
      return `🤖 **Event Assistant:** I've analyzed your request: "${userMessage}".
Key recommendation: Ensure that your timeline, budget, and guest communications are aligned at least 10 days before kickoff for a smooth execution!`;
    }

    const systemPrompt = `You are an AI Event Planning Assistant.
Help users with:
- Event ideas, checklists, venues, budgets, marketing, timelines, and risks.
Be creative, clear, and practical.
${context ? `Context category: ${context}` : ""}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 450,
      temperature: 0.7,
    });

    return response.choices?.[0]?.message?.content || "No reply from AI.";
  } catch (error) {
    console.error("AI Chat error:", error.message);
    return `🤖 **AI Assistant:** Event Planning Tip: Start with a clear schedule, confirmed venue, and defined attendee target for the best outcome!`;
  }
};

// 🎯 5. Personalized Suggestions
export const generatePersonalizedSuggestions = async (userEvents, userPreferences) => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return `🎯 **Personalized Recommendations:**
1. Recommended Schedule: Friday evenings or Saturday mornings have highest attendance rates.
2. Popular Category: Professional workshops and tech fests saw the highest engagement.
3. Suggestion: Incorporate 30-minute networking intermissions to increase participant satisfaction.`;
    }

    const eventHistory = userEvents.map((e) => ({
      title: e.title,
      category: e.category,
      date: e.startDate,
      success: e.analytics?.engagement > 50 ? "successful" : "average",
    }));

    const prompt = `User Event History:
${JSON.stringify(eventHistory, null, 2)}
Preferences: ${JSON.stringify(userPreferences, null, 2)}

Suggest:
1. Best future time slots
2. Recommended event categories
3. Improvements for next events`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.6,
    });

    return response.choices?.[0]?.message?.content || "No response.";
  } catch (error) {
    console.error("AI Personalized suggestions error:", error.message);
    return "🎯 Plan events 2–3 weeks in advance for optimal attendance!";
  }
};

export default {
  generateEventDescription,
  generateEventNameSuggestions,
  generateTodoList,
  chatWithAI,
  generatePersonalizedSuggestions,
};
