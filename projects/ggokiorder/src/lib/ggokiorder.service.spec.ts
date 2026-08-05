import { TestBed } from '@angular/core/testing';

import { GgokiorderService } from './ggokiorder.service';

describe('GgokiorderService', () => {
  let service: GgokiorderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GgokiorderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
