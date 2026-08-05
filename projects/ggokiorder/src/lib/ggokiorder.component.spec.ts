import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GgokiorderComponent } from './ggokiorder.component';

describe('GgokiorderComponent', () => {
  let component: GgokiorderComponent;
  let fixture: ComponentFixture<GgokiorderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GgokiorderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GgokiorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
