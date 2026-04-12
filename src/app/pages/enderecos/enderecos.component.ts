import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { Endereco } from '../../models/endereco.model';
import { EnderecoProximo } from '../../models/endereco-proximo.model';
import { EnderecoService } from '../../services/endereco.service';

@Component({
  selector: 'app-enderecos',
  templateUrl: './enderecos.component.html',
  styleUrls: ['./enderecos.component.scss']
})
export class EnderecosComponent implements OnInit {

  // =========================================================
  // Formulário
  // =========================================================
  fEndereco!: FormGroup;
  bModoEdicao  = false;
  nIdEdicao: number | null = null;
  bBuscandoCep = false;
  bSalvando    = false;

  // =========================================================
  // Lista de endereços (cards)
  // =========================================================
  lEnderecos: Endereco[]         = [];
  lEnderecosFiltrados: Endereco[] = [];
  sBuscaTexto = '';
  bCarregando = false;

  private oBuscaSubject = new Subject<string>();

  // =========================================================
  // Busca por proximidade
  // =========================================================
  sCepProximidade      = '';
  /** Todos os resultados retornados pela API (sem filtro) */
  lTodosProximos: EnderecoProximo[]      = [];
  /** Subconjunto exibido após aplicar o filtro de raio */
  lEnderecosProximos: EnderecoProximo[]  = [];
  bBuscandoProximos    = false;
  bProximosCarregados  = false;
  /** Raio ativo: 0 = Todos, 5 = 5 km, 10 = 10 km */
  nRaioFiltroKm        = 0;

  /** Getter usado no template para verificar se o CEP de proximidade é válido */
  get bCepProximidadeInvalido(): boolean {
    return this.sCepProximidade.replace(/\D/g, '').length < 8;
  }
  lColunasProximos     = ['nPosicao', 'sCep', 'sLogradouro', 'sCidade', 'sEstado', 'dDistanciaKm'];

  constructor(
    private oFb: FormBuilder,
    private oEnderecoService: EnderecoService,
    private oSnackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.carregarEnderecos();

    this.oBuscaSubject.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe(sTexto => this.aplicarFiltro(sTexto));
  }

  // =========================================================
  // Formulário
  // =========================================================

  private inicializarFormulario(): void {
    this.fEndereco = this.oFb.group({
      sCep:         ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
      sNumero:      [''],
      sComplemento: [''],
      sLogradouro:  [''],
      sBairro:      [''],
      sCidade:      [''],
      sEstado:      ['']
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
    const oPayload: Partial<Endereco> = this.fEndereco.value;

    if (this.bModoEdicao && this.nIdEdicao !== null) {
      this.oEnderecoService.atualizar(this.nIdEdicao, oPayload).subscribe({
        next: () => {
          this.mostrarMensagem('Endereço atualizado com sucesso!', 'sucesso');
          this.resetarFormulario();
          this.carregarEnderecos();
        },
        error: (oErro: { error: string }) => {
          this.mostrarMensagem(oErro.error || 'Erro ao atualizar endereço.', 'erro');
          this.bSalvando = false;
        }
      });
    } else {
      this.oEnderecoService.criar(oPayload).subscribe({
        next: () => {
          this.mostrarMensagem('Endereço cadastrado com sucesso!', 'sucesso');
          this.resetarFormulario();
          this.carregarEnderecos();
        },
        error: (oErro: { error: string }) => {
          this.mostrarMensagem(oErro.error || 'Erro ao cadastrar endereço.', 'erro');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  excluirEndereco(nId: number | undefined): void {
    if (!nId || !confirm('Deseja realmente excluir este endereço?')) return;

    this.oEnderecoService.excluir(nId).subscribe({
      next: () => {
        this.mostrarMensagem('Endereço excluído com sucesso!', 'sucesso');
        this.carregarEnderecos();
        if (this.nIdEdicao === nId) this.resetarFormulario();
      },
      error: () => this.mostrarMensagem('Erro ao excluir endereço.', 'erro')
    });
  }

  cancelarEdicao(): void { this.resetarFormulario(); }

  private resetarFormulario(): void {
    this.fEndereco.reset();
    this.bModoEdicao = false;
    this.nIdEdicao   = null;
    this.bSalvando   = false;
  }

  // =========================================================
  // Lista de endereços (cards)
  // =========================================================

  carregarEnderecos(): void {
    this.bCarregando = true;
    this.oEnderecoService.listarTodos().subscribe({
      next: (lEnderecos: Endereco[]) => {
        this.lEnderecos         = lEnderecos;
        this.aplicarFiltro(this.sBuscaTexto);
        this.bCarregando        = false;
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

  aplicarFiltro(sTexto: string): void {
    if (!sTexto.trim()) {
      this.lEnderecosFiltrados = [...this.lEnderecos];
      return;
    }
    const sFiltro = sTexto.trim().toLowerCase();
    this.lEnderecosFiltrados = this.lEnderecos.filter(oE =>
      [oE.sCep, oE.sLogradouro, oE.sBairro, oE.sCidade, oE.sEstado]
        .some(sValor => sValor?.toLowerCase().includes(sFiltro))
    );
  }

  // =========================================================
  // Busca por proximidade
  // =========================================================

  onCepProximidadeInput(oEvent: Event): void {
    const oInput = oEvent.target as HTMLInputElement;
    let sValor   = oInput.value.replace(/\D/g, '');
    if (sValor.length > 5) {
      sValor = sValor.substring(0, 5) + '-' + sValor.substring(5, 8);
    }
    this.sCepProximidade = sValor;
  }

  /**
   * Altera o raio e filtra localmente — sem nova chamada à API.
   * O filtro só funciona após a primeira busca carregar os dados.
   */
  selecionarRaio(nRaio: number): void {
    this.nRaioFiltroKm = nRaio;
    if (this.bProximosCarregados) {
      this.aplicarFiltroProximos();
    }
  }

  /** Busca TODOS os endereços próximos (sem raio) e armazena localmente. */
  buscarProximos(): void {
    const sCepLimpo = this.sCepProximidade.replace(/\D/g, '');
    if (sCepLimpo.length !== 8) {
      this.mostrarMensagem('Digite um CEP válido para buscar os endereços próximos.', 'aviso');
      return;
    }

    this.bBuscandoProximos   = true;
    this.bProximosCarregados = false;
    this.lTodosProximos      = [];
    this.lEnderecosProximos  = [];

    // Sempre busca todos — o filtro de raio é aplicado localmente
    this.oEnderecoService.buscarProximos(this.sCepProximidade).subscribe({
      next: (lProximos: EnderecoProximo[]) => {
        this.lTodosProximos      = lProximos;
        this.bBuscandoProximos   = false;
        this.bProximosCarregados = true;
        this.aplicarFiltroProximos();

        if (lProximos.length === 0) {
          this.mostrarMensagem('Nenhum endereço com coordenadas cadastrado.', 'aviso');
        }
      },
      error: (oErro: { error: string }) => {
        this.mostrarMensagem(oErro.error || 'Erro ao buscar endereços próximos.', 'erro');
        this.bBuscandoProximos = false;
      }
    });
  }

  /** Filtra lTodosProximos pelo raio selecionado e atualiza lEnderecosProximos. */
  private aplicarFiltroProximos(): void {
    if (this.nRaioFiltroKm === 0) {
      this.lEnderecosProximos = [...this.lTodosProximos];
    } else {
      this.lEnderecosProximos = this.lTodosProximos.filter(
        oE => oE.dDistanciaKm <= this.nRaioFiltroKm
      );
    }

    if (this.bProximosCarregados && this.nRaioFiltroKm > 0 && this.lEnderecosProximos.length === 0) {
      this.mostrarMensagem(`Nenhum endereço encontrado em até ${this.nRaioFiltroKm} km.`, 'aviso');
    }
  }

  // =========================================================
  // Utilitários
  // =========================================================

  formatarEndereco(oEndereco: Endereco): string {
    return [oEndereco.sLogradouro, oEndereco.sNumero, oEndereco.sComplemento, oEndereco.sBairro]
      .filter(Boolean).join(', ') || '—';
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
