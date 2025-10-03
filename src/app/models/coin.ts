import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface para a Memecoin
export interface Memecoin {
  id?: number;
  nome?: string;
  symbol?: string;
  image?: string;
  active?: boolean;
  status?: string;
  valorAtual?: number;
  valorAlvo?: number;
  taxa?: number;
  variacaoMaxima?: number;
  aportIn?: number;
  aportOut?: number;
  valorBase?: number;            
  maxOperacoesHistorico?: number;
  allowAllUsers?: boolean;       
  whitelistedEmails?: string[];  
}

// Interface para o Histórico de Valores
export interface HistoricoValor {
  id: number;
  dataHora: string;
  valorAbertura: number;
  valorFechamento: number;
  valorMaximo: number;
  valorMinimo: number;
}