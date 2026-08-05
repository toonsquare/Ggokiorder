import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GgokiorderComponent } from './ggokiorder.component';

describe('GgokiorderComponent', () => {
  let component: GgokiorderComponent;
  let fixture: ComponentFixture<GgokiorderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GgokiorderComponent ]
    }).compileComponents();

    fixture = TestBed.createComponent(GgokiorderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
