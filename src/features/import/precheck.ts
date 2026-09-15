/**
 * Pré-contrôle local d'un PDF avant l'envoi au serveur : on vérifie que le
 * fichier a une couche texte et ressemble à un bulletin de paie. Aucune analyse
 * n'est révélée — juste un feu vert / rouge pour éviter d'envoyer un fichier
 * inexploitable.
 */

const PAYSLIP_HINTS =
  /net\s+à\s+payer|net\s+a\s+payer|cotisation|salaire\s+brut|net\s+imposable|bulletin\s+de\s+(paie|salaire|paye)|net\s+social|urssaf|s[ée]curit[ée]\s+sociale/i;

export interface PrecheckResult {
  ok: boolean;
  reason?: string;
}

export async function precheckPdf(file: File): Promise<PrecheckResult> {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    return { ok: false, reason: 'Merci de sélectionner un fichier PDF.' };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, reason: 'Fichier trop volumineux (8 Mo maximum).' };
  }

  let text: string;
  try {
    const { readPdfText } = await import('@/features/parsing/pdf');
    const doc = await readPdfText(await file.arrayBuffer());
    text = doc.lines.map((l) => l.text).join(' ');
    if (doc.charCount < 80) {
      return {
        ok: false,
        reason:
          'Ce PDF ne contient pas de texte : c’est probablement un scan ou une photo. Exportez votre bulletin en PDF depuis votre espace RH.',
      };
    }
  } catch {
    return { ok: false, reason: 'PDF illisible ou endommagé.' };
  }

  if (!PAYSLIP_HINTS.test(text)) {
    return {
      ok: false,
      reason: 'Ce document ne ressemble pas à un bulletin de paie français.',
    };
  }
  return { ok: true };
}
