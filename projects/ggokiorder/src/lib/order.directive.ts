import { Directive, ElementRef, EventEmitter, HostListener, inject, OnDestroy, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderEvent, BASE_TRANSITION_TIME } from './ggokiorder.models';

const BASE_STYLE: string = 'position: absolute; left: 0px;';
const TRANSITION: string = `top ease-in-out ${BASE_TRANSITION_TIME}ms, left ease-in-out ${BASE_TRANSITION_TIME}ms`;

@Directive({
  selector: '[orderDirective]'
})
export class OrderDirective implements OnDestroy {
  @Output() startMousedown: EventEmitter<OrderEvent> = new EventEmitter<OrderEvent>();
  @Output() needResize: EventEmitter<void> = new EventEmitter<void>();
  public eventSubs: Subscription[] = [];
  public prevHeight: number = 0;
  public element: ElementRef = inject(ElementRef);
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    this.addEvent();
  }

  ngOnDestroy(): void {
    this.removeEvent();
  }

  /**
   * mousedown 했을때 this 와 mouseEvent emit
   * @param {MouseEvent} $event
   */
  @HostListener('mousedown', ['$event'])
  mousedownEvent($event: MouseEvent): void {
    $event.preventDefault();
    $event.stopPropagation();

    this.startMousedown.emit({ orderItem: this, mouseEvent: $event });
  }

  /**
   * 이벤트 추가
   * @return {void}
   */
  addEvent(): void {
    // 리사이즈 이벤트
    this.resizeObserver = new ResizeObserver(entries => {
      try {
        entries.forEach(entry => {
          const height: number = entry.contentRect.height;
          if (this.prevHeight !== height) {
            this.prevHeight = height;
            this.needResize.emit();
          }
        });
      } catch (e) {
        console.error(e);
        throw e;
      }
    });
    this.resizeObserver.observe(this.element.nativeElement);
  }

  /**
   * 이벤트 제거
   * @return {void}
   */
  removeEvent(): void {
    // 마우스 이벤트
    this.element.nativeElement.removeEventListener('mousedown', this.mousedownEvent);

    // 리사이즈 이벤트
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    // 구독중인 에미터
    this.eventSubs.forEach(eventSub => {
      eventSub.unsubscribe();
    });
    this.eventSubs = [];
  }

  /**
   * 기본 스타일 적용하고 요소 height 리턴
   * @param {number} top
   * @param {number} left
   * @param {number} zIndex
   * @return {number}
   */
  setBaseStyle(top: number, left: number = 0, zIndex: number = 1): number {
    this.setTransition(true);
    const element: HTMLElement = this.element.nativeElement;
    element.style.cssText = BASE_STYLE;

    return this.setPosition(top, left, zIndex);
  }

  /**
   * 요소 top, left 적용하고 height 리턴
   * @param {number} top
   * @param {number} left
   * @param {number} zIndex
   * @return {number}
   */
  setPosition(top: number, left: number = 0, zIndex: number = 1): number {
    const element: HTMLElement = this.element.nativeElement;
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.zIndex = `${zIndex}`;

    return element.offsetHeight;
  }

  /**
   * transition 스타일 적용 토글
   * @param {boolean} isToggle
   * @return {void}
   */
  setTransition(isToggle: boolean): void {
    if (isToggle) this.element.nativeElement.style.transition = TRANSITION;
    else {
      setTimeout(() => {
        this.element.nativeElement.style.transition = '';
      }, BASE_TRANSITION_TIME);
    }
  }
}
