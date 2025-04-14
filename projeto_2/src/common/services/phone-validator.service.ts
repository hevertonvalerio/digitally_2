import { Injectable } from '@nestjs/common';

@Injectable()
export class PhoneValidatorService {
  /**
   * Valida se um número é celular
   * Formato aceito: +55DDD9XXXXXXXX ou DDD9XXXXXXXX
   */
  isCellPhone(phone: string): boolean {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');

    // Se começar com +55, remove
    const nationalNumber = cleanPhone.replace(/^55/, '');

    // Verifica se tem o tamanho correto (11 dígitos) e começa com 9
    if (nationalNumber.length !== 11) return false;
    
    // Verifica se é celular (começa com 9 após o DDD)
    const isCell = nationalNumber[2] === '9';
    
    // Verifica se o DDD é válido (11-99)
    const ddd = parseInt(nationalNumber.substring(0, 2));
    const validDDD = ddd >= 11 && ddd <= 99;

    return isCell && validDDD;
  }

  /**
   * Formata um número de telefone para o padrão WhatsApp
   * Entrada: qualquer formato
   * Saída: +55DDD9XXXXXXXX
   */
  formatToWhatsApp(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const nationalNumber = cleanPhone.replace(/^55/, '');
    
    if (nationalNumber.length !== 11) {
      throw new Error('Número de telefone inválido');
    }

    return `+55${nationalNumber}`;
  }

  /**
   * Extrai informações de um número de telefone
   */
  extractPhoneInfo(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const nationalNumber = cleanPhone.replace(/^55/, '');

    if (nationalNumber.length !== 11) {
      throw new Error('Número de telefone inválido');
    }

    return {
      ddd: nationalNumber.substring(0, 2),
      number: nationalNumber.substring(2),
      isCell: nationalNumber[2] === '9',
      fullNumber: `+55${nationalNumber}`
    };
  }
} 