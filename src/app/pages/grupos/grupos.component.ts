import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Grupo } from '../../models/grupo.model';
import { Membro } from '../../models/membro.model';
import { GrupoService } from '../../services/grupo.service';
import { MembroService } from '../../services/membro.service';
import { normalizarTexto, gerarLinkContato } from '../../shared/texto.util';

@Component({
  selector: 'app-grupos',
  templateUrl: './grupos.component.html',
  styleUrls: ['./grupos.component.scss']
})
export class GruposComponent implements OnInit {

  @ViewChild('oPaginatorMembros') oPaginatorMembros!: MatPaginator;

  // =====================================================
  // Estado dos formulários
  // =====================================================
  fGrupo!: FormGroup;
  bModoEdicao = false;
  nIdEdicao: number | null = null;
  bSalvando   = false;

  // =====================================================
  // Listagens
  // =====================================================
  lGrupos: Grupo[] = [];
  lMembrosTodos: Membro[] = [];
  bCarregando = false;

  // =====================================================
  // Grupo selecionado para ver detalhes
  // =====================================================
  oGrupoSelecionado: Grupo | null = null;
  lMembrosDoGrupo: Membro[] = [];
  lMembrosPagina: Membro[] = [];
  nTotalMembros = 0;
  nTamanhoPagina = 5;
  nPaginaAtual = 0;

  // Adicionar membro ao grupo
  nMembroParaAdicionar: number | null = null;

  // Membros candidatos a serem ADICIONADOS ao grupo selecionado.
  // Exclui quem já está no grupo (qualquer função/situação é aceita aqui).
  get lMembrosDisponiveis(): Membro[] {
    if (!this.oGrupoSelecionado) return this.lMembrosTodos;
    const oSet = new Set(this.lMembrosDoGrupo.map(o => o.nId));
    return this.lMembrosTodos.filter(o => !oSet.has(o.nId));
  }

  /**
   * Membros elegíveis a serem LÍDER de grupo.
   * Regra: Visitantes e Desigrejados não podem liderar.
   */
  get lMembrosElegiveisLider(): Membro[] {
    return this.lMembrosTodos.filter(o =>
      o.sFuncao !== 'Visitante' && !o.bDesigrejado
    );
  }

  constructor(
    private oFb: FormBuilder,
    private oGrupoService: GrupoService,
    private oMembroService: MembroService,
    private oSnackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.fGrupo = this.oFb.group({
      sNome:      ['', [Validators.required, Validators.maxLength(120)]],
      sDescricao: ['', Validators.maxLength(500)],
      nLiderId:   [null, Validators.required]
    });
    this.carregar();
  }

  // =====================================================
  // Carga inicial
  // =====================================================
  carregar(): void {
    this.bCarregando = true;
    this.oGrupoService.listarTodos().subscribe({
      next: l => { this.lGrupos = l; this.bCarregando = false; },
      error: () => {
        this.mostrar('Erro ao carregar grupos.', 'erro');
        this.bCarregando = false;
      }
    });
    this.oMembroService.listarTodos().subscribe({
      next: l => this.lMembrosTodos = l,
      error: () => this.mostrar('Erro ao carregar membros.', 'erro')
    });
  }

  // =====================================================
  // Formulário — Criar / Atualizar
  // =====================================================
  onSubmit(): void {
    if (this.fGrupo.invalid || this.bSalvando) return;
    this.bSalvando = true;

    const oPayload: Partial<Grupo> = {
      sNome:      this.fGrupo.value.sNome,
      sDescricao: this.fGrupo.value.sDescricao || '',
      nLiderId:   this.fGrupo.value.nLiderId
    };

    const oReq = this.bModoEdicao && this.nIdEdicao !== null
      ? this.oGrupoService.atualizar(this.nIdEdicao, oPayload)
      : this.oGrupoService.criar(oPayload);

    oReq.subscribe({
      next: () => {
        this.mostrar(this.bModoEdicao ? 'Grupo atualizado!' : 'Grupo cadastrado!', 'sucesso');
        this.resetar();
        this.carregar();
      },
      error: (oErro: { error: string }) => {
        this.mostrar(oErro.error || 'Erro ao salvar grupo.', 'erro');
        this.bSalvando = false;
      }
    });
  }

  editarGrupo(oGrupo: Grupo): void {
    this.bModoEdicao = true;
    this.nIdEdicao   = oGrupo.nId ?? null;
    this.fGrupo.patchValue({
      sNome:      oGrupo.sNome,
      sDescricao: oGrupo.sDescricao ?? '',
      nLiderId:   oGrupo.nLiderId
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  excluirGrupo(nId: number | undefined): void {
    if (!nId || !confirm('Excluir este grupo? Os membros serão desvinculados.')) return;
    this.oGrupoService.excluir(nId).subscribe({
      next: () => {
        this.mostrar('Grupo excluído.', 'sucesso');
        if (this.oGrupoSelecionado?.nId === nId) this.oGrupoSelecionado = null;
        this.carregar();
      },
      error: () => this.mostrar('Erro ao excluir grupo.', 'erro')
    });
  }

  cancelar(): void { this.resetar(); }

  private resetar(): void {
    this.fGrupo.reset({ sNome: '', sDescricao: '', nLiderId: null });
    this.bModoEdicao = false;
    this.nIdEdicao   = null;
    this.bSalvando   = false;
  }

  // =====================================================
  // Detalhes do grupo (membros vinculados, paginação)
  // =====================================================
  selecionarGrupo(nId: number | undefined): void {
    if (!nId) return;
    if (this.oGrupoSelecionado?.nId === nId) {
      this.oGrupoSelecionado = null;
      this.lMembrosDoGrupo   = [];
      return;
    }
    this.oGrupoService.buscarPorId(nId).subscribe({
      next: oGrupo => {
        this.oGrupoSelecionado = oGrupo;
        this.lMembrosDoGrupo   = oGrupo.lMembros ?? [];
        this.nTotalMembros     = this.lMembrosDoGrupo.length;
        this.nPaginaAtual      = 0;
        this.atualizarPaginaMembros();
      },
      error: () => this.mostrar('Erro ao carregar detalhes do grupo.', 'erro')
    });
  }

  onPaginaMembrosChange(oEvento: PageEvent): void {
    this.nPaginaAtual   = oEvento.pageIndex;
    this.nTamanhoPagina = oEvento.pageSize;
    this.atualizarPaginaMembros();
  }

  private atualizarPaginaMembros(): void {
    const nInicio = this.nPaginaAtual * this.nTamanhoPagina;
    this.lMembrosPagina = this.lMembrosDoGrupo.slice(nInicio, nInicio + this.nTamanhoPagina);
  }

  // =====================================================
  // Adicionar / remover membros do grupo selecionado
  // =====================================================
  adicionarMembroAoGrupo(): void {
    if (!this.oGrupoSelecionado || this.nMembroParaAdicionar == null) return;
    const nGrupoId = this.oGrupoSelecionado.nId!;
    const nMembroId = this.nMembroParaAdicionar;
    this.oGrupoService.adicionarMembro(nGrupoId, nMembroId).subscribe({
      next: () => {
        this.mostrar('Membro adicionado ao grupo.', 'sucesso');
        this.nMembroParaAdicionar = null;
        this.recarregarGrupoSelecionado();
      },
      error: (e: { error: string }) =>
        this.mostrar(e.error || 'Erro ao adicionar membro.', 'erro')
    });
  }

  removerMembroDoGrupo(nMembroId: number | undefined): void {
    if (!this.oGrupoSelecionado || !nMembroId) return;
    if (!confirm('Remover este membro do grupo?')) return;
    this.oGrupoService.removerMembro(this.oGrupoSelecionado.nId!, nMembroId).subscribe({
      next: () => {
        this.mostrar('Membro removido.', 'sucesso');
        this.recarregarGrupoSelecionado();
      },
      error: () => this.mostrar('Erro ao remover membro.', 'erro')
    });
  }

  private recarregarGrupoSelecionado(): void {
    if (!this.oGrupoSelecionado) return;
    const nId = this.oGrupoSelecionado.nId!;
    this.oGrupoService.buscarPorId(nId).subscribe({
      next: o => {
        this.oGrupoSelecionado = o;
        this.lMembrosDoGrupo   = o.lMembros ?? [];
        this.nTotalMembros     = this.lMembrosDoGrupo.length;
        if (this.nPaginaAtual * this.nTamanhoPagina >= this.nTotalMembros && this.nPaginaAtual > 0) {
          this.nPaginaAtual--;
        }
        this.atualizarPaginaMembros();
      }
    });
    // Atualiza a lista de grupos (contagem pode ter mudado)
    this.oGrupoService.listarTodos().subscribe(l => this.lGrupos = l);
  }

  // =====================================================
  // Utilitários
  // =====================================================
  formatarTelefone(s?: string): string {
    if (!s) return '—';
    const d = s.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return s;
  }

  gerarLinkContato(s?: string, b?: boolean): string {
    return gerarLinkContato(s, b ?? false);
  }

  private mostrar(s: string, t: 'sucesso' | 'erro' | 'aviso'): void {
    const mC: Record<string,string> = {
      sucesso: 'snack-sucesso', erro: 'snack-erro', aviso: 'snack-aviso'
    };
    this.oSnackBar.open(s, 'Fechar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: [mC[t]]
    });
  }
}
