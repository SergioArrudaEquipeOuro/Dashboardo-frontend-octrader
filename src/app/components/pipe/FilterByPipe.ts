import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filterBy' })
export class FilterByPipe implements PipeTransform {
  transform(items: any[], searchTerm: string, filterType: string = 'ALL'): any[] {
    if (!items) return [];
    if (!searchTerm && filterType === 'ALL') return items;

    const term = searchTerm?.toLowerCase() || '';

    return items.filter(item => {
      // filtra por busca textual
      const matchesText = !term || [
        item.nome,
        item.email,
        item.tokenIdentificacao,
        item.cpf,
        item.telefone
      ].some(f => f?.toLowerCase().includes(term));

      // filtra por tipo
      const matchesType = filterType === 'ALL'
        || (filterType === 'CLIENTE' && item.saldo !== undefined)
        || (filterType === 'BROKER' && Array.isArray(item.clientes));

      return matchesText && matchesType;
    });
  }
}
