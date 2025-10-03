import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Release } from '../models/release';
import { User } from '../models/user';
import { Contrato } from '../models/contrato';
import { UploadService } from './upload.service';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {
  constructor(private uploadService: UploadService) { }

  /**
   * Gera um PDF de Releases agrupados por Broker, listando clientes e suas entradas.
   * @param data Array de brokers e clientes.
   * @param filterParams Parâmetros de filtro para exibição no PDF.
   */
  public generatePDF(
    data: {
      broker: string;
      clientes: {
        cliente: string;
        entradas: {
          approved: boolean;
          entryType: string;
          value: number;
          coin: string;
          date: Date;
        }[];
        total: number;
      }[];
    }[],
    filterParams: any
  ): void {
    const doc = new jsPDF();
    let finalTotal = 0;
    let yPosition = 10;

    // ----------------------
    // 1. TÍTULO PRINCIPAL
    // ----------------------
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41); // Texto escuro
    doc.text('Relatório de Releases', 105, yPosition, { align: 'center' });
    yPosition += 7;

    // Linha horizontal sob o título
    doc.setDrawColor(52, 58, 64); // Cinza-azulado
    doc.setLineWidth(1);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 6;

    // ----------------------
    // 2. CAIXA COM PARÂMETROS
    // ----------------------
    // Fundo cinza-claro
    const boxHeight = 25;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPosition, 190, boxHeight, 'F');

    // Ajuste de margin interna
    const boxTextX = 12;
    let boxTextY = yPosition + 6;

    // Título da caixa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text('Parâmetros de Filtro:', boxTextX, boxTextY);
    boxTextY += 6;

    // Conteúdo dos parâmetros
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Release: ${filterParams.filterType}`, boxTextX, boxTextY);
    boxTextY += 5;
    doc.text(`Status de Aprovação: ${filterParams.filterApproved}`, boxTextX, boxTextY);
    boxTextY += 5;
    doc.text(`Data de Início: ${filterParams.startDate}`, 90, yPosition + 12);
    doc.text(`Data de Fim: ${filterParams.endDate}`, 90, yPosition + 17);

    // Avança a YPosition além do box
    yPosition += boxHeight + 5;

    // ----------------------
    // 3. DIVISOR INICIAL
    // ----------------------
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 5;

    // ----------------------
    // 4. LISTA DE BROKERS
    // ----------------------
    data.forEach((brokerData, index) => {
      // Divisor entre brokers (exceto no primeiro)
      if (index > 0) {
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.5);
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 5;
      }

      // Nome do Broker
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(`Broker: ${brokerData.broker}`, 10, yPosition);
      yPosition += 8;

      // 4.1 Monta a tabela com os releases desse broker
      const tableData = brokerData.clientes.flatMap(clientData => {
        return clientData.entradas.map(entrada => [
          entrada.approved ? 'Sim' : 'Não',
          clientData.cliente,
          entrada.entryType,
          entrada.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
          entrada.coin,
          new Date(entrada.date).toLocaleDateString('en-US'),
          entrada.approved ? 'Aprovado' : 'Não Aprovado'
        ]);
      });

      autoTable(doc, {
        head: [
          [
            'Aprovado',
            'Cliente',
            'Tipo de Entrada',
            'Valor',
            'Moeda',
            'Data',
            'Status'
          ]
        ],
        body: tableData.length > 0 ? tableData : [['', '', '', '', '', '', '']],
        startY: yPosition,
        theme: 'grid',

        // -- Cores e estilos "clean" --
        headStyles: {
          fillColor: [52, 58, 64],   // Cabeçalho: cinza-azulado escuro
          textColor: [255, 255, 255],// Texto branco
          fontStyle: 'bold',
          lineColor: [255, 255, 255],
          lineWidth: 0.2
        },
        bodyStyles: {
          fillColor: [248, 249, 250], // Fundo quase branco
          textColor: [33, 37, 41],    // Texto escuro
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]  // Linhas alternadas em branco
        },
        styles: {
          fontSize: 10,
          font: 'helvetica'
        },

        didDrawPage: dataTable => {
          // Atualiza yPosition após a tabela
          if (dataTable.cursor && dataTable.cursor.y) {
            yPosition = dataTable.cursor.y + 10;
          } else {
            yPosition += 10;
          }
        }
      });

      // 4.2 Exibe o total do Broker
      const brokerTotal = brokerData.clientes.reduce((sum, client) => sum + client.total, 0);
      finalTotal += brokerTotal;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(
        `Total do Broker: ${brokerTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
        10,
        yPosition
      );
      yPosition += 10;
    });

    // ----------------------
    // 5. TOTAL GERAL
    // ----------------------
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text(`Total Geral: ${finalTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`, 10, yPosition + 5);

    // Gera o Blob e abre em nova aba
    const pdfOutput = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfOutput);
    window.open(pdfUrl, '_blank');
  }

  /**
   * Gera um PDF simples para as Releases de um cliente específico.
   */
  public generatePDFCliente(releases: Release[], client: User): void {
    const doc = new jsPDF();
    let yPosition = 10;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text(`Relatório de Releases - Cliente: ${client.nome}`, 105, yPosition, { align: 'center' });
    yPosition += 8;

    // Linha
    doc.setDrawColor(52, 58, 64);
    doc.setLineWidth(0.8);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Tabela
    const tableData = releases.map(release => [
      release.approved ? 'Sim' : 'Não',
      release.entryType || 'Desconhecido',
      (release.value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'),
      new Date(release.date ?? new Date()).toLocaleDateString('en-US')
    ]);

    autoTable(doc, {
      head: [['Aprovado', 'Tipo de Release', 'Valor', 'Data']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',

      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: [248, 249, 250],
        textColor: [33, 37, 41],
        lineColor: [200, 200, 200],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      styles: {
        fontSize: 10,
        font: 'helvetica'
      }
    });

    // Abre em nova aba
    const pdfOutput = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfOutput);
    window.open(pdfUrl, '_blank');
  }

  /**
   * Gera um PDF de Ativos agrupados (ex.: Stocks, Commodities etc.).
   */
  public generateAssetsPDF(
    groups: {
      group: string;
      data: { name: string; symbol: string }[];
    }[]
  ): jsPDF {
    const doc = new jsPDF();
    let yPosition = 10;

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text('Ativos do Mercado Financeiro', 105, yPosition, { align: 'center' });
    yPosition += 8;

    // Linha
    doc.setDrawColor(52, 58, 64);
    doc.setLineWidth(0.8);
    doc.line(10, yPosition, 200, yPosition);
    yPosition += 10;

    // Para cada grupo de ativos
    groups.forEach(group => {
      // Subtítulo
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 58, 64);
      doc.text(group.group, 10, yPosition);
      yPosition += 6;

      // Monta os dados de tabela
      const tableData = group.data.map((item, index) => [
        index + 1,
        item.name,
        item.symbol,
        group.group
      ]);

      autoTable(doc, {
        head: [['Nº', 'Nome', 'Símbolo', 'Direção']],
        body: tableData,
        startY: yPosition,
        theme: 'grid',

        headStyles: {
          fillColor: [52, 58, 64],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        bodyStyles: {
          fillColor: [248, 249, 250],
          textColor: [33, 37, 41],
          lineColor: [200, 200, 200],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        styles: {
          fontSize: 10,
          font: 'helvetica'
        },

        didDrawPage: (dataTable: any) => {
          if (dataTable.cursor && dataTable.cursor.y) {
            yPosition = dataTable.cursor.y + 10;
          } else {
            yPosition += 10;
          }
        }
      });

      // Ajusta posição Y para a próxima seção
      yPosition = (doc as any).lastAutoTable.finalY + 10;

      // Quebra de página se necessário
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 10;
      }
    });

    return doc;
  }


























  getProfileImageUrl(imgPerfil: string | undefined): string {
    if (!imgPerfil) {
      return 'https://i.imgur.com/ICbUrx3.png'; // URL de uma imagem padrão caso o usuário não tenha foto
    }
    return `${this.uploadService.url()}${imgPerfil}`;
  }

  public generateContractPDF(
    contrato: Contrato,
    user: User,
    directorSignatureUrl: string,
    clientSignatureUrl: string,
    nomeDiretor: string,
    enterprise: any,
    logoEnterprise: string
  ): void {
    const doc = new jsPDF({ unit: 'px' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;
    const maxLineWidth = pageWidth - margin * 2;

    // 1) Cabeçalho
    const logoUrl = this.getProfileImageUrl(logoEnterprise);
    const logoW = 100, 
    logoH = 25;

    doc.addImage(logoUrl, 'PNG', margin, y, logoW, logoH);
    y += logoH + 20;
    doc.setFont('helvetica', 'bold').setFontSize(18);
    doc.text(
      'CONTRATO DE CESSÃO DE FUNDOS DE CRÉDITO',
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 30;

    // 2) Introdução
    doc.setFont('helvetica', 'normal').setFontSize(11);
    const intro = `As ordens de compras são assinadas e reconhecidas por ambas as partes, de um lado a ${enterprise.nomeEmpresa} (CORRETORA) e de ${user.nome}, titular da conta: ${user.tokenIdentificacao}, e do CPF ${user.cpf}, estando assim em concordância com a compra e venda de lotes de operação: ${contrato.saldo?.toLocaleString('USD', { style: 'currency', currency: 'USD' })}.`;
    const introLines = doc.splitTextToSize(intro, maxLineWidth);
    introLines.forEach((line: string) => {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 14;
    });
    y += 10;

    // 3) Parágrafos com bullets do JSON
    contrato.paragrafos?.forEach(p => {
      // título
      if (y + 18 > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold').setFontSize(12);
      doc.text(p.titulo || '', margin, y);
      y += 18;

      // corpo: unifica quebras, converte bullets “⦁” em “•” com nova linha e remove HTML
      let raw = p.texto || '';
      raw = raw
        .replace(/\r\n|\r/g, '\n')           // unify line breaks
        .replace(/⦁\s*/g, '\n• ')            // JSON bullet → new line + •
        .replace(/<li>/gi, '\n• ')           // caso use <li> também
        .replace(/<\/li>/gi, '')
        .replace(/<[^>]+>/g, '');            // remove demais tags
      // colapsa bullets duplicados
      raw = raw.replace(/(\n• ){2,}/g, '\n• ');

      const lines = doc.splitTextToSize(raw.trim(), maxLineWidth);
      doc.setFont('helvetica', 'normal').setFontSize(11);
      lines.forEach((line: string) => {
        if (y + 14 > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line.trim(), margin, y);
        y += 14;
      });
      y += 10;
    });

    // 4) Assinaturas e rodapé
    const sigW = 120, sigH = 50;
    const riskText = `Aviso de Risco: Os CFDs são instrumentos complexos e apresentam elevado risco de perda rápida de dinheiro devido à alavancagem. Leia nossos documentos legais.`;
    const riskLines = doc.splitTextToSize(riskText, maxLineWidth);
    const footerH = riskLines.length * 12 + (contrato.signed ? 30 : 0);
    if (y + sigH + 20 + footerH > pageHeight - margin) { doc.addPage(); y = margin; }

    // Diretoria
    doc.addImage(directorSignatureUrl, 'PNG', margin, y, sigW, sigH);
    doc.setFont('helvetica', 'normal').setFontSize(10);
    doc.text(`Diretoria: ${nomeDiretor}`, margin, y + sigH + 12);

    // Cliente
    doc.addImage(clientSignatureUrl, 'PNG', pageWidth - margin - sigW, y, sigW, sigH);
    doc.text(`Cliente: ${user.nome}`, pageWidth - margin - sigW, y + sigH + 12);
    y += sigH + 30;

    // Aviso de Risco
    doc.setFont('helvetica', 'normal').setFontSize(9);
    riskLines.forEach((line: string) => {
      if (y + 12 > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 12;
    });
    y += 10;

    // Status final
    if (contrato.signed) {
      doc.setFont('helvetica', 'bold').setFontSize(11);
      doc.text(
        'Contrato já foi assinado e regulamentado pela lei nº 14.063/2020.',
        pageWidth / 2,
        y,
        { align: 'center' }
      );
    }

    // Gera e abre PDF
    const blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
  }

}
