 const maxDuration = 60;

const TOPIC_POOL = [
  ['Ethics of punishment and desert','Philosophy of mind and free will','Political obligation and legitimacy','Epistemology and scepticism','Philosophy of science and explanation','Moral luck and responsibility'],
  ['Behavioural economics and nudge theory','Development economics and poverty traps','History of economic thought','Central banking and monetary policy','Technology, automation and labour','Inequality and redistribution'],
  ['Historiography and historical method','Colonial and postcolonial history','History of science and medicine','Intellectual history of political ideas','Social and cultural history','Memory, myth and national identity'],
  ['Large language models and cognition','Social media and public discourse','CRISPR and bioethics','The replication crisis in psychology','Neuroscience, law and responsibility','Climate modelling and uncertainty'],
  ['Attention, boredom and distraction','Memory, nostalgia and identity','Friendship and moral obligation','Translation and the limits of language','Solitude and self-knowledge','Reading and the construction of the self']
];

function pickTopics() {
  return TOPIC_POOL.map(g => g[Math.floor(Math.random() * g.length)]);
}

  module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API key present:', !!apiKey, '| Length:', apiKey?.length);
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set' });

  const [phil, econ, hist, sci, abs] = pickTopics();

  const PROMPT = `Generate a CAT (Common Admission Test) Reading Comprehension mock test on these specific topics:
1. Philosophy: ${phil}
2. Economics: ${econ}
3. History: ${hist}
4. Science & Technology: ${sci}
5. Abstract: ${abs}

PASSAGE RULES:
- Each passage: exactly 4 paragraphs (~140 words each), wrapped in <p> tags
- Prose style: serious academic/literary quality
- Structure: thesis → development → complication → resolution or open question
- Each passage must have a clear argumentative spine

QUESTION RULES — 4 questions per passage in this exact order:
1. Main Argument — author's central claim
2. Tone — how the author engages with the material
3. Specific Detail — something directly stated in the passage
4. Critical Reasoning — weaken/strengthen/assumption/inference

OPTION RULES:
- Exactly 4 options per question, maximum 2 lines each
- Build these traps into wrong options:
  * Scope trap: true of one paragraph but not the whole passage
  * Degree trap: slightly overstates or understates the author's position
  * Attribution trap: a view the author describes but does not hold
  * Extension trap: a plausible implication the passage does not draw

Difficulty: A = easy, B = medium, C = hard. Mix across questions.

Return ONLY valid JSON. No preamble, no markdown, no code fences. Start with { end with }.

{
  "passages": [
    {
      "topic": "Philosophy",
      "title": "A short evocative title",
      "source": "Adapted from contemporary writing in [field]",
      "difficulty": "B",
      "text": "<p>...</p><p>...</p><p>...</p><p>...</p>",
      "questions": [
        {
          "type": "Main Argument",
          "stem": "Which best captures the central argument of the passage?",
          "options": ["option A", "option B", "option C", "option D"],
          "correct": 2,
          "difficulty": "B",
          "explanation": "Option C is correct because... Option A fails because... Option B fails because... Option D fails because..."
        },
        {
          "type": "Tone",
          "stem": "The author's tone is best described as:",
          "options": ["...", "...", "...", "..."],
          "correct": 0,
          "difficulty": "B",
          "explanation": "..."
        },
        {
          "type": "Specific Detail",
          "stem": "According to the passage, ...",
          "options": ["...", "...", "...", "..."],
          "correct": 1,
          "difficulty": "A",
          "explanation": "..."
        },
        {
          "type": "Critical Reasoning",
          "stem": "Which, if true, most weakens the claim that...",
          "options": ["...", "...", "...", "..."],
          "correct": 3,
          "difficulty": "C",
          "explanation": "..."
        }
      ]
    }
  ]
}`;

  try {
    const apiKey = "PASTE_YOUR_KEY_HERE"; // temporary hardcode
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: PROMPT }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 8192,
        }
      })
    });

    const raw = await response.text();
    console.log('Gemini status:', response.status);
    console.log('Gemini response (first 300 chars):', raw.slice(0, 300));

    if (!response.ok) throw new Error(`Gemini error ${response.status}: ${raw.slice(0, 200)}`);

    const data = JSON.parse(raw);
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('{'), end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.passages) || parsed.passages.length < 5)
      throw new Error('Incomplete data — expected 5 passages');

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({ error: err.message });
  }
}
