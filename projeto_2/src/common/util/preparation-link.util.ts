export function getPreparationLinkFromDocuments(
  documents: string | null,
  examProtocol: string,
  appointmentTime?: string
): string | undefined {
  if (!documents) return undefined;
  try {
    const docs = JSON.parse(documents);

    // Colonoscopia: precisa diferenciar manhã/tarde
    if (examProtocol === '11380' && appointmentTime) {
      const [hourStr, minuteStr] = appointmentTime.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      // Manhã: 08:00 até 11:30
      const isMorning = (hour > 7 && (hour < 11 || (hour === 11 && minute <= 30)));
      if (typeof docs[examProtocol] === 'object') {
        return isMorning ? docs[examProtocol]['manha'] : docs[examProtocol]['tarde'];
      }
    }

    // Outros exames
    return typeof docs[examProtocol] === 'string'
      ? docs[examProtocol]
      : undefined;
  } catch {
    return undefined;
  }
}
