import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { VirtListModule } from './modules/virt-list/virt-list.module';
import { AppComponent } from './app.component';


@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, VirtListModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
