import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-ranking',
  templateUrl: './dialog-ranking.component.html',
  styleUrls: ['./dialog-ranking.component.css']
})
export class DialogRankingComponent implements OnInit {

  private scrollPosition = 0;  // Guardar a posição da rolagem

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<DialogRankingComponent>
  ) {}

  ngOnInit(): void {
    // Adicionar a classe para a animação funcionar após a abertura
    setTimeout(() => {
      const content = document.querySelector('.content');
      content?.classList.add('show-dialog');
    }, 10);

    // Armazenar a posição atual da rolagem da página
    this.scrollPosition = window.pageYOffset;

    // Impedir a rolagem sem mudar a posição
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.style.position = 'fixed';
    document.body.style.overflow = 'hidden';
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    // Restaurar a posição original da página e liberar a rolagem
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    window.scrollTo(0, this.scrollPosition);  // Voltar para a posição original
  }
}
