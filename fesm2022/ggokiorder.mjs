import * as i0 from '@angular/core';
import { EventEmitter, inject, ElementRef, PLATFORM_ID, HostListener, Output, Directive, ChangeDetectorRef, afterNextRender, Input, ViewChild, ContentChildren, Component } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';

const BASE_TRANSITION_TIME = 200;

const TRANSITION = `top ease-in-out ${BASE_TRANSITION_TIME}ms, left ease-in-out ${BASE_TRANSITION_TIME}ms`;
class OrderDirective {
    startMousedown = new EventEmitter();
    needResize = new EventEmitter();
    eventSubs = [];
    prevHeight = 0;
    element = inject(ElementRef);
    resizeObserver;
    resizeFrame;
    isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    constructor() {
        this.addEvent();
    }
    ngOnDestroy() {
        this.removeEvent();
    }
    /**
     * mousedown 했을때 this 와 mouseEvent emit
     * @param {MouseEvent} $event
     */
    mousedownEvent($event) {
        $event.preventDefault();
        $event.stopPropagation();
        this.startMousedown.emit({ orderItem: this, mouseEvent: $event });
    }
    /**
     * 이벤트 추가
     * @return {void}
     */
    addEvent() {
        // SSR 등 브라우저가 아닌 환경에는 ResizeObserver 가 없다
        if (!this.isBrowser)
            return;
        // 리사이즈 이벤트
        this.resizeObserver = new ResizeObserver(entries => {
            try {
                entries.forEach(entry => {
                    const height = entry.contentRect.height;
                    if (this.prevHeight === height)
                        return;
                    this.prevHeight = height;
                    this.emitNeedResize();
                });
            }
            catch (e) {
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
    emitNeedResize() {
        if (this.resizeFrame !== undefined)
            return;
        this.resizeFrame = requestAnimationFrame(() => {
            this.resizeFrame = undefined;
            this.needResize.emit();
        });
    }
    /**
     * 이벤트 제거
     * @return {void}
     */
    removeEvent() {
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
    setBaseStyle(top, left = 0, zIndex = 1) {
        this.setTransition(true);
        const element = this.element.nativeElement;
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
    setPosition(top, left = 0, zIndex = 1) {
        const element = this.element.nativeElement;
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
    setTransition(isToggle) {
        if (isToggle)
            this.element.nativeElement.style.transition = TRANSITION;
        else {
            setTimeout(() => {
                this.element.nativeElement.style.transition = '';
            }, BASE_TRANSITION_TIME);
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: OrderDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "19.2.25", type: OrderDirective, isStandalone: true, selector: "[orderDirective]", outputs: { startMousedown: "startMousedown", needResize: "needResize" }, host: { listeners: { "mousedown": "mousedownEvent($event)" } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: OrderDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[orderDirective]'
                }]
        }], ctorParameters: () => [], propDecorators: { startMousedown: [{
                type: Output
            }], needResize: [{
                type: Output
            }], mousedownEvent: [{
                type: HostListener,
                args: ['mousedown', ['$event']]
            }] } });

const MOVING_ITEMS_GAP = 10;
var MousedownButton;
(function (MousedownButton) {
    MousedownButton[MousedownButton["Left"] = 0] = "Left";
    MousedownButton[MousedownButton["Middle"] = 1] = "Middle";
    MousedownButton[MousedownButton["Right"] = 2] = "Right";
    MousedownButton[MousedownButton["None"] = -1] = "None";
})(MousedownButton || (MousedownButton = {}));
class GgokiorderComponent {
    items;
    scrollDiv;
    orderDiv;
    emptyDiv;
    goalDivider;
    selected = [];
    moveArea = 10;
    objects;
    multiSelectMode = true;
    allowNoSelection = false;
    isHierarchy = false;
    moved = new EventEmitter();
    clickItem = new EventEmitter();
    changeHeight = new EventEmitter();
    movingState = new EventEmitter();
    isMoving = false;
    targetIndex; // 이동 시킬 위치의 index
    targetTop;
    targetParentIndex; // 드랍 대상 오브젝트 행의 orderItems index
    isDividerIndented = false; // 디바이더가 부모 하위 위치를 가리켜 자식 행처럼 들여쓰기 되어야 하는지
    clientY;
    scrollInterval;
    changeSub;
    orderItems = []; // 전체 GgokiorderItem<T> 목록
    movingItems = []; // 이동 할 GgokiorderItem<T> 목록
    movingIndices = []; // 이동 대상 인덱스(isHierarchy 시 부모 자식 포함). 드래그 시작 시 세팅
    mousedownIndex; // mousedown 한 orderItems 의 아이템 index
    prevMousedownIndex; // 이전에 mousedown 한 orderItems 의 아이템 index
    lastShiftIndex;
    minTop;
    maxTop;
    mousedownX;
    mousedownY;
    mousedownButton = MousedownButton.None; // mousedown 버튼 확인. none 이면 mousedown 하지 않은 상태
    scrollY = 0;
    maxScroll = 0;
    isMovingInit = false; // 선택 아이템 이동을 위한 초기화 되어 있는지
    isActiveChanged = false; // 활성화 되어 있지 않은 아이템 활성화 시키는 경우
    deferredSelection;
    isInternallyChanged = false;
    dropTargetItem; // 드랍 대상으로 하이라이트 중인 오브젝트 행
    dropBoundaryParentId;
    isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    changeDetectorRef = inject(ChangeDetectorRef);
    constructor() {
        afterNextRender(() => {
            this.initGgokiorder(this.items);
        });
    }
    _mousedownItem; // mousedown 한 아이템
    get mousedownItem() {
        return this._mousedownItem;
    }
    set mousedownItem(item) {
        this._mousedownItem = item;
    }
    get ensureMousedownItem() {
        if (!this.mousedownItem)
            throw new Error('Could not find mousedownItem');
        return this.mousedownItem;
    }
    ngOnChanges(changes) {
        this.initMovingItems();
        if (changes['selected'] && changes['selected'].currentValue !== changes['selected'].previousValue)
            this.initSelected();
    }
    ngAfterContentInit() {
        // ng-content 구독
        this.changeSub = this.items.changes.subscribe((items) => {
            this.initGgokiorder(items);
        });
    }
    ngOnDestroy() {
        // ng-content 구독 해제
        if (this.changeSub) {
            this.changeSub.unsubscribe();
        }
        // 드래그 도중 파괴되는 경우 document 에 남는 이벤트와 스크롤 인터벌 정리
        if (this.isBrowser)
            this.removeDocumentEvents();
        this.toggleMovingScroll(false);
    }
    /**
     * ng-content 요소들 기본 스타일 적용
     * @param {QueryList<OrderDirective>} orderElements
     * @return {void}
     */
    initGgokiorder(orderElements) {
        if (!this.objects)
            throw new Error('[ggokiorder] objects Input 은 필수입니다');
        try {
            // sortItems 초기화
            this.orderItems = orderElements.map((directive, order) => {
                // mousedown event subscribe
                if (!directive.eventSubs)
                    directive.eventSubs = [];
                if (directive.eventSubs.length === 0) {
                    directive.eventSubs.push(directive.startMousedown.subscribe(orderEvent => {
                        this.mousedownEvent(orderEvent);
                    }));
                    directive.eventSubs.push(directive.needResize.subscribe(() => {
                        this.resizeElements();
                    }));
                }
                return { directive, order, top: 0, object: this.objects[order] };
            });
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        this.resizeElements();
        this.initMovingItems();
    }
    /**
     * 요소 height 변경
     * @return {void}
     */
    resizeElements() {
        const orderDiv = this.orderDiv.nativeElement;
        const prevHeight = orderDiv.style.height;
        let topElementHeight = 0;
        let zIndexMax = 1000;
        try {
            this.orderItems.forEach(orderItem => {
                const element = orderItem.directive.element.nativeElement;
                // 접힌 부모의 자식 행은 숨기고 레이아웃에서 제외한다. (isHierarchy 전용)
                if (this.isCollapsedHidden(orderItem)) {
                    element.style.display = 'none';
                    return;
                }
                element.style.display = '';
                orderItem.top = topElementHeight;
                const zIndex = this.isMoving && this.movingItems.includes(orderItem) ? zIndexMax-- : 1;
                const itemHeight = orderItem.directive.setBaseStyle(orderItem.top, 0, zIndex);
                // 부모가 있는 행은 자식 행 들여쓰기 적용 (들여쓰기 폭은 --child-indent, isHierarchy 전용)
                element.style.paddingLeft = this.getParentObjectId(orderItem) != null ? 'var(--child-indent)' : '';
                topElementHeight += itemHeight;
            });
            const resultHeight = `${topElementHeight}px`;
            orderDiv.style.height = resultHeight;
            if (resultHeight !== prevHeight)
                this.changeHeight.emit();
            this.changeDetectorRef.markForCheck();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * movingItems 초기화
     * @return {void}
     */
    initMovingItems() {
        if (!this.selected || this.selected.length === 0)
            return;
        // 목록에서 아이템이 지워졌는데 selected 가 갱신되지 않은 경우 범위 밖 index 가 들어올 수 있으므로 걸러낸다
        this.movingItems = this.selected.filter(index => this.orderItems[index] !== undefined).map(index => this.orderItems[index]);
    }
    /**
     * selected 목록 초기화
     * @return {void}
     */
    initSelected() {
        if (this.isInternallyChanged && this.prevMousedownIndex !== undefined)
            return;
        this.prevMousedownIndex = this.selected.length > 0 ? this.selected.at(-1) : undefined;
        this.lastShiftIndex = undefined;
        this.isInternallyChanged = false;
    }
    /**
     * 부모 행 접기/펼치기 토글. 접힘 상태(아이템 시그널)를 뒤집고 목록 레이아웃을 갱신한다.
     * (부모 접기/펼치기 기능을 ggokiorder 가 담당)
     * @param {T} object 부모 행의 object
     * @returns {void}
     */
    toggleCollapse(object) {
        if (!this.isHierarchy)
            return;
        const isCollapsed = object.isCollapsed;
        if (!isCollapsed)
            return;
        isCollapsed.set(!isCollapsed());
        this.resizeElements();
    }
    /**
     * mousedown event
     * @param {OrderEvent} event
     * @return {void}
     */
    mousedownEvent(event) {
        const mouseEvent = event.mouseEvent;
        //  right button 이거나 이미 누른 상태 리턴
        if (mouseEvent.button === 2 || this.mousedownButton !== MousedownButton.None)
            return;
        // left / middle button 저장
        this.mousedownButton = mouseEvent.button;
        const isCtrl = mouseEvent.ctrlKey || mouseEvent.metaKey;
        const isShift = mouseEvent.shiftKey;
        try {
            this.mousedownX = mouseEvent.clientX;
            this.mousedownY = mouseEvent.clientY + this.scrollY;
            // 선택한 아이템 index 처리. selected 에 없을 경우 새 아이템 down
            this.mousedownIndex = this.orderItems.findIndex(orderItem => orderItem.directive === event.orderItem);
            // 활성 아이템 변경 체크
            const mousedownItem = this.orderItems[this.mousedownIndex];
            this.isActiveChanged = mousedownItem !== this.mousedownItem;
            this.mousedownItem = mousedownItem;
            /** 우선순위대로 selected 변경
             *  1. 멀티셀렉 아님
             *  2. shift
             *  3. ctrl
             *  4. 활성화 아닌 아이템 선택 **/
            if (!this.multiSelectMode)
                this.selectItem();
            else if (isShift)
                this.selectItemOnShiftMousedown();
            else if (isCtrl)
                this.selectItemOnCtrlMousedown();
            else
                this.selectItemWithSelected();
            this.prevMousedownIndex = this.mousedownIndex;
            if (!isShift)
                this.lastShiftIndex = this.mousedownIndex;
            // selected 바뀐 경우 선택 처리
            this.initMovingItems();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        // add mouse event
        this.addDocumentEvents();
    }
    /**
     * Shift Mousedown 으로 Multi select
     * @return {void}
     */
    selectItemOnShiftMousedown() {
        if (this.prevMousedownIndex === undefined) {
            this.selectItem();
            return;
        }
        const changeSelected = (start, end, isAdd) => {
            const addValue = start < end ? 1 : -1;
            for (let i = start; i !== end + addValue; i = i + addValue) {
                const selectedIndex = this.selected.indexOf(i);
                if (isAdd && selectedIndex === -1)
                    this.selected.push(i);
                else if (!isAdd && selectedIndex !== -1)
                    this.selected.splice(selectedIndex, 1);
            }
            this.isInternallyChanged = true;
        };
        // 선택 해제 해야 하는 부분 splice
        if (this.lastShiftIndex === undefined)
            this.lastShiftIndex = this.prevMousedownIndex;
        else
            changeSelected(this.prevMousedownIndex, this.lastShiftIndex, false);
        // 선택 해야 하는 부분 add
        changeSelected(this.lastShiftIndex, this.mousedownIndex, true);
    }
    /**
     * Ctrl Mousedown 으로 Multi select
     * @return {void}
     */
    selectItemOnCtrlMousedown() {
        if (this.prevMousedownIndex === undefined) {
            this.selectItem();
            return;
        }
        const selectedIndex = this.selected.indexOf(this.mousedownIndex);
        if (selectedIndex === -1) {
            this.selected.push(this.mousedownIndex);
            this.isInternallyChanged = true;
            this.prevMousedownIndex = this.mousedownIndex;
            return;
        }
        this.deferredSelection = selectedIndex;
    }
    /**
     * Ctrl Mouseup 으로 선택 및 해제
     * @returns {boolean}
     */
    selectItemOnCtrlMouseup() {
        if (this.deferredSelection === undefined)
            throw new Error('Invalid deferredSelection');
        const isMultipleSelection = this.selected.length > 1;
        if (!this.allowNoSelection && !isMultipleSelection)
            return true;
        this.selected.splice(this.deferredSelection, 1);
        this.isInternallyChanged = true;
        const newIndex = isMultipleSelection ? this.selected.at(-1) : undefined;
        this.mousedownItem = newIndex === undefined ? undefined : this.orderItems[newIndex];
        this.prevMousedownIndex = newIndex;
        this.lastShiftIndex = newIndex ?? this.lastShiftIndex;
        return !isMultipleSelection;
    }
    /**
     * mousedown 시 이동일 경우와 분기 처리
     * @return {void}
     */
    selectItemWithSelected() {
        if (this.movingItems.includes(this.ensureMousedownItem))
            this.deferredSelection = this.mousedownIndex;
        else
            this.selectItem();
    }
    /**
     * Single Select
     * @return {void}
     */
    selectItem() {
        if (this.isActiveChanged)
            this.selected.splice(0, this.selected.length, this.mousedownIndex);
        this.isInternallyChanged = true;
        this.prevMousedownIndex = this.mousedownIndex;
    }
    /**
     * mousemove event
     * @param {MouseEvent} event
     * @return {void}
     */
    mousemoveEvent = (event) => {
        // mousemove 인지 체크
        if (!this.isMoving)
            this.isMoving = this.mousedownX !== event.clientX || this.mousedownY !== event.clientY + this.scrollY;
        else {
            // mousemove 일 때 초기화 안되어 있으면 초기화
            if (!this.isMovingInit) {
                this.movingInit();
                // 이동 대상이 없어 초기화가 중단된 경우 이동 처리를 하지 않는다
                if (!this.isMovingInit)
                    return;
                this.setLastItem();
            }
            this.elementsMoving(event);
        }
        // document 리스너라 zoneless 에서는 자동으로 변경 감지가 돌지 않는다
        this.changeDetectorRef.markForCheck();
    };
    /**
     * 마지막 요소 부분 빈 div 세팅
     * 없으면 스크롤 이상하게 움직임
     * @return {void}
     */
    setLastItem() {
        const lastItem = this.orderItems.at(-1);
        if (!lastItem)
            throw new Error('orderItems empty array');
        const lastItemElement = lastItem.directive.element.nativeElement;
        const emptyElement = this.emptyDiv.nativeElement;
        if (!emptyElement.offsetHeight)
            emptyElement.style.height = `${lastItemElement.offsetHeight}px`;
        emptyElement.style.top = lastItemElement.style.top;
    }
    /**
     * mouseup event
     * @param {MouseEvent} event
     * @return {void}
     */
    mouseupEvent = (event) => {
        // remove mouse event
        this.removeDocumentEvents();
        this.mousedownButton = MousedownButton.None;
        const isCtrl = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;
        try {
            let isSelect = true;
            if (this.deferredSelection !== undefined) {
                // 보류 처리 된 선택 진행
                if (!this.isMoving) {
                    this.isActiveChanged = true;
                    if (isCtrl)
                        isSelect = this.selectItemOnCtrlMouseup();
                    else
                        this.selectItem();
                }
                this.deferredSelection = undefined;
            }
            if (this.isMoving)
                this.endMoving();
            if (this.isActiveChanged && this.mousedownItem !== undefined) {
                this.clickItem.emit({
                    object: this.mousedownItem.object,
                    isMultiSelect: isShift || isCtrl,
                    button: event.button,
                    isSelect
                });
                this.isActiveChanged = false;
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        // document 리스너라 zoneless 에서는 자동으로 변경 감지가 돌지 않는다
        this.changeDetectorRef.markForCheck();
    };
    /**
     * 선택 요소들 이동 전 초기화
     * @return {void}
     */
    movingInit() {
        try {
            this.isMovingInit = true;
            // 이동 대상 인덱스 확정 (isHierarchy 시 선택 부모의 자식 포함) 후 movingItems 재구성
            this.movingIndices = this.getMovingIndices();
            this.movingItems = this.movingIndices.map(index => this.orderItems[index]);
            // 이동 대상이 없으면(selected 가 비었거나 전부 범위 밖) 이동을 시작하지 않는다
            if (this.movingItems.length === 0) {
                this.isMoving = false;
                this.isMovingInit = false;
                return;
            }
            // 스크롤 최대값 저장
            const scrollDiv = this.scrollDiv.nativeElement;
            this.maxScroll = scrollDiv.scrollHeight - scrollDiv.clientHeight;
            // 누른 아이템 세팅
            const mousedownItem = this.ensureMousedownItem;
            const movingIndex = this.movingItems.indexOf(mousedownItem);
            mousedownItem.isMousedown = true;
            const basePosition = +mousedownItem.directive.element.nativeElement.style.top.replace('px', '');
            // 이동 시작 전 마우스 다운 위치로 선택 요소들 이동
            let zIndex = 1000;
            this.movingItems.forEach((item, index) => {
                const topAddValue = (index - movingIndex) * MOVING_ITEMS_GAP;
                item.directive.setPosition(basePosition + topAddValue, index * MOVING_ITEMS_GAP, zIndex);
                item.directive.setTransition(false);
                item.prevTop = basePosition + topAddValue;
                zIndex--;
            });
            const itemHalfHeight = this.movingItems[0].directive.element.nativeElement.offsetHeight / 2;
            this.minTop = -itemHalfHeight + this.scrollY;
            this.maxTop = scrollDiv.offsetHeight - itemHalfHeight + this.scrollY;
            this.movingState.emit(this.isMoving);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * 요소 움직임
     * @param {Event} event
     * @return {void}
     */
    elementsMoving(event) {
        const isMouseEvent = (event) => {
            return 'clientY' in event;
        };
        if (isMouseEvent(event))
            this.clientY = event.clientY;
        if (this.clientY === undefined)
            throw new Error('undefined clientY');
        const mouseYDistance = this.clientY + this.scrollY - this.mousedownY;
        const mouseY = this.clientY - this.orderDiv.nativeElement.getBoundingClientRect().top;
        try {
            // 첫번째 moving item 위치값 계산
            const firstMovingItem = this.movingItems[0];
            const topValue = Math.max(this.minTop, firstMovingItem.prevTop + mouseYDistance);
            // moving items 위치값 적용
            this.applyMovingItemsPosition(topValue);
            // 이동 위치 디바이더 세팅
            this.targetTop = undefined;
            this.targetIndex = undefined;
            this.targetParentIndex = undefined;
            this.dropBoundaryParentId = undefined;
            this.isDividerIndented = false;
            const dividerHalfHeight = this.goalDivider.nativeElement.offsetHeight / 2;
            const moveArea = this.moveArea;
            const movingSet = new Set(this.movingItems);
            // 이동 아이템 누적 개수 + 마지막으로 보이는 행 index (접혀 숨겨진 행 제외) 계산.
            // lastVisibleIndex 행의 하단 영역은 목록 아래 전체를 담당한다
            const movingCountBefore = new Array(this.orderItems.length + 1).fill(0);
            let lastVisibleIndex = -1;
            for (let i = 0; i < this.orderItems.length; i++) {
                movingCountBefore[i + 1] = movingCountBefore[i] + (movingSet.has(this.orderItems[i]) ? 1 : 0);
                if (!this.isCollapsedHidden(this.orderItems[i]))
                    lastVisibleIndex = i;
            }
            for (const [i, item] of this.orderItems.entries()) {
                // 접혀 숨겨진 행은 영역 검사에서 제외
                if (this.isCollapsedHidden(item))
                    continue;
                const topY = item.top;
                const bottomY = topY + item.directive.element.nativeElement.offsetHeight;
                // 커서가 행보다 아래면 다음 행에서 검사 (마지막 행이면 목록 아래 영역도 행 하단으로 처리)
                if (i !== lastVisibleIndex && mouseY > bottomY)
                    continue;
                if (mouseY <= topY + moveArea) {
                    // 행 상단 → 행 위 디바이더 (이 행과 같은 계층으로 이동. 부모 하위 위치면 디바이더도 들여쓰기)
                    this.dropBoundaryParentId = this.getParentObjectId(item);
                    this.isDividerIndented = this.dropBoundaryParentId != null;
                    this.targetIndex = i - movingCountBefore[i];
                    this.targetTop = topY - dividerHalfHeight;
                }
                else if (!this.isHierarchy || mouseY >= bottomY - moveArea) {
                    this.dropBoundaryParentId = i === lastVisibleIndex && mouseY > bottomY ? null : this.getParentObjectId(item);
                    this.isDividerIndented = this.dropBoundaryParentId != null;
                    // 접혀 숨겨진 자식 행들 사이에 소속이 다른 아이템이 끼지 않도록 숨김 블록 뒤로 인덱스 보정
                    // (접힌 부모 바로 아래 드랍 시 숨겨진 자식들 뒤 = 블록 밖으로)
                    let rawIndex = i + 1;
                    while (rawIndex < this.orderItems.length &&
                        this.isCollapsedHidden(this.orderItems[rawIndex]) &&
                        this.getParentObjectId(this.orderItems[rawIndex]) !== this.dropBoundaryParentId) {
                        rawIndex++;
                    }
                    this.targetIndex = rawIndex - movingCountBefore[rawIndex];
                    this.targetTop = bottomY - dividerHalfHeight;
                }
                else if (!this.movingItems.includes(item)) {
                    // 행 가운데 → 해당 행 하위로 드랍 대상 (이동 중인 행 자신은 제외. 실제 이동 가능 여부는 이벤트 받은 쪽이 결정)
                    this.targetParentIndex = i;
                }
                break;
            }
            // 하위 드랍 대상 행 하이라이트 갱신
            this.setParentDropHighlight(this.targetParentIndex === undefined ? undefined : this.orderItems[this.targetParentIndex]);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * movingItems 위치 이동
     * @param {number} topValue
     * @return {void}
     */
    applyMovingItemsPosition(topValue) {
        this.movingItems.forEach(item => {
            item.directive.element.nativeElement.style.top = topValue + 'px';
            item.directive.element.nativeElement.style.opacity = '0.4';
            topValue = topValue + MOVING_ITEMS_GAP;
        });
    }
    /**
     * 선택 요소들 이동 종료
     * @return {void}
     */
    endMoving() {
        // 프로퍼티 초기화
        this.isMoving = false;
        this.isMovingInit = false;
        this.lastShiftIndex = undefined;
        this.prevMousedownIndex = this.selected.at(-1);
        const dropParentIndex = this.targetParentIndex;
        const dropParentId = this.dropBoundaryParentId;
        this.targetParentIndex = undefined;
        this.dropBoundaryParentId = undefined;
        this.isDividerIndented = false;
        this.setParentDropHighlight(undefined);
        try {
            // 행 가운데 영역 드랍 → 해당 행 하위로 이동 요청 (수락된 경우에만 재배치)
            if (dropParentIndex !== undefined) {
                this.dropToParent(dropParentIndex);
                return;
            }
            if (this.targetIndex === undefined) {
                // targetIndex 없을 경우 원래 순서로 정렬
                this.revertMoveResult();
                return;
            }
            const movedResults = this.buildMovedResults(this.targetIndex);
            // 부모 계층 검사 — 이동 중인 아이템이 자기 부모 블록 밖에 놓이면 부모 이탈,
            // 다른 부모 블록 안에 놓이면 그 부모으로 편입 처리하고, 그 외 무효 배치는 막고 원래 순서로 되돌린다.
            const resultObjects = movedResults.map(movedItem => this.orderItems[movedItem.prev].object);
            const parentChanges = this.resolveParentChanges(resultObjects, dropParentId);
            if (parentChanges === null) {
                this.revertMoveResult();
                return;
            }
            // 순서 변경과 소속 변경을 하나의 이동 결과 배열로 emit 한다. 실제 값 변경(parentObjectId 등)은 받은 쪽에서 처리한다.
            this.applyMoveResult(movedResults);
            this.moved.emit(this.buildMovedObjects(resultObjects, movedResults, parentChanges));
            // 소속 변경으로 자식 행 들여쓰기가 바뀔 수 있으므로 레이아웃 갱신 (parentObjectId 는 위 emit 처리에서 동기 반영됨)
            if (parentChanges.size > 0)
                this.resizeElements();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * 요소 이동 결과 받아오기
     * @param {number} count
     * @param {number[]} excludedItems
     * @param {boolean} isNotChange
     * @returns {MovedResultArray}
     */
    getMovedResults(count, excludedItems, isNotChange = false) {
        const items = [];
        const orders = [];
        let order = 0;
        while (orders.length < count && order < this.orderItems.length) {
            const applyIndex = order++;
            // isHierarchy 시 movingIndices 는 선택 부모의 자식까지 포함 (자식이 부모과 함께 이동하도록)
            const isSelected = this.movingIndices.includes(applyIndex);
            const isResult = !(isSelected || excludedItems.includes(applyIndex)) || isNotChange;
            if (isNotChange && isSelected)
                this.orderItems[applyIndex].directive.element.nativeElement.style.opacity = '';
            if (isResult) {
                orders.push(applyIndex);
                items.push(this.getMovedResult(applyIndex, isSelected));
            }
        }
        return { items, orders };
    }
    /**
     * 요소 이동 결과 생성
     * @param {number} prev
     * @param {boolean} isSelected
     * @return {MovedItem}
     */
    getMovedResult(prev, isSelected) {
        if (this.orderItems[prev].isMousedown)
            this.orderItems[prev].isMousedown = false;
        this.orderItems[prev].directive.setTransition(true);
        return { prev, isSelected };
    }
    /**
     * 현재 스크롤 위치 기억
     * @param {Event} event
     * @return {void}
     */
    setScroll(event) {
        const target = event.target;
        this.scrollY = target.scrollTop;
        if (this.isMoving)
            this.elementsMoving(event);
    }
    /**
     * 스크롤 이동
     * @param {number} value
     * @return {void}
     */
    moveScroll(value) {
        // 이동 중이 아니면(드래그 종료 후 인터벌이 남은 경우 등) 스크롤을 멈춘다
        const firstMovingItem = this.movingItems[0];
        if (!this.isMoving || firstMovingItem === undefined) {
            this.toggleMovingScroll(false);
            return;
        }
        const scrollDiv = this.scrollDiv.nativeElement;
        try {
            // 스크롤 값 계산
            const scrollValue = Math.min(Math.max(0, scrollDiv.scrollTop + value), this.maxScroll);
            // movingItems 위치값 계산
            const topValue = +firstMovingItem.directive.element.nativeElement.style.top.replace('px', '') + value;
            // 스크롤 이동
            scrollDiv.scrollTo({ top: scrollValue, behavior: 'smooth' });
            this.scrollY = scrollValue;
            // movingItems 이동
            this.applyMovingItemsPosition(topValue);
            // min/max top 계산
            this.minTop = this.minTop + value;
            this.maxTop = this.maxTop + value;
            if (scrollValue === 0 || scrollValue === this.maxScroll)
                this.toggleMovingScroll(false);
            // setInterval 콜백이라 zoneless 에서는 자동으로 변경 감지가 돌지 않는다
            this.changeDetectorRef.markForCheck();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    /**
     * 스크롤 on/off
     * @param {boolean} isMovingScroll
     * @param {number} value
     */
    toggleMovingScroll(isMovingScroll, value = 30) {
        if (isMovingScroll) {
            this.scrollInterval = window.setInterval(() => {
                this.moveScroll(value);
            }, 100);
        }
        else if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = 0;
        }
    }
    /**
     * 드래그 추적용 document 이벤트 등록
     * @return {void}
     */
    addDocumentEvents() {
        document.body.addEventListener('mousemove', this.mousemoveEvent);
        document.body.addEventListener('mouseup', this.mouseupEvent);
        document.body.addEventListener('mouseleave', this.mouseupEvent);
    }
    /**
     * 드래그 추적용 document 이벤트 해제
     * @return {void}
     */
    removeDocumentEvents() {
        document.body.removeEventListener('mousemove', this.mousemoveEvent);
        document.body.removeEventListener('mouseup', this.mouseupEvent);
        document.body.removeEventListener('mouseleave', this.mouseupEvent);
    }
    /**
     * 선택한 모든 아이템 선택 취소
     * @param {MouseEvent} event
     * @return {void}
     */
    unselectAllItem(event) {
        if (!this.allowNoSelection)
            return;
        this.selected.splice(0);
        this.movingItems.splice(0);
        this.isInternallyChanged = false;
        this.isMoving = false;
        this.targetIndex = undefined;
        this.targetTop = undefined;
        this.targetParentIndex = undefined;
        this.dropBoundaryParentId = undefined;
        this.isDividerIndented = false;
        this.setParentDropHighlight(undefined);
        this.prevMousedownIndex = undefined;
        this.lastShiftIndex = undefined;
        this.mousedownButton = MousedownButton.None;
        this.deferredSelection = undefined;
        this.mousedownItem = undefined;
        this.clickItem.emit({
            isMultiSelect: false,
            button: event.button,
            isSelect: false
        });
    }
    /**
     * 행 가운데 영역 드랍 처리. 드랍 대상 행 하위로 이동 아이템들을 편입시킨다.
     * 대상 행이 부모(그룹) 행(isCollapsed 보유)이 아니면 편입 불가 → 원래 순서로 되돌린다.
     * @param {number} parentIndex 드랍 대상 행의 orderItems index
     * @returns {void}
     */
    dropToParent(parentIndex) {
        const parentObject = this.asHierarchy(this.orderItems[parentIndex]);
        // 대상 행이 부모 행이 아니면 하위 편입 불가
        if (parentObject.isCollapsed === undefined) {
            this.revertMoveResult();
            return;
        }
        const parentId = parentObject.id;
        // 대상 행 바로 뒤(하위 최상단)로 재배치. 이동 아이템 전부를 대상 행 하위로 편입시킨다.
        const movingCountBefore = this.movingIndices.filter(index => index <= parentIndex).length;
        const movedResults = this.buildMovedResults(parentIndex + 1 - movingCountBefore);
        const resultObjects = movedResults.map(movedItem => this.orderItems[movedItem.prev].object);
        const parentChanges = new Map(this.movingItems.map(item => [item.object, parentId]));
        this.applyMoveResult(movedResults);
        this.moved.emit(this.buildMovedObjects(resultObjects, movedResults, parentChanges));
        this.resizeElements();
    }
    /**
     * targetIndex 위치에 이동 아이템들(isHierarchy 시 부모 자식 포함)을 끼워넣은 이동 결과 목록 생성
     * @param {number} targetIndex
     * @returns {MovedItem[]}
     */
    buildMovedResults(targetIndex) {
        // 이동 대상(isHierarchy 시 부모 자식 포함)을 오름차순으로 정렬해서 사용
        const sortingSelected = [...this.movingIndices].sort((a, b) => a - b);
        // 순서 적용을 위한 배열
        const movedResults = [], excludedItems = [];
        // 1. targetIndex 앞의 요소들 정렬
        {
            const { items, orders } = this.getMovedResults(targetIndex, []);
            movedResults.push(...items);
            excludedItems.push(...orders);
        }
        // 2. selected 요소들 정렬
        sortingSelected.forEach(order => {
            this.orderItems[order].directive.element.nativeElement.style.opacity = '';
            movedResults.push(this.getMovedResult(order, true));
        });
        // 3. targetIndex 뒤의 요소들 정렬
        {
            const { items } = this.getMovedResults(this.orderItems.length - movedResults.length, excludedItems);
            movedResults.push(...items);
        }
        return movedResults;
    }
    /**
     * 이동 결과를 원래 순서로 되돌린다.
     * @returns {void}
     */
    revertMoveResult() {
        const { items } = this.getMovedResults(this.orderItems.length, [], true);
        this.applyMoveResult(items);
    }
    /**
     * 아이템의 object 를 계층 인터페이스로 해석한다.
     * @param {GgokiorderItem<T>} item
     * @returns {GgokiorderHierarchyObject}
     */
    asHierarchy(item) {
        return item.object;
    }
    /**
     * 아이템의 부모 id (없으면 null). isHierarchy 이 아니면 항상 null.
     * @param {GgokiorderItem<T>} item
     * @returns {number | null}
     */
    getParentObjectId(item) {
        if (!this.isHierarchy)
            return null;
        return this.asHierarchy(item).parentObjectId ?? null;
    }
    /**
     * 접힌 부모에 속해 숨겨야 하는 자식 행인지 여부.
     * @param {GgokiorderItem<T>} item
     * @returns {boolean}
     */
    isCollapsedHidden(item) {
        const parentId = this.getParentObjectId(item);
        if (parentId == null)
            return false;
        const parent = this.orderItems.find(target => this.asHierarchy(target).id === parentId);
        const isCollapsed = parent && this.asHierarchy(parent).isCollapsed;
        return !!isCollapsed && isCollapsed();
    }
    /**
     * 부모 인덱스의 자식 orderItems 인덱스 목록.
     * @param {number} parentIndex
     * @returns {number[]}
     */
    getChildIndices(parentIndex) {
        if (!this.isHierarchy)
            return [];
        const parentId = this.asHierarchy(this.orderItems[parentIndex]).id;
        const result = [];
        this.orderItems.forEach((item, index) => {
            if (this.getParentObjectId(item) === parentId)
                result.push(index);
        });
        return result;
    }
    /**
     * 실제로 함께 이동시킬 인덱스 목록. isHierarchy 일 때 선택된 부모의 자식까지 포함한다.
     * (부모 드래그 시 자식이 함께 따라가도록)
     * @returns {number[]}
     */
    getMovingIndices() {
        // 목록에서 아이템이 지워졌는데 selected 가 갱신되지 않은 경우를 대비해 범위 밖 index 는 걸러낸다
        const selected = this.selected.filter(index => this.orderItems[index] !== undefined);
        if (!this.isHierarchy)
            return selected;
        const indices = new Set(selected);
        selected.forEach(index => this.getChildIndices(index).forEach(childIndex => indices.add(childIndex)));
        return [...indices].sort((a, b) => a - b);
    }
    /**
     * 하위 드랍 대상 행 하이라이트 적용/해제.
     * 행은 projected content 라 컴포넌트 스코프 스타일이 닿지 않으므로 인라인 스타일로 처리한다.
     * @param {GgokiorderItem<T> | undefined} item 하이라이트할 행 (undefined 면 해제만)
     * @returns {void}
     */
    setParentDropHighlight(item) {
        if (this.dropTargetItem === item)
            return;
        if (this.dropTargetItem) {
            const prevElement = this.dropTargetItem.directive.element.nativeElement;
            prevElement.style.outline = '';
            prevElement.style.outlineOffset = '';
        }
        this.dropTargetItem = item;
        if (item) {
            const element = item.directive.element.nativeElement;
            element.style.outline = 'var(--goal-thickness) solid var(--goal-color)';
            element.style.outlineOffset = 'calc(var(--goal-thickness) * -1)';
        }
    }
    /**
     * 주어진 순서를 부모 계층 기준으로 해석해 소속 변경 목록을 만든다.
     * 부모 블록(부모 행 + 뒤따르는 자식 연속 구간)을 기준으로 이동 중인 아이템의 새 소속을 정한다.
     * - 이동 중인 아이템이 자기 부모 블록 밖(최상위 영역)에 놓이면 → 부모 이탈 ({ object })
     * - 이동 중인 아이템이 다른 부모 블록 안에 놓이면 → 그 부모로 편입 ({ parentObjectId, object })
     *   (단, 이동 아이템에 부모 행이 포함되면 부모 중첩 방지를 위해 편입 불가 → 무효)
     * - 이동하지 않은 자식의 블록이 끊기면 → 무효
     * isHierarchy 가 아니면 항상 빈 Map(소속 변경 없음)을 반환한다.
     * @param {T[]} orderedObjects 이동 결과로 만들어질 object 순서
     * @param {number | null} [dropParentId] 디바이더 드랍 시 커서가 가리킨 소속 부모 id.
     *   부모 블록 경계(마지막 자식 ↔ 부모 밖 요소 사이)처럼 순서만으로 소속이 모호할 때 이 값을 우선한다.
     *   undefined 면 블록 컨텍스트로 판단.
     * @returns {Map<T, number | null> | null} 소속이 바뀐 object → 새 부모 id(null = 최상위) Map. 배치가 계층 규칙상 무효면 null.
     */
    resolveParentChanges(orderedObjects, dropParentId) {
        const changes = new Map();
        if (!this.isHierarchy)
            return changes;
        const movingObjects = new Set(this.movingItems.map(item => item.object));
        // 이동 아이템에 부모 행이 포함되면 (부모 중첩 방지) 다른 부모 블록으로의 편입은 허용하지 않는다
        const canJoin = !this.movingItems.some(item => this.asHierarchy(item).isCollapsed !== undefined);
        // 현재 순회 위치가 속한 부모 블록의 부모 행 object (없으면 최상위 영역)
        let contextParent;
        for (const object of orderedObjects) {
            const current = object;
            // 부모 행: 새 부모 블록 시작
            if (current.isCollapsed !== undefined) {
                contextParent = object;
                continue;
            }
            const parentId = current.parentObjectId ?? null;
            const contextId = contextParent?.id ?? null;
            if (!movingObjects.has(object)) {
                if (parentId === contextId)
                    continue; // 현재 블록 소속 그대로 (최상위 포함)
                // 이동하지 않은 최상위 오브젝트는 부모 블록을 닫고, 자식의 블록이 끊긴 경우는 무효
                if (parentId != null)
                    return null;
                contextParent = undefined;
                continue;
            }
            // 이동 중인 오브젝트: 드랍 위치의 블록 기준으로 소속 변경.
            // 블록 경계 드랍은 커서가 가리킨 요소의 계층 위치(dropParentId)를 우선한다.
            const desiredParentId = dropParentId === undefined ? contextId : dropParentId;
            if (desiredParentId == null) {
                // 최상위 행이 되므로 현재 블록은 여기서 닫힌다 (블록 중간이면 뒤따르는 자식 검사에서 무효 처리)
                if (parentId != null)
                    changes.set(object, null); // 부모 블록 밖 → 부모 이탈
                contextParent = undefined;
                continue;
            }
            if (parentId === desiredParentId)
                continue; // 소속 변화 없음
            if (!canJoin || !contextParent || contextParent.id !== desiredParentId)
                return null;
            changes.set(object, contextParent.id); // 다른 부모 블록 안 → 그 부모으로 편입
        }
        return changes;
    }
    /**
     * 이동으로 순서 또는 소속이 바뀐 항목만 골라 이동 결과 배열을 만든다.
     * 받은 쪽이 order 를 index 로 대상 object 를 얻고, 한 번의 순회로 순서 저장과 소속 변경을 처리할 수 있도록
     * 각 항목에 새 order·parentObjectId 를 담는다. (object 자체는 공유 배열의 index 로 얻으므로 담지 않는다)
     * isHierarchy 가 아니면 parentObjectId 는 담지 않는다.
     * @param {T[]} resultObjects 이동 결과 순서의 object 목록 (index = 새 order)
     * @param {MovedItem[]} movedResults 이동 결과(각 항목의 prev = 이동 전 index)
     * @param {Map<T, number | null>} parentChanges 소속이 바뀐 object → 새 부모 id(null = 최상위) Map
     * @returns {MovedObject[]}
     */
    buildMovedObjects(resultObjects, movedResults, parentChanges) {
        const moved = [];
        resultObjects.forEach((object, next) => {
            const isPositionChanged = movedResults[next].prev !== next;
            const isParentChanged = parentChanges.has(object);
            if (!isPositionChanged && !isParentChanged)
                return; // 순서·소속 모두 그대로면 제외
            // isHierarchy 가 아니면 소속 개념이 없으므로 parentObjectId 를 담지 않는다
            if (!this.isHierarchy) {
                moved.push({ order: next });
                return;
            }
            // 소속이 바뀐 항목은 새 부모를, 그 외에는 현재 부모를 담는다 (받은 쪽은 기존 값과 비교해 변경 여부 판단)
            const currentParentId = object.parentObjectId ?? null;
            const parentObjectId = isParentChanged ? parentChanges.get(object) : currentParentId;
            moved.push({ order: next, parentObjectId });
        });
        return moved;
    }
    /**
     *  HTML element 에 top 적용 및 배열 순서 재배치 적용
     * @param {MovedItem[]} movedResults
     * @returns {void}
     * @private
     */
    applyMoveResult(movedResults) {
        let top = 0;
        const orderItems = [];
        const objects = [];
        for (const [next, { prev, isSelected }] of movedResults.entries()) {
            const orderItem = this.orderItems[prev];
            const height = orderItem.directive.setPosition(top);
            top = top + height;
            orderItems.push(orderItem);
            objects.push(orderItem.object);
            if (isSelected) {
                const selectedIndex = this.selected.indexOf(prev);
                if (selectedIndex !== -1)
                    this.selected[selectedIndex] = next;
            }
        }
        this.orderItems.splice(0, this.orderItems.length, ...orderItems);
        this.objects.splice(0, this.objects.length, ...objects);
        this.movingState.emit(this.isMoving);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: GgokiorderComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "19.2.25", type: GgokiorderComponent, isStandalone: true, selector: "ggokiorder", inputs: { selected: "selected", moveArea: "moveArea", objects: "objects", multiSelectMode: "multiSelectMode", allowNoSelection: "allowNoSelection", isHierarchy: "isHierarchy" }, outputs: { moved: "moved", clickItem: "clickItem", changeHeight: "changeHeight", movingState: "movingState" }, queries: [{ propertyName: "items", predicate: OrderDirective, descendants: true }], viewQueries: [{ propertyName: "scrollDiv", first: true, predicate: ["scrollDiv"], descendants: true }, { propertyName: "orderDiv", first: true, predicate: ["orderDiv"], descendants: true }, { propertyName: "emptyDiv", first: true, predicate: ["emptyDiv"], descendants: true }, { propertyName: "goalDivider", first: true, predicate: ["goalDivider"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<div class=\"ggokiorder-wrapper\">\n  <div #scrollDiv (mousedown)=\"unselectAllItem($event)\" (scroll)=\"setScroll($event)\" class=\"scroll-wrapper scroll-container\">\n    <div #orderDiv class=\"order-wrapper\">\n      <!-- \uC694\uC18C \uBAA9\uB85D -->\n      <ng-content></ng-content>\n      <div #emptyDiv class=\"empty-item\"></div>\n\n      <!-- \uC774\uB3D9\uC2DC\uD0AC \uC694\uC18C \uBAA9\uC801\uC9C0 \uD45C\uC2DC \uB514\uBC14\uC774\uB354 (\uBD80\uBAA8 \uD558\uC704 \uC704\uCE58\uBA74 \uC790\uC2DD \uD589\uCC98\uB7FC \uB4E4\uC5EC\uC4F0\uAE30) -->\n      <div\n        #goalDivider\n        [ngClass]=\"{ visible: targetIndex !== undefined && targetIndex >= 0 && isMoving, indented: isDividerIndented }\"\n        [style.top.px]=\"targetTop\"\n        class=\"goal-divider\"\n      ></div>\n    </div>\n  </div>\n\n  <!-- \uC694\uC18C \uC774\uB3D9\uC2DC \uC2A4\uD06C\uB864 -->\n  @if (isMoving) {\n    <div (mouseenter)=\"toggleMovingScroll(true, -30)\" (mouseleave)=\"toggleMovingScroll(false)\" class=\"scroll-div scroll-up\"></div>\n    <div (mouseenter)=\"toggleMovingScroll(true)\" (mouseleave)=\"toggleMovingScroll(false)\" class=\"scroll-div scroll-down\"></div>\n  }\n</div>\n", styles: [":host{--max-height: none;--scroll-spot-height: 20px;--goal-width: 100%;--goal-thickness: 2px;--goal-color: red;--goal-radius: 1px;--child-indent: 0px}.ggokiorder-wrapper{display:flex;position:relative;height:100%}.ggokiorder-wrapper .scroll-container{overflow:auto;scrollbar-color:rgba(0,0,0,.5) transparent}.ggokiorder-wrapper .scroll-wrapper{display:flex;position:relative;height:100%;width:100%;overflow-y:auto;overflow-x:hidden}.ggokiorder-wrapper .scroll-wrapper .order-wrapper{position:relative;width:100%;transition:scroll ease-in-out .1s;max-height:var(--max-height)}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .empty-item{position:absolute;background:transparent;width:100%;z-index:0}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider{position:absolute;visibility:hidden;left:calc((100% - var(--goal-width)) / 2);width:var(--goal-width);background:var(--goal-color);height:var(--goal-thickness);border-radius:var(--goal-radius)}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider.visible{visibility:visible;z-index:2}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider.indented{left:calc((100% - var(--goal-width)) / 2 + var(--child-indent) + 4px);width:calc(var(--goal-width) - var(--child-indent) - 4px)}.ggokiorder-wrapper .scroll-div{position:absolute;width:100%;background:transparent;z-index:2000;height:var(--scroll-spot-height)}.ggokiorder-wrapper .scroll-div.scroll-up{top:0}.ggokiorder-wrapper .scroll-div.scroll-down{bottom:0}\n"], dependencies: [{ kind: "directive", type: NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "19.2.25", ngImport: i0, type: GgokiorderComponent, decorators: [{
            type: Component,
            args: [{ selector: 'ggokiorder', imports: [NgClass], standalone: true, template: "<div class=\"ggokiorder-wrapper\">\n  <div #scrollDiv (mousedown)=\"unselectAllItem($event)\" (scroll)=\"setScroll($event)\" class=\"scroll-wrapper scroll-container\">\n    <div #orderDiv class=\"order-wrapper\">\n      <!-- \uC694\uC18C \uBAA9\uB85D -->\n      <ng-content></ng-content>\n      <div #emptyDiv class=\"empty-item\"></div>\n\n      <!-- \uC774\uB3D9\uC2DC\uD0AC \uC694\uC18C \uBAA9\uC801\uC9C0 \uD45C\uC2DC \uB514\uBC14\uC774\uB354 (\uBD80\uBAA8 \uD558\uC704 \uC704\uCE58\uBA74 \uC790\uC2DD \uD589\uCC98\uB7FC \uB4E4\uC5EC\uC4F0\uAE30) -->\n      <div\n        #goalDivider\n        [ngClass]=\"{ visible: targetIndex !== undefined && targetIndex >= 0 && isMoving, indented: isDividerIndented }\"\n        [style.top.px]=\"targetTop\"\n        class=\"goal-divider\"\n      ></div>\n    </div>\n  </div>\n\n  <!-- \uC694\uC18C \uC774\uB3D9\uC2DC \uC2A4\uD06C\uB864 -->\n  @if (isMoving) {\n    <div (mouseenter)=\"toggleMovingScroll(true, -30)\" (mouseleave)=\"toggleMovingScroll(false)\" class=\"scroll-div scroll-up\"></div>\n    <div (mouseenter)=\"toggleMovingScroll(true)\" (mouseleave)=\"toggleMovingScroll(false)\" class=\"scroll-div scroll-down\"></div>\n  }\n</div>\n", styles: [":host{--max-height: none;--scroll-spot-height: 20px;--goal-width: 100%;--goal-thickness: 2px;--goal-color: red;--goal-radius: 1px;--child-indent: 0px}.ggokiorder-wrapper{display:flex;position:relative;height:100%}.ggokiorder-wrapper .scroll-container{overflow:auto;scrollbar-color:rgba(0,0,0,.5) transparent}.ggokiorder-wrapper .scroll-wrapper{display:flex;position:relative;height:100%;width:100%;overflow-y:auto;overflow-x:hidden}.ggokiorder-wrapper .scroll-wrapper .order-wrapper{position:relative;width:100%;transition:scroll ease-in-out .1s;max-height:var(--max-height)}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .empty-item{position:absolute;background:transparent;width:100%;z-index:0}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider{position:absolute;visibility:hidden;left:calc((100% - var(--goal-width)) / 2);width:var(--goal-width);background:var(--goal-color);height:var(--goal-thickness);border-radius:var(--goal-radius)}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider.visible{visibility:visible;z-index:2}.ggokiorder-wrapper .scroll-wrapper .order-wrapper .goal-divider.indented{left:calc((100% - var(--goal-width)) / 2 + var(--child-indent) + 4px);width:calc(var(--goal-width) - var(--child-indent) - 4px)}.ggokiorder-wrapper .scroll-div{position:absolute;width:100%;background:transparent;z-index:2000;height:var(--scroll-spot-height)}.ggokiorder-wrapper .scroll-div.scroll-up{top:0}.ggokiorder-wrapper .scroll-div.scroll-down{bottom:0}\n"] }]
        }], ctorParameters: () => [], propDecorators: { items: [{
                type: ContentChildren,
                args: [OrderDirective, { descendants: true }]
            }], scrollDiv: [{
                type: ViewChild,
                args: ['scrollDiv']
            }], orderDiv: [{
                type: ViewChild,
                args: ['orderDiv']
            }], emptyDiv: [{
                type: ViewChild,
                args: ['emptyDiv']
            }], goalDivider: [{
                type: ViewChild,
                args: ['goalDivider']
            }], selected: [{
                type: Input
            }], moveArea: [{
                type: Input
            }], objects: [{
                type: Input,
                args: [{ required: true }]
            }], multiSelectMode: [{
                type: Input
            }], allowNoSelection: [{
                type: Input
            }], isHierarchy: [{
                type: Input
            }], moved: [{
                type: Output
            }], clickItem: [{
                type: Output
            }], changeHeight: [{
                type: Output
            }], movingState: [{
                type: Output
            }] } });

/*
 * Public API Surface of ggokiorder
 */

/**
 * Generated bundle index. Do not edit.
 */

export { BASE_TRANSITION_TIME, GgokiorderComponent, OrderDirective };
//# sourceMappingURL=ggokiorder.mjs.map
