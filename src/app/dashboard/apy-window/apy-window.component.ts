import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Vault} from '../../models/vault';
import {Pool} from '../../models/pool';
import {CustomModalComponent} from '../../dialogs/custom-modal/custom-modal.component';

@Component({
  selector: 'app-apy-window',
  templateUrl: './apy-window.component.html',
  styleUrls: ['./apy-window.component.scss']
})
export class ApyWindowComponent implements OnInit {
  @Output() showModal = new EventEmitter<boolean>();
  @Input() vault: Vault;
  @Input() pool: Pool;
  @ViewChild('incomeModal') private incomeModal: CustomModalComponent;
  @ViewChild('psApyModal') private psApyModal: CustomModalComponent;

  constructor() {
  }

  ngOnInit(): void {
  }

  closeModal(): void {
    this.showModal.emit(false);
  }


  // ------------------- DIALOGS --------------------

  openIncomeDialog(): void {
    if (this.vault.contract.name === 'PS') {
      this.openPsApyDialog();
      return;
    }
    this.incomeModal.open();
  }

  private openPsApyDialog(): void {
    if (this.vault.contract.name !== 'PS') {
      return;
    }
    this.psApyModal.open();
  }
}
