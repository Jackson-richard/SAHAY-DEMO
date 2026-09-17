
 
export async function extractSignals(text, language = 'en') {
    const defaultSignals = {
        emotionalDistress: 0.0,
        sleepDifficulty: 0.0,
        safetyConcern: 0.0,
        engagement: 0.0,
        confidence: 0.0
    };

    if (!text || typeof text !== 'string' || text.trim() === '') {
        return defaultSignals;
    }

    const t = text.toLowerCase();
    const signals = { ...defaultSignals, engagement: 0.8, confidence: 0.92 };

    // 1. Emotional Distress Keywords (Multilingual support mock)
    if (t.includes('overwhelmed') || t.includes('struggling') || t.includes('stressed') || t.includes('bad') || t.includes('worse') || t.includes('மன அழுத்தம்') || t.includes('तनाव') || t.includes('ఆందోళన')) {
        signals.emotionalDistress = 0.8;
    } else if (t.includes('good') || t.includes('fine') || t.includes('okay') || t.includes('better') || t.includes('நன்றாக') || t.includes('ठीक')) {
        signals.emotionalDistress = 0.2;
    } else {
        signals.emotionalDistress = 0.4;
    }

    // 2. Sleep Difficulty Keywords
    if (t.includes('sleep') || t.includes('rest') || t.includes('awake') || t.includes('தூக்கம்') || t.includes('नींद')) {
        if (t.includes("can't") || t.includes('difficult') || t.includes('no ') || t.includes('not') || t.includes("hard")) {
            signals.sleepDifficulty = 0.9;
        } else {
            signals.sleepDifficulty = 0.3;
        }
    }

    // 3. Safety Concern Keywords
    if (t.includes('unsafe') || t.includes('danger') || t.includes('afraid') || t.includes('threat') || t.includes('scared') || t.includes('பயம்') || t.includes('खतरा')) {
        signals.safetyConcern = 0.95;
    }

    // Simulate network delay to mimic LLM inference time
    await new Promise(resolve => setTimeout(resolve, 800));

    return signals;
}
