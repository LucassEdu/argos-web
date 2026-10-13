import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbaContas } from './aba-contas';

describe('AbaContas', () => {
  let component: AbaContas;
  let fixture: ComponentFixture<AbaContas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbaContas],
    }).compileComponents();

    fixture = TestBed.createComponent(AbaContas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
