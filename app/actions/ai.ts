'use server';

import { prisma } from '../../lib/prisma';

async function fetchGemini(prompt: string, apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error?.message || `Erro HTTP ${response.status}`);
    }
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("A IA não retornou texto.");
    return text;
}

export async function askAICenter(prompt: string, estimateContext?: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { 
        success: false, 
        error: 'A chave da API do Gemini (GEMINI_API_KEY) não está configurada no servidor.' 
      };
    }

    // Step 1: Extract keywords to search our SINAPI database
    const extractionPrompt = `
      Você é um especialista em orçamento de obras e tabela SINAPI.
      O usuário perguntou: "${prompt}"
      Identifique as principais palavras-chave para buscar serviços na tabela SINAPI (máximo 3 a 4 palavras chaves curtas e diretas).
      Responda APENAS com as palavras-chave separadas por espaço, sem pontuação extra.
      Exemplo: "pintura latex acrilica", ou "muro arrimo bloco", ou "piso porcelanato".
    `;

    const keywords = await fetchGemini(extractionPrompt, apiKey);

    // Step 2: Search our database
    // Split keywords to perform a flexible search
    const terms = keywords.split(' ').filter((t: string) => t.trim().length > 2);
    const searchConditions = terms.map((term: string) => ({
      description: { contains: term.trim() }
    }));

    let dbItems: any[] = [];
    if (searchConditions.length > 0) {
      dbItems = await prisma.referenceComposition.findMany({
        where: { AND: searchConditions },
        take: 5,
        include: {
          resources: true
        }
      });
      
      // If no strict AND matches, try OR to at least get something
      if (dbItems.length === 0) {
        dbItems = await prisma.referenceComposition.findMany({
          where: { OR: searchConditions },
          take: 5,
          include: {
             resources: true
          }
        });
      }
    }

    // Step 3: Generate the actual assistant response based on the findings
    let itemsContext = "Nenhum item SINAPI exato encontrado para essa busca no banco local.";
    if (dbItems.length > 0) {
      itemsContext = "Itens SINAPI encontrados no banco:\n";
      dbItems.forEach((item, idx) => {
        itemsContext += `\nOpção ${idx + 1}:\nCódigo: ${item.code}\nDescrição: ${item.description}\nUnidade: ${item.unit}\nCusto: R$ ${item.totalCost || 0}\n`;
      });
    }

    const chatPrompt = `
      Você é a "Engenheira IA", uma assistente sênior de engenharia de custos do sistema ObraSys.
      
      Pergunta do Usuário: "${prompt}"
      
      Contexto do Orçamento Atual (se houver): ${estimateContext || 'Nenhum'}
      
      ${itemsContext}
      
      Instruções:
      1. Responda à pergunta do usuário de forma educada, técnica e concisa (em português do Brasil).
      2. Se houver opções SINAPI no banco (listadas acima), analise e sugira qual delas é a mais adequada para a situação, ou explique a diferença entre elas.
      3. Se NÃO houver opções no banco, tente dar uma sugestão técnica de qual composição ou insumo seria ideal na prática (sem inventar códigos SINAPI).
      4. Use formatação markdown (negrito, listas) para deixar a resposta bonita e legível.
      5. Nunca liste os insumos de uma composição a não ser que o usuário tenha pedido.
    `;

    const assistantMessage = await fetchGemini(chatPrompt, apiKey);

    return {
      success: true,
      message: assistantMessage,
      items: dbItems // We return the actual items so the UI can render "Add to Estimate" buttons
    };

  } catch (error: any) {
    console.error('AI Center Error:', error);
    return { success: false, error: error.message };
  }
}
