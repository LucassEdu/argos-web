import { Component, inject } from '@angular/core';

import { Avisos } from '../../../core/avisos';

// Mostra os avisos rápidos. Fica uma vez só, no painel.
@Component({
  selector: 'app-avisos',
  templateUrl: './avisos.html',
  styleUrl: './avisos.scss',
})
export class AvisosTela {
  protected readonly avisos = inject(Avisos);
}