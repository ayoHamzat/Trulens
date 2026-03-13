import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulationsPageComponent } from './simulations-page.component';

describe('SimulationsPageComponent', () => {
  let component: SimulationsPageComponent;
  let fixture: ComponentFixture<SimulationsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulationsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulationsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
