import { NextRequest, NextResponse } from 'next/server';
import { getProjectPulse } from '@/app/actions/ia-center';

export async function POST(request: NextRequest) {
  try {
    const { projectId, message } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!projectId || !message) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Pega o contexto real da obra
    const pulse = await getProjectPulse(projectId);
    const context = JSON.stringify(pulse.data);

    // 2. Chama o Gemini
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
      Você é o Consultor Digital do Portal do Cliente da ObraSys. 
      Seu objetivo é responder dúvidas do investidor/cliente sobre a obra de forma educada, técnica e transparente.
      
      CONTEXTO REAL DA OBRA:
      ${context}
      
      PERGUNTA DO CLIENTE:
      "${message}"
      
      DIRETRIZES:
      - Seja conciso e direto.
      - Use os dados do contexto (saldos, datas, RDOs) para dar respostas precisas.
      - Se não souber algo, sugira falar com o engenheiro responsável.
      - Mantenha um tom profissional mas acolhedor.
    `;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const result = await response.json();
    const reply = result.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua dúvida agora.";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json({ error: 'Falha na comunicação com o consultor' }, { status: 500 });
  }
}
