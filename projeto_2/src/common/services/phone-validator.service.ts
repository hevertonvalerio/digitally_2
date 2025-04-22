import { Injectable } from '@nestjs/common';

@Injectable()
export class PhoneValidatorService {
  /**
   * Valida se um número é celular
   * Aceita qualquer formato de número
   */
  isCellPhone(phone: string): boolean {
    // Aceita qualquer número que não seja vazio
    return !!phone;
  }

  /**
   * Formata um número de telefone para o padrão WhatsApp
   * Retorna o número como está, apenas adicionando + se não tiver
   */
  formatToWhatsApp(phone: string): string {
    const cleanPhone = phone.trim();
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }

  /**
   * Extrai informações de um número de telefone
   */
  extractPhoneInfo(phone: string) {
    return {
      fullNumber: phone.startsWith('+') ? phone : `+${phone}`
    };
  }
}
