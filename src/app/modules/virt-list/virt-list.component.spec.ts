import { CommonModule } from '@angular/common';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { VirtListComponent } from './virt-list.component';

describe('VirtListComponent', () => {
  let component: VirtListComponent;
  let fixture: ComponentFixture<VirtListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule], declarations: [VirtListComponent],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VirtListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
