import { Directive, ElementRef, EventEmitter, HostListener, inject, OnDestroy, Output, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { OrderEvent, BASE_TRANSITION_TIME } from './ggokiorder.models';

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
  private resizeFrame: number | undefined;
  private readonly isBrowser: boolean = isPlatformBrowser(inject(PLATFORM_ID));

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
    // SSR 등 브라우저가 아닌 환경에는 ResizeObserver 가 없다
    if (!this.isBrowser) return;

    // 리사이즈 이벤트
    this.resizeObserver = new ResizeObserver(entries => {
      try {
        entries.forEach(entry => {
          const height: number = entry.contentRect.height;
          if (this.prevHeight === height) return;

          this.prevHeight = height;
          this.emitNeedResize();
        });
      } catch (e) {
        console.error(e);
        throw e;
      }
    });
    this.resizeObserver.observe(this.element.nativeElement);
  }

  /**
   * 리사이즈 알림 emit.
   * ResizeObserver 콜백 안에서 동기로 레이아웃을 바꾸면 브라우저가
   * 'ResizeObserver loop completed with undelivered notifications' 를 띄우므로 다음 프레임으로 미룬다.
   * @return {void}
   */
  emitNeedResize(): void {
    if (this.resizeFrame !== undefined) return;

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      this.needResize.emit();
    });
  }

  /**
   * 이벤트 제거
   * @return {void}
   */
  removeEvent(): void {
    // 리사이즈 이벤트 (mousedown 은 @HostListener 라 Angular 가 알아서 해제한다)
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    if (this.resizeFrame !== undefined) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = undefined;
    }

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

    // cssText 를 덮어쓰면 소비자가 요소에 건 인라인 스타일까지 지워지므로 필요한 속성만 지정한다.
    // opacity 는 이동 중 적용된 값이 남지 않도록 여기서 초기화한다.
    element.style.position = 'absolute';
    element.style.opacity = '';

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
