import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/fx-rates", async (req, res) => {
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares", {
      headers: {
        'User-Agent': 'Finlev-App/1.0'
      }
    });
    if (!response.ok) {
      throw new Error(`DolarApi responded with status ${response.status}`);
    }
    const data = await response.json();
    
    const ratesMap: Record<string, { buy: number; sell: number; name: string; updated: string }> = {};
    data.forEach((item: any) => {
      ratesMap[item.casa] = {
        buy: item.compra,
        sell: item.venta,
        name: item.nombre,
        updated: item.fechaActualizacion,
      };
    });

    res.json({
      rates: ratesMap,
      raw: data,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error fetching FX rates:", error);
    res.status(500).json({ error: error.message || "Failed to fetch live exchange rates" });
  }
});

app.get("/api/inflation-fx-history", async (req, res) => {
  try {
    const [inflRes, fxRes] = await Promise.all([
      fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion", {
        headers: { 'User-Agent': 'Finlev-App/1.0' }
      }),
      fetch("https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa", {
        headers: { 'User-Agent': 'Finlev-App/1.0' }
      })
    ]);

    if (!inflRes.ok || !fxRes.ok) {
      throw new Error("Failed to fetch inflation or FX history from ArgentinaDatos");
    }

    const inflData: { fecha: string; valor: number }[] = await inflRes.json();
    const fxData: { fecha: string; compra: number; venta: number }[] = await fxRes.json();

    const monthlyFx: Record<string, number> = {};
    fxData.forEach(item => {
      const month = item.fecha.substring(0, 7);
      monthlyFx[month] = item.venta || item.compra;
    });

    const recentInfl = inflData.filter(item => item.fecha >= '2024-01-01');
    
    let cumulativeIndex = 100;
    const historyPoints = recentInfl.map((item, idx) => {
      const month = item.fecha.substring(0, 7);
      if (idx > 0) {
        cumulativeIndex = cumulativeIndex * (1 + item.valor / 100);
      }
      let rate = monthlyFx[month] || null;
      
      // Manual Overrides for simulation months (2026)
      if (month === '2026-01') rate = 1450;
      if (month === '2026-02') rate = 1400;
      if (month === '2026-03') rate = 1380;
      if (month === '2026-04') rate = 1448.5;
      if (month === '2026-05') rate = 1410;
      if (month === '2026-06') rate = 1480;
      if (month === '2026-07') rate = 1485;
      if (month === '2026-08') rate = 1496;

      return {
        month,
        monthlyInflation: item.valor,
        inflationIndex: Math.round(cumulativeIndex * 10) / 10,
        usdArsRate: rate,
      };
    }).filter(pt => pt.usdArsRate !== null || pt.month >= '2024-09');

    res.json({
      points: historyPoints,
      source: "ArgentinaDatos API (INDEC CPI & MEP FX Rate)",
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error fetching inflation/FX history:", error);
    res.status(500).json({ error: error.message || "Failed to fetch inflation history" });
  }
});

app.post("/api/ai-insights", async (req, res) => {
  try {
    const { summaryData } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    
    const prompt = `You are an expert financial advisor analyzing a user's multi-currency (ARS & USD), multi-account personal finance data. 
Here is the financial summary for the period:
- Total Income: ${summaryData.totalIncome}
- Total Expenses: ${summaryData.totalExpenses}
- Savings Rate: ${summaryData.savingsRate}%
- Top Expense Categories: ${JSON.stringify(summaryData.topCategories)}
- Top Accounts: ${JSON.stringify(summaryData.topAccounts)}
- Inflation vs FX Context: Argentina peso depreciation and inflation impact.

Provide 3 actionable financial recommendations, 2 key spending risks or anomalies, and a brief overall financial health score (0-100) with a 2-sentence summary. Format your response in clear JSON structure or clean markdown.`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
    });
    
    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }
    
    res.json({ insights: fullOutput });
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    if (error?.message?.includes('resource_exhausted') || error?.status === 429) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again shortly." });
    }
    res.status(500).json({ error: error.message || "Failed to generate AI insights" });
  }
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const { messages, financialContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured on the server." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are an expert AI financial assistant integrated into a multi-currency personal finance tracker (handling ARS and USD in Argentina). 
Here is the user's current financial context:
- Summary: ${JSON.stringify(financialContext?.summary || {})}
- Monthly Trends: ${JSON.stringify(financialContext?.monthlyTrend || [])}
- Top Categories: ${JSON.stringify(financialContext?.topCategories || [])}
- Recent Transactions: ${JSON.stringify(financialContext?.recentTransactions || [])}

Answer the user's questions clearly, accurately, and concisely. Use the provided context to give personalized advice.`;

    const lastMessage = messages[messages.length - 1].content;
    
    // Construct history for the interaction
    const historyText = (messages || []).slice(0, -1).map((m: any) => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');

    const prompt = historyText 
      ? `History:\n${historyText}\n\nUser: ${lastMessage}`
      : lastMessage;

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: prompt,
      system_instruction: systemInstruction,
    });

    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }
    
    res.json({ reply: fullOutput });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    if (error?.message?.includes('resource_exhausted') || error?.status === 429) {
      return res.status(429).json({ error: "AI quota temporarily exceeded. Please try again shortly." });
    }
    res.status(500).json({ error: error.message || "Failed to generate AI response" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
