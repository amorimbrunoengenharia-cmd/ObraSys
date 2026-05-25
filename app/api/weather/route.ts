import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Sao Paulo';
  const date = searchParams.get('date'); // YYYY-MM-DD
  
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  try {
    // Se não houver chave, simulamos uma resposta baseada na lógica de clima
    if (!API_KEY || API_KEY === 'sua_chave_aqui') {
      return NextResponse.json({
        manha: 'sol',
        tarde: 'nublado',
        noite: 'sol',
        info: 'Dados simulados (Chave API não configurada)'
      });
    }

    // Busca clima atual/previsão
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=pt_br`
    );
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Erro ao buscar clima');

    // Lógica simplificada: mapear os períodos do dia (baseado na previsão de 3h em 3h)
    // Manhã (09:00), Tarde (15:00), Noite (21:00)
    const periods = {
      manha: data.list[3]?.weather[0]?.main.toLowerCase(), // ~9h
      tarde: data.list[5]?.weather[0]?.main.toLowerCase(), // ~15h
      noite: data.list[7]?.weather[0]?.main.toLowerCase(), // ~21h
    };

    const mapWeather = (w: string) => {
      if (w.includes('rain') || w.includes('drizzle')) return 'chuva';
      if (w.includes('cloud')) return 'nublado';
      return 'sol';
    };

    return NextResponse.json({
      manha: mapWeather(periods.manha || ''),
      tarde: mapWeather(periods.tarde || ''),
      noite: mapWeather(periods.noite || ''),
      temp: data.list[0].main.temp,
      description: data.list[0].weather[0].description
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao processar clima' }, { status: 500 });
  }
}
