import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { Endereco } from '../../models/endereco.model';
import { EnderecoProximo } from '../../models/endereco-proximo.model';
import { EnderecoService } from '../../services/endereco.service';
import { normalizarTexto, gerarLinkContato } from '../../shared/texto.util';

/** Filtros possíveis pelo tipo de pessoa cadastrada no endereço. */
type TipoFiltro = 'todos' | 'membros' | 'visitantes' | 'desigrejados';

/** Endereço exibido na lista — pode ou não ter distância (quando proximidade ativa). */
type EnderecoExibido = Endereco & { dDistanciaKm?: number };

@Component({
  selector: 'app-listagem',
  templateUrl: './listagem.component.html',
  styleUrls: ['./listagem.component.scss']
})
export class ListagemComponent implements OnInit, AfterViewInit {

  @ViewChild('oPaginator') oPaginator!: MatPaginator;

  // =========================================================
  // Dados de origem
  // =========================================================
  /** Todos os endereços cadastrados (chamada inicial sem proximidade). */
  lEnderecos: Endereco[] = [];

  /** Endereços com distância calculada (apenas após o usuário informar CEP). */
  lTodosProximos: EnderecoProximo[] = [];

  /** Lista resultante após aplicar todos os filtros. */
  lEnderecosFiltrados: EnderecoExibido[] = [];

  /** Página atualmente exibida. */
  lEnderecosPagina: EnderecoExibido[] = [];

  // =========================================================
  // Filtros
  // =========================================================
  sBuscaTexto      = '';
  sCepProximidade  = '';
  /** 0 = sem filtro de raio (todos os endereços). */
  nRaioFiltroKm    = 0;
  sTipoFiltro: TipoFiltro = 'todos';

  // =========================================================
  // Estado / paginação
  // =========================================================
  bCarregando         = false;
  bBuscandoProximos   = false;
  bProximosCarregados = false;

  nTotalItens    = 0;
  nTamanhoPagina = 15;
  nPaginaAtual   = 0;

  private oBuscaSubject = new Subject<string>();

  /** Set de IDs de endereços com o card expandido. */
  private oExpandidos = new Set<number>();

  // =========================================================
  // Getters auxiliares
  // =========================================================
  get bCepProximidadeValido(): boolean {
    return this.sCepProximidade.replace(/\D/g, '').length === 8;
  }

  /** Verdadeiro quando os cards devem exibir a distância. */
  get bExibeDistancia(): boolean {
    return this.bProximosCarregados && this.nRaioFiltroKm > 0;
  }

  constructor(
    private oEnderecoService: EnderecoService,
    private oSnackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarEnderecos();

    this.oBuscaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(sTexto => {
      this.sBuscaTexto = sTexto;
      this.resetarPaginacao();
      this.aplicarFiltros();
    });
  }

  ngAfterViewInit(): void {
    // Garante que o paginator está pronto
  }

  // =========================================================
  // Carregamento inicial
  // =========================================================
  carregarEnderecos(): void {
    this.bCarregando = true;
    this.oEnderecoService.listarTodos().subscribe({
      next: lEnderecos => {
        this.lEnderecos = lEnderecos;
        this.aplicarFiltros();
        this.bCarregando = false;
      },
      error: () => {
        this.mostrarMensagem('Erro ao carregar endereços.', 'erro');
        this.bCarregando = false;
      }
    });
  }

  // =========================================================
  // Eventos de UI — Busca por texto
  // =========================================================
  onFiltroInput(oEvent: Event): void {
    const sValor = (oEvent.target as HTMLInputElement).value;
    this.oBuscaSubject.next(sValor);
  }

  limparBusca(): void {
    this.sBuscaTexto = '';
    this.resetarPaginacao();
    this.aplicarFiltros();
  }

  // =========================================================
  // Eventos de UI — Filtro por tipo
  // =========================================================
  selecionarTipo(sTipo: TipoFiltro): void {
    this.sTipoFiltro = sTipo;
    this.resetarPaginacao();
    this.aplicarFiltros();
  }

  // =========================================================
  // Eventos de UI — Filtro por proximidade
  // =========================================================
  onCepProximidadeInput(oEvent: Event): void {
    const oInput = oEvent.target as HTMLInputElement;
    let sValor   = oInput.value.replace(/\D/g, '');
    if (sValor.length > 5) {
      sValor = sValor.substring(0, 5) + '-' + sValor.substring(5, 8);
    }
    this.sCepProximidade = sValor;

    // Ao alterar o CEP, invalida resultados anteriores de proximidade.
    if (this.bProximosCarregados) {
      this.bProximosCarregados = false;
      this.lTodosProximos      = [];
      if (this.nRaioFiltroKm > 0) this.aplicarFiltros();
    }
  }

  selecionarRaio(nRaio: number): void {
    // Pediu raio sem CEP válido nem resultados carregados → avisa.
    if (nRaio > 0 && !this.bCepProximidadeValido && !this.bProximosCarregados) {
      this.mostrarMensagem('Informe um CEP de referência para filtrar por proximidade.', 'aviso');
      return;
    }

    this.nRaioFiltroKm = nRaio;
    this.resetarPaginacao();

    // Se ativou raio mas ainda não carregou proximidade, busca agora.
    if (nRaio > 0 && !this.bProximosCarregados) {
      this.buscarProximos();
    } else {
      this.aplicarFiltros();
    }
  }

  buscarProximos(): void {
    if (!this.bCepProximidadeValido) {
      this.mostrarMensagem('Digite um CEP válido.', 'aviso');
      return;
    }
    this.bBuscandoProximos   = true;
    this.bProximosCarregados = false;
    this.lTodosProximos      = [];

    this.oEnderecoService.buscarProximos(this.sCepProximidade).subscribe({
      next: lProximos => {
        this.lTodosProximos      = lProximos;
        this.bBuscandoProximos   = false;
        this.bProximosCarregados = true;
        if (lProximos.length === 0) {
          this.mostrarMensagem('Nenhum endereço com coordenadas cadastrado.', 'aviso');
        }
        this.aplicarFiltros();
      },
      error: oErro => {
        this.mostrarMensagem(oErro.error || 'Erro ao buscar endereços próximos.', 'erro');
        this.bBuscandoProximos = false;
      }
    });
  }

  // =========================================================
  // Aplicação dos filtros (texto + tipo + raio)
  // =========================================================
  private aplicarFiltros(): void {
    // 1. Base: usa lista de proximidade (filtrada por raio) ou lista normal.
    let lBase: EnderecoExibido[];
    if (this.bExibeDistancia) {
      lBase = this.lTodosProximos.filter(
        oE => oE.dDistanciaKm <= this.nRaioFiltroKm
      );
    } else {
      lBase = [...this.lEnderecos];
    }

    // 2. Filtro por texto — sem distinção de acentos ou maiúsculas/minúsculas
    const sTermo = normalizarTexto(this.sBuscaTexto);
    if (sTermo) {
      lBase = lBase.filter(oE => {
        const lCampos = [oE.sCep, oE.sLogradouro, oE.sBairro, oE.sCidade, oE.sEstado]
          .map(s => normalizarTexto(s));
        if (lCampos.some(s => s.includes(sTermo))) return true;
        return oE.lMembros?.some(oM => normalizarTexto(oM.sNome).includes(sTermo)) ?? false;
      });
    }

    // 3. Filtro por tipo (Membros / Visitantes / Desigrejados / Todos)
    if (this.sTipoFiltro === 'visitantes') {
      lBase = lBase.filter(oE =>
        oE.lMembros?.some(oM => oM.sFuncao === 'Visitante')
      );
    } else if (this.sTipoFiltro === 'membros') {
      lBase = lBase.filter(oE =>
        oE.lMembros?.some(oM => oM.sFuncao && oM.sFuncao !== 'Visitante')
      );
    } else if (this.sTipoFiltro === 'desigrejados') {
      lBase = lBase.filter(oE =>
        oE.lMembros?.some(oM => oM.bDesigrejado === true)
      );
    }

    this.lEnderecosFiltrados = lBase;
    this.nTotalItens = lBase.length;
    this.atualizarPagina();
  }

  // =========================================================
  // Paginação
  // =========================================================
  onPaginaChange(oEvento: PageEvent): void {
    this.nPaginaAtual   = oEvento.pageIndex;
    this.nTamanhoPagina = oEvento.pageSize;
    this.atualizarPagina();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private atualizarPagina(): void {
    const nInicio = this.nPaginaAtual * this.nTamanhoPagina;
    const nFim    = nInicio + this.nTamanhoPagina;
    this.lEnderecosPagina = this.lEnderecosFiltrados.slice(nInicio, nFim);
  }

  private resetarPaginacao(): void {
    this.nPaginaAtual = 0;
    if (this.oPaginator) this.oPaginator.firstPage();
  }

  // =========================================================
  // Utilitários
  // =========================================================
  formatarTelefone(sTelefone?: string): string {
    if (!sTelefone) return '—';
    const sD = sTelefone.replace(/\D/g, '');
    if (sD.length === 11) return `(${sD.slice(0,2)}) ${sD.slice(2,7)}-${sD.slice(7)}`;
    if (sD.length === 10) return `(${sD.slice(0,2)}) ${sD.slice(2,6)}-${sD.slice(6)}`;
    return sTelefone;
  }

  /** Retorna link wa.me (WhatsApp) ou tel: dependendo da flag bWhatsapp. */
  gerarLinkContato(sTelefone?: string, bWhatsapp?: boolean): string {
    return gerarLinkContato(sTelefone, bWhatsapp ?? false);
  }

  /** Alterna o estado expandido de um card. */
  alternarExpansao(nId?: number): void {
    if (nId == null) return;
    if (this.oExpandidos.has(nId)) this.oExpandidos.delete(nId);
    else this.oExpandidos.add(nId);
  }

  /** True se o card está expandido. */
  estaExpandido(nId?: number): boolean {
    return nId != null && this.oExpandidos.has(nId);
  }

  private mostrarMensagem(sMensagem: string, sTipo: 'sucesso' | 'erro' | 'aviso'): void {
    const mClasse: Record<string, string> = {
      sucesso: 'snack-sucesso', erro: 'snack-erro', aviso: 'snack-aviso'
    };
    this.oSnackBar.open(sMensagem, 'Fechar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: [mClasse[sTipo]]
    });
  }
}
