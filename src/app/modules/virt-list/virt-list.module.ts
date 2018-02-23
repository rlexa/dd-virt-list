import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtListComponent } from './virt-list.component';

@NgModule({
  imports: [CommonModule],
  declarations: [VirtListComponent],
  exports: [VirtListComponent]
})
export class VirtListModule { }
