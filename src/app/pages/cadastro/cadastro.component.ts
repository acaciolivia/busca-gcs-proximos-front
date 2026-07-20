import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { Endereco } from '../../models/endereco.model';
import { EnderecoService } from '../../services/endereco.service';
import { Membro, FUNCOES_IGREJA } from '../../models/membro.model';
import { MembroService } from '../../services/membro.service';
import { Grupo } from '../../models/grupo.model';
import { GrupoService } from '../../services/grupo.service';
import { normalizarTexto, gerarLinkContato } from '../../shared/texto.util';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit {

  // =========================================================
  // Formulário unificado (Endereço + Membro)
  // =========================================================
  fEndereco!: FormGroup;
  bModoEdicao  = false;
  nIdEdicao: number | null = null;
  nIdMembroEdicao: number | null = null;
  bBuscandoCep = false;
  bSalvando    = false;
  readonly lFuncoes = FUNCOES_IGREJA;

  /** Grupos disponíveis para vincular ao membro. */
  lGrupos: Grupo[] = [];

  // =========================================================
  // Lista de endereços (cards)
  // =========================================================
  lEnderecos: Endereco[]          = [];
  lEnderecosFiltrados: Endereco[] = [];
  sBuscaTexto = '';
  bCarregando = false;

  private oBuscaSubject = new Subject<string>();

  constructor(
    private oFb: FormBuilder,
    private oEnderecoService: EnderecoService,
    private oMembroService: MembroService,
    private oGrupoService: GrupoService,
    private oSnackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.carregarEnderecos();
    this.carregarGrupos();

    this.oBuscaSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(sTexto => this.aplicarFiltro(sTexto));
  }

  carregarGrupos(): void {
    this.oGrupoService.listarTodos().subscribe({
      next: l => this.lGrupos = l,
      error: () => { /* silencioso — sem grupos cadastrados é OK */ }
    });
  }

  // =========================================================
  // Formulário
  // =========================================================

  private inicializarFormulario(): void {
    this.fEndereco = this.oFb.group({
      sCep:            ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
      sNumero:         [''],
      sComplemento:    [''],
      sLogradouro:     [''],
      sBairro:         [''],
      sCidade:         [''],
      sEstado:         [''],
      sNomeMembro:     ['', [Validators.required, Validators.maxLength(150)]],
      sTelefoneMembro: ['', Validators.maxLength(20)],
      sFuncaoMembro:   ['Membro', Validators.required],
      bWhatsapp:       [false],
      bAceitaContato:  [false],
      bDesigrejado:    [false],
      nGrupoId:        [null]
    });
  }

  onCepInput(oEvent: Event): void {
    const oInput = oEvent.target as HTMLInputElement;
    let sValor   = oInput.value.replace(/\D/g, '');
    if (sValor.length > 5) {
      sValor = sValor.substring(0, 5) + '-' + sValor.substring(5, 8);
    }
    this.fEndereco.get('sCep')?.setValue(sValor, { emitEvent: false });
    if (sValor.replace(/\D/g, '').length === 8) {
      this.buscarEnderecoPorCep(sValor);
    }
  }

  onCepBlur(): void {
    const sCep = this.fEndereco.get('sCep')?.value as string;
    if (sCep && sCep.replace(/\D/g, '').length === 8 && !this.bBuscandoCep) {
      this.buscarEnderecoPorCep(sCep);
    }
  }

  buscarEnderecoPorCep(sCep: string): void {
    this.bBuscandoCep = true;
    this.fEndereco.patchValue({ sLogradouro: '', sBairro: '', sCidade: '', sEstado: '' });

    this.oEnderecoService.consultarCep(sCep).subscribe({
      next: (oEndereco: Endereco) => {
        this.fEndereco.patchValue({
          sLogradouro: oEndereco.sLogradouro ?? '',
          sBairro:     oEndereco.sBairro     ?? '',
          sCidade:     oEndereco.sCidade     ?? '',
          sEstado:     oEndereco.sEstado     ?? ''
        });
        this.bBuscandoCep = false;
      },
      error: () => {
        this.mostrarMensagem('CEP não encontrado. Preencha o endereço manualmente.', 'aviso');
        this.bBuscandoCep = false;
      }
    });
  }

  onSubmit(): void {
    if (this.fEndereco.invalid || this.bSalvando) return;

    this.bSalvando = true;
    const oValores = this.fEndereco.value;

    const oPayloadEndereco: Partial<Endereco> = {
      sCep:         oValores.sCep,
      sNumero:      oValores.sNumero,
      sComplemento: oValores.sComplemento,
      sLogradouro:  oValores.sLogradouro,
      sBairro:      oValores.sBairro,
      sCidade:      oValores.sCidade,
      sEstado:      oValores.sEstado
    };

    const oPayloadMembro: Partial<Membro> = {
      sNome:           oValores.sNomeMembro,
      sTelefone:       oValores.sTelefoneMembro,
      sFuncao:         oValores.sFuncaoMembro || 'Membro',
      bWhatsapp:       !!oValores.bWhatsapp,
      bAceitaContato:  !!oValores.bAceitaContato,
      bDesigrejado:    !!oValores.bDesigrejado,
      nGrupoId:        oValores.nGrupoId || undefined
    };

    if (this.bModoEdicao && this.nIdEdicao !== null) {
      this.oEnderecoService.atualizar(this.nIdEdicao, oPayloadEndereco).pipe(
        switchMap((oEndSalvo: Endereco) => {
          const oMembroPay = { ...oPayloadMembro, nEnderecoId: oEndSalvo.nId };
          if (this.nIdMembroEdicao !== null) {
            return this.oMembroService.atualizar(this.nIdMembroEdicao, oMembroPay);
          } else {
            return this.oMembroService.criar(oMembroPay);
          }
        })
      ).subscribe({
        next: () => {
          this.mostrarMensagem('Endereço e membro atualizados com sucesso!', 'sucesso');
          this.resetarFormulario();
          this.carregarEnderecos();
        },
        error: (oErro: { error: string }) => {
          this.mostrarMensagem(oErro.error || 'Erro ao atualizar.', 'erro');
          this.bSalvando = false;
        }
      });
    } else {
      this.oEnderecoService.criar(oPayloadEndereco).pipe(
        switchMap((oEndCriado: Endereco) => {
          const oMembroPay = { ...oPayloadMembro, nEnderecoId: oEndCriado.nId };
          return this.oMembroService.criar(oMembroPay);
        })
      ).subscribe({
        next: () => {
          this.mostrarMensagem('Endereço e membro cadastrados com sucesso!', 'sucesso');
          this.resetarFormulario();
          this.carregarEnderecos();
        },
        error: (oErro: { error: string }) => {
          this.mostrarMensagem(oErro.error || 'Erro ao cadastrar.', 'erro');
          this.bSalvando = false;
        }
      });
    }
  }

  editarEndereco(oEndereco: Endereco): void {
    this.bModoEdicao = true;
    this.nIdEdicao   = oEndereco.nId ?? null;

    this.fEndereco.patchValue({
      sCep:         oEndereco.sCep         ?? '',
      sNumero:      oEndereco.sNumero      ?? '',
      sComplemento: oEndereco.sComplemento ?? '',
      sLogradouro:  oEndereco.sLogradouro  ?? '',
      sBairro:      oEndereco.sBairro      ?? '',
      sCidade:      oEndereco.sCidade      ?? '',
      sEstado:      oEndereco.sEstado      ?? ''
    });

    const oMembro = oEndereco.lMembros?.[0];
    if (oMembro) {
      this.nIdMembroEdicao = oMembro.nId ?? null;
      this.fEndereco.patchValue({
        sNomeMembro:     oMembro.sNome     ?? '',
        sTelefoneMembro: oMembro.sTelefone ?? '',
        sFuncaoMembro:   oMembro.sFuncao   ?? 'Membro',
        bWhatsapp:       !!oMembro.bWhatsapp,
        bAceitaContato:  !!oMembro.bAceitaContato,
        bDesigrejado:    !!oMembro.bDesigrejado,
        nGrupoId:        oMembro.nGrupoId ?? null
      });
    } else {
      this.nIdMembroEdicao = null;
      this.fEndereco.patchValue({
        sNomeMembro: '', sTelefoneMembro: '', sFuncaoMembro: 'Membro',
        bWhatsapp: false, bAceitaContato: false, bDesigrejado: false,
        nGrupoId: null
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  excluirEndereco(nId: number | undefined): void {
    if (!nId || !confirm('Deseja realmente excluir este endereço? Os membros vinculados também serão removidos.')) return;

    this.oEnderecoService.excluir(nId).subscribe({
      next: () => {
        this.mostrarMensagem('Endereço excluído com sucesso!', 'sucesso');
        this.carregarEnderecos();
        if (this.nIdEdicao === nId) this.resetarFormulario();
      },
      error: (oErro: { error: string }) =>
        this.mostrarMensagem(oErro.error || 'Erro ao excluir endereço.', 'erro')
    });
  }

  cancelarEdicao(): void { this.resetarFormulario(); }

  private resetarFormulario(): void {
    this.fEndereco.reset({
      sFuncaoMembro: 'Membro',
      bWhatsapp: false,
      bAceitaContato: false,
      bDesigrejado: false,
      nGrupoId: null
    });
    this.bModoEdicao     = false;
    this.nIdEdicao       = null;
    this.nIdMembroEdicao = null;
    this.bSalvando       = false;
  }

  // =========================================================
  // Lista de endereços
  // =========================================================

  carregarEnderecos(): void {
    this.bCarregando = true;
    this.oEnderecoService.listarTodos().subscribe({
      next: (lEnderecos: Endereco[]) => {
        this.lEnderecos = lEnderecos;
        this.aplicarFiltro(this.sBuscaTexto);
        this.bCarregando = false;
      },
      error: () => {
        this.mostrarMensagem('Erro ao carregar endereços.', 'erro');
        this.bCarregando = false;
      }
    });
  }

  onFiltroInput(oEvent: Event): void {
    this.sBuscaTexto = (oEvent.target as HTMLInputElement).value;
    this.oBuscaSubject.next(this.sBuscaTexto);
  }

  limparFiltro(): void {
    this.sBuscaTexto = '';
    this.aplicarFiltro('');
  }

  aplicarFiltro(sTexto: string): void {
    const sTermo = normalizarTexto(sTexto);
    if (!sTermo) {
      this.lEnderecosFiltrados = [...this.lEnderecos];
      return;
    }
    // Filtra ignorando acentos e maiúsculas/minúsculas.
    this.lEnderecosFiltrados = this.lEnderecos.filter(oE => {
      const lCampos = [oE.sCep, oE.sLogradouro, oE.sBairro, oE.sCidade, oE.sEstado]
        .map(s => normalizarTexto(s));
      if (lCampos.some(s => s.includes(sTermo))) return true;
      return oE.lMembros?.some(oM => normalizarTexto(oM.sNome).includes(sTermo)) ?? false;
    });
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
