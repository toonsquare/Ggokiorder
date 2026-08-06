import { OrderDirective } from './order.directive';

export const BASE_TRANSITION_TIME: number = 200;

export interface GgokiorderObject {
  /** 소속 부모 id. isHierarchy 를 쓰지 않으면 없어도 된다. (없거나 null 이면 최상위) */
  parentObjectId?: number | null;
  id: number;
}

/**
 * isHierarchy 모드에서 projected 아이템(object)이 만족해야 하는 계층 인터페이스.
 * - id / parentObjectId 로 부모-자식 관계를 표현한다. (parentObjectId 가 없거나 null 이면 최상위)
 * - 부모 행은 isCollapsed(Angular WritableSignal) 로 접힘 상태를 노출/제어한다.
 */
export interface GgokiorderHierarchyObject {
  id: number;
  parentObjectId?: number | null;
  isCollapsed?: { (): boolean; set(value: boolean): void };
}

/** ggokiorder 가 관리하는 행 하나. 요소(directive)와 데이터(object)를 짝지어 순서·위치를 들고 있다. */
export interface GgokiorderItem<T extends GgokiorderObject = GgokiorderObject> {
  directive: OrderDirective;
  object: T;
  order: number;
  top: number;
  prevTop?: number;
  isMousedown?: boolean;
}

/** 이동 결과 한 건. prev 는 이동 전 index, isSelected 는 이동 대상이었는지 여부. */
export interface MovedItem {
  prev: number;
  isSelected: boolean;
}

/** 이동 결과 목록(items)과 그 대상이 된 이동 전 index 목록(orders). */
export interface MovedResultArray {
  items: MovedItem[];
  orders: number[];
}

export interface ClickItem<T extends GgokiorderObject = GgokiorderObject> {
  object?: T;
  isMultiSelect: boolean;
  button: number;
  isSelect: boolean;
}

export interface OrderEvent {
  orderItem: OrderDirective;
  mouseEvent: MouseEvent;
}

/** ggokiorder 이동으로 순서·소속이 바뀐 항목 하나. 바뀐 항목만 담아 배열로 한 번에 emit 한다.
 * 받은 쪽은 order 를 [objects] 배열의 index 로 써서 대상 object 를 얻고(공유 배열 기준),
 * 이 배열을 한 번만 순회하면 순서 저장과 소속 변경을 모두 처리할 수 있다.
 * - order: 이동 후 전체에서의 새 순서(index)
 * - parentObjectId: 이동 후 소속 부모 id (null = 최상위). isHierarchy 가 아니면 담지 않는다 */
export interface MovedObject {
  order: number;
  parentObjectId?: number | null;
}
