import { ElementRef, EventEmitter, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderEvent } from './ggokiorder.models';
import * as i0 from "@angular/core";
export declare class OrderDirective implements OnDestroy {
    startMousedown: EventEmitter<OrderEvent>;
    needResize: EventEmitter<void>;
    eventSubs: Subscription[];
    prevHeight: number;
    element: ElementRef;
    private resizeObserver;
    private readonly isBrowser;
    constructor();
    ngOnDestroy(): void;
    /**
     * mousedown 했을때 this 와 mouseEvent emit
     * @param {MouseEvent} $event
     */
    mousedownEvent($event: MouseEvent): void;
    /**
     * 이벤트 추가
     * @return {void}
     */
    addEvent(): void;
    /**
     * 이벤트 제거
     * @return {void}
     */
    removeEvent(): void;
    /**
     * 기본 스타일 적용하고 요소 height 리턴
     * @param {number} top
     * @param {number} left
     * @param {number} zIndex
     * @return {number}
     */
    setBaseStyle(top: number, left?: number, zIndex?: number): number;
    /**
     * 요소 top, left 적용하고 height 리턴
     * @param {number} top
     * @param {number} left
     * @param {number} zIndex
     * @return {number}
     */
    setPosition(top: number, left?: number, zIndex?: number): number;
    /**
     * transition 스타일 적용 토글
     * @param {boolean} isToggle
     * @return {void}
     */
    setTransition(isToggle: boolean): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<OrderDirective, never>;
    static ɵdir: i0.ɵɵDirectiveDeclaration<OrderDirective, "[orderDirective]", never, {}, { "startMousedown": "startMousedown"; "needResize": "needResize"; }, never, never, true, never>;
}
