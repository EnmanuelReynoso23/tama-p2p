export interface CompanionContext {
  petName: string;
  currentStreak: number;
  habitsTotal: number;
  habitsCompleted: number;
  friendOnline: boolean;
  friendName?: string;
}

export function getCompanionGreeting(ctx: CompanionContext): string {
  const hour = new Date().getHours();
  const progress = ctx.habitsTotal > 0 ? Math.round((ctx.habitsCompleted / ctx.habitsTotal) * 100) : 0;

  if (progress === 100) {
    return `Mision cumplida por hoy. Tienes una racha de ${ctx.currentStreak} dias activos. Me siento genial a tu lado.`;
  }

  if (hour < 12) {
    return `Buenos dias. Hoy es un buen dia para avanzar con calma. Llevamos ${ctx.habitsCompleted}/${ctx.habitsTotal} habitos completados.`;
  } else if (hour < 19) {
    if (ctx.friendOnline) {
      return `${ctx.friendName || 'Tu amiga'} esta conectada. Que tal si completan un habito juntos para cuidar la racha?`;
    }
    return `Buenas tardes. Como va tu energia? Recuerda tomar agua y cuidar tu postura mientras avanzamos.`;
  } else {
    return `Buenas noches. Has avanzado con ${ctx.habitsCompleted} metas hoy. Tienes una racha de ${ctx.currentStreak} dias. Preparate para un buen descanso.`;
  }
}

export function getAdviceForTopic(topic: string, ctx: CompanionContext): string {
  const t = topic.toLowerCase();

  if (t.includes('agua') || t.includes('sed') || t.includes('hidrat')) {
    return 'Un vaso de agua fresca ahora mismo reactiva tu concentracion y oxigena tu cerebro. Te acompano mientras bebes.';
  }

  if (t.includes('flojera') || t.includes('procrast') || t.includes('desgana') || t.includes('cansad')) {
    return 'La regla de los 2 minutos: no pienses en terminar todo, solo proponte avanzar 120 segundos. El primer paso rompe la inercia.';
  }

  if (t.includes('estres') || t.includes('ansied') || t.includes('abrumad') || t.includes('agobi')) {
    return 'Inhala en 4 segundos, sosten 4, exhala en 4. Hazlo tres veces. Escribe en un papel solo lo que dependa de ti en esta hora.';
  }

  if (t.includes('estudi') || t.includes('tarea') || t.includes('trabaj') || t.includes('enfoque')) {
    return 'Aplica un bloque Pomodoro: 25 minutos sin notificaciones ni pestanas distractoras, seguidos de 5 minutos de pausa completa.';
  }

  if (t.includes('amiga') || t.includes('amigo') || t.includes('p2p') || t.includes('juntos')) {
    if (ctx.friendOnline) {
      return `${ctx.friendName || 'Tu amiga'} esta en linea. Compartir habitos mutuos aumenta un 65% la probabilidad de mantener la racha.`;
    }
    return 'Invita a tu amiga conectandose a la misma sala P2P para mantener viva su racha compartida.';
  }

  if (t.includes('racha') || t.includes('dias') || t.includes('record')) {
    return `Llevamos una racha de ${ctx.currentStreak} dias consecutivos. La consistencia silenciosa construye grandes cambios.`;
  }

  return `Estoy aqui contigo. Divide lo que tienes pendiente en pasos pequenos. Llevas ${ctx.habitsCompleted} de ${ctx.habitsTotal} habitos listos hoy.`;
}
