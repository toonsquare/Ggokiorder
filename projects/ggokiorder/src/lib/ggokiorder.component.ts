import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderDirective } from './order.directive';
import { ClickItem, GgokiorderObject, MovedObject, OrderEvent } from './ggokiorder.models';
import { NgClass } from '@angular/common';

const MOVING_ITEMS_GAP: number = 10;

interface GgokiorderItem<T extends GgokiorderObject = GgokiorderObject> {
  directive: OrderDirective;
  object: T;
  order: number;
  top: number;
  prevTop?: number;
  isMousedown?: boolean;
}

interface MovedItem {
  prev: number;
  isSelected: boolean;
}

interface MovedResultArray {
  items: MovedItem[];
  orders: number[];
}

/**
 * isHierarchy 모드에서 projected 아이템(object)이 만족해야 하는 계층 인터페이스.
 * - id / parentObjectId 로 부모-자식 관계를 표현한다. (parentObjectId 가 null 이면 최상위)
 * - 부모 행은 isCollapsed(Angular WritableSignal) 로 접힘 상태를 노출/제어한다.
 */
interface GgokiorderHierarchyObject {
  id: number;
  parentObjectId?: number | null;
  isCollapsed?: { (): boolean; set(value: boolean): void };
}

enum MousedownButton {
  Left = 0,
  Middle = 1,
  Right = 2,
  None = -1
}

@Component({
  selector: 'ggokiorder',
  templateUrl: './ggokiorder.component.html',
  styleUrls: ['./ggokiorder.component.scss'],
  imports: [NgClass],
  standalone: true
})
export class GgokiorderComponent<T extends GgokiorderObject = GgokiorderObject> implements AfterViewInit, AfterContentInit, OnDestroy, OnChanges {
  @ContentChildren(OrderDirective) items!: QueryList<OrderDirective>;

  @ViewChild('scrollDiv') scrollDiv!: ElementRef;
  @ViewChild('orderDiv') orderDiv!: ElementRef;
  @ViewChild('emptyDiv') emptyDiv!: ElementRef;
  @ViewChild('goalDivider') goalDivider!: ElementRef;

  @Input() selected: number[] = [];
  @Input() moveArea: number = 10;
  @Input() objects!: T[];
  @Input() multiSelectMode: boolean = true;
  @Input() allowNoSelection: boolean = false;
  @Input() isHierarchy: boolean = false;
  @Output() moved: EventEmitter<MovedObject[]> = new EventEmitter<MovedObject[]>();
  @Output() clickItem: EventEmitter<ClickItem<T>> = new EventEmitter<ClickItem<T>>();
  @Output() changeHeight: EventEmitter<void> = new EventEmitter<void>();
  @Output() movingState: EventEmitter<boolean> = new EventEmitter<boolean>();

  public isMoving: boolean = false;
  public targetIndex: number | undefined; // 이동 시킬 위치의 index
  public targetTop: number | undefined;
  public targetParentIndex: number | undefined; // 드랍 대상 오브젝트 행의 orderItems index
  public isDividerIndented: boolean = false; // 디바이더가 부모 하위 위치를 가리켜 자식 행처럼 들여쓰기 되어야 하는지
  public clientY: number | undefined;
  public scrollInterval!: number;
  private changeSub!: Subscription;
  private orderItems: GgokiorderItem<T>[] = []; // 전체 GgokiorderItem<T> 목록
  private movingItems: GgokiorderItem<T>[] = []; // 이동 할 GgokiorderItem<T> 목록
  private movingIndices: number[] = []; // 이동 대상 인덱스(isHierarchy 시 부모 자식 포함). 드래그 시작 시 세팅
  private mousedownIndex!: number; // mousedown 한 orderItems 의 아이템 index
  private prevMousedownIndex: number | undefined; // 이전에 mousedown 한 orderItems 의 아이템 index
  private lastShiftIndex: number | undefined;
  private minTop!: number;
  private maxTop!: number;
  private mousedownX!: number;
  private mousedownY!: number;
  private mousedownButton: MousedownButton = MousedownButton.None; // mousedown 버튼 확인. none 이면 mousedown 하지 않은 상태
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private isMovingInit: boolean = false; // 선택 아이템 이동을 위한 초기화 되어 있는지
  private isActiveChanged: boolean = false; // 활성화 되어 있지 않은 아이템 활성화 시키는 경우
  private deferredSelection: number | undefined;
  private isInternallyChanged: boolean = false;
  private dropTargetItem: GgokiorderItem<T> | undefined; // 드랍 대상으로 하이라이트 중인 오브젝트 행
  private dropBoundaryParentId?: number | null;

  private _mousedownItem: GgokiorderItem<T> | undefined; // mousedown 한 아이템

  get mousedownItem(): GgokiorderItem<T> | undefined {
    return this._mousedownItem;
  }

  set mousedownItem(item: GgokiorderItem<T> | undefined) {
    this._mousedownItem = item;
  }

  get ensureMousedownItem(): GgokiorderItem<T> {
    if (!this.mousedownItem) throw new Error('Could not find mousedownItem');
    return this.mousedownItem;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initMovingItems();

    if (changes['selected'] && changes['selected'].currentValue !== changes['selected'].previousValue) this.initSelected();
  }

  ngAfterContentInit() {
    // ng-content 구독
    this.changeSub = this.items.changes.subscribe((items: QueryList<OrderDirective>) => {
      this.initGgokiorder(items);
    });
  }

  ngAfterViewInit() {
    // ggokiorder 초기화
    this.initGgokiorder(this.items);
  }

  ngOnDestroy(): void {
    // ng-content 구독 해제
    if (this.changeSub) {
      this.changeSub.unsubscribe();
    }
  }

  /**
   * ng-content 요소들 기본 스타일 적용
   * @param {QueryList<OrderDirective>} orderElements
   * @return {void}
   */
  initGgokiorder(orderElements: QueryList<OrderDirective>): void {
    try {
      // sortItems 초기화
      this.orderItems = orderElements.map((directive, order) => {
        // mousedown event subscribe
        if (!directive.eventSubs) directive.eventSubs = [];
        if (directive.eventSubs.length === 0) {
          directive.eventSubs.push(
            directive.startMousedown.subscribe(orderEvent => {
              this.mousedownEvent(orderEvent);
            })
          );
          directive.eventSubs.push(
            directive.needResize.subscribe(() => {
              this.resizeElements();
            })
          );
        }

        return { directive, order, top: 0, object: this.objects[order] };
      });
    } catch (e) {
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
  resizeElements(): void {
    const orderDiv: HTMLElement = this.orderDiv.nativeElement;
    const prevHeight: string = orderDiv.style.height;

    let topElementHeight: number = 0;
    let zIndexMax: number = 1000;

    try {
      this.orderItems.forEach(orderItem => {
        const element: HTMLElement = orderItem.directive.element.nativeElement;

        // 접힌 부모의 자식 행은 숨기고 레이아웃에서 제외한다. (isHierarchy 전용)
        if (this.isCollapsedHidden(orderItem)) {
          element.style.display = 'none';
          return;
        }
        element.style.display = '';

        orderItem.top = topElementHeight;
        const zIndex: number = this.isMoving && this.movingItems.includes(orderItem) ? zIndexMax-- : 1;
        const itemHeight: number = orderItem.directive.setBaseStyle(orderItem.top, 0, zIndex);

        // 부모가 있는 행은 자식 행 들여쓰기 적용 (들여쓰기 폭은 --child-indent, isHierarchy 전용)
        // setBaseStyle 이 cssText 로 인라인 스타일을 초기화하므로 반드시 그 뒤에 적용해야 한다
        element.style.paddingLeft = this.getParentObjectId(orderItem) != null ? 'var(--child-indent)' : '';
        topElementHeight += itemHeight;
      });

      const resultHeight: string = `${topElementHeight}px`;
      orderDiv.style.height = resultHeight;
      if (resultHeight !== prevHeight) this.changeHeight.emit();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * movingItems 초기화
   * @return {void}
   */
  initMovingItems(): void {
    if (!this.selected || this.selected.length === 0) return;

    this.movingItems = this.selected.map(index => {
      return this.orderItems[index];
    });
  }

  /**
   * selected 목록 초기화
   * @return {void}
   */
  initSelected(): void {
    if (this.isInternallyChanged && this.prevMousedownIndex !== undefined) return;

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
  toggleCollapse(object: T): void {
    if (!this.isHierarchy) return;

    const isCollapsed: GgokiorderHierarchyObject['isCollapsed'] = (object as GgokiorderHierarchyObject).isCollapsed;
    if (!isCollapsed) return;

    isCollapsed.set(!isCollapsed());
    this.resizeElements();
  }

  /**
   * mousedown event
   * @param {OrderEvent} event
   * @return {void}
   */
  mousedownEvent(event: OrderEvent): void {
    const mouseEvent: MouseEvent = event.mouseEvent;

    //  right button 이거나 이미 누른 상태 리턴
    if (mouseEvent.button === 2 || this.mousedownButton !== MousedownButton.None) return;

    // left / middle button 저장
    this.mousedownButton = mouseEvent.button;

    const isCtrl: boolean = mouseEvent.ctrlKey || mouseEvent.metaKey;
    const isShift: boolean = mouseEvent.shiftKey;

    try {
      this.mousedownX = mouseEvent.clientX;
      this.mousedownY = mouseEvent.clientY + this.scrollY;

      // 선택한 아이템 index 처리. selected 에 없을 경우 새 아이템 down
      this.mousedownIndex = this.orderItems.findIndex(orderItem => orderItem.directive === event.orderItem);

      // 활성 아이템 변경 체크
      const mousedownItem: GgokiorderItem<T> = this.orderItems[this.mousedownIndex];
      this.isActiveChanged = mousedownItem !== this.mousedownItem;
      this.mousedownItem = mousedownItem;

      /** 우선순위대로 selected 변경
       *  1. 멀티셀렉 아님
       *  2. shift
       *  3. ctrl
       *  4. 활성화 아닌 아이템 선택 **/
      if (!this.multiSelectMode) this.selectItem();
      else if (isShift) this.selectItemOnShiftMousedown();
      else if (isCtrl) this.selectItemOnCtrlMousedown();
      else this.selectItemWithSelected();

      this.prevMousedownIndex = this.mousedownIndex;
      if (!isShift) this.lastShiftIndex = this.mousedownIndex;

      // selected 바뀐 경우 선택 처리
      this.initMovingItems();
    } catch (e) {
      console.error(e);
      throw e;
    }

    // add mouse event
    document.body.addEventListener('mousemove', this.mousemoveEvent);
    document.body.addEventListener('mouseup', this.mouseupEvent);
    document.body.addEventListener('mouseleave', this.mouseupEvent);
  }

  /**
   * Shift Mousedown 으로 Multi select
   * @return {void}
   */
  selectItemOnShiftMousedown(): void {
    if (this.prevMousedownIndex === undefined) {
      this.selectItem();
      return;
    }

    const changeSelected: (start: number, end: number, isAdd: boolean) => void = (start: number, end: number, isAdd: boolean) => {
      const addValue: number = start < end ? 1 : -1;
      for (let i = start; i !== end + addValue; i = i + addValue) {
        const selectedIndex: number = this.selected.indexOf(i);
        if (isAdd && selectedIndex === -1) this.selected.push(i);
        else if (!isAdd && selectedIndex !== -1) this.selected.splice(selectedIndex, 1);
      }
      this.isInternallyChanged = true;
    };

    // 선택 해제 해야 하는 부분 splice
    if (this.lastShiftIndex === undefined) this.lastShiftIndex = this.prevMousedownIndex;
    else changeSelected(this.prevMousedownIndex, this.lastShiftIndex, false);

    // 선택 해야 하는 부분 add
    changeSelected(this.lastShiftIndex, this.mousedownIndex, true);
  }

  /**
   * Ctrl Mousedown 으로 Multi select
   * @return {void}
   */
  selectItemOnCtrlMousedown(): void {
    if (this.prevMousedownIndex === undefined) {
      this.selectItem();

      return;
    }

    const selectedIndex: number = this.selected.indexOf(this.mousedownIndex);

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
  selectItemOnCtrlMouseup(): boolean {
    if (this.deferredSelection === undefined) throw new Error('Invalid deferredSelection');

    const isMultipleSelection: boolean = this.selected.length > 1;

    if (!this.allowNoSelection && !isMultipleSelection) return true;

    this.selected.splice(this.deferredSelection, 1);
    this.isInternallyChanged = true;

    const newIndex: number | undefined = isMultipleSelection ? this.selected.at(-1) : undefined;
    this.mousedownItem = newIndex === undefined ? undefined : this.orderItems[newIndex];
    this.prevMousedownIndex = newIndex;
    this.lastShiftIndex = newIndex ?? this.lastShiftIndex;

    return !isMultipleSelection;
  }

  /**
   * mousedown 시 이동일 경우와 분기 처리
   * @return {void}
   */
  selectItemWithSelected(): void {
    if (this.movingItems.includes(this.ensureMousedownItem)) this.deferredSelection = this.mousedownIndex;
    else this.selectItem();
  }

  /**
   * Single Select
   * @return {void}
   */
  selectItem(): void {
    if (this.isActiveChanged) this.selected.splice(0, this.selected.length, this.mousedownIndex);
    this.isInternallyChanged = true;

    this.prevMousedownIndex = this.mousedownIndex;
  }

  /**
   * mousemove event
   * @param {MouseEvent} event
   * @return {void}
   */
  mousemoveEvent: (event: MouseEvent) => void = (event: MouseEvent): void => {
    // mousemove 인지 체크
    if (!this.isMoving) this.isMoving = this.mousedownX !== event.clientX || this.mousedownY !== event.clientY + this.scrollY;
    else {
      // mousemove 일 때 초기화 안되어 있으면 초기화
      if (!this.isMovingInit) {
        this.movingInit();
        this.setLastItem();
      }

      this.elementsMoving(event);
    }
  };

  /**
   * 마지막 요소 부분 빈 div 세팅
   * 없으면 스크롤 이상하게 움직임
   * @return {void}
   */
  setLastItem(): void {
    const lastItem: GgokiorderItem<T> | undefined = this.orderItems.at(-1);
    if (!lastItem) throw new Error('orderItems empty array');

    const lastItemElement: HTMLElement = lastItem.directive.element.nativeElement;
    const emptyElement = this.emptyDiv.nativeElement;
    if (!emptyElement.offsetHeight) emptyElement.style.height = `${lastItemElement.offsetHeight}px`;
    emptyElement.style.top = lastItemElement.style.top;
  }

  /**
   * mouseup event
   * @param {MouseEvent} event
   * @return {void}
   */
  mouseupEvent: (event: MouseEvent) => void = (event: MouseEvent): void => {
    // remove mouse event
    document.body.removeEventListener('mousemove', this.mousemoveEvent);
    document.body.removeEventListener('mouseup', this.mouseupEvent);
    document.body.removeEventListener('mouseleave', this.mouseupEvent);

    this.mousedownButton = MousedownButton.None;

    const isCtrl: boolean = event.ctrlKey || event.metaKey;
    const isShift: boolean = event.shiftKey;

    try {
      let isSelect: boolean = true;
      if (this.deferredSelection !== undefined) {
        // 보류 처리 된 선택 진행
        if (!this.isMoving) {
          this.isActiveChanged = true;
          if (isCtrl) isSelect = this.selectItemOnCtrlMouseup();
          else this.selectItem();
        }

        this.deferredSelection = undefined;
      }

      if (this.isMoving) this.endMoving();

      if (this.isActiveChanged && this.mousedownItem !== undefined) {
        this.clickItem.emit({
          object: this.mousedownItem.object,
          isMultiSelect: isShift || isCtrl,
          button: event.button,
          isSelect
        });
        this.isActiveChanged = false;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  /**
   * 선택 요소들 이동 전 초기화
   * @return {void}
   */
  movingInit(): void {
    try {
      this.isMovingInit = true;

      // 이동 대상 인덱스 확정 (isHierarchy 시 선택 부모의 자식 포함) 후 movingItems 재구성
      this.movingIndices = this.getMovingIndices();
      this.movingItems = this.movingIndices.map(index => this.orderItems[index]);

      // 스크롤 최대값 저장
      const scrollDiv: HTMLElement = this.scrollDiv.nativeElement;
      this.maxScroll = scrollDiv.scrollHeight - scrollDiv.clientHeight;

      // 누른 아이템 세팅
      const mousedownItem: GgokiorderItem<T> = this.ensureMousedownItem;
      const movingIndex: number = this.movingItems.indexOf(mousedownItem);
      mousedownItem.isMousedown = true;
      const basePosition: number = +mousedownItem.directive.element.nativeElement.style.top.replace('px', '');

      // 이동 시작 전 마우스 다운 위치로 선택 요소들 이동
      let zIndex: number = 1000;
      this.movingItems.forEach((item, index) => {
        const topAddValue: number = (index - movingIndex) * MOVING_ITEMS_GAP;

        item.directive.setPosition(basePosition + topAddValue, index * MOVING_ITEMS_GAP, zIndex);
        item.directive.setTransition(false);
        item.prevTop = basePosition + topAddValue;
        zIndex--;
      });

      const itemHalfHeight: number = this.movingItems[0].directive.element.nativeElement.offsetHeight / 2;
      this.minTop = -itemHalfHeight + this.scrollY;
      this.maxTop = scrollDiv.offsetHeight - itemHalfHeight + this.scrollY;
      this.movingState.emit(this.isMoving);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * 요소 움직임
   * @param {Event} event
   * @return {void}
   */
  elementsMoving(event: Event): void {
    const isMouseEvent: (event: Event) => event is MouseEvent = (event: Event): event is MouseEvent => {
      return 'clientY' in event;
    };
    if (isMouseEvent(event)) this.clientY = event.clientY;

    if (this.clientY === undefined) throw new Error('undefined clientY');
    const mouseYDistance: number = this.clientY + this.scrollY - this.mousedownY;
    const mouseY: number = this.clientY - this.orderDiv.nativeElement.getBoundingClientRect().top;

    try {
      // 첫번째 moving item 위치값 계산
      const firstMovingItem: GgokiorderItem<T> = this.movingItems[0];
      const topValue: number = Math.max(this.minTop, (firstMovingItem.prevTop as number) + mouseYDistance);

      // moving items 위치값 적용
      this.applyMovingItemsPosition(topValue);

      // 이동 위치 디바이더 세팅
      this.targetTop = undefined;
      this.targetIndex = undefined;
      this.targetParentIndex = undefined;
      this.dropBoundaryParentId = undefined;
      this.isDividerIndented = false;

      const dividerHalfHeight: number = this.goalDivider.nativeElement.offsetHeight / 2;
      const moveArea: number = this.moveArea;

      const movingSet = new Set<GgokiorderItem<T>>(this.movingItems);

      // 이동 아이템 누적 개수 + 마지막으로 보이는 행 index (접혀 숨겨진 행 제외) 계산.
      // lastVisibleIndex 행의 하단 영역은 목록 아래 전체를 담당한다
      const movingCountBefore: number[] = new Array(this.orderItems.length + 1).fill(0);
      let lastVisibleIndex: number = -1;
      for (let i = 0; i < this.orderItems.length; i++) {
        movingCountBefore[i + 1] = movingCountBefore[i] + (movingSet.has(this.orderItems[i]) ? 1 : 0);
        if (!this.isCollapsedHidden(this.orderItems[i])) lastVisibleIndex = i;
      }

      for (const [i, item] of this.orderItems.entries()) {
        // 접혀 숨겨진 행은 영역 검사에서 제외
        if (this.isCollapsedHidden(item)) continue;

        const topY: number = item.top;
        const bottomY: number = topY + item.directive.element.nativeElement.offsetHeight;

        // 커서가 행보다 아래면 다음 행에서 검사 (마지막 행이면 목록 아래 영역도 행 하단으로 처리)
        if (i !== lastVisibleIndex && mouseY > bottomY) continue;

        if (mouseY <= topY + moveArea) {
          // 행 상단 → 행 위 디바이더 (이 행과 같은 계층으로 이동. 부모 하위 위치면 디바이더도 들여쓰기)
          this.dropBoundaryParentId = this.getParentObjectId(item);
          this.isDividerIndented = this.dropBoundaryParentId != null;
          this.targetIndex = i - movingCountBefore[i];
          this.targetTop = topY - dividerHalfHeight;
        } else if (!this.isHierarchy || mouseY >= bottomY - moveArea) {
          this.dropBoundaryParentId = i === lastVisibleIndex && mouseY > bottomY ? null : this.getParentObjectId(item);
          this.isDividerIndented = this.dropBoundaryParentId != null;

          // 접혀 숨겨진 자식 행들 사이에 소속이 다른 아이템이 끼지 않도록 숨김 블록 뒤로 인덱스 보정
          // (접힌 부모 바로 아래 드랍 시 숨겨진 자식들 뒤 = 블록 밖으로)
          let rawIndex: number = i + 1;
          while (
            rawIndex < this.orderItems.length &&
            this.isCollapsedHidden(this.orderItems[rawIndex]) &&
            this.getParentObjectId(this.orderItems[rawIndex]) !== this.dropBoundaryParentId
            ) {
            rawIndex++;
          }

          this.targetIndex = rawIndex - movingCountBefore[rawIndex];
          this.targetTop = bottomY - dividerHalfHeight;
        } else if (!this.movingItems.includes(item)) {
          // 행 가운데 → 해당 행 하위로 드랍 대상 (이동 중인 행 자신은 제외. 실제 이동 가능 여부는 이벤트 받은 쪽이 결정)
          this.targetParentIndex = i;
        }

        break;
      }

      // 하위 드랍 대상 행 하이라이트 갱신
      this.setParentDropHighlight(this.targetParentIndex === undefined ? undefined : this.orderItems[this.targetParentIndex]);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * movingItems 위치 이동
   * @param {number} topValue
   * @return {void}
   */
  applyMovingItemsPosition(topValue: number): void {
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
  endMoving(): void {
    // 프로퍼티 초기화
    this.isMoving = false;
    this.isMovingInit = false;
    this.lastShiftIndex = undefined;
    this.prevMousedownIndex = this.selected.at(-1);

    const dropParentIndex: number | undefined = this.targetParentIndex;
    const dropParentId: number | null | undefined = this.dropBoundaryParentId;
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

      const movedResults: MovedItem[] = this.buildMovedResults(this.targetIndex);

      // 부모 계층 검사 — 이동 중인 아이템이 자기 부모 블록 밖에 놓이면 부모 이탈,
      // 다른 부모 블록 안에 놓이면 그 부모으로 편입 처리하고, 그 외 무효 배치는 막고 원래 순서로 되돌린다.
      const resultObjects: T[] = movedResults.map(movedItem => this.orderItems[movedItem.prev].object);
      const parentChanges: Map<T, number | null> | null = this.resolveParentChanges(resultObjects, dropParentId);
      if (parentChanges === null) {
        this.revertMoveResult();
        return;
      }

      // 순서 변경과 소속 변경을 하나의 이동 결과 배열로 emit 한다. 실제 값 변경(parentObjectId 등)은 받은 쪽에서 처리한다.
      this.applyMoveResult(movedResults);
      this.moved.emit(this.buildMovedObjects(resultObjects, movedResults, parentChanges));

      // 소속 변경으로 자식 행 들여쓰기가 바뀔 수 있으므로 레이아웃 갱신 (parentObjectId 는 위 emit 처리에서 동기 반영됨)
      if (parentChanges.size > 0) this.resizeElements();
    } catch (e) {
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
  getMovedResults(count: number, excludedItems: number[], isNotChange: boolean = false): MovedResultArray {
    const items: MovedItem[] = [];
    const orders: number[] = [];

    let order: number = 0;
    while (orders.length < count && order < this.orderItems.length) {
      const applyIndex: number = order++;
      // isHierarchy 시 movingIndices 는 선택 부모의 자식까지 포함 (자식이 부모과 함께 이동하도록)
      const isSelected: boolean = this.movingIndices.includes(applyIndex);

      const isResult: boolean = !(isSelected || excludedItems.includes(applyIndex)) || isNotChange;

      if (isNotChange && isSelected) this.orderItems[applyIndex].directive.element.nativeElement.style.opacity = '';

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
  getMovedResult(prev: number, isSelected: boolean): MovedItem {
    if (this.orderItems[prev].isMousedown) this.orderItems[prev].isMousedown = false;
    this.orderItems[prev].directive.setTransition(true);

    return { prev, isSelected };
  }

  /**
   * 현재 스크롤 위치 기억
   * @param {Event} event
   * @return {void}
   */
  setScroll(event: Event): void {
    const target: HTMLElement = event.target as HTMLElement;
    this.scrollY = target.scrollTop;

    if (this.isMoving) this.elementsMoving(event);
  }

  /**
   * 스크롤 이동
   * @param {number} value
   * @return {void}
   */
  moveScroll(value: number): void {
    const scrollDiv: HTMLElement = this.scrollDiv.nativeElement;

    try {
      // 스크롤 값 계산
      const scrollValue: number = Math.min(Math.max(0, scrollDiv.scrollTop + value), this.maxScroll);

      // movingItems 위치값 계산
      const firstMovingItem: GgokiorderItem<T> = this.movingItems[0];
      const topValue: number = +firstMovingItem.directive.element.nativeElement.style.top.replace('px', '') + value;

      // 스크롤 이동
      scrollDiv.scrollTo({ top: scrollValue, behavior: 'smooth' });
      this.scrollY = scrollValue;

      // movingItems 이동
      this.applyMovingItemsPosition(topValue);

      // min/max top 계산
      this.minTop = this.minTop + value;
      this.maxTop = this.maxTop + value;

      if (scrollValue === 0 || scrollValue === this.maxScroll) this.toggleMovingScroll(false);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * 스크롤 on/off
   * @param {boolean} isMovingScroll
   * @param {number} value
   */
  toggleMovingScroll(isMovingScroll: boolean, value: number = 30): void {
    if (isMovingScroll) {
      this.scrollInterval = window.setInterval(() => {
        this.moveScroll(value);
      }, 100);
    } else if (this.scrollInterval) clearInterval(this.scrollInterval);
  }

  /**
   * 선택한 모든 아이템 선택 취소
   * @param {MouseEvent} event
   * @return {void}
   */
  unselectAllItem(event: MouseEvent): void {
    if (!this.allowNoSelection) return;

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
  private dropToParent(parentIndex: number): void {
    const parentObject: GgokiorderHierarchyObject = this.asHierarchy(this.orderItems[parentIndex]);
    // 대상 행이 부모 행이 아니면 하위 편입 불가
    if (parentObject.isCollapsed === undefined) {
      this.revertMoveResult();
      return;
    }
    const parentId: number = parentObject.id;

    // 대상 행 바로 뒤(하위 최상단)로 재배치. 이동 아이템 전부를 대상 행 하위로 편입시킨다.
    const movingCountBefore: number = this.movingIndices.filter(index => index <= parentIndex).length;
    const movedResults: MovedItem[] = this.buildMovedResults(parentIndex + 1 - movingCountBefore);
    const resultObjects: T[] = movedResults.map(movedItem => this.orderItems[movedItem.prev].object);
    const parentChanges: Map<T, number | null> = new Map<T, number | null>(this.movingItems.map(item => [item.object, parentId]));

    this.applyMoveResult(movedResults);
    this.moved.emit(this.buildMovedObjects(resultObjects, movedResults, parentChanges));
    this.resizeElements();
  }

  /**
   * targetIndex 위치에 이동 아이템들(isHierarchy 시 부모 자식 포함)을 끼워넣은 이동 결과 목록 생성
   * @param {number} targetIndex
   * @returns {MovedItem[]}
   */
  private buildMovedResults(targetIndex: number): MovedItem[] {
    // 이동 대상(isHierarchy 시 부모 자식 포함)을 오름차순으로 정렬해서 사용
    const sortingSelected: number[] = [...this.movingIndices].sort((a, b) => a - b);

    // 순서 적용을 위한 배열
    const movedResults: MovedItem[] = [],
      excludedItems: number[] = [];

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
  private revertMoveResult(): void {
    const { items } = this.getMovedResults(this.orderItems.length, [], true);
    this.applyMoveResult(items);
  }

  /**
   * 아이템의 object 를 계층 인터페이스로 해석한다.
   * @param {GgokiorderItem<T>} item
   * @returns {GgokiorderHierarchyObject}
   */
  private asHierarchy(item: GgokiorderItem<T>): GgokiorderHierarchyObject {
    return item.object;
  }

  /**
   * 아이템의 부모 id (없으면 null). isHierarchy 이 아니면 항상 null.
   * @param {GgokiorderItem<T>} item
   * @returns {number | null}
   */
  private getParentObjectId(item: GgokiorderItem<T>): number | null {
    if (!this.isHierarchy) return null;
    return this.asHierarchy(item).parentObjectId ?? null;
  }

  /**
   * 접힌 부모에 속해 숨겨야 하는 자식 행인지 여부.
   * @param {GgokiorderItem<T>} item
   * @returns {boolean}
   */
  private isCollapsedHidden(item: GgokiorderItem<T>): boolean {
    const parentId: number | null = this.getParentObjectId(item);
    if (parentId == null) return false;

    const parent: GgokiorderItem<T> | undefined = this.orderItems.find(target => this.asHierarchy(target).id === parentId);
    const isCollapsed: GgokiorderHierarchyObject['isCollapsed'] = parent && this.asHierarchy(parent).isCollapsed;
    return !!isCollapsed && isCollapsed();
  }

  /**
   * 부모 인덱스의 자식 orderItems 인덱스 목록.
   * @param {number} parentIndex
   * @returns {number[]}
   */
  private getChildIndices(parentIndex: number): number[] {
    if (!this.isHierarchy) return [];
    const parentId: number = this.asHierarchy(this.orderItems[parentIndex]).id;
    const result: number[] = [];
    this.orderItems.forEach((item, index) => {
      if (this.getParentObjectId(item) === parentId) result.push(index);
    });
    return result;
  }

  /**
   * 실제로 함께 이동시킬 인덱스 목록. isHierarchy 일 때 선택된 부모의 자식까지 포함한다.
   * (부모 드래그 시 자식이 함께 따라가도록)
   * @returns {number[]}
   */
  private getMovingIndices(): number[] {
    if (!this.isHierarchy) return [...this.selected];

    const indices: Set<number> = new Set<number>(this.selected);
    this.selected.forEach(index => this.getChildIndices(index).forEach(childIndex => indices.add(childIndex)));
    return [...indices].sort((a, b) => a - b);
  }

  /**
   * 하위 드랍 대상 행 하이라이트 적용/해제.
   * 행은 projected content 라 컴포넌트 스코프 스타일이 닿지 않으므로 인라인 스타일로 처리한다.
   * @param {GgokiorderItem<T> | undefined} item 하이라이트할 행 (undefined 면 해제만)
   * @returns {void}
   */
  private setParentDropHighlight(item: GgokiorderItem<T> | undefined): void {
    if (this.dropTargetItem === item) return;

    if (this.dropTargetItem) {
      const prevElement: HTMLElement = this.dropTargetItem.directive.element.nativeElement;
      prevElement.style.outline = '';
      prevElement.style.outlineOffset = '';
    }

    this.dropTargetItem = item;

    if (item) {
      const element: HTMLElement = item.directive.element.nativeElement;
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
  private resolveParentChanges(orderedObjects: T[], dropParentId?: number | null): Map<T, number | null> | null {
    const changes: Map<T, number | null> = new Map<T, number | null>();
    if (!this.isHierarchy) return changes;

    const movingObjects: Set<T> = new Set<T>(this.movingItems.map(item => item.object));
    // 이동 아이템에 부모 행이 포함되면 (부모 중첩 방지) 다른 부모 블록으로의 편입은 허용하지 않는다
    const canJoin: boolean = !this.movingItems.some(item => this.asHierarchy(item).isCollapsed !== undefined);

    // 현재 순회 위치가 속한 부모 블록의 부모 행 object (없으면 최상위 영역)
    let contextParent: T | undefined;

    for (const object of orderedObjects) {
      const current: GgokiorderHierarchyObject = object;

      // 부모 행: 새 부모 블록 시작
      if (current.isCollapsed !== undefined) {
        contextParent = object;
        continue;
      }

      const parentId: number | null = current.parentObjectId ?? null;
      const contextId: number | null = contextParent?.id ?? null;

      if (!movingObjects.has(object)) {
        if (parentId === contextId) continue; // 현재 블록 소속 그대로 (최상위 포함)
        // 이동하지 않은 최상위 오브젝트는 부모 블록을 닫고, 자식의 블록이 끊긴 경우는 무효
        if (parentId != null) return null;
        contextParent = undefined;
        continue;
      }

      // 이동 중인 오브젝트: 드랍 위치의 블록 기준으로 소속 변경.
      // 블록 경계 드랍은 커서가 가리킨 요소의 계층 위치(dropParentId)를 우선한다.
      const desiredParentId: number | null = dropParentId === undefined ? contextId : dropParentId;

      if (desiredParentId == null) {
        // 최상위 행이 되므로 현재 블록은 여기서 닫힌다 (블록 중간이면 뒤따르는 자식 검사에서 무효 처리)
        if (parentId != null) changes.set(object, null); // 부모 블록 밖 → 부모 이탈
        contextParent = undefined;
        continue;
      }

      if (parentId === desiredParentId) continue; // 소속 변화 없음

      if (!canJoin || !contextParent || contextParent.id !== desiredParentId) return null;
      changes.set(object, contextParent.id); // 다른 부모 블록 안 → 그 부모으로 편입
    }

    return changes;
  }

  /**
   * 이동으로 순서 또는 소속이 바뀐 항목만 골라 이동 결과 배열을 만든다.
   * 받은 쪽이 order 를 index 로 대상 object 를 얻고, 한 번의 순회로 순서 저장과 소속 변경을 처리할 수 있도록
   * 각 항목에 새 order·parentObjectId 를 담는다. (object 자체는 공유 배열의 index 로 얻으므로 담지 않는다)
   * @param {T[]} resultObjects 이동 결과 순서의 object 목록 (index = 새 order)
   * @param {MovedItem[]} movedResults 이동 결과(각 항목의 prev = 이동 전 index)
   * @param {Map<T, number | null>} parentChanges 소속이 바뀐 object → 새 부모 id(null = 최상위) Map
   * @returns {MovedObject[]}
   */
  private buildMovedObjects(resultObjects: T[], movedResults: MovedItem[], parentChanges: Map<T, number | null>): MovedObject[] {
    const moved: MovedObject[] = [];

    resultObjects.forEach((object, next) => {
      const isPositionChanged: boolean = movedResults[next].prev !== next;
      const isParentChanged: boolean = parentChanges.has(object);
      if (!isPositionChanged && !isParentChanged) return; // 순서·소속 모두 그대로면 제외

      // 소속이 바뀐 항목은 새 부모를, 그 외에는 현재 부모를 담는다 (받은 쪽은 기존 값과 비교해 변경 여부 판단)
      const currentParentId: number | null = this.isHierarchy ? ((object as GgokiorderHierarchyObject).parentObjectId ?? null) : null;
      const parentObjectId: number | null = isParentChanged ? parentChanges.get(object)! : currentParentId;
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
  private applyMoveResult(movedResults: MovedItem[]): void {
    let top: number = 0;
    const orderItems: GgokiorderItem<T>[] = [];
    const objects: T[] = [];

    for (const [next, { prev, isSelected }] of movedResults.entries()) {
      const orderItem: GgokiorderItem<T> = this.orderItems[prev];

      const height: number = orderItem.directive.setPosition(top);
      top = top + height;

      orderItems.push(orderItem);
      objects.push(orderItem.object);

      if (isSelected) {
        const selectedIndex: number = this.selected.indexOf(prev);
        if (selectedIndex !== -1) this.selected[selectedIndex] = next;
      }
    }
    this.orderItems.splice(0, this.orderItems.length, ...orderItems);
    this.objects.splice(0, this.objects.length, ...objects);

    this.movingState.emit(this.isMoving);
  }
}
