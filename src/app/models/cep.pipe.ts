import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cep'
})
export class CepPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return '';
    }
    
    // Remove qualquer caractere que não seja número
    value = value.replace(/\D/g, '');

    // Adiciona os pontos e traço no formato xx.xxx-xxx
    if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{3})$/, '$1.$2');
    }

    return value;
  }
}
